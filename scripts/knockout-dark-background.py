#!/usr/bin/env python3
"""
Knock the flat dark card fill out of a poster-style print file.

The AI-generated "tech pack" designs (Defragmenting Reality and friends) are
built from rounded panels filled with a near-black grey — around rgb(32,32,40),
often with a checkerboard texture over it. That fill is fully opaque, so on a
black garment DTG lays a white underbase and prints a grey rectangle on top:
visible boxes that are lighter than the shirt, plus a lot of needless ink.

Making the fill transparent is the real fix — no ink, fabric shows through, and
the artwork reads as line work floating on the garment.

The trick is removing the fill without eating the artwork's own dark pixels
(outlines, glitch squares, drop shadows). Those are thin; the card fill is one
enormous connected region. So: threshold to a dark mask, label connected
components, and only clear components larger than a minimum area.

    python knockout-dark-background.py in.png out.png [--threshold 70]
                                                      [--min-area-pct 0.5]
                                                      [--feather 1]

Run it on the ORIGINAL full-resolution export, never on a downscaled preview —
resampling blends the fill into neighbouring pixels and the threshold smears.
"""
import argparse
import sys

import numpy as np
from PIL import Image


def connected_components(mask: np.ndarray) -> tuple[np.ndarray, int]:
    """Label 4-connected True regions. Two-pass union-find, no scipy needed."""
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    parent: list[int] = [0]

    def find(x: int) -> int:
        root = x
        while parent[root] != root:
            root = parent[root]
        while parent[x] != root:  # path compression
            parent[x], x = root, parent[x]
        return root

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[max(ra, rb)] = min(ra, rb)

    next_label = 1
    for y in range(h):
        row = mask[y]
        for x in range(w):
            if not row[x]:
                continue
            up = labels[y - 1, x] if y > 0 else 0
            left = labels[y, x - 1] if x > 0 else 0
            if up and left:
                labels[y, x] = min(up, left)
                union(up, left)
            elif up or left:
                labels[y, x] = up or left
            else:
                labels[y, x] = next_label
                parent.append(next_label)
                next_label += 1

    # Flatten to root labels.
    lut = np.array([find(i) for i in range(next_label)], dtype=np.int32)
    return lut[labels], next_label


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument(
        "--threshold",
        type=int,
        default=70,
        help="max RGB channel value counted as 'dark card fill' (default 70). "
        "With --light, the MINIMUM value counted as light fill (try 200)",
    )
    ap.add_argument(
        "--light",
        action="store_true",
        help="remove a light/white background instead of a dark one. Line art "
        "exported on white prints as a white rectangle on any garment that is "
        "not white — obvious on heather grey.",
    )
    ap.add_argument(
        "--min-area-pct",
        type=float,
        default=0.5,
        help="only clear dark regions at least this %% of the image (default 0.5)",
    )
    ap.add_argument(
        "--feather",
        type=int,
        default=1,
        help="shrink the cleared area by N px so outlines keep a clean edge. "
        "Leaves one pixel of background around every edge, which is invisible "
        "for a dark fill on a dark garment and a glaring white outline for a "
        "light one — pass 0 with --unmatte",
    )
    ap.add_argument(
        "--unmatte-width",
        type=int,
        default=3,
        help="how many pixels either side of the cut to rebuild (default 3)",
    )
    ap.add_argument(
        "--unmatte",
        action="store_true",
        help="recover soft edges instead of cutting hard. Anti-aliased pixels "
        "are the artwork blended into the background, so a hard threshold "
        "either keeps them (a bright fringe) or cuts them (jagged edges). "
        "This derives partial alpha from how far each edge pixel sits from "
        "the background colour, then un-multiplies that colour back out.",
    )
    args = ap.parse_args()

    im = Image.open(args.src).convert("RGBA")
    arr = np.array(im)
    h, w = arr.shape[:2]

    rgb = arr[:, :, :3].astype(np.int16)
    alpha = arr[:, :, 3]

    if args.light:
        # Every channel at or above the threshold — a flat light fill. Using
        # min() rather than max() keeps saturated pale colours (a pink, a
        # cream) from being mistaken for white paper.
        fill = (rgb.min(axis=2) >= args.threshold) & (alpha > 200)
    else:
        fill = (rgb.max(axis=2) <= args.threshold) & (alpha > 200)
    labels, n = connected_components(fill)

    min_area = int(h * w * args.min_area_pct / 100.0)
    counts = np.bincount(labels.ravel())
    big = {i for i, c in enumerate(counts) if i != 0 and c >= min_area}
    if not big:
        hint = "a lower --threshold" if args.light else "a higher --threshold"
        print(
            f"No {'light' if args.light else 'dark'} region reached "
            f"{args.min_area_pct}% of the image ({min_area}px). "
            f"Nothing removed — try {hint}.",
            file=sys.stderr,
        )
        return 1

    clear = np.isin(labels, list(big))

    # Pull the cleared area back from its own border so anti-aliased outline
    # pixels are not left stranded against sudden transparency.
    for _ in range(max(0, args.feather)):
        interior = clear.copy()
        interior[1:, :] &= clear[:-1, :]
        interior[:-1, :] &= clear[1:, :]
        interior[:, 1:] &= clear[:, :-1]
        interior[:, :-1] &= clear[:, 1:]
        clear = interior

    out = arr.copy()
    out[:, :, 3] = np.where(clear, 0, alpha)

    if args.unmatte:
        # Rebuild the anti-aliased ramp instead of cutting through it.
        #
        # A hard threshold splits that ramp: pixels above it are erased, the
        # ones just below survive at full opacity, and what is left is a bright
        # one-pixel outline. Both halves are wrong — the edge is neither fully
        # background nor fully artwork.
        #
        # So take a few pixels either side of the boundary and derive coverage
        # from brightness across the whole ramp, rather than asking a yes/no
        # question at one cut-off.
        edge = np.zeros_like(clear)
        edge[1:, :] |= clear[:-1, :] != clear[1:, :]
        edge[:-1, :] |= clear[:-1, :] != clear[1:, :]
        edge[:, 1:] |= clear[:, :-1] != clear[:, 1:]
        edge[:, :-1] |= clear[:, :-1] != clear[:, 1:]
        for _ in range(max(1, args.unmatte_width) - 1):
            grown = edge.copy()
            grown[1:, :] |= edge[:-1, :]
            grown[:-1, :] |= edge[1:, :]
            grown[:, 1:] |= edge[:, :-1]
            grown[:, :-1] |= edge[:, 1:]
            edge = grown

        bg = 255.0 if args.light else 0.0
        # Fully opaque by the time a pixel is this far from the background.
        solid = args.threshold - 60 if args.light else args.threshold + 60

        c = rgb[edge].astype(np.float32)
        v = c.min(axis=1) if args.light else c.max(axis=1)
        span = abs(args.threshold - solid)
        a = np.clip(np.abs(v - bg) / max(1e-6, abs(bg - solid)), 0.0, 1.0)

        # Un-multiply the background back out: observed = a*F + (1-a)*bg,
        # so F = (observed - (1-a)*bg) / a. Skipping this leaves the
        # background mixed into the edge, which prints as a halo even where
        # the pixel is only partly opaque.
        a3 = np.repeat(a[:, None], 3, axis=1)
        f = np.where(a3 > 0.04, (c - (1.0 - a3) * bg) / np.maximum(a3, 0.04), c)

        out[:, :, :3][edge] = np.clip(f, 0, 255).astype(np.uint8)
        out[:, :, 3][edge] = (a * 255).astype(np.uint8)

    removed = clear.sum()
    before = (alpha > 200).sum()
    after = (out[:, :, 3] > 200).sum()
    Image.fromarray(out, "RGBA").save(args.dst)

    print(f"{args.src} -> {args.dst}")
    print(f"  regions cleared:  {len(big)}")
    print(f"  pixels cleared:   {removed:,} ({removed / (h * w):.1%} of image)")
    print(f"  opaque coverage:  {before / (h * w):.1%} -> {after / (h * w):.1%}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

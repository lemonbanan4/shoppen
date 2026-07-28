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
        help="max RGB channel value counted as 'dark card fill' (default 70)",
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
        help="shrink the cleared area by N px so outlines keep a clean edge",
    )
    args = ap.parse_args()

    im = Image.open(args.src).convert("RGBA")
    arr = np.array(im)
    h, w = arr.shape[:2]

    rgb = arr[:, :, :3].astype(np.int16)
    alpha = arr[:, :, 3]

    dark = (rgb.max(axis=2) <= args.threshold) & (alpha > 200)
    labels, n = connected_components(dark)

    min_area = int(h * w * args.min_area_pct / 100.0)
    counts = np.bincount(labels.ravel())
    big = {i for i, c in enumerate(counts) if i != 0 and c >= min_area}
    if not big:
        print(
            f"No dark region reached {args.min_area_pct}% of the image "
            f"({min_area}px). Nothing removed — try a higher --threshold.",
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

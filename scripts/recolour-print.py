#!/usr/bin/env python3
"""
Recolour a single-tone print file, keeping its alpha exactly as-is.

A logo drawn in near-white only works on dark garments. Printed on white or
bone it is effectively invisible — the ink and the fabric are the same value.
The fix is a second file in a dark tone, not a different garment, whenever the
same product also carries dark artwork elsewhere (a black back print and a
white chest print need opposite garment colours, so one of them has to move).

Only the RGB channels are rewritten. Alpha is untouched, so anti-aliased edges
and soft shadows keep their exact shape and the mark stays as crisp as the
original.

    python recolour-print.py in.png out.png --to 17,17,17
    python recolour-print.py in.png out.png --to 255,255,255 --preserve-shading

By default every opaque pixel becomes the target colour, which is what you
want for a flat one-colour mark. --preserve-shading instead maps the existing
luminance range onto the target, keeping relative light and dark within the
artwork — use it when the mark has real tonal modelling rather than flat fill.
"""
import argparse
import sys

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument(
        "--to",
        default="17,17,17",
        help="target RGB, comma separated (default 17,17,17 — near-black)",
    )
    ap.add_argument(
        "--preserve-shading",
        action="store_true",
        help="map existing luminance onto the target instead of flat filling",
    )
    args = ap.parse_args()

    try:
        target = np.array([int(c) for c in args.to.split(",")], dtype=np.float64)
        if target.shape != (3,):
            raise ValueError
    except ValueError:
        print("--to must be three comma-separated values, e.g. 17,17,17", file=sys.stderr)
        return 1

    im = Image.open(args.src).convert("RGBA")
    arr = np.array(im).astype(np.float64)
    alpha = arr[:, :, 3]
    visible = alpha > 0

    if not visible.any():
        print("Image is fully transparent — nothing to recolour.", file=sys.stderr)
        return 1

    before = arr[:, :, :3][alpha > 200]
    before_mean = before.max(axis=1).mean() if before.size else 0

    if args.preserve_shading:
        lum = arr[:, :, :3].max(axis=2)
        lo, hi = lum[visible].min(), lum[visible].max()
        # Normalise to 0..1 across the artwork's own range, then scale the
        # target. A flat mark (lo == hi) would divide by zero, so fall back.
        t = (lum - lo) / (hi - lo) if hi > lo else np.ones_like(lum)
        for c in range(3):
            arr[:, :, c] = np.where(visible, target[c] * t, arr[:, :, c])
    else:
        for c in range(3):
            arr[:, :, c] = np.where(visible, target[c], arr[:, :, c])

    out = arr.astype(np.uint8)
    Image.fromarray(out, "RGBA").save(args.dst)

    after = out[:, :, :3][alpha > 200]
    after_mean = after.max(axis=1).mean() if after.size else 0
    print(f"{args.src} -> {args.dst}")
    print(f"  size:            {im.size[0]}x{im.size[1]}")
    print(f"  opaque coverage: {(alpha > 200).mean():.1%} (unchanged)")
    print(f"  ink brightness:  {before_mean:.0f} -> {after_mean:.0f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

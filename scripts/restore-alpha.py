#!/usr/bin/env python3
"""
Reattach an original's transparency to its upscaled copy.

Upscalers built on Real-ESRGAN — Upscayl included — run on RGB only. The alpha
channel is dropped, and what comes back is the artwork flattened onto white.
Printful then prints that white as a solid rectangle of ink.

The obvious fixes are both wrong for this artwork:

  Background removers (Printful's, Canva's) work by deciding what the subject
  is. These designs are a subject PLUS loose marks — drips, splatter, sun
  rays, scattered scrawl — that no subject detector keeps.

  Threshold-based white removal eats the artwork's own white: the crown, the
  highlights, the halftone. knockout-dark-background.py --light is the right
  tool for a flat card fill and the wrong one here.

The transparency is not lost, though — it is still in the file that went into
the upscaler. So take the alpha from there, scale it to the new size, and put
it back. Nothing is detected or guessed; the mask is the original's own.

    python restore-alpha.py original.png upscaled.png out.png
                            [--harden 0.5]

--harden re-crisps the mask after resampling, which matters on hard-edged
graphic art: a smoothly interpolated alpha leaves a soft halo that DTG prints
as a grey fringe. Values near 0.5 snap mid-tones; 0 leaves the ramp alone.
"""
import argparse
import sys

import numpy as np
from PIL import Image


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("original", help="the file that still has transparency")
    ap.add_argument("upscaled", help="upscaler output, alpha flattened to white")
    ap.add_argument("out")
    ap.add_argument(
        "--harden",
        type=float,
        default=0.0,
        help="0 keeps the soft ramp; ~0.5 snaps mid-tones to fully on/off",
    )
    args = ap.parse_args()

    original = Image.open(args.original).convert("RGBA")
    upscaled = Image.open(args.upscaled).convert("RGB")

    if original.getchannel("A").getextrema() == (255, 255):
        print(
            "! original is fully opaque — there is no transparency to restore.\n"
            "  Check you passed the pre-upscale file, not another flattened one.",
            file=sys.stderr,
        )
        return 1

    # LANCZOS on the mask, matching how the RGB was enlarged, so edges land in
    # the same place. Nearest would alias every diagonal in the linework.
    alpha = original.getchannel("A").resize(upscaled.size, Image.LANCZOS)

    if args.harden > 0:
        a = np.asarray(alpha).astype(np.float32) / 255.0
        # Smoothstep around the threshold: keeps genuine soft edges soft while
        # collapsing the interpolation ramp that resampling introduced.
        k = 6.0
        a = 1.0 / (1.0 + np.exp(-k * (a - args.harden) * 4))
        alpha = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), "L")

    out = upscaled.convert("RGBA")
    out.putalpha(alpha)
    out.save(args.out)

    transparent = int((np.asarray(alpha) < 16).sum())
    total = alpha.size[0] * alpha.size[1]
    print(
        f"wrote {args.out}  {out.size[0]}x{out.size[1]}  "
        f"{100 * transparent / total:.1f}% transparent"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

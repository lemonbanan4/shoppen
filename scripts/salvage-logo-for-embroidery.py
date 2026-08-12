#!/usr/bin/env python3
"""
Turn an existing raster logo into a stitchable one.

I previously said this could not be done and that the only route was drawing a
new mark. That was wrong. The AI logos cannot be embroidered *as they are* —
dry-brush texture, internal shading, speckle and hairline drips all sit under
the ~1.2mm a satin column can hold — but the letterforms underneath are solid
shapes, and the texture can be taken off them rather than the whole logo
thrown away.

Three steps, all measured at the true output size so the thresholds mean
something:

  binarise    collapse the artwork to a silhouette. Embroidery has no tonal
              range, so anything that is not a solid shape is a decision the
              digitiser will make for you, badly.

  despeckle   drop every blob smaller than a stitch can hold. Connected
              components rather than a blur, because a blur thins the strokes
              that have to survive while leaving the specks it was aimed at.

  close       bridge hairline gaps and smooth the ragged edge, so the
              digitiser traces one clean outline instead of chasing a
              hand-torn one.

What is lost is the fine dry-brush speckle, which was never going to stitch.
What survives is the letterform character, which is the part that is actually
the brand.

    python3 scripts/salvage-logo-for-embroidery.py <input.png> --height 600

Writes alongside the input as <name>-embroidery.png.
"""
import argparse
import pathlib
import subprocess
import sys

# Printful embroidery placements are 300dpi; a satin column bottoms out around
# 1.2mm, which is ~14px there.
DPI = 300
MIN_STITCH_MM = 1.2
MIN_PX = MIN_STITCH_MM / 25.4 * DPI


def sh(args):
    return subprocess.run(args, capture_output=True, text=True)


def survival(path):
    """Share of the mark that survives an erode of the stitch minimum.

    A blunt proxy for "how much of this is thinner than thread can hold".
    Read it next to the image, never instead of it — a solid blob scores
    beautifully and can still be an unreadable logo.
    """
    a = float(sh(["magick", str(path), "-alpha", "extract",
                  "-format", "%[fx:mean]", "info:"]).stdout or 0)
    b = float(sh(["magick", str(path), "-alpha", "extract",
                  "-morphology", "Erode", f"Disk:{MIN_PX/2:.0f}",
                  "-format", "%[fx:mean]", "info:"]).stdout or 0)
    return b / a * 100 if a else 0


def salvage(src: pathlib.Path, height: int, colour: str) -> pathlib.Path:
    area = int(MIN_PX * MIN_PX)
    dst = src.with_name(f"{src.stem}-embroidery.png")
    r = sh([
        "magick", str(src), "-trim", "+repage", "-resize", f"x{height}",
        # Silhouette, at output size so the thresholds below are in real units.
        "-alpha", "extract", "-threshold", "50%",
        # Anything smaller than one stitch cannot be sewn; remove it rather
        # than let the digitiser guess.
        "-define", f"connected-components:area-threshold={area}",
        "-define", "connected-components:mean-color=true",
        "-connected-components", "8",
        # Bridge hairline gaps, then smooth the torn edge.
        "-morphology", "Close", "Disk:3",
        "-morphology", "Smooth", "Disk:2",
        # Back to a coloured mark on transparency.
        #
        # No -negate here. After the threshold the mark is white and the field
        # is black, which is already the alpha channel wanted; negating first
        # inverted it, producing an opaque white plate with the logo punched
        # out of it. On screen that still looks like a clean silhouette, which
        # is why it survived review — and it would have been stitched as a
        # solid rectangle with a hole in it.
        "(", "+clone", "-fill", colour, "-colorize", "100", ")",
        "+swap", "-alpha", "off", "-compose", "CopyOpacity", "-composite",
        str(dst),
    ])
    if not dst.exists():
        raise RuntimeError(f"salvage failed: {r.stderr[-300:]}")
    return dst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--height", type=int, default=600,
                    help="output height in px; 600 = 2in at 300dpi")
    ap.add_argument("--colour", default="#FFFFFF",
                    help="thread colour, from Printful's palette")
    args = ap.parse_args()

    src = pathlib.Path(args.input)
    if not src.exists():
        print(f"No such file: {src}", file=sys.stderr)
        return 1

    out = salvage(src, args.height, args.colour)
    print(f"  {out}")
    print(f"  {survival(out):.0f}% survives a {MIN_PX:.0f}px erode "
          f"(the stitch minimum at {DPI}dpi)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
Draw the Solkast embroidery files, sized to Printful's cap placements.

Nothing in the existing logo set can be embroidered as-is. The v3 and v4 marks
are AI rasters built from dry-brush texture, internal line shading, speckle and
tapered points — at a 2 inch placement a satin column bottoms out around 1.2mm,
so all of that is below the machine's resolution. Firefly cannot fix it either:
regenerating without the sun returns another textured raster, and extracting
the lettering keeps the texture and loses the sun. The grunge IS the logo, and
it is exactly what thread cannot hold.

So these are drawn rather than derived: solid closed shapes, one colour, no
gradients, nothing thinner than the machine can stitch.

The wordmark is set to match the site's nav — letterspaced caps in a condensed
grotesque — not the tee artwork. That is the right reference: the nav wordmark
is the identity, the grungy versions are prints. A cap should carry the
identity.

Placements (Printful, 300dpi):

    embroidery_front_large   1650x600   5.50 x 2.00 in   caps
    embroidery_front         1500x525   5.00 x 1.75 in   beanies
    embroidery_left/right/back 600x300  2.00 x 1.00 in   caps

The 5.5x2 front is 2.75:1 landscape, so a square mark would fill a third of it.
The front gets a horizontal lockup that earns the width; the small placements
get the mark alone, which is the only thing that survives at 1 inch.

    python3 scripts/build-embroidery-lockups.py

Writes designv4/build/embroidery/*.png
"""
import math
import pathlib
import subprocess
import sys

OUT = pathlib.Path("/Users/lemon/development/shoppen/designv4/build/embroidery")

FONT = "/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf"

# Thread, not ink. Printful embroidery accepts only fifteen thread colours and
# rejects the order outright if the artwork asks for anything else — the brand
# gold #E8B93F is not among them:
#
#   #FFFFFF #000000 #96A1A8 #A67843 #FFCC00 #E25C27 #CC3366 #CC3333
#   #660000 #333366 #005397 #3399FF #6B5294 #01784E #7BA35A
#
# #FFCC00 is the nearest by distance and the wrong answer: it is a primary
# school-bus yellow that makes an organic cap look like a promo giveaway.
# #A67843 is a decent muted bronze and the alternative worth sampling.
#
# White wins on the argument that decided the lockup itself — the site's nav
# wordmark is white letterspaced caps, that is the identity, and a cap should
# carry the identity rather than an approximation of a print colour.
THREAD = "#FFFFFF"
GOLD = THREAD

# Minimum stitchable satin column, in mm, and the placement DPI.
MIN_STITCH_MM = 1.2
DPI = 300
MIN_PX = MIN_STITCH_MM / 25.4 * DPI  # ~14px at 300dpi


def sun_ops(cx, cy, r, colour=GOLD):
    """The brand mark, drawn as primitives.

    Not converted from the SVG: this machine's ImageMagick has no librsvg
    delegate and silently drops stroked paths, which renders the mark as a
    bare dot. Same reason the OG cards are drawn rather than converted.

    r is the radius of the solid centre; the geometry follows logo-mark.tsx,
    where the disc is 42 units and the rays run 64 to 88 in a 200 box.
    """
    k = r / 42.0
    ray_w = 20 * k
    if ray_w < MIN_PX:
        print(f"  ! rays are {ray_w:.0f}px, under the {MIN_PX:.0f}px minimum",
              file=sys.stderr)
    ops = [f"fill '{colour}'", "stroke none",
           "circle %.1f,%.1f %.1f,%.1f" % (cx, cy, cx, cy - r)]
    ops += ["fill none", f"stroke '{colour}'", "stroke-linecap round",
            "stroke-width %.1f" % ray_w]
    for i in range(8):
        a = math.radians(i * 45)
        ops.append("line %.1f,%.1f %.1f,%.1f" % (
            cx + 64 * k * math.sin(a), cy - 64 * k * math.cos(a),
            cx + 88 * k * math.sin(a), cy - 88 * k * math.cos(a)))
    return ops


def build(name, w, h, draw_ops, text=None, pointsize=0, kerning=0,
          text_x=0, colour=GOLD):
    cmd = ["magick", "-size", f"{w}x{h}", "xc:none"]
    if draw_ops:
        cmd += ["-draw", " ".join(draw_ops)]
    if text:
        cmd += ["-font", FONT, "-pointsize", str(pointsize),
                "-kerning", str(kerning), "-fill", colour,
                "-gravity", "west", "-annotate", f"+{text_x}+0", text]
    out = OUT / f"{name}.png"
    cmd += [str(out)]
    subprocess.run(cmd, check=True)
    return out


def report(path):
    r = subprocess.run(["magick", str(path), "-format",
                        "%w %h %[fx:mean*100]", "info:"],
                       capture_output=True, text=True).stdout.split()
    print(f"  {path.name:<34} {r[0]}x{r[1]}  ink {float(r[2]):.1f}%")


def main():
    if not pathlib.Path(FONT).exists():
        print(f"Missing font: {FONT}", file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)

    # ---- Cap front, 1650x600. Mark left, wordmark right. ----
    # The mark sits at 200px radius (400px disc) inside a 600px height, leaving
    # breathing room top and bottom; the wordmark is optically centred on it.
    build("solkast-cap-front-lockup", 1650, 600,
          sun_ops(300, 300, 132),
          text="SOLKAST", pointsize=300, kerning=26, text_x=560)

    # ---- Beanie front, 1500x525. Same lockup, shorter. ----
    build("solkast-beanie-front-lockup", 1500, 525,
          sun_ops(262, 262, 116),
          text="SOLKAST", pointsize=262, kerning=22, text_x=490)

    # ---- Small placements, 600x300. Mark alone. ----
    # A wordmark at 1 inch would set its stems below the stitch minimum; the
    # mark is the only thing that holds at this size.
    build("solkast-cap-small-mark", 600, 300, sun_ops(300, 150, 96))

    # ---- Small placement, wordmark only. Provided, but not recommended. ----
    #
    # A seven-letter condensed wordmark does not fit a 2x1 inch window and keep
    # stitchable stems. The trade is direct and there is no setting that wins
    # both: at 150pt it read fine on screen and only 10% survived a
    # minimum-width erode; at 205pt it held 33% and overran the canvas; at
    # 178pt it fits with 23%. The mark holds 76% at the same size.
    #
    # So the small placements should carry the mark. This file exists for a
    # back hit where the wordmark is wanted despite the softness, and it should
    # be sampled before it is sold.
    build("solkast-cap-small-wordmark", 600, 300, None,
          text="SOLKAST", pointsize=178, kerning=4, text_x=22)

    for p in sorted(OUT.glob("*.png")):
        report(p)
    print(f"\n  minimum stitchable feature at {DPI}dpi: {MIN_PX:.0f}px")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

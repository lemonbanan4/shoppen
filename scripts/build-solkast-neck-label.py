#!/usr/bin/env python3
"""
Build the printed inside label for the all-over-print pieces.

Cut-and-sew garments have no woven tag. The label is a print area on the same
sublimation pass as everything else, which means it costs nothing to add and
nothing at all if you leave it out — the neck simply ships blank. Blank is
defensible on a plain tee. On a 1499 track jacket it reads as unfinished, and
it is the one place a buyer looks to find out what they bought.

Small enough that the design is mostly restraint: 375x150 at 150dpi is two and
a half inches by one. The wordmark is the geometric one the site header uses,
not either of the illustrated sun logos — those are drawn to survive at chest
size and turn to mud at an inch, and a label that cannot be read is worse than
no label.

Dark ink, because the label prints on the white polyester substrate rather than
on the patterned face of the garment.

    python3 scripts/build-solkast-neck-label.py

Writes designv4/build/labels/solkast-label-inside.png
"""
import pathlib
import subprocess
import sys

ASSETS = pathlib.Path("/Users/lemon/development/shoppen/shoppen-merch-assets")
OUT = pathlib.Path("/Users/lemon/development/shoppen/designv4/build/labels")

WORDMARK = ASSETS / "solkast-embroidery" / "solkast-cap-small-wordmark.png"
FONT = "/System/Library/Fonts/Supplemental/Arial Narrow.ttf"

W, H = 375, 150          # Printful label_inside, 150dpi
INK = "#141414"

# Deliberately not the size. One file serves every variant, so a printed size
# would be wrong on all but one of them.
CARE = "PRINTED TO ORDER  ·  RECYCLED POLYESTER"
DOMAIN = "SOLKAST.COM"


def sh(a):
    return subprocess.run(a, capture_output=True, text=True)


def fx(path, expr):
    return sh(["magick", str(path), "-format", expr, "info:"]).stdout.strip()


def main():
    if not WORDMARK.exists():
        print(f"No wordmark at {WORDMARK}", file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / "solkast-label-inside.png"

    # The wordmark is greyscale+alpha with the letterforms in the alpha
    # channel, so recolour through the alpha rather than tinting the pixels —
    # tinting a greyscale plate leaves the transparent surround coloured too.
    #
    # Trimmed first, and fitted to a box bounded on BOTH axes. Scaling to a
    # fraction of the width alone put a 116px-tall mark on a 150px canvas and
    # pushed the rule and both lines of type clean off the bottom edge; the
    # file still wrote, and still looked plausible, because what fell off the
    # canvas leaves no trace on what is left.
    box_w, box_h = int(W * 0.62), 46
    r = sh([
        "magick",
        "(", str(WORDMARK), "-trim", "+repage",
        "-resize", f"{box_w}x{box_h}", "-alpha", "extract", ")",
        "(", "+clone", "-fill", INK, "-colorize", "100%", ")",
        "+swap", "-alpha", "off", "-compose", "CopyOpacity", "-composite",
        str(OUT / "_mark.png"),
    ])
    if not (OUT / "_mark.png").exists():
        print(f"recolour failed: {r.stderr[-300:]}", file=sys.stderr)
        return 1

    mh = int(fx(OUT / "_mark.png", "%h"))
    mark_y = 20
    rule_y = mark_y + mh + 13
    if rule_y + 46 > H:
        print(f"  Layout does not fit: rule at {rule_y} on a {H}px canvas.",
              file=sys.stderr)
        return 1

    r = sh([
        "magick", "-size", f"{W}x{H}", "xc:none",
        # Wordmark, centred, upper third.
        "(", str(OUT / "_mark.png"), ")",
        "-gravity", "north", "-geometry", f"+0+{mark_y}", "-composite",
        "-gravity", "northwest",
        # Hairline rule, inset from both edges.
        "-fill", INK, "-stroke", "none",
        "-draw", f"rectangle {int(W*0.22)},{rule_y} {int(W*0.78)},{rule_y+1}",
        # Two lines of small type. Arial Narrow because there is no fontconfig
        # here, so the font has to be named by file path.
        "-font", FONT, "-pointsize", "15", "-fill", INK,
        "-gravity", "north",
        "-annotate", f"+0+{rule_y + 12}", CARE,
        "-annotate", f"+0+{rule_y + 32}", DOMAIN,
        str(dst),
    ])
    if not dst.exists():
        print(f"compose failed: {r.stderr[-400:]}", file=sys.stderr)
        return 1
    (OUT / "_mark.png").unlink(missing_ok=True)

    # Verify what was written rather than what was asked for.
    got = fx(dst, "%wx%h")
    if got != f"{W}x{H}":
        print(f"  wrong size: {got}, expected {W}x{H}", file=sys.stderr)
        return 1

    # A label that is blank, or nearly, is the failure mode worth catching:
    # a bad mask or a missing font yields a valid PNG with nothing on it.
    ink = float(fx(dst, "%[fx:mean.a]"))
    print(f"  {dst.name}  {got}  ink coverage {ink*100:.1f}%")
    if ink < 0.02:
        print("  Refusing: the label is effectively empty.", file=sys.stderr)
        return 1

    # Proof at real size against white, which is what it prints on.
    sh(["magick", str(dst), "-background", "white", "-alpha", "remove",
        "-bordercolor", "#ccc", "-border", "1", str(OUT / "_proof_label.png")])
    print(f"  proof: {OUT / '_proof_label.png'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

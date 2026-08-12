#!/usr/bin/env python3
"""
Reduce existing artwork to one-colour silhouettes for the Heather Grey capsule.

Heather Grey is #b0b0b0 — a true mid-tone. Black ink reads 9.7:1 on it and
white only 2.2:1, so the capsule is dark ink and the artwork has to carry its
own contrast. That rules out everything currently in the shop: each design had
its background keyed against the colour it was generated on, so the garment
shows through wherever black or white used to be. On a mid-tone that reads as
the washed-out mess French Navy was just retired for.

A silhouette has no such dependency. Binarised to one colour with real alpha,
the same design works on black, white and grey alike — which is the whole
argument for building the capsule this way rather than generating new art.

Two variants are produced for every source so the choice is made by eye:

  raw      binarise only. Keeps every speck and hairline the artwork had.
  clean    binarise, then drop islands under MIN_PX and close hairline gaps.

MIN_PX is deliberately tiny here — 3px at 150dpi is about half a millimetre,
near what DTG can actually hold. The embroidery version of this uses 14px,
because thread cannot do what ink can, and reusing that figure would throw
away detail this process is meant to keep.

    python3 scripts/build-heather-capsule.py

Writes designv4/build/heather/<slug>-{raw,clean}.png at 1800x2400, plus a
proof sheet on the real garment colour.
"""
import pathlib
import subprocess
import sys

ROOT = pathlib.Path("/Users/lemon/development/shoppen")
OUT = ROOT / "designv4/build/heather"
ASSETS = ROOT / "shoppen-merch-assets"
V4 = ROOT / "designv4/build/print"

PW, PH = 1800, 2400
GARMENT = "#b0b0b0"          # Stanley/Stella Heather Grey, from Printful
INK = "#111111"              # not pure black: DTG on a mid-tone reads softer
MIN_PX = 3                   # ~0.5mm at 150dpi

# (slug, source, artwork polarity).
#
# Polarity is the thing that decides whether this works at all, and getting it
# wrong fails in two different visible ways. "dark" means dark marks on a light
# field — flatten onto white, threshold, invert. "light" means bright marks on
# a dark field, which is every design keyed against black: flatten onto BLACK
# and do not invert, or the artwork lands below the threshold and vanishes.
#
# A first pass ran everything as "dark". The gold-on-black wordmark came out at
# 0.2% ink — a blank shirt — and it was not a bad threshold, it was the wrong
# question asked of the image.
#
# Chosen for shape, not colour. A silhouette keeps only form, so anything
# carrying its structure in hue has nothing left afterwards: the orange-on-
# black Liberty design reduced to an illegible mass and is not here.
SOURCES = [
    ("tuned-sun",  V4 / "solkast-v4-tuned-sun.png",           "dark"),
    ("sun-face",   V4 / "solkast-v4-sun-face-logo.png",       "dark"),
    ("statue",     V4 / "solkast-v4-statue-dawn.png",         "dark"),
    ("wordmark",   ASSETS / "solkast-v3/solkast-v3-logo-01.png", "light"),
    ("structure",  V4 / "solkast-v4-structure.png",           "light"),
    ("molecule",   V4 / "solkast-v4-sun-molecule.png",        "light"),
]


def sh(a):
    return subprocess.run(a, capture_output=True, text=True)


def build(slug: str, src: pathlib.Path, polarity: str,
          clean: bool) -> pathlib.Path:
    dst = OUT / f"{slug}-{'clean' if clean else 'raw'}.png"
    # Flatten onto the field the artwork was drawn against, so transparency and
    # that field binarise identically, then keep whichever side is the marks.
    field = "white" if polarity == "dark" else "black"
    cmd = ["magick", str(src), "-trim", "+repage",
           # Fit first so the thresholds below are in real output pixels.
           "-resize", f"{int(PW*0.82)}x{int(PH*0.82)}",
           "-background", "none", "-alpha", "set",
           "-background", field, "-alpha", "remove", "-alpha", "off",
           "-colorspace", "Gray", "-threshold", "62%"]
    if polarity == "dark":
        cmd += ["-negate"]
    if clean:
        cmd += ["-define", f"connected-components:area-threshold={MIN_PX*MIN_PX}",
                "-define", "connected-components:mean-color=true",
                "-connected-components", "8",
                "-morphology", "Close", "Disk:1"]
    # Grey mask -> solid ink on transparency.
    cmd += ["(", "+clone", "-fill", INK, "-colorize", "100", ")",
            "+swap", "-alpha", "off", "-compose", "CopyOpacity", "-composite",
            "-background", "none", "-gravity", "center",
            "-extent", f"{PW}x{PH}", str(dst)]
    r = sh(cmd)
    if not dst.exists():
        raise RuntimeError(f"{slug}: {r.stderr[-300:]}")
    return dst


def ink_share(p: pathlib.Path) -> float:
    out = sh(["magick", str(p), "-alpha", "extract",
              "-format", "%[fx:mean]", "info:"]).stdout.strip()
    try:
        return float(out) * 100
    except ValueError:
        return -1.0


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tiles = []
    font = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

    for slug, src, polarity in SOURCES:
        if not src.exists():
            print(f"  missing source: {src}", file=sys.stderr)
            continue
        for clean in (False, True):
            p = build(slug, src, polarity, clean)
            print(f"  {p.name:<24} ink {ink_share(p):5.1f}% of canvas")
            t = OUT / f"_t_{p.stem}.png"
            sh(["magick", "-size", f"{PW}x{PH}", f"xc:{GARMENT}", str(p),
                "-composite", "-resize", "300x400",
                "-set", "label", p.stem, str(t)])
            tiles += ["(", str(t), ")"]

    sh(["magick", "montage", *tiles, "-font", font, "-label", "%l",
        "-pointsize", "20", "-fill", "white", "-tile", "4x3",
        "-geometry", "+10+10", "-background", "#3a3a3a",
        str(OUT / "_proof.jpg")])
    print(f"\n  proof on {GARMENT}: {OUT / '_proof.jpg'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

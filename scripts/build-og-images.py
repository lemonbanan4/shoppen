#!/usr/bin/env python3
"""
Render the per-brand Open Graph / Twitter card images.

Both storefronts were shipping the untouched Medusa starter card — a stock
desk lamp captioned "Next.js Starter Template". That is what every share of
angerkop.se or solkast.com rendered as: in WhatsApp, iMessage, Slack, Discord,
Facebook, and in a TikTok or Instagram bio link. It is the single most-seen
brand asset either shop has, and it advertised someone else's boilerplate.

Drawn with ImageMagick's native primitives rather than by converting the mark
SVGs, because this machine's ImageMagick has no librsvg delegate: its internal
renderer silently drops every stroked path and keeps only filled shapes, so
the Solkast sun came out as a bare dot and the Ångerköp Å came out empty. A
converter that fails by producing a plausible-looking wrong image is worse
than one that errors, so the geometry is duplicated here instead — kept in
step with logo-mark.tsx by hand, which is cheap for four paths.

Fonts are addressed by file path for the same reason: there is no fontconfig,
so -font Helvetica-Bold silently falls back to a default rather than failing.

    python3 scripts/build-og-images.py

Writes apps/storefront/public/brand/og-{brand}.jpg at 1200x630.
"""
import math
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "apps/storefront/public/brand"

FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"

INK = "#0a0a0a"
GOLD = "#E8B93F"
W, H = 1200, 630

BRANDS = {
    "solkast": {
        "wordmark": "SOLKAST",
        "tagline": "Considered goods.",
        "domain": "solkast.com",
        "mark": "sun",
    },
    "angerkop": {
        "wordmark": "ÅNGERKÖP",
        "tagline": "Köp nu. Ångra sen.",
        "domain": "angerkop.se",
        "mark": "aa",
    },
}

# Both marks are authored in the 200x200 viewBox that logo-mark.tsx uses, then
# mapped onto the card. Keeping the source coordinates identical is what makes
# the duplication survivable.
K = 0.62
CX, CY = W / 2, 168


def vb(px, py, ox=100, oy=100):
    """viewBox point -> card point."""
    return CX + (px - ox) * K, CY + (py - oy) * K


def sun_ops():
    ops = [f"fill '{GOLD}'", "stroke none",
           "circle %.1f,%.1f %.1f,%.1f" % (CX, CY, CX, CY - 42 * K)]
    ops += [f"fill none", f"stroke '{GOLD}'", "stroke-linecap round",
            "stroke-width %.1f" % (20 * K)]
    for i in range(8):
        a = math.radians(i * 45)
        x1, y1 = CX + 64 * K * math.sin(a), CY - 64 * K * math.cos(a)
        x2, y2 = CX + 88 * K * math.sin(a), CY - 88 * K * math.cos(a)
        ops.append("line %.1f,%.1f %.1f,%.1f" % (x1, y1, x2, y2))
    return ops


def aa_ops():
    # The Å is authored around y=102, not y=100.
    def p(px, py):
        return vb(px, py, 100, 102)

    ring_c = p(100, 32)
    ring_e = p(100, 32 - 16)
    ops = [
        "fill none", f"stroke '{GOLD}'", "stroke-width %.1f" % (14 * K),
        "stroke-linecap butt",
        "circle %.1f,%.1f %.1f,%.1f" % (*ring_c, *ring_e),
        "stroke-linecap round", "stroke-width %.1f" % (26 * K),
        "line %.1f,%.1f %.1f,%.1f" % (*p(100, 70), *p(44, 176)),
        "line %.1f,%.1f %.1f,%.1f" % (*p(100, 70), *p(156, 176)),
        "stroke-width %.1f" % (24 * K),
        "line %.1f,%.1f %.1f,%.1f" % (*p(66, 140), *p(134, 140)),
    ]
    return ops


def build(slug, spec):
    ops = sun_ops() if spec["mark"] == "sun" else aa_ops()
    out = OUT / f"og-{slug}.jpg"
    cmd = [
        "magick", "-size", f"{W}x{H}", f"xc:{INK}",
        "-draw", " ".join(ops),
        # Wordmark
        "-font", FONT, "-pointsize", "104", "-kerning", "16",
        "-fill", "white", "-gravity", "north", "-annotate", "+8+268",
        spec["wordmark"],
        # Hairline rule, the width of a short word — a full-width rule turns
        # the card into a document header.
        "-fill", GOLD, "-stroke", "none",
        "-draw", "rectangle %d,%d %d,%d" % (W / 2 - 46, 418, W / 2 + 46, 421),
        # Tagline
        "-font", FONT_REG, "-pointsize", "38", "-kerning", "1",
        "-fill", "#d4d4d4", "-gravity", "north", "-annotate", "+0+452",
        spec["tagline"],
        # Domain
        "-font", FONT_REG, "-pointsize", "26", "-kerning", "5",
        "-fill", "#737373", "-gravity", "north", "-annotate", "+0+536",
        spec["domain"].upper(),
        "-quality", "92", str(out),
    ]
    subprocess.run(cmd, check=True)
    print(f"  {out.relative_to(ROOT)}  {out.stat().st_size // 1024} KB")


def main():
    if not pathlib.Path(FONT).exists():
        print(f"Missing font: {FONT}", file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    for slug, spec in BRANDS.items():
        build(slug, spec)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

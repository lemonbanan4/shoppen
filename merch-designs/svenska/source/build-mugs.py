#!/usr/bin/env python3
"""
Mug artwork for the svenska capsule.

The mug wrap is 2700x1050 at 300dpi — ratio 2.57, against the tees' 1.56.
Reusing a tee file here would letterbox it: Printful fits artwork inside the
printfile, so a 1.56 design lands ~1640px wide on a 2700px canvas and prints
small with dead space either side. These are laid out for the wrap instead.

Composition targets the mug's front face rather than a full 360° wrap. The
design sits centred, roughly 60% of the wrap width, so it reads square-on to
someone holding it — a full wrap would put the punchline round the side.

Mugs are white ceramic and printed by sublimation, so there is only one ink
version: dark type. No white-ink variant is needed or possible.

    python build-mugs.py
"""
import os

import cairosvg
from PIL import Image

INK = "#0A0A0A"
ACCENT = "#9A4B2E"
FOOTER = "ÅNGERKÖP &#8226; EST. INGEN ANING"
W, H = 2700, 1050

HERE = os.path.dirname(os.path.abspath(__file__))
FINAL = os.path.join(HERE, "..", "final")
BLACK_FACE = 'font-family="Arial Black, Arial-Black, sans-serif" font-weight="900"'
PLAIN_FACE = 'font-family="Helvetica, Arial, sans-serif" font-weight="500"'


def footer_tag(y):
    return (
        f'<text x="{W//2}" y="{y}" text-anchor="middle" '
        f'font-family="Helvetica, Arial, sans-serif" font-weight="700" '
        f'font-size="34" letter-spacing="12" fill="{ACCENT}">{FOOTER}</text>'
    )


def orkar_inte():
    """One line here rather than the tee's two — the wrap is wide and short,
    so stacking would shrink the type to fit the height."""
    return f"""<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">
<text x="{W//2}" y="560" text-anchor="middle" {BLACK_FACE}
      font-size="300" letter-spacing="10" fill="{INK}">ORKAR INTE</text>
<path d="M 800 660 L 1500 660 Q 1660 660 1720 700 L 1900 700"
      stroke="{INK}" stroke-width="22" fill="none" stroke-linecap="round"/>
{footer_tag(830)}
</svg>"""


def utbrand_men_mysig():
    return f"""<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">
<text x="{W//2}" y="450" text-anchor="middle" {BLACK_FACE}
      font-size="260" letter-spacing="6" fill="{INK}">UTBRÄND</text>
<text x="{W//2}" y="640" text-anchor="middle" {PLAIN_FACE}
      font-size="150" letter-spacing="20" fill="{INK}">men mysig</text>
<line x1="{W//2-300}" y1="720" x2="{W//2+300}" y2="720" stroke="{ACCENT}"
      stroke-width="10" stroke-linecap="round"/>
{footer_tag(850)}
</svg>"""


SVG_DESIGNS = [
    ("mug-orkar-inte", orkar_inte),
    ("mug-utbrand-men-mysig", utbrand_men_mysig),
]


def compose_varning():
    """The warning label is an existing 3600x2443 raster with hazard striping
    that would be tedious and error-prone to re-lay out in SVG. Scale it to
    the wrap height and centre it instead — it reads as a badge on the face."""
    src = Image.open(os.path.join(FINAL, "varning-impulskop-PRINT.png")).convert("RGBA")
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    margin = 70
    scale = (H - margin * 2) / src.height
    label = src.resize((int(src.width * scale), int(src.height * scale)), Image.LANCZOS)
    canvas.alpha_composite(label, ((W - label.width) // 2, (H - label.height) // 2))
    out = os.path.join(FINAL, "mug-varning-impulskop-PRINT.png")
    canvas.save(out)
    print(f"wrote {os.path.basename(out)}  ({label.width}x{label.height} on {W}x{H})")


if __name__ == "__main__":
    os.makedirs(FINAL, exist_ok=True)
    for slug, fn in SVG_DESIGNS:
        svg = fn()
        with open(os.path.join(HERE, f"{slug}.svg"), "w", encoding="utf-8") as f:
            f.write(svg)
        dst = os.path.join(FINAL, f"{slug}-PRINT.png")
        cairosvg.svg2png(bytestring=svg.encode("utf-8"), write_to=dst,
                         output_width=W, output_height=H)
        print(f"wrote {os.path.basename(dst)}")
    compose_varning()

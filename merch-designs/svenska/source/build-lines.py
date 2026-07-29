#!/usr/bin/env python3
"""
Generate the svenska capsule's type-led designs in both ink colours.

Every design in this capsule is type only — no illustration, no fine detail.
That is a print decision as much as an aesthetic one: solid heavy letterforms
survive DTG on cotton at any size, where thin outlines and small captions turn
to mush (measured on the Defragmenting capsule, where 3-4mm caption text was
unreadable on the garment).

Two ink versions per design, because the same file cannot serve both:
  dark  (#0A0A0A on #9A4B2E accent) for White and Heather Grey
  light (#F5F4F0 on #C88A6A accent) for Black and French Navy
The accent shifts warmer on the light version — a rust that reads on white
goes muddy on black.

    python build-lines.py            # writes ../final/*.png at 3600px wide
"""
import os

import cairosvg

DARK = {"ink": "#0A0A0A", "accent": "#9A4B2E"}
LIGHT = {"ink": "#F5F4F0", "accent": "#C88A6A"}
FOOTER = "ÅNGERKÖP &#8226; EST. INGEN ANING"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "final")

BLACK_FACE = 'font-family="Arial Black, Arial-Black, sans-serif" font-weight="900"'
PLAIN_FACE = 'font-family="Helvetica, Arial, sans-serif" font-weight="500"'


def footer(c, y=800):
    return (
        f'<text x="700" y="{y}" text-anchor="middle" '
        f'font-family="Helvetica, Arial, sans-serif" font-weight="700" '
        f'font-size="30" letter-spacing="10" fill="{c["accent"]}">{FOOTER}</text>'
    )


def lagom_delulu(c):
    """Swedish moderation applied to being delusional. The gauge pegged dead
    centre is the joke: exactly the right amount of unhinged."""
    return f"""<svg viewBox="0 0 1400 900" xmlns="http://www.w3.org/2000/svg">
<text x="700" y="330" text-anchor="middle" {BLACK_FACE}
      font-size="240" letter-spacing="6" fill="{c['ink']}">LAGOM</text>
<text x="700" y="590" text-anchor="middle" {BLACK_FACE}
      font-size="240" letter-spacing="6" fill="{c['ink']}">DELULU</text>
<!-- gauge: end stops, a track, and the marker sitting exactly in the middle -->
<line x1="430" y1="672" x2="970" y2="672" stroke="{c['ink']}"
      stroke-width="8" stroke-linecap="round"/>
<line x1="430" y1="652" x2="430" y2="692" stroke="{c['ink']}" stroke-width="8"
      stroke-linecap="round"/>
<line x1="970" y1="652" x2="970" y2="692" stroke="{c['ink']}" stroke-width="8"
      stroke-linecap="round"/>
<circle cx="700" cy="672" r="22" fill="{c['ink']}"/>
{footer(c)}
</svg>"""


def det_loser_sig(c):
    """A confident Swedish reassurance, undercut by the parenthetical. The
    hedge is set small and in the accent so the eye reaches it second."""
    return f"""<svg viewBox="0 0 1400 900" xmlns="http://www.w3.org/2000/svg">
<text x="700" y="420" text-anchor="middle" {BLACK_FACE}
      font-size="150" letter-spacing="2" fill="{c['ink']}">DET LÖSER SIG</text>
<text x="700" y="560" text-anchor="middle" {BLACK_FACE}
      font-size="86" letter-spacing="8" fill="{c['accent']}">(FÖRMODLIGEN)</text>
{footer(c, 760)}
</svg>"""


def utbrand_men_mysig(c):
    """Burnt out but cosy. The contradiction is carried by the type itself:
    the first word heavy and shouted, the second light and calm."""
    return f"""<svg viewBox="0 0 1400 900" xmlns="http://www.w3.org/2000/svg">
<text x="700" y="360" text-anchor="middle" {BLACK_FACE}
      font-size="230" letter-spacing="4" fill="{c['ink']}">UTBRÄND</text>
<text x="700" y="530" text-anchor="middle" {PLAIN_FACE}
      font-size="128" letter-spacing="16" fill="{c['ink']}">men mysig</text>
<!-- A smoke wisp was tried here and cut: at print size it read as a stray
     mark rather than smoke, and the joke is carried by the type contrast
     alone. The capsule stays type-only. -->
<line x1="470" y1="620" x2="930" y2="620" stroke="{c['accent']}"
      stroke-width="8" stroke-linecap="round"/>
{footer(c)}
</svg>"""


DESIGNS = [
    ("lagom-delulu", lagom_delulu),
    ("det-loser-sig", det_loser_sig),
    ("utbrand-men-mysig", utbrand_men_mysig),
]

if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(OUT, exist_ok=True)
    for slug, fn in DESIGNS:
        for suffix, colours in (("", DARK), ("-white", LIGHT)):
            svg = fn(colours)
            src = os.path.join(here, f"{slug}{suffix}.svg")
            with open(src, "w", encoding="utf-8") as f:
                f.write(svg)
            dst = os.path.join(OUT, f"{slug}{suffix}-PRINT.png")
            cairosvg.svg2png(bytestring=svg.encode("utf-8"), write_to=dst,
                             output_width=3600, output_height=2314)
            print(f"wrote {os.path.basename(dst)}")

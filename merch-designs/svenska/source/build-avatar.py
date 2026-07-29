#!/usr/bin/env python3
"""
Profile-picture marks for @angerkop.

A TikTok avatar renders as a ~40px circle in feed. That rules out the
wordmark (unreadable), the old Solkast sunburst (too many points to survive
downsampling, and semantically orphaned — it literalised "sol"), and anything
with fine detail. What survives is one high-contrast shape.

Three candidates, all built on the brand's existing vocabulary rather than
new invention: the hazard amber and black of the VARNING label, and Å as the
one character that reads instantly Swedish.

    python build-avatar.py      # writes ../final/avatar-*.png at 1080px
"""
import os

import cairosvg

AMBER = "#E8B93F"
INK = "#0A0A0A"
PAPER = "#F5F4F0"
RUST = "#9A4B2E"
S = 1080
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "final")
FACE = 'font-family="Arial Black, Arial-Black, sans-serif" font-weight="900"'


def hazard_a():
    """Amber field, hazard stripes top and bottom, a black Å. Reads as a
    warning sign at any size and ties straight to the VARNING tee."""
    stripes = "".join(
        f'<polygon points="{x},0 {x+52},0 {x+104},104 {x+52},104" fill="{INK}"/>'
        for x in range(-160, S + 160, 104)
    )
    return f"""<svg viewBox="0 0 {S} {S}" xmlns="http://www.w3.org/2000/svg">
<rect width="{S}" height="{S}" fill="{AMBER}"/>
<g>{stripes}</g>
<g transform="translate(0,{S-104})">{stripes}</g>
<text x="{S//2}" y="{S//2+230}" text-anchor="middle" {FACE}
      font-size="620" fill="{INK}">Å</text>
</svg>"""


def ink_a():
    """The inverse: near-black field, amber Å. Quieter, and sits better beside
    a dark feed than a full amber tile."""
    return f"""<svg viewBox="0 0 {S} {S}" xmlns="http://www.w3.org/2000/svg">
<rect width="{S}" height="{S}" fill="{INK}"/>
<text x="{S//2}" y="{S//2+230}" text-anchor="middle" {FACE}
      font-size="640" fill="{AMBER}">Å</text>
</svg>"""


def sagging_a():
    """Å over the sagging underline from ORKAR INTE — the one piece of drawn
    language the capsule already owns. Carries the joke without needing to be
    read as words."""
    return f"""<svg viewBox="0 0 {S} {S}" xmlns="http://www.w3.org/2000/svg">
<rect width="{S}" height="{S}" fill="{PAPER}"/>
<text x="{S//2}" y="{S//2+150}" text-anchor="middle" {FACE}
      font-size="560" fill="{INK}">Å</text>
<path d="M 300 760 L 620 760 Q 700 760 740 792 L 820 792"
      stroke="{RUST}" stroke-width="34" fill="none" stroke-linecap="round"/>
</svg>"""


CANDIDATES = [
    ("avatar-hazard-a", hazard_a),
    ("avatar-ink-a", ink_a),
    ("avatar-sagging-a", sagging_a),
]

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for slug, fn in CANDIDATES:
        svg = fn()
        dst = os.path.join(OUT, f"{slug}.png")
        cairosvg.svg2png(bytestring=svg.encode("utf-8"), write_to=dst,
                         output_width=S, output_height=S)
        print(f"wrote {os.path.basename(dst)}")

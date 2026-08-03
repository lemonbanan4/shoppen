#!/usr/bin/env python3
"""
Build "statement hook" reels — a second format to test against the quiz.

The quiz reel proved the capsule retains (40% watched-full, up from 12.79%),
but it opens with a question, which asks the viewer to do work before they get
anything. This format inverts that: a full-screen Swedish line that names a
feeling, with no product on screen at all, so the viewer recognises themselves
first and only then finds out it is a shirt.

Each hook is three frames — statement, product, end card — so one build gives
several days of posts. Vary one thing at a time: same cut, different hook.

    python build-hook-reels.py

Writes ../merch-designs/svenska/reel-hooks/<slug>/01..03.jpg
"""
import os

from PIL import Image, ImageDraw

from reel_common import (
    BRAND,
    H,
    INK,
    MOCKUPS,
    PAPER,
    PRINTS,
    W,
    draw_centred_block,
    font,
    garment_card,
    trim_alpha,
    wrap,
)

HANDLE = "@angerkop"

# Written to be recognised, not admired: each names a specific moment rather
# than a mood. "När du" openers put the viewer in it immediately.
HOOKS = [
    {
        "slug": "orkar-inte",
        "line": "när du vaknar och redan är slut",
        "print": "orkar-inte-white-PRINT.png",
        "pid": "452915678",
    },
    {
        "slug": "varning-impulskop",
        "line": "när du la 3 saker i kundvagnen kl 02:47",
        "print": "varning-impulskop-PRINT.png",
        "pid": "452915689",
    },
    {
        "slug": "det-loser-sig",
        "line": "när du säger ”det löser sig” utan en plan",
        "print": "det-loser-sig-white-PRINT.png",
        "pid": "452915713",
    },
    {
        "slug": "utbrand-men-mysig",
        "line": "när du är helt slut men har mjukisbyxor på dig",
        "print": "utbrand-men-mysig-white-PRINT.png",
        "pid": "452915734",
    },
]

# Same bands as the quiz reel, so the product lands in the identical spot if a
# hook frame is ever cut in front of quiz frames.
ART_BAND = (300, 880)
CARD_TOP = 940
CARD_W_FRAC = 0.60


def statement_frame(line):
    """Type only, no product. Showing the garment here would give away that it
    is an ad before the viewer has recognised themselves in the line."""
    canvas = Image.new("RGB", (W, H), INK)
    draw = ImageDraw.Draw(canvas)

    # Step down only as far as needed. Held for four beats with nothing else
    # on screen, the type has to carry the whole frame — an earlier pass
    # started at 108 and left most of the frame empty, which reads as thin
    # rather than deliberate.
    max_w = int(W * 0.88)
    for size in (150, 136, 122, 110, 98, 88):
        f = font(size)
        lines = wrap(draw, line, f, max_w)
        if len(lines) <= 4:
            break

    gap = int(size * 0.16)
    heights = [
        draw.textbbox((0, 0), ln, font=f)[3] - draw.textbbox((0, 0), ln, font=f)[1]
        for ln in lines
    ]
    block_h = sum(heights) + gap * (len(lines) - 1)
    top = (H - block_h) // 2
    bottom = draw_centred_block(draw, lines, f, top, PAPER, line_gap=gap)

    # One rust rule: enough to carry brand recall across a run of these
    # without giving away that it is an ad before the payoff lands.
    rule_w = int(W * 0.16)
    draw.line(
        [(W - rule_w) // 2, bottom + 46, (W + rule_w) // 2, bottom + 46],
        fill=BRAND,
        width=9,
    )
    return canvas


def product_frame(print_file, pid):
    canvas = Image.new("RGB", (W, H), INK)

    art = trim_alpha(Image.open(os.path.join(PRINTS, print_file)).convert("RGBA"))
    band_h = ART_BAND[1] - ART_BAND[0]
    scale = min(W * 0.82 / art.width, band_h / art.height)
    art = art.resize(
        (max(1, int(art.width * scale)), max(1, int(art.height * scale))), Image.LANCZOS
    )
    canvas.paste(
        art, ((W - art.width) // 2, ART_BAND[0] + (band_h - art.height) // 2), art
    )

    card = garment_card(pid, int(W * CARD_W_FRAC))
    canvas.paste(card, ((W - card.width) // 2, CARD_TOP), card)
    return canvas


def end_frame(pid):
    """One product, big, plus the handle — the loop cuts back from here."""
    canvas = Image.new("RGB", (W, H), INK)
    draw = ImageDraw.Draw(canvas)

    card = garment_card(pid, int(W * 0.78))
    canvas.paste(card, ((W - card.width) // 2, 420), card)

    f = font(64)
    box = draw.textbbox((0, 0), HANDLE, font=f)
    draw.text(((W - (box[2] - box[0])) / 2 - box[0], 1430), HANDLE, font=f, fill=BRAND)
    return canvas


def main():
    out_root = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..",
        "merch-designs",
        "svenska",
        "reel-hooks",
    )
    for hook in HOOKS:
        out = os.path.abspath(os.path.join(out_root, hook["slug"]))
        os.makedirs(out, exist_ok=True)
        statement_frame(hook["line"]).save(os.path.join(out, "01-hook.jpg"), quality=94)
        product_frame(hook["print"], hook["pid"]).save(
            os.path.join(out, "02-product.jpg"), quality=94
        )
        end_frame(hook["pid"]).save(os.path.join(out, "03-end.jpg"), quality=94)
        print(f"wrote {hook['slug']}/  — ”{hook['line']}”")

    print(
        "\nCut, per hook: 01 for 4 beats (they have to read it), 02 for 2, 03 for 2.\n"
        "8 beats = 2 bars, so the loop restarts on a bar line. Pick the sound\n"
        "first and snap to CapCut's beat markers rather than typing durations."
    )


if __name__ == "__main__":
    main()

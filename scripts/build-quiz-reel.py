#!/usr/bin/env python3
"""
Build the "Vilken är du?" frame set — a 6-option quiz reel for the svenska capsule.

Why this format. A 3s average watch time on a 15s video is a hook failure, not
a product failure: TikTok pushes on completion rate, so a short loopable cut
scores far better on identical viewer behaviour. A quiz also manufactures
comments ("jag är LAGOM DELULU"), and comments carry more reach than likes.

Why these frames. The option has to be readable inside ~0.7s, at thumbnail
size. Cropping a studio mockup tight enough for that throws away the garment
silhouette, and the frame stops reading as clothing. So each frame carries two
elements: the print artwork at size (that is the option label, and it is
already the capsule's typography), and the garment below it (that is the
product). No caption is added on top — it would say the same words a third
time.

    python build-quiz-reel.py [-o outdir]

Writes 01..06 (options), 07 (end card). Timing notes printed on completion.
"""
import argparse
import os

from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
INK = (10, 10, 10)
PAPER = (245, 244, 240)
BRAND = (154, 75, 46)

HERE = os.path.dirname(os.path.abspath(__file__))
PRINTS = os.path.join(HERE, "..", "merch-designs", "svenska", "final")
# Not /private/tmp: the macOS tmp cleaner reaps files older than a few days
# and gutted a previous clone of this repo.
MOCKUPS = "/Users/lemon/development/shoppen/shoppen-merch-assets/mockups"

# Order matters: the first frame carries the question, so it should be the
# line that lands fastest. ORKAR INTE is the shortest and the one already
# getting exposure.
OPTIONS = [
    ("orkar-inte-white-PRINT.png", "452915678", "ORKAR INTE"),
    ("varning-impulskop-PRINT.png", "452915689", "VARNING: IMPULSKÖP"),
    ("lagom-delulu-white-PRINT.png", "452915702", "LAGOM DELULU"),
    ("cant-even-white-PRINT.png", "452915695", "CAN'T EVEN"),
    ("det-loser-sig-white-PRINT.png", "452915713", "DET LÖSER SIG"),
    ("utbrand-men-mysig-white-PRINT.png", "452915734", "UTBRÄND MEN MYSIG"),
]

QUESTION = "VILKEN ÄR DU?"
HANDLE = "@angerkop"


def font(size, black=True):
    """Prefer a heavy grotesk; fall back through what macOS ships."""
    candidates = (
        ["/System/Library/Fonts/Supplemental/Arial Black.ttf",
         "/System/Library/Fonts/Supplemental/Arial Bold.ttf"]
        if black
        else ["/System/Library/Fonts/Supplemental/Arial Bold.ttf"]
    ) + [
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def trim_alpha(im):
    """Crop transparent padding so the artwork can be scaled to a known width.

    The print files are laid out for a garment printfile, which is much wider
    than the ink inside it — scaling the file naively leaves the type small.
    """
    if im.mode != "RGBA":
        return im
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def garment_card(pid, target_w):
    """The mockup as a rounded white card — it sits on a dark frame, so it
    needs to read as a deliberate panel rather than a stray white rectangle."""
    src = Image.open(os.path.join(MOCKUPS, f"pf-{pid}-0.jpg")).convert("RGB")
    # Crop to the torso: the full 1000px square wastes a third of its height on
    # empty background below the hem.
    src = src.crop((90, 20, 910, 800))
    scale = target_w / src.width
    card = src.resize((target_w, int(src.height * scale)), Image.LANCZOS)

    mask = Image.new("L", card.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, card.size[0] - 1, card.size[1] - 1], radius=28, fill=255
    )
    out = Image.new("RGBA", card.size, (0, 0, 0, 0))
    out.paste(card, (0, 0), mask)
    return out


def badge(draw, n):
    """Numbered so viewers can answer in one character in the comments."""
    r, cx, cy = 46, 86, 96
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BRAND)
    f = font(48)
    t = str(n)
    box = draw.textbbox((0, 0), t, font=f)
    draw.text(
        (cx - (box[2] - box[0]) / 2 - box[0], cy - (box[3] - box[1]) / 2 - box[1]),
        t,
        font=f,
        fill=PAPER,
    )


# Fixed bands, not flowed layout. The lines differ in length and depth, so
# stacking them sequentially moved the garment between 630 and 930px down the
# frame depending on the design — and across a 0.7s hard cut that reads as the
# product jumping, forcing the eye to re-find it every time. Pinning the bands
# keeps the artwork the only thing that changes.
ART_BAND = (300, 880)
CARD_TOP = 940
CARD_W_FRAC = 0.60


def option_frame(idx, print_file, pid, with_question):
    canvas = Image.new("RGB", (W, H), INK)
    draw = ImageDraw.Draw(canvas)

    if with_question:
        # The question rides on the first option rather than a card of its own:
        # a standalone question frame asks something the viewer cannot answer
        # yet, spending the most valuable frame in the video on no payoff.
        f = font(76)
        box = draw.textbbox((0, 0), QUESTION, font=f)
        draw.text(((W - (box[2] - box[0])) / 2 - box[0], 170), QUESTION, font=f, fill=PAPER)

    art = trim_alpha(Image.open(os.path.join(PRINTS, print_file)).convert("RGBA"))
    band_h = ART_BAND[1] - ART_BAND[0]
    scale = min(W * 0.82 / art.width, band_h / art.height)
    art = art.resize(
        (max(1, int(art.width * scale)), max(1, int(art.height * scale))), Image.LANCZOS
    )
    canvas.paste(
        art,
        ((W - art.width) // 2, ART_BAND[0] + (band_h - art.height) // 2),
        art,
    )

    card = garment_card(pid, int(W * CARD_W_FRAC))
    canvas.paste(card, ((W - card.width) // 2, CARD_TOP), card)

    badge(draw, idx)
    return canvas


def end_card():
    """All six together, so the last thing on screen is the full choice — and
    the frame the loop cuts back from."""
    canvas = Image.new("RGB", (W, H), INK)
    draw = ImageDraw.Draw(canvas)

    f = font(84)
    box = draw.textbbox((0, 0), QUESTION, font=f)
    draw.text(((W - (box[2] - box[0])) / 2 - box[0], 190), QUESTION, font=f, fill=PAPER)

    # Sized from the height budget, not the width: three rows scaled to fill
    # 1080px of columns overflow the frame and collide with the handle, which
    # is what a width-driven grid did here first time round.
    cols, rows, gap = 2, 3, 24
    top, bottom = 340, 1480  # keep clear of TikTok's bottom UI
    cell_h = (bottom - top - (rows - 1) * gap) // rows
    # garment_card crops to 820x780, so height leads width by that ratio
    cell_w = int(cell_h * 820 / 780)
    margin = (W - (cols * cell_w + (cols - 1) * gap)) // 2
    for i, (_, pid, _) in enumerate(OPTIONS):
        card = garment_card(pid, cell_w)
        cx = margin + (i % cols) * (cell_w + gap)
        cy = top + (i // cols) * (cell_h + gap)
        canvas.paste(card, (cx, cy), card)
        b = font(34)
        draw.ellipse([cx + 12, cy + 12, cx + 62, cy + 62], fill=BRAND)
        t = str(i + 1)
        tb = draw.textbbox((0, 0), t, font=b)
        draw.text(
            (cx + 37 - (tb[2] - tb[0]) / 2 - tb[0], cy + 37 - (tb[3] - tb[1]) / 2 - tb[1]),
            t,
            font=b,
            fill=PAPER,
        )

    f2 = font(48)
    box2 = draw.textbbox((0, 0), HANDLE, font=f2)
    draw.text(
        ((W - (box2[2] - box2[0])) / 2 - box2[0], bottom + 34),
        HANDLE,
        font=f2,
        fill=BRAND,
    )
    return canvas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-o", "--outdir", default=os.path.join(HERE, "..", "merch-designs",
                                                          "svenska", "reel-vilken-ar-du"))
    args = ap.parse_args()
    out = os.path.abspath(args.outdir)
    os.makedirs(out, exist_ok=True)

    for i, (pf, pid, name) in enumerate(OPTIONS, start=1):
        frame = option_frame(i, pf, pid, with_question=(i == 1))
        dst = os.path.join(out, f"{i:02d}-{pf.split('-PRINT')[0]}.jpg")
        frame.save(dst, quality=94)
        print(f"wrote {os.path.basename(dst)}  ({name})")

    dst = os.path.join(out, "07-end-card.jpg")
    end_card().save(dst, quality=94)
    print(f"wrote {os.path.basename(dst)}")

    print(
        "\nCut: frames 01-06 at 0.7s each (4.2s), 07 for 1.3s → 5.5s total.\n"
        "Cut 01-06 on the beat, and match the last frame back to the first so\n"
        "it loops — a viewer who watches twice without noticing scores over\n"
        "100% completion, which is the signal that earns distribution."
    )


if __name__ == "__main__":
    main()

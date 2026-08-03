"""
Shared frame-building pieces for the vertical reel scripts.

KNOWN DUPLICATION: build-quiz-reel.py predates this module and still carries
its own copies of font/trim_alpha/garment_card, plus the same ART_BAND (300,
880) / CARD_TOP 940 / CARD_W_FRAC 0.60 constants that build-hook-reels.py
imports from here. That matters because the two scripts are meant to produce
interchangeable product frames — a hook frame cut in front of quiz frames only
works if the garment lands in the identical spot. So if you change the card
crop or those bands, change them in BOTH files.

Consolidating is the right fix; it was attempted and reverted rather than risk
breaking already-published frames mid-campaign.
"""
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


def wrap(draw, text, f, max_w):
    """Greedy wrap to a pixel width — hook lines are written as sentences, not
    pre-broken, so the line breaks have to be measured rather than guessed."""
    words, lines, cur = text.split(), [], ""
    for word in words:
        trial = f"{cur} {word}".strip()
        box = draw.textbbox((0, 0), trial, font=f)
        if box[2] - box[0] <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def draw_centred_block(draw, lines, f, top, fill, line_gap=18):
    """Draw wrapped lines centred horizontally, returning the bottom y."""
    y = top
    for line in lines:
        box = draw.textbbox((0, 0), line, font=f)
        draw.text(((W - (box[2] - box[0])) / 2 - box[0], y), line, font=f, fill=fill)
        y += (box[3] - box[1]) + line_gap
    return y

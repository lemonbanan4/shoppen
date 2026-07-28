#!/usr/bin/env python3
"""
Build a 9:16 photo carousel from the mockups already generated for a product.

AI video cannot hold lettering steady on a garment — typographic designs warp
between frames — so for a text-led brand the reliable format is TikTok/Reels
photo mode: a hook frame, the product, the detail, a close, all stills.

Uses the studio mockups from the assets repo, so no new renders and no
generation cost.

    python build-social-carousel.py <printful_product_id> [-o outdir]
                                    [--hook "..."] [--close "..."]

Writes 01.jpg … NN.jpg, ready to upload in order.
"""
import argparse
import glob
import os
import sys

from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
BRAND = (154, 75, 46)          # Solkast rust
INK = (16, 16, 16)
PAPER = (247, 246, 243)

ASSETS = "/private/tmp/shoppen-merch-assets-repo2/mockups"


def font(size, bold=True):
    """Prefer a condensed grotesk; fall back through what macOS ships."""
    for path in (
        "/System/Library/Fonts/Supplemental/Impact.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def wrap(draw, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        trial = f"{cur} {w_}".strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    return lines


def text_frame(text, sub=None, bg=INK, fg=PAPER, accent=BRAND):
    im = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(im)
    f = font(120)
    lines = wrap(d, text.upper(), f, W - 160)
    # Shrink until it fits comfortably in the upper two thirds.
    size = 120
    while len(lines) * size * 1.15 > H * 0.5 and size > 48:
        size -= 6
        f = font(size)
        lines = wrap(d, text.upper(), f, W - 160)
    total = len(lines) * size * 1.15
    y = (H - total) / 2 - (60 if sub else 0)
    for ln in lines:
        d.text(((W - d.textlength(ln, font=f)) / 2, y), ln, font=f, fill=fg)
        y += size * 1.15
    if sub:
        fs = font(46)
        d.text(((W - d.textlength(sub.upper(), font=fs)) / 2, y + 40),
               sub.upper(), font=fs, fill=accent)
    return im


def product_frame(path, caption=None):
    im = Image.new("RGB", (W, H), PAPER)
    p = Image.open(path).convert("RGB")
    # Fill the frame width, anchored slightly high so the graphic sits in the
    # upper half where the eye lands first on a vertical feed.
    scale = W / p.width
    p = p.resize((W, int(p.height * scale)), Image.LANCZOS)
    im.paste(p, (0, int(H * 0.10)))
    if caption:
        d = ImageDraw.Draw(im)
        f = font(58)
        lines = wrap(d, caption.upper(), f, W - 120)
        y = H - 120 - len(lines) * 66
        for ln in lines:
            d.text(((W - d.textlength(ln, font=f)) / 2, y), ln, font=f, fill=INK)
            y += 66
    return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("product_id")
    ap.add_argument("-o", "--outdir", default=os.path.expanduser("~/Downloads/solkast-carousel"))
    ap.add_argument("--hook", default="warning: impulse purchases ahead")
    ap.add_argument("--sub", default="solkast")
    ap.add_argument("--close", default="link in bio")
    args = ap.parse_args()

    shots = sorted(glob.glob(os.path.join(ASSETS, f"pf-{args.product_id}-*.jpg")))
    if not shots:
        sys.exit(f"No mockups found for {args.product_id} in {ASSETS}")

    os.makedirs(args.outdir, exist_ok=True)
    frames = [text_frame(args.hook, args.sub)]
    captions = [None, "organic heavyweight cotton", "oversized cut",
                "printed to order in the eu", None, None]
    for i, s in enumerate(shots[:5]):
        frames.append(product_frame(s, captions[i] if i < len(captions) else None))
    frames.append(text_frame(args.close, "solkast.com", bg=BRAND, fg=PAPER, accent=PAPER))

    for i, f in enumerate(frames, 1):
        out = os.path.join(args.outdir, f"{i:02d}.jpg")
        f.save(out, quality=92)
    print(f"wrote {len(frames)} frames to {args.outdir}")
    print("Upload in order as a TikTok/Reels photo post. No video generation needed.")


if __name__ == "__main__":
    main()

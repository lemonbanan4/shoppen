#!/usr/bin/env python3
"""
Audit every Printful product's artwork against the garment it prints on.

Three failure modes have actually shipped in this store, and none of them
raise an error anywhere — the product looks fine in the dashboard and prints
wrong:

  1. Contrast. A near-white mark on a white tee, or near-black art on a black
     tee, is invisible. Caught by comparing ink brightness to garment
     brightness.
  2. Opaque background. Art flattened onto a solid card (dark from an image
     model, white from Canva) prints as a rectangle on any garment that is not
     that exact colour.
  3. Resolution. Effective DPI at the real print width, not the number the
     upscaler claims.

    PRINTFUL_API_TOKEN=... python audit-print-files.py

Read-only. Prints a table and a list of things worth looking at.
"""
import io
import json
import os
import sys
import time
import urllib.request

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
TOKEN = os.environ.get("PRINTFUL_API_TOKEN")
if not TOKEN:
    sys.exit("PRINTFUL_API_TOKEN not set")

# Rough garment lightness, 0 (black) to 255 (white). Only needs to be close
# enough to tell "dark fabric" from "light fabric".
GARMENT_LIGHTNESS = {
    "black": 20, "french navy": 40, "navy": 40, "anthracite": 55,
    "india ink grey": 60, "dark heather grey": 90, "charcoal": 70,
    "heather grey": 180, "ash": 200, "sand": 210, "desert dust": 205,
    "khaki": 195, "bone": 235, "adobe": 175, "dusty rose": 190,
    "lavender": 200, "sky blue": 195, "light blue": 200, "light pink": 215,
    "white": 250, "natural": 240,
}
SKIP_TYPES = {"preview", "mockup", "label_inside", "label_outside",
              "label_inside_dtf", "embroidery_thread"}


def api(path):
    r = urllib.request.Request(
        "https://api.printful.com" + path,
        headers={"Authorization": "Bearer " + TOKEN},
    )
    for _ in range(5):
        try:
            return json.load(urllib.request.urlopen(r, timeout=60))["result"]
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(20)
                continue
            raise
    return None


def analyse(url):
    """Ink brightness, opacity and background-fill signal for one print file."""
    # Printful's CDN 403s the default urllib user-agent.
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=90) as r:
        im = Image.open(io.BytesIO(r.read())).convert("RGBA")
    a = np.array(im)
    alpha, rgb = a[:, :, 3], a[:, :, :3]
    ink = alpha > 200
    if not ink.any():
        return None
    px = rgb[ink].astype(float)
    mx, mn = px.max(axis=1), px.min(axis=1)
    # Perceived lightness, and saturation. Max-channel brightness alone reads a
    # vivid pink as "near-white" and flags artwork that is perfectly visible —
    # saturated ink shows on any fabric, so only near-neutral art needs the
    # contrast check.
    lightness = 0.2126 * px[:, 0] + 0.7152 * px[:, 1] + 0.0722 * px[:, 2]
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    return dict(mean=float(lightness.mean()), sat=float(sat.mean()),
                opaque=float(ink.mean()), size=im.size)


def main():
    products = api("/store/products?limit=100")
    print(f"auditing {len(products)} products\n")
    print(f"{'product':40} {'placement':7} {'px':>11} {'dpi':>4} {'lum':>4} "
          f"{'sat':>4} {'opaque':>7}  flags")
    print("-" * 104)
    issues = []

    for p in products:
        d = api(f"/store/products/{p['id']}")
        if not d:
            continue
        sv = d["sync_variants"]
        if not sv:
            continue
        colours = {v["product"]["name"].split("(")[-1].split("/")[0].strip().lower()
                   for v in sv}
        known = [GARMENT_LIGHTNESS[c] for c in colours if c in GARMENT_LIGHTNESS]
        name = d["sync_product"]["name"][:40]

        for f in sv[0].get("files", []):
            if f.get("type") in SKIP_TYPES or not f.get("preview_url"):
                continue
            try:
                r = analyse(f["preview_url"])
            except Exception as e:
                print(f"{name:40} {f.get('type')[:7]:7} download failed: {e}")
                continue
            if not r:
                continue
            w, h = f.get("width") or 0, f.get("height") or 0
            # Assumes a ~12in body placement. Chest marks, cap fronts and bag
            # panels print much smaller, so their real DPI is far higher than
            # this — treat LOW-DPI as "look at it", not "it is broken".
            dpi = w / 12 if w else 0
            flags = []
            if dpi and dpi < 150:
                flags.append(f"CHECK-DPI({dpi:.0f}@12in)")
            if r["opaque"] > 0.95:
                flags.append("OPAQUE-BG")
            # Saturated artwork reads against any fabric; only near-neutral
            # ink (a white mark, black line art) can vanish into the garment.
            if r["sat"] < 0.25:
                for c in colours:
                    g = GARMENT_LIGHTNESS.get(c)
                    if g is not None and abs(r["mean"] - g) < 55:
                        flags.append(f"LOW-CONTRAST/{c}")
            if flags:
                issues.append((name, f.get("type"), flags))
            print(f"{name:40} {f.get('type')[:7]:7} {w:5}x{h:<5} {dpi:4.0f} "
                  f"{r['mean']:4.0f} {r['sat']:4.2f} {r['opaque']:6.1%}  "
                  f"{' '.join(flags)}")
        time.sleep(0.5)

    print()
    if issues:
        print(f"{len(issues)} placement(s) worth checking:")
        for n, t, fl in issues:
            print(f"  {n[:44]:44} {t:8} {', '.join(fl)}")
    else:
        print("No contrast, background or resolution problems found.")


if __name__ == "__main__":
    main()

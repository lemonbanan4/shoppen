#!/usr/bin/env python3
"""
Create the v6 tees, each with a sleeve wordmark.

Three front graphics, and the first products in the shop to print anywhere
other than the chest. The sleeve is a 600x525 patch on this blank, so the
wordmark that goes there is the geometric one — the brush and blackletter cuts
exist too, but at four inches the geometric reads and the other two turn to
texture.

Colourways come from the field each design was drawn against, which is the
whole Rose Sun lesson: a light-field design on a dark garment prints its
wordmark black on black. Chase the Light leads on French Navy because it was
literally composed on navy; it works on Black too and is offered there second.

A second placement costs roughly 5-9 USD a unit, which is why the sleeve is one
small wordmark rather than a second graphic, and why these sit at 599 rather
than the 499 of a front-only tee.

    python3 scripts/create-solkast-v6-tees.py --dry-run
    python3 scripts/create-solkast-v6-tees.py

Re-running creates duplicates — Printful has no upsert.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

RAW = "https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets/main"
V6 = f"{RAW}/solkast-v6"
SLEEVES = f"{RAW}/solkast-sleeves"

CATALOG = 823
RETAIL = "599.00"

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

# Blaster 2.0 variant ids, S-2XL.
COLOURS = {
    "Black":       {"S": 21000, "M": 21006, "L": 21012, "XL": 21018, "2XL": 21024},
    "French Navy": {"S": 21001, "M": 21007, "L": 21013, "XL": 21019, "2XL": 21025},
    "Stone":       {"S": 21004, "M": 21010, "L": 21016, "XL": 21022, "2XL": 21028},
    "White":       {"S": 21005, "M": 21011, "L": 21017, "XL": 21023, "2XL": 21029},
}

FRONT = {"area_width": 1800, "area_height": 2400,
         "width": 1800, "height": 2400, "top": 0, "left": 0}
SLEEVE = {"area_width": 600, "area_height": 525,
          "width": 600, "height": 525, "top": 0, "left": 0}

# The sleeve patch is near square, so it takes the tee cut of the wordmark
# rather than either long-sleeve strip.
#
# Two inks, because one does not cover both. The wordmark as drawn is cream and
# measures 7.2:1 on Black and 1.1:1 on Stone — not faint on a pale garment,
# gone. The dark recolour is the mirror: 12.7:1 on Stone, 1.5:1 on Black. Which
# one a product gets follows its colourways, the same rule that decides which
# garment a front design belongs on.
SLEEVE_LIGHT_INK = f"{SLEEVES}/solkast-v6-geometric-tee.png"
SLEEVE_DARK_INK = f"{SLEEVES}/solkast-v6-geometric-dark-tee.png"

# (name, front printfile, colourways, sleeve artwork)
PRODUCTS = [
    ("Glow Different Tee", "solkast-v6-glow-different.png",
     ["Black", "French Navy"], SLEEVE_LIGHT_INK),
    ("Chase the Light Tee", "solkast-v6-chase-the-light.png",
     ["French Navy", "Black"], SLEEVE_LIGHT_INK),
    ("Stay Golden Tee", "solkast-v6-stay-golden.png",
     ["Stone", "White"], SLEEVE_DARK_INK),
]


def request(path, token, store, body=None, attempts=6):
    for attempt in range(attempts):
        req = urllib.request.Request(
            "https://api.printful.com" + path,
            data=json.dumps(body).encode() if body is not None else None,
            headers={"Authorization": f"Bearer {token}",
                     "X-PF-Store-Id": str(store),
                     "User-Agent": UA,
                     "Content-Type": "application/json"},
            method="POST" if body is not None else "GET")
        try:
            with urllib.request.urlopen(req) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == attempts - 1:
                raise
            wait = int(e.headers.get("Retry-After") or 0)
            if not wait:
                m = re.search(r"after (\d+) second", e.read().decode())
                wait = int(m.group(1)) if m else 60
            print(f"     rate limited, waiting {wait + 2}s...", flush=True)
            time.sleep(wait + 2)


def reachable(url):
    try:
        req = urllib.request.Request(url, method="HEAD",
                                     headers={"User-Agent": UA})
        with urllib.request.urlopen(req) as r:
            return int(r.headers.get("content-length") or 0)
    except urllib.error.URLError:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    token = os.environ.get("PRINTFUL_SOLKAST_API_TOKEN")
    store = os.environ.get("PRINTFUL_SOLKAST_STORE_ID")
    if not token or not store:
        print("Set PRINTFUL_SOLKAST_API_TOKEN and PRINTFUL_SOLKAST_STORE_ID.",
              file=sys.stderr)
        return 1

    # Printful caches a file by URL the moment it first fetches it, so a bad
    # URL is not just a failed create — it can poison every later reference.
    for url in [SLEEVE_LIGHT_INK, SLEEVE_DARK_INK] + \
               [f"{V6}/{a}" for _, a, _, _ in PRODUCTS]:
        size = reachable(url)
        if size is None:
            print(f"  unreachable: {url}", file=sys.stderr)
            return 1
        print(f"  ok {url.rsplit('/', 1)[-1]:<38} {size/1e6:.1f} MB")

    created = {}
    for name, art, colours, sleeve_art in PRODUCTS:
        files = [
            {"type": "front", "url": f"{V6}/{art}", "position": FRONT},
            {"type": "sleeve_left", "url": sleeve_art, "position": SLEEVE},
        ]
        variants = [
            {"variant_id": vid, "retail_price": RETAIL, "files": files}
            for c in colours for vid in COLOURS[c].values()
        ]
        if args.dry_run:
            print(f"\n  {name}  {'/'.join(colours)}")
            print(f"    {len(variants)} variants @ {RETAIL}")
            print(f"    front  {art}")
            print(f"    sleeve {sleeve_art.rsplit('/', 1)[-1]} (left)")
            continue
        try:
            res = request("/store/products", token, store,
                          {"sync_product": {"name": name},
                           "sync_variants": variants})
            pid = (res.get("result") or {}).get("id") or res.get("result")
            created[str(pid)] = name
            print(f"  ok {name:<22} id={pid}  ({len(variants)} variants, "
                  f"{'/'.join(colours)})")
        except urllib.error.HTTPError as e:
            print(f"  FAILED {name}: {e.code} {e.read().decode()[:300]}",
                  file=sys.stderr)
        time.sleep(6)

    if created:
        print("\nCURATED entries for sync-solkast-products.ts:\n")
        for pid, name in created.items():
            print(f'  "{pid}": "{name}",')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

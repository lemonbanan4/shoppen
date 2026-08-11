#!/usr/bin/env python3
"""
Create the ten launch products for Solkast in Printful.

Colourways are per design and come from the rendered mockups rather than from
the ink measurements. The measurement is a useful screen for "will this vanish
entirely" and a poor verdict on anything else — it under-called three separate
designs in this set that the composite got right, so the mockup decides.

The logo tee carries an explicit position: a brand mark fitted to the full
1800x2400 front placement would print roughly A2 across the chest. Everything
else fills the placement, which is what a poster-style graphic wants.

    python create-solkast-v2-products.py --dry-run
    python create-solkast-v2-products.py

Re-running creates duplicates; Printful has no upsert. It also caches a file
by URL at creation time, so a corrected design has to be published under a new
filename to be re-fetched.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

CATALOG_PRODUCT = 823          # Stanley/Stella Blaster 2.0
RETAIL_PRICE = "499.00"
V2 = ("https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
      "/main/solkast-v2")
V3 = ("https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
      "/main/solkast-v3")

VARIANTS = {
    "Stone":       {"S": 21004, "M": 21010, "L": 21016, "XL": 21022, "2XL": 21028},
    "White":       {"S": 21005, "M": 21011, "L": 21017, "XL": 21023, "2XL": 21029},
    "Black":       {"S": 21000, "M": 21006, "L": 21012, "XL": 21018, "2XL": 21024},
    "French Navy": {"S": 21001, "M": 21007, "L": 21013, "XL": 21019, "2XL": 21025},
}
DARK = ["Black", "French Navy"]
LIGHT = ["Stone", "White"]
BOTH = ["Black", "Stone"]

FULL_FRONT = {"area_width": 1800, "area_height": 2400,
              "width": 1800, "height": 2400, "top": 0, "left": 0}
# ~9in wide, sitting in the upper third — a chest mark, not a chest poster.
CHEST = {"area_width": 1800, "area_height": 2400,
         "width": 1100, "height": 1100, "top": 230, "left": 350}

# (name, file url, colourways, position)
PRODUCTS = [
    ("From Shadow Tee",       f"{V2}/solkast-v2-black-11.png",  DARK,  FULL_FRONT),
    ("Solar Crown Tee",       f"{V2}/solkast-v2-light-15.png",  DARK,  FULL_FRONT),
    ("Rose Sun Tee",          f"{V2}/solkast-v2-light-18.png",  DARK,  FULL_FRONT),
    ("Total Eclipse Tee",     f"{V2}/solkast-v2-light-22.png",  DARK,  FULL_FRONT),
    ("Built in Sunlight Tee", f"{V3}/solkast-v3-design-01.png", BOTH,  FULL_FRONT),
    ("Driven by Light Tee",   f"{V3}/solkast-v3-design-02.png", BOTH,  FULL_FRONT),
    ("City Angel Tee",        f"{V2}/solkast-v2-light-24.png",  LIGHT, FULL_FRONT),
    ("Late Bloom Tee",        f"{V2}/solkast-v2-light-13.png",  LIGHT, FULL_FRONT),
    ("Nebula Tee",            f"{V3}/solkast-v3-design-03.png", LIGHT, FULL_FRONT),
    ("Solkast Mark Tee",      f"{V3}/solkast-v3-logo-01.png",   DARK,  CHEST),
]


def request(path, token, store, body=None, attempts=6):
    """Printful rate-limits store writes and returns the window to wait."""
    for attempt in range(attempts):
        req = urllib.request.Request(
            "https://api.printful.com" + path,
            data=json.dumps(body).encode() if body else None,
            headers={"Authorization": f"Bearer {token}",
                     "X-PF-Store-Id": store,
                     "Content-Type": "application/json"},
            method="POST" if body else "GET")
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

    created = {}
    for name, url, colours, position in PRODUCTS:
        variants = [
            {"variant_id": vid, "retail_price": RETAIL_PRICE,
             "files": [{"type": "default", "url": url, "position": position}]}
            for colour in colours for vid in VARIANTS[colour].values()
        ]
        if args.dry_run:
            fit = "chest" if position is CHEST else "full"
            print(f"  {name:<24} {', '.join(colours):<22} "
                  f"{len(variants):2d} variants  {fit}")
            continue
        try:
            res = request("/store/products", token, store,
                          {"sync_product": {"name": name},
                           "sync_variants": variants})
            pid = (res.get("result") or {}).get("id") or res.get("result")
            created[str(pid)] = name
            print(f"  ok {name:<24} id={pid}  ({len(variants)} variants)")
        except urllib.error.HTTPError as e:
            print(f"  FAILED {name}: {e.code} {e.read().decode()[:200]}",
                  file=sys.stderr)
        time.sleep(6)

    if created:
        print("\nCURATED entries for sync-solkast-products.ts:\n")
        for pid, name in created.items():
            print(f'  "{pid}": "{name}",')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

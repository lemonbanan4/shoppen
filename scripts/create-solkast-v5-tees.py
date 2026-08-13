#!/usr/bin/env python3
"""
Create the v5 sun-monogram tees.

Two versions of one idea — a sun ringed by molecular bonds around an S — which
is deliberately the same vocabulary as the Solstice all-over pattern. The
all-over pieces and the graphic tees should look like one range seen at two
scales rather than two separate drops.

The pair is split by field, and that is the whole point of listing them
separately. new1 is drawn on black with white and silver in it; new2 is drawn
on white with the wordmark in near-black. Each goes on the garment colour it
was drawn for and nowhere else.

That constraint is not theoretical. Rose Sun, a light-field design, was listed
on Black and French Navy, and printed its wordmark black on black — it read as
a misprint. It has just been re-listed on Stone and White for this reason.

    python3 scripts/create-solkast-v5-tees.py --dry-run
    python3 scripts/create-solkast-v5-tees.py

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

V5 = ("https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
      "/main/solkast-v5")

CATALOG = 823          # Stanley/Stella Blaster 2.0, the shop's standard tee
RETAIL = "499.00"

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

# Blaster 2.0 variant ids, S-2XL, read off the existing products.
COLOURS = {
    "Black": {"S": 21000, "M": 21006, "L": 21012, "XL": 21018, "2XL": 21024},
    "Stone": {"S": 21004, "M": 21010, "L": 21016, "XL": 21022, "2XL": 21028},
    "White": {"S": 21005, "M": 21011, "L": 21017, "XL": 21023, "2XL": 21029},
}

# (name, printfile, the colours the artwork was drawn for)
PRODUCTS = [
    ("Chemistry of Light Tee", "solkast-v5-sun-monogram-dark.png", ["Black"]),
    ("From Matter Tee", "solkast-v5-sun-monogram-light.png", ["Stone", "White"]),
]

# The printfiles are built to the placement exactly by prep-designv5.py, so
# this is a 1:1 placement with nothing for Printful to rescale.
FULL_FRONT = {"area_width": 1800, "area_height": 2400,
              "width": 1800, "height": 2400, "top": 0, "left": 0}


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
    for name, art, colours in PRODUCTS:
        url = f"{V5}/{art}"
        try:
            with urllib.request.urlopen(
                    urllib.request.Request(url, method="HEAD",
                                           headers={"User-Agent": UA})) as r:
                size = int(r.headers.get("content-length", 0))
        except urllib.error.URLError as e:
            print(f"  {name}: artwork unreachable ({e})", file=sys.stderr)
            return 1

        variants = [
            {"variant_id": vid, "retail_price": RETAIL,
             "files": [{"type": "front", "url": url, "position": FULL_FRONT}]}
            for c in colours for vid in COLOURS[c].values()
        ]

        if args.dry_run:
            print(f"  {name:<26} {'/'.join(colours):<13} "
                  f"{len(variants)} variants  @ {RETAIL}  "
                  f"{art}  ({size/1e6:.1f} MB)")
            continue

        try:
            res = request("/store/products", token, store,
                          {"sync_product": {"name": name},
                           "sync_variants": variants})
            pid = (res.get("result") or {}).get("id") or res.get("result")
            created[str(pid)] = name
            print(f"  ok {name:<26} id={pid}  ({len(variants)} variants, "
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

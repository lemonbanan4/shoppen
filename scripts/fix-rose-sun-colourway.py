#!/usr/bin/env python3
"""
Re-list Rose Sun on the garment colour its artwork was drawn for.

Rose Sun prints solkast-v2-light-18.png — one of the "light" set, drawn to sit
on a pale garment, with the SOLKAST wordmark in near-black. It was listed on
Black and French Navy. On black the wordmark is black on black: at full
contrast it is barely there, and on the garment it will read as a misprint
rather than as a design.

Its two siblings from the same set, Late Bloom (light-13) and City Angel
(light-24), are both on Stone and White. Rose Sun is the one that got the dark
colourway, and nothing about the artwork differs.

This is the same failure as French Navy, which is already filtered out in the
sync: artwork keyed against one background, sold on another. The difference is
that French Navy was wrong for every design and could be handled with a filter,
while this is one product on the wrong blank and has to be re-listed — a sync
variant's colour is fixed at creation and cannot be edited.

So: create Rose Sun on Stone and White, then point CURATED at the new id. The
old product is left in Printful, listing nothing, costing nothing, and
available if the artwork is ever redrawn for dark.

    python3 scripts/fix-rose-sun-colourway.py --dry-run
    python3 scripts/fix-rose-sun-colourway.py
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

ART = ("https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
       "/main/solkast-v2/solkast-v2-light-18.png")

NAME = "Rose Sun Tee"
RETAIL = "499.00"
OLD_PRODUCT_ID = "455299319"

# Blaster 2.0 (823), Stone and White, S-2XL — read off Late Bloom, which is
# the same artwork family on the right blank.
VARIANTS = {
    "Stone": {"S": 21004, "M": 21010, "L": 21016, "XL": 21022, "2XL": 21028},
    "White": {"S": 21005, "M": 21011, "L": 21017, "XL": 21023, "2XL": 21029},
}

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")


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

    # No explicit position: Printful centres and fits the artwork in the print
    # area, which is what put Late Bloom where it is. Supplying one here would
    # have to be computed for a 2400x3424 file against Late Bloom's 2400x3600,
    # and getting that arithmetic wrong is how a print ends up off-centre.
    variants = [
        {"variant_id": vid, "retail_price": RETAIL,
         "files": [{"type": "front", "url": ART}]}
        for sizes in VARIANTS.values() for vid in sizes.values()
    ]

    if args.dry_run:
        print(f"  {NAME}: {len(variants)} variants "
              f"({', '.join(VARIANTS)} x {', '.join(VARIANTS['Stone'])}) "
              f"@ {RETAIL}")
        print(f"  art: {ART.rsplit('/', 1)[-1]}")
        print(f"  replaces product {OLD_PRODUCT_ID} (Black / French Navy)")
        return 0

    try:
        res = request("/store/products", token, store,
                      {"sync_product": {"name": NAME},
                       "sync_variants": variants})
        pid = (res.get("result") or {}).get("id") or res.get("result")
        print(f"  ok {NAME}  id={pid}  ({len(variants)} variants)")
        print("\nUpdate CURATED in sync-solkast-products.ts:")
        print(f'  remove  "{OLD_PRODUCT_ID}": "Rose Sun Tee",')
        print(f'  add     "{pid}": "Rose Sun Tee",')
    except urllib.error.HTTPError as e:
        print(f"  FAILED: {e.code} {e.read().decode()[:300]}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

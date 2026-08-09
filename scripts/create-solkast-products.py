#!/usr/bin/env python3
"""
Create the Solkast graphic tees in Printful from hosted print files.

Printful fetches each file from its URL server-side, so nothing is uploaded
from this machine — which matters on a metered connection, and is how every
Ångerköp product was made.

Colourways are per design, not global. Roughly half the ink in most of these
designs is dark linework, so on Black or French Navy that half disappears into
the shirt: measured across the set, 44-63% of each design's ink sits within
45 luminance points of black. Design 13 is the sole inversion — 50% light ink,
so it needs a dark garment and loses 53% on Stone.

    python create-solkast-products.py --dry-run    # print what it would do
    python create-solkast-products.py              # create them

Re-running creates duplicates; Printful has no upsert. Delete first if you
need to redo a product, and remember it caches a file by URL at creation, so a
corrected design must be published under a new filename to be re-fetched.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import re
import urllib.request

CATALOG_PRODUCT = 823  # Stanley/Stella SATU020, Unisex Organic Oversized Blaster 2.0
RETAIL_PRICE = "499.00"
BASE = (
    "https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
    "/main/solkast-prints"
)

# Printful catalogue variant ids, size -> id.
VARIANTS = {
    "Stone":       {"S": 21004, "M": 21010, "L": 21016, "XL": 21022, "2XL": 21028},
    "White":       {"S": 21005, "M": 21011, "L": 21017, "XL": 21023, "2XL": 21029},
    "Black":       {"S": 21000, "M": 21006, "L": 21012, "XL": 21018, "2XL": 21024},
    "French Navy": {"S": 21001, "M": 21007, "L": 21013, "XL": 21019, "2XL": 21025},
}

LIGHT_GARMENTS = ["Stone", "White"]
DARK_GARMENTS = ["Black", "French Navy"]

# Names read off the artwork rather than invented, so the product page and the
# print agree on what the piece is called.
DESIGNS = [
    ("01", "Chase the Light", LIGHT_GARMENTS),
    ("02", "Shine Anyway", LIGHT_GARMENTS),
    ("03", "The Light Reveals", LIGHT_GARMENTS),
    ("04", "Made by the Sun", LIGHT_GARMENTS),
    ("05", "Outshine", LIGHT_GARMENTS),
    ("06", "No Permission", LIGHT_GARMENTS),
    ("07", "Solar", LIGHT_GARMENTS),
    ("08", "Elevate", LIGHT_GARMENTS),
    ("09", "Ascend", LIGHT_GARMENTS),
    ("10", "Leave Your Mark", LIGHT_GARMENTS),
    ("11", "Taiyo", LIGHT_GARMENTS),
    ("12", "Rise Above", LIGHT_GARMENTS),
    ("13", "Discipline Builds Freedom", DARK_GARMENTS),
    ("14", "Sol Drives", LIGHT_GARMENTS),
]


def request(path, token, store, body=None, attempts=5):
    """Printful rate-limits store writes and says how long to wait. A fixed
    pause between creates is not enough — a 14-product run tripped the limit
    on the eleventh — so honour the retry window it returns."""
    for attempt in range(attempts):
        req = urllib.request.Request(
            f"https://api.printful.com{path}",
            data=json.dumps(body).encode() if body else None,
            headers={
                "Authorization": f"Bearer {token}",
                "X-PF-Store-Id": store,
                "Content-Type": "application/json",
            },
            method="POST" if body else "GET",
        )
        try:
            with urllib.request.urlopen(req) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == attempts - 1:
                raise
            wait = int(e.headers.get("Retry-After") or 0)
            if not wait:
                # The message carries the window when the header does not.
                body_text = e.read().decode()
                m = re.search(r"after (\d+) second", body_text)
                wait = int(m.group(1)) if m else 60
            print(f"     rate limited, waiting {wait + 2}s...", flush=True)
            time.sleep(wait + 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", help="comma-separated design numbers, e.g. 11,12,13,14")
    args = ap.parse_args()

    token = os.environ.get("PRINTFUL_SOLKAST_API_TOKEN")
    store = os.environ.get("PRINTFUL_SOLKAST_STORE_ID")
    if not token or not store:
        print("Set PRINTFUL_SOLKAST_API_TOKEN and PRINTFUL_SOLKAST_STORE_ID.",
              file=sys.stderr)
        return 1

    only = {n.strip() for n in args.only.split(",")} if args.only else None
    designs = [d for d in DESIGNS if not only or d[0] in only]

    created = 0
    for num, name, garments in designs:
        url = f"{BASE}/{num}-PRINT-v3.png"
        variants = []
        for colour in garments:
            for size, vid in VARIANTS[colour].items():
                variants.append({
                    "variant_id": vid,
                    "retail_price": RETAIL_PRICE,
                    "files": [{"type": "default", "url": url}],
                })

        title = f"{name} Tee"
        if args.dry_run:
            print(f"{num}  {title:30s} {', '.join(garments):22s} "
                  f"{len(variants):2d} variants  {RETAIL_PRICE} SEK")
            continue

        try:
            res = request("/store/products", token, store, {
                "sync_product": {"name": title},
                "sync_variants": variants,
            })
            pid = (res.get("result") or {}).get("id") or res.get("result")
            print(f"  ✓ {num} {title:30s} ({len(variants)} variants)  id={pid}")
            created += 1
        except urllib.error.HTTPError as e:
            print(f"  ✗ {num} {title}: {e.code} {e.read().decode()[:200]}",
                  file=sys.stderr)
        # Printful rate-limits store writes; a short pause keeps a 14-product
        # run comfortably inside it.
        time.sleep(6)

    if not args.dry_run:
        print(f"\nCreated {created}/{len(designs)} products.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

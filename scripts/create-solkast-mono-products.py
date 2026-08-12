#!/usr/bin/env python3
"""
Create the Mono capsule: four one-colour tees on Heather Grey.

Heather Grey was the only colourway the shop had never used, and the reason
was never the colour — it was that every design depended on its background.
Each had its field keyed against black or white, so on a mid-tone the garment
shows through wherever that field used to be. French Navy was retired for
exactly this. A binarised silhouette carries its own contrast and does not
care what it sits on.

Priced at the standard 499, not as a discount line. These are not lesser
versions of the colour prints — they are a different treatment of the same
artwork, and a one-colour print on heather is a more expensive-looking garment
than a full-colour one, not a cheaper one.

Heather Grey only, deliberately. The point of the capsule is the colourway the
range was missing; putting the same files on Black as well would just be the
existing shirts again in worse resolution.

    python3 scripts/create-solkast-mono-products.py --dry-run
    python3 scripts/create-solkast-mono-products.py

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

MONO = ("https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
        "/main/solkast-mono")

CATALOG = 823
RETAIL = "499.00"

# Heather Grey, S–2XL.
VARIANTS = {"S": 21002, "M": 21008, "L": 21014, "XL": 21020, "2XL": 21026}

FULL_FRONT = {"area_width": 1800, "area_height": 2400,
              "width": 1800, "height": 2400, "top": 0, "left": 0}

# (product name, printfile)
PRODUCTS = [
    ("Tuned Sun Mono Tee",  f"{MONO}/solkast-mono-tuned-sun.png"),
    ("Sun Face Mono Tee",   f"{MONO}/solkast-mono-sun-face.png"),
    ("Statue Dawn Mono Tee", f"{MONO}/solkast-mono-statue.png"),
    ("Solkast Mono Tee",    f"{MONO}/solkast-mono-wordmark.png"),
]


def request(path, token, store, body=None, attempts=6):
    for attempt in range(attempts):
        req = urllib.request.Request(
            "https://api.printful.com" + path,
            data=json.dumps(body).encode() if body is not None else None,
            headers={"Authorization": f"Bearer {token}",
                     "X-PF-Store-Id": str(store),
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
    for name, url in PRODUCTS:
        variants = [
            {"variant_id": vid, "retail_price": RETAIL,
             "files": [{"type": "default", "url": url, "position": FULL_FRONT}]}
            for vid in VARIANTS.values()
        ]
        if args.dry_run:
            print(f"  {name:<24} Heather Grey  {len(variants)} variants  "
                  f"{RETAIL}  {url.rsplit('/', 1)[-1]}")
            continue
        try:
            res = request("/store/products", token, store,
                          {"sync_product": {"name": name},
                           "sync_variants": variants})
            pid = (res.get("result") or {}).get("id") or res.get("result")
            created[str(pid)] = name
            print(f"  ok {name:<24} id={pid}  ({len(variants)} variants)")
        except urllib.error.HTTPError as e:
            print(f"  FAILED {name}: {e.code} {e.read().decode()[:220]}",
                  file=sys.stderr)
        time.sleep(6)

    if created:
        print("\nCURATED entries for sync-solkast-products.ts:\n")
        for pid, name in created.items():
            print(f'  "{pid}": "{name}",')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
Create the arch logotype hoodie, from its own printfile.

Not the tee script, on purpose. The Slammer 2.0 hoodie front is a 1875x1875
square with a pouch pocket crossing the lower third — a different shape from
the Blaster 2.0 tee's 1800x2400 rectangle — so it needs its own catalogue id,
variant table and its own artwork rather than the tee file centred into a
square area it was not built for. Centring the tee file there was tried and
rendered on a real hoodie first: it lands low enough to brush the pocket seam
and shrinks from 11 inches to 8.6, because a 3:4 file fitted into a square is
limited by its height.

Dark garments only, same as the tee: the wordmark measures 5.6-6.3:1 on Black
and French Navy and 1.3-1.7:1 on Stone and White, which is gone rather than
faint.

Priced at 899 to match the shop's other hoodies (the Mono capsule), not the
tee's ladder — a hoodie blank costs more than a tee whatever is printed on it.

    python3 scripts/create-solkast-v7-hoodie.py --dry-run
    python3 scripts/create-solkast-v7-hoodie.py

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
ART = f"{RAW}/solkast-v7/solkast-v7-arch-amber-hoodie.png"

CATALOG = 831  # Slammer 2.0 hoodie
RETAIL = "899.00"
NAME = "Solkast Arch Hoodie"

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

# Slammer 2.0 variant ids, Black and French Navy, S-2XL.
COLOURS = {
    "Black":       {"S": 21149, "M": 21153, "L": 21157, "XL": 21161, "2XL": 21165},
    "French Navy": {"S": 21150, "M": 21154, "L": 21158, "XL": 21162, "2XL": 21166},
}

# The printfile is already built to this exact area — see prep-firefly-batch.py
# with --size 1875x1875 — so this is a 1:1 placement with nothing to rescale.
FRONT = {"area_width": 1875, "area_height": 1875,
         "width": 1875, "height": 1875, "top": 0, "left": 0}


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

    size = reachable(ART)
    if size is None:
        print(f"  unreachable: {ART}", file=sys.stderr)
        return 1
    print(f"  ok {ART.rsplit('/', 1)[-1]}  {size/1e6:.1f} MB")

    variants = [
        {"variant_id": vid, "retail_price": RETAIL,
         "files": [{"type": "front", "url": ART, "position": FRONT}]}
        for c in COLOURS.values() for vid in c.values()
    ]

    if args.dry_run:
        print(f"\n  {NAME}  Black/French Navy")
        print(f"    {len(variants)} variants @ {RETAIL}")
        print(f"    front  {ART.rsplit('/', 1)[-1]}  (1875x1875, own cut)")
        return 0

    try:
        res = request("/store/products", token, store,
                      {"sync_product": {"name": NAME},
                       "sync_variants": variants})
        pid = (res.get("result") or {}).get("id") or res.get("result")
        print(f"  ok {NAME}  id={pid}  ({len(variants)} variants)")
        print(f"\nCURATED entry for sync-solkast-products.ts:\n")
        print(f'  "{pid}": "{NAME}",')
    except urllib.error.HTTPError as e:
        print(f"  FAILED {NAME}: {e.code} {e.read().decode()[:300]}",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

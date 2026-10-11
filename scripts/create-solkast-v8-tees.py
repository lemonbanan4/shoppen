#!/usr/bin/env python3
"""
Create the v8 tees — the Y2K-tech-mystic capsule.

Eleven designs from a single Firefly export batch, each one placement (front
or back, never both — a second placement is a different product tier, not
this one). Front went to the wordmark-forward pieces, back to the dense
poster/collage ones, matching how the source images actually read on a
garment rather than any rule about content.

Two of these are one placement short of the full v6/v7 wardrobe (no sleeve),
so they sit at the v7 tier: 499, not 599.

    python3 scripts/create-solkast-v8-tees.py --dry-run
    python3 scripts/create-solkast-v8-tees.py

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
V8 = f"{RAW}/solkast-v8"

CATALOG = 823
RETAIL = "499.00"

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

# Blaster 2.0 variant ids, S-2XL.
COLOURS = {
    "Black":       {"S": 21000, "M": 21006, "L": 21012, "XL": 21018, "2XL": 21024},
    "French Navy": {"S": 21001, "M": 21007, "L": 21013, "XL": 21019, "2XL": 21025},
}

FRONT = {"area_width": 1800, "area_height": 2400,
         "width": 1800, "height": 2400, "top": 0, "left": 0}
BACK = {"area_width": 1800, "area_height": 2400,
        "width": 1800, "height": 2400, "top": 0, "left": 0}

# (name, printfile, placement)
PRODUCTS = [
    ("Solkast Arc Tee", "solkast-arc-sun.png", "front"),
    ("Golden Hour Tee", "solkast-sun-shades.png", "front"),
    ("Sun Crest Tee", "solkast-sun-monogram-white.png", "front"),
    ("Static Tee", "solkast-blindfold-monogram.png", "front"),
    ("Horizon Tee", "solkast-horizon-head.png", "back"),
    ("Paradise Tee", "solkast-paradise-sun.png", "back"),
    ("Oracle Tee", "solkast-amber-oracle.png", "back"),
    ("Mindscape Tee", "solkast-mindscape-head.png", "back"),
    ("Elite Tee", "solkast-elite-head.png", "back"),
    ("Chaos Tee", "solkast-chaos3-head.png", "back"),
    ("Molecular Tee", "solkast-molecular-pattern.png", "back"),
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
    for _, art, _ in PRODUCTS:
        url = f"{V8}/{art}"
        size = reachable(url)
        if size is None:
            print(f"  unreachable: {url}", file=sys.stderr)
            return 1
        print(f"  ok {url.rsplit('/', 1)[-1]:<38} {size/1e6:.1f} MB")

    created = {}
    for name, art, placement in PRODUCTS:
        url = f"{V8}/{art}"
        pos = FRONT if placement == "front" else BACK
        files = [{"type": placement, "url": url, "position": pos}]
        variants = [
            {"variant_id": vid, "retail_price": RETAIL, "files": files}
            for c in COLOURS for vid in COLOURS[c].values()
        ]
        if args.dry_run:
            print(f"\n  {name}  ({placement})")
            print(f"    {len(variants)} variants @ {RETAIL}")
            print(f"    {placement}  {art}")
            continue
        try:
            res = request("/store/products", token, store,
                          {"sync_product": {"name": name},
                           "sync_variants": variants})
            pid = (res.get("result") or {}).get("id") or res.get("result")
            created[str(pid)] = name
            print(f"  ok {name:<22} id={pid}  ({len(variants)} variants, "
                  f"{placement})")
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

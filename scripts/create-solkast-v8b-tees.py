#!/usr/bin/env python3
"""
Create the v8b tees — curated second wave of the Y2K capsule (amber, SK
monogram, blue), plus the fixed second paradise.exe variant.

All back placement, Black + French Navy, matching the v8 tier.

    python3 scripts/create-solkast-v8b-tees.py --dry-run
    python3 scripts/create-solkast-v8b-tees.py

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
V8B = f"{RAW}/solkast-v8b"

CATALOG = 823
RETAIL = "499.00"

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

COLOURS = {
    "Black":       {"S": 21000, "M": 21006, "L": 21012, "XL": 21018, "2XL": 21024},
    "French Navy": {"S": 21001, "M": 21007, "L": 21013, "XL": 21019, "2XL": 21025},
}

BACK = {"area_width": 1800, "area_height": 2400,
        "width": 1800, "height": 2400, "top": 0, "left": 0}

# (name, printfile)
PRODUCTS = [
    ("Transcend Tee", "solkast-v8b-amber-178573.png"),
    ("Future Drip Tee", "solkast-v8b-amber-554322.png"),
    ("Visions Tee", "solkast-v8b-ambergrad-178573.png"),
    ("Y2K Vision Tee", "solkast-v8b-ambergrad-361152.png"),
    ("Forever Tee", "solkast-v8b-gold-178573.png"),
    ("Sun Code Tee", "solkast-v8b-dys-261848x.png"),
    ("Molecular Crest Tee", "solkast-v8b-dys-295078.png"),
    ("Hooded Crest Tee", "solkast-v8b-dys-295078xx.png"),
    ("Survival Protocol Tee", "solkast-v8b-dys-538133.png"),
    ("Crest Tee", "solkast-v8b-std-436127.png"),
    ("Glyph Tee", "solkast-v8b-std-134899.png"),
    ("Dreamscape Tee", "solkast-v8b-neon-178573x.png"),
    ("Illusion Systems Tee", "solkast-v8b-std-219695.png"),
    ("Flux Tee", "solkast-v8b-std-305720.png"),
    ("Eternal Sunshine Tee", "solkast-v8b-paradise2.png"),
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

    for _, art in PRODUCTS:
        url = f"{V8B}/{art}"
        size = reachable(url)
        if size is None:
            print(f"  unreachable: {url}", file=sys.stderr)
            return 1
        print(f"  ok {url.rsplit('/', 1)[-1]:<38} {size/1e6:.1f} MB")

    created = {}
    for name, art in PRODUCTS:
        url = f"{V8B}/{art}"
        files = [{"type": "back", "url": url, "position": BACK}]
        variants = [
            {"variant_id": vid, "retail_price": RETAIL, "files": files}
            for c in COLOURS for vid in COLOURS[c].values()
        ]
        if args.dry_run:
            print(f"\n  {name}")
            print(f"    {len(variants)} variants @ {RETAIL}")
            print(f"    back  {art}")
            continue
        try:
            res = request("/store/products", token, store,
                          {"sync_product": {"name": name},
                           "sync_variants": variants})
            pid = (res.get("result") or {}).get("id") or res.get("result")
            created[str(pid)] = name
            print(f"  ok {name:<22} id={pid}  ({len(variants)} variants)")
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

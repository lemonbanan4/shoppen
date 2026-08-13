#!/usr/bin/env python3
"""
Create the Solstice kit: an all-over-print track jacket and matching joggers.

This is the first thing in the shop that is printed rather than decorated. A
graphic tee is a blank someone else made with a rectangle put on it; an AOP
garment is printed on flat fabric which is then cut and sewn, so the pattern
runs across seams, down sleeves and around legs with nothing left blank. That
is the whole reason to do it, and it is also why it is unforgiving — the tile
repeats a dozen times across a kit, so a join that is slightly off is a line
down the leg, twelve times.

The tile passed the seam test in tile-for-aop.py at 1.09x, meaning its wrap
looks like every other column in the image. Two earlier tiles did not and were
thrown away.

Both blanks are the recycled polyester versions (801, 400) rather than the
standard ones. Sublimation only works on polyester, so the organic-cotton claim
the rest of the shop makes cannot follow the pattern onto these — recycled is
the honest version of the same argument rather than a silent exception to it.

Six jacket placements and two jogger placements all point at one sheet each.
They came out byte-identical — same tile, same repeat, same panel size — and
Printful caches files by URL, so this uploads two files rather than eight.

Pricing sits above the ladder (tee 499, sweatshirt 799, hoodie 899) because the
blank costs far more: 669 for the jacket against roughly 250 for a hoodie. The
store is denominated in SEK, which is easy to misread as dollars on a catalogue
endpoint; the Medusa sync converts per-variant with live FX.

    python3 scripts/create-solkast-aop-kit.py --dry-run
    python3 scripts/create-solkast-aop-kit.py

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

AOP = ("https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
       "/main/solkast-aop")

JACKET_SHEET = f"{AOP}/solkast-aop-sun-jacket.jpg"
LEGS_SHEET = f"{AOP}/solkast-aop-sun-legs.jpg"

# Cloudflare rejects the default urllib user-agent with "error code: 1010"
# before the request ever reaches Printful, which reads as a 403 permissions
# failure and is not one.
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

# Sizes are limited to XS-2XL, matching the rest of the range. The blanks go to
# 6XL; carrying sizes the other products do not is a support burden for a first
# run of an untested silhouette.
JACKET = {
    "name": "Solstice Track Jacket",
    "catalog": 801,
    "retail": "1499.00",          # SEK; blank cost 669
    "variants": {"XS": 20371, "S": 20372, "M": 20373,
                 "L": 20374, "XL": 20375, "2XL": 20376},
    # All six are the same 6600x6900 sheet. Leaving `details` and `pocket` out
    # would print the trim and pocket panels blank white on a garment whose
    # entire point is that nothing is blank.
    "sheet": JACKET_SHEET,
    "placements": ["front", "back", "sleeve_left", "sleeve_right",
                   "details", "pocket"],
    "size": (6600, 6900),
}

JOGGERS = {
    "name": "Solstice Joggers",
    "catalog": 400,
    "retail": "999.00",           # SEK; blank cost 389
    "variants": {"XS": 11033, "S": 11034, "M": 11035,
                 "L": 11036, "XL": 11037, "2XL": 11038},
    "sheet": LEGS_SHEET,
    "placements": ["leg_left", "leg_right"],
    "size": (4950, 7500),
}

PRODUCTS = [JACKET, JOGGERS]


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


def files_for(spec):
    """One entry per placement, all pointing at the same sheet."""
    w, h = spec["size"]
    pos = {"area_width": w, "area_height": h,
           "width": w, "height": h, "top": 0, "left": 0}
    return [{"type": p, "url": spec["sheet"], "position": pos}
            for p in spec["placements"]]


def verify_sheets(specs):
    """Check the artwork is reachable before asking Printful to fetch it.

    Printful caches a file by URL at the moment it first fetches it. A sheet
    that 404s here fails the whole create; worse, one that serves the wrong
    bytes gets cached and every later product silently reuses them.
    """
    ok = True
    for url in sorted({s["sheet"] for s in specs}):
        try:
            req = urllib.request.Request(url, method="HEAD",
                                         headers={"User-Agent": UA})
            with urllib.request.urlopen(req) as r:
                size = int(r.headers.get("content-length") or 0)
            print(f"  sheet ok  {url.rsplit('/', 1)[-1]}  {size / 1e6:.1f} MB")
        except urllib.error.URLError as e:
            print(f"  SHEET UNREACHABLE  {url}  ({e})", file=sys.stderr)
            ok = False
    return ok


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

    if not verify_sheets(PRODUCTS):
        return 1

    created = {}
    for spec in PRODUCTS:
        files = files_for(spec)
        variants = [
            {"variant_id": vid, "retail_price": spec["retail"], "files": files}
            for vid in spec["variants"].values()
        ]
        if args.dry_run:
            w, h = spec["size"]
            print(f"\n  {spec['name']}  (catalog {spec['catalog']})")
            print(f"    {len(variants)} variants  "
                  f"{'/'.join(spec['variants'])}  @ {spec['retail']} SEK")
            print(f"    {len(files)} placements @ {w}x{h}: "
                  f"{', '.join(spec['placements'])}")
            print(f"    sheet {spec['sheet'].rsplit('/', 1)[-1]}")
            continue
        try:
            res = request("/store/products", token, store,
                          {"sync_product": {"name": spec["name"]},
                           "sync_variants": variants})
            pid = (res.get("result") or {}).get("id") or res.get("result")
            created[str(pid)] = spec["name"]
            print(f"  ok {spec['name']:<24} id={pid}  "
                  f"({len(variants)} variants, {len(files)} placements)")
        except urllib.error.HTTPError as e:
            print(f"  FAILED {spec['name']}: {e.code} {e.read().decode()[:400]}",
                  file=sys.stderr)
        time.sleep(6)

    if created:
        print("\nCURATED entries for sync-solkast-products.ts:\n")
        for pid, name in created.items():
            print(f'  "{pid}": "{name}",')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

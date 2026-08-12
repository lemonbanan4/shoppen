#!/usr/bin/env python3
"""
Widen the Solkast range by form rather than by graphic.

The shop had twenty-one products built on three product types — tee, hoodie,
poster. That is wide on artwork and narrow on form, which is backwards for a
label whose whole pitch is a short list made properly. Another ten tee graphics
would have deepened the imbalance; a crewneck and a tote fix it.

Both additions stay inside the existing Stanley/Stella family so the range
reads as one collection:

  Raddler 2.0 Oversized Sweatshirt (822)  the crewneck sibling of the
      Blaster 2.0 tee already in the shop, and — usefully — its front placement
      is 1800x2400 at 150dpi, identical to the tee, so the existing printfiles
      drop straight in with nothing re-rendered.

  Mantis Organic Denim Tote (528)  organic denim, one size, one colour. Its
      placement is 1500x1500 square, so it needs its own file rather than a
      letterboxed garment printfile.

Priced into the existing ladder: poster 249, tee 499, back-print tee 599,
sweatshirt 799, hoodie 899. The crewneck sits between tee and hoodie because
that is where a crewneck belongs — the one already sitting unused in the
Printful store was priced at 949, above the hoodie, which is backwards.

Sweatshirt designs are the three that already span tee, hoodie and poster, so
each becomes a complete family rather than a fourth orphan graphic.

    python3 scripts/create-solkast-v4-products.py --dry-run
    python3 scripts/create-solkast-v4-products.py

Re-running creates duplicates — Printful has no upsert. Check the store before
a second run.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

V2 = ("https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
      "/main/solkast-v2")
V3 = ("https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
      "/main/solkast-v3")
V4 = ("https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
      "/main/solkast-v4")

SWEATSHIRT = 822
TOTE = 528

SWEAT_PRICE = "799.00"
TOTE_PRICE = "299.00"

# Raddler 2.0, S-2XL. Only Black and White: the designs were keyed against
# those fields, so Heather Grey and French Navy would show the wrong colour
# everywhere the artwork assumed its background.
SWEAT_VARIANTS = {
    "Black": {"S": 20831, "M": 20836, "L": 20841, "XL": 20846, "2XL": 20851},
    "White": {"S": 20835, "M": 20840, "L": 20845, "XL": 20850, "2XL": 20855},
}

TOTE_VARIANT = 13313  # Denim Blue, one size

FULL_FRONT = {"area_width": 1800, "area_height": 2400,
              "width": 1800, "height": 2400, "top": 0, "left": 0}
TOTE_FRONT = {"area_width": 1500, "area_height": 1500,
              "width": 1500, "height": 1500, "top": 0, "left": 0}

# (name, file url, colourways)
SWEATSHIRTS = [
    ("From Shadow Sweatshirt",       f"{V2}/solkast-v2-black-11.png",  ["Black"]),
    ("Solar Crown Sweatshirt",       f"{V2}/solkast-v2-light-15.png",  ["Black"]),
    ("Built in Sunlight Sweatshirt", f"{V3}/solkast-v3-design-01.png", ["Black", "White"]),
]

TOTES = [
    ("Solkast Mark Tote", f"{V4}/solkast-v4-tote-sun-mark.png"),
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

    jobs = []
    for name, url, colours in SWEATSHIRTS:
        variants = [
            {"variant_id": vid, "retail_price": SWEAT_PRICE,
             "files": [{"type": "default", "url": url, "position": FULL_FRONT}]}
            for c in colours for vid in SWEAT_VARIANTS[c].values()
        ]
        jobs.append((name, variants, f"{', '.join(colours)} · {len(variants)} variants"))

    for name, url in TOTES:
        variants = [{"variant_id": TOTE_VARIANT, "retail_price": TOTE_PRICE,
                     "files": [{"type": "default", "url": url,
                                "position": TOTE_FRONT}]}]
        jobs.append((name, variants, "Denim Blue · 1 variant"))

    created = {}
    for name, variants, note in jobs:
        if args.dry_run:
            print(f"  {name:<32} {note}")
            continue
        try:
            res = request("/store/products", token, store,
                          {"sync_product": {"name": name},
                           "sync_variants": variants})
            pid = (res.get("result") or {}).get("id") or res.get("result")
            created[str(pid)] = name
            print(f"  ok {name:<32} id={pid}  ({len(variants)} variants)")
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

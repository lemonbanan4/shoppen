#!/usr/bin/env python3
"""
Create the embroidered cap and beanie.

Both blanks are organic, which is not decoration: the shop's claim is organic
cotton printed to order, and a conventional-cotton cap next to it undercuts
the only thing the brand says about itself. Econscious EC7000 and Atlantis
Organic Ribbed are the organic options Printful carries that also embroider.

Black only. Gold thread on black is the brand's own pairing and the one
contrast I can be sure of without a sample in hand; Oyster and the coloured
beanies can follow once the first one has been seen.

Front placement only. Embroidery is charged per placement, and a side hit adds
cost to a product that has never been sold. The 2x1in side and back files
exist and can be added later.

Priced into the ladder: tote 299, beanie 349, cap 399, tee 499, back-print
599, sweatshirt 799, hoodie 899.

    python3 scripts/create-solkast-caps.py --dry-run
    python3 scripts/create-solkast-caps.py

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

EMB = ("https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
       "/main/solkast-embroidery")

# Embroidery is thread, not ink, so Printful will not accept an arbitrary
# colour: the API rejects the product outright unless thread_colors names
# values from its fifteen-colour palette, which does not include the brand
# gold. White both matches the site's nav wordmark and gives the most contrast
# on a black cap. See build-embroidery-lockups.py for the full palette and why
# the nearest gold was the wrong choice.
THREAD = "#FFFFFF"

# The option key is placement-specific — thread_colors for a plain front,
# thread_colors_front_large for the cap's wide front — and a mismatch fails
# with the same error as an unknown colour.
# The artwork is the v3 brush logos put through
# salvage-logo-for-embroidery.py, not a drawn mark. An earlier version used a
# clean geometric sun: perfectly stitchable and wrong, because it read as a
# weather icon rather than as Solkast. These carry the lettering already on the
# tees, so a cap matches the shirts.
#
# (name, catalog id, variant id, placement, option key, file, w, h, price)
PRODUCTS = [
    ("Solkast Cap", 491, 12689, "embroidery_front_large",
     "thread_colors_front_large",
     f"{EMB}/solkast-cap-front-logo01.png", 1650, 600, "399.00"),
    ("Solkast Cap — Sunburst", 491, 12689, "embroidery_front_large",
     "thread_colors_front_large",
     f"{EMB}/solkast-cap-front-logo02.png", 1650, 600, "399.00"),
    ("Solkast Beanie", 449, 11706, "embroidery_front",
     "thread_colors",
     f"{EMB}/solkast-beanie-front-logo01.png", 1500, 525, "349.00"),
    ("Solkast Beanie — Sunburst", 449, 11706, "embroidery_front",
     "thread_colors",
     f"{EMB}/solkast-beanie-front-logo02.png", 1500, 525, "349.00"),
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
    for name, cat, vid, place, opt_key, url, w, h, price in PRODUCTS:
        # The embroidery file fills its placement exactly, so the position is
        # the whole area — no insetting, which on a cap front would push the
        # lockup off the panel's centre seam.
        position = {"area_width": w, "area_height": h,
                    "width": w, "height": h, "top": 0, "left": 0}
        variants = [{
            "variant_id": vid, "retail_price": price,
            "files": [{"type": place, "url": url, "position": position}],
            "options": [{"id": opt_key, "value": [THREAD]}],
        }]
        if args.dry_run:
            print(f"  {name:<18} catalog {cat}  variant {vid}  "
                  f"{place}  {w}x{h}  {opt_key}={THREAD}  {price} SEK")
            continue
        try:
            res = request("/store/products", token, store,
                          {"sync_product": {"name": name},
                           "sync_variants": variants})
            pid = (res.get("result") or {}).get("id") or res.get("result")
            created[str(pid)] = name
            print(f"  ok {name:<18} id={pid}")
        except urllib.error.HTTPError as e:
            print(f"  FAILED {name}: {e.code} {e.read().decode()[:240]}",
                  file=sys.stderr)
        time.sleep(6)

    if created:
        print("\nCURATED entries for sync-solkast-products.ts:\n")
        for pid, name in created.items():
            print(f'  "{pid}": "{name}",')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

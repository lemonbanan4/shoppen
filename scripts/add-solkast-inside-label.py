#!/usr/bin/env python3
"""
Add the printed inside label to the all-over-print pieces, in place.

Unlike creating a product, this is safe to re-run: PUT /store/products/{id}
edits the existing product rather than making another one, and the label is
added only where it is missing.

The care taken here is over what PUT does to the files array — it replaces it
wholesale rather than merging, so every existing placement has to be sent back
alongside the new one. Sending only the label would leave a garment with a
label and no artwork.

    python3 scripts/add-solkast-inside-label.py --dry-run
    python3 scripts/add-solkast-inside-label.py
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

LABEL = ("https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
         "/main/solkast-labels/solkast-label-inside.png")

# Printful's label_inside print area, identical on both blanks.
LABEL_POS = {"area_width": 375, "area_height": 150,
             "width": 375, "height": 150, "top": 0, "left": 0}

PRODUCTS = {"455589012": "Solstice Track Jacket",
            "455589016": "Solstice Joggers"}

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

# Files Printful generates itself. Echoing these back on a PUT is at best
# ignored and at worst confuses the placement it belongs to.
GENERATED = {"preview", "mockup"}


def request(path, token, store, body=None, method=None, attempts=6):
    for attempt in range(attempts):
        req = urllib.request.Request(
            "https://api.printful.com" + path,
            data=json.dumps(body).encode() if body is not None else None,
            headers={"Authorization": f"Bearer {token}",
                     "X-PF-Store-Id": str(store),
                     "User-Agent": UA,
                     "Content-Type": "application/json"},
            method=method or ("POST" if body is not None else "GET"))
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

    try:
        with urllib.request.urlopen(
                urllib.request.Request(LABEL, method="HEAD",
                                       headers={"User-Agent": UA})) as r:
            print(f"  label ok  {int(r.headers.get('content-length', 0))} bytes")
    except urllib.error.URLError as e:
        print(f"  label unreachable: {e}", file=sys.stderr)
        return 1

    for pid, name in PRODUCTS.items():
        detail = request(f"/store/products/{pid}", token, store)["result"]
        variants = detail["sync_variants"]

        if any(f["type"] == "label_inside" for f in variants[0]["files"]):
            print(f"  {name}: already labelled, skipping")
            continue

        payload = []
        for v in variants:
            kept = [
                {"type": f["type"], "url": f["url"], "position": f.get("position")}
                for f in v["files"]
                if f["type"] not in GENERATED and f.get("url")
            ]
            payload.append({
                "id": v["id"],
                "files": kept + [{"type": "label_inside", "url": LABEL,
                                  "position": LABEL_POS}],
            })

        if args.dry_run:
            print(f"  {name}: {len(payload)} variants, "
                  f"{len(payload[0]['files'])} files each "
                  f"({', '.join(f['type'] for f in payload[0]['files'])})")
            continue

        try:
            request(f"/store/products/{pid}", token, store,
                    {"sync_variants": payload}, method="PUT")
            print(f"  ok {name} — label added to {len(payload)} variants")
        except urllib.error.HTTPError as e:
            print(f"  FAILED {name}: {e.code} {e.read().decode()[:300]}",
                  file=sys.stderr)
        time.sleep(6)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

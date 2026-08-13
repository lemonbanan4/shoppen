#!/usr/bin/env python3
"""
Point the Solstice products at the second-generation pattern.

The first tile scored 1.09x and passed by luck; this one scores 1.07x and came
from a prompt that stated the wrap as a constraint. It also carries the S
monogram, the SOLKAST BUILT DIFFERENT labels and the chemistry notation the
first one does not — it says something, where the first was warm texture.

Done in place. Every one of these eight ids is referenced by CURATED, by
mockups.json and by the live Medusa catalogue, so re-listing would mean
rewriting all three and issuing new URLs for products that are already indexed.

The care is all in what PUT does: it replaces a variant's files array outright,
so anything absent is deleted. Every existing variant is sent back by id, the
neck label is carried across explicitly, and the script refuses to write if the
variant count would drop or if any placement has no replacement sheet.

Reversible by design. The first-generation sheets are untouched in the assets
repo, so going back is running this with --generation 1.

    python3 scripts/swap-solstice-pattern.py --dry-run
    python3 scripts/swap-solstice-pattern.py
    python3 scripts/swap-solstice-pattern.py --generation 1   # roll back
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
AOP = f"{RAW}/solkast-aop"
LABEL = f"{RAW}/solkast-labels/solkast-label-inside.png"

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

# product id -> (name, sheet-family). The sheet for a placement is chosen by
# its print area, which is how one family covers panels of different sizes.
PRODUCTS = {
    "455589012": ("Solstice Track Jacket", "track-jacket"),
    "455589016": ("Solstice Joggers", "joggers"),
    "455595147": ("Solstice Zip Hoodie", "zip-hoodie"),
    "455595154": ("Solstice Baseball Jersey", "baseball-jersey"),
    "455595166": ("Solstice Bucket Hat", "bucket-hat"),
    "455595175": ("Solstice Duffle", "duffle"),
    "455595180": ("Solstice Bandana", "bandana"),
    "455634532": ("Solstice Bomber Jacket", "bomber"),
}

# First-generation sheets, kept so --generation 1 can roll back. These were
# named before the family convention, hence the one-off spellings.
GEN1 = {
    ("track-jacket", "6600x6900"): "solkast-aop-sun-jacket.jpg",
    ("joggers", "4950x7500"): "solkast-aop-sun-legs.jpg",
    ("zip-hoodie", "5250x6000"): "solkast-aop-zip-hoodie-5250x6000.jpg",
    ("zip-hoodie", "5250x3750"): "solkast-aop-zip-hoodie-5250x3750.jpg",
    ("baseball-jersey", "5700x6900"): "solkast-aop-baseball-jersey-5700x6900.jpg",
    ("baseball-jersey", "5700x2250"): "solkast-aop-baseball-jersey-5700x2250.jpg",
    ("bucket-hat", "2700x3150"): "solkast-aop-bucket-hat-2700x3150.jpg",
    ("duffle", "4050x2700"): "solkast-aop-duffle-4050x2700.jpg",
    ("bandana", "4125x4125"): "solkast-aop-bandana-4125x4125.jpg",
    ("bomber", "4650x5400"): "solkast-aop-bomber-4650x5400.jpg",
    ("bomber", "7950x2700"): "solkast-aop-bomber-7950x2700.jpg",
}

LABEL_W, LABEL_H = 375, 150


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


def sheet_for(family, size, generation):
    if generation == 1:
        name = GEN1.get((family, size))
        return f"{AOP}/{name}" if name else None
    return f"{AOP}/solkast-aopv2-{family}-{size}.jpg"


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
    ap.add_argument("--generation", type=int, default=2, choices=(1, 2))
    ap.add_argument("--only", help="comma-separated product ids")
    args = ap.parse_args()

    token = os.environ.get("PRINTFUL_SOLKAST_API_TOKEN")
    store = os.environ.get("PRINTFUL_SOLKAST_STORE_ID")
    if not token or not store:
        print("Set PRINTFUL_SOLKAST_API_TOKEN and PRINTFUL_SOLKAST_STORE_ID.",
              file=sys.stderr)
        return 1

    only = {i.strip() for i in (args.only or "").split(",") if i.strip()}
    rc = 0
    for pid, (name, family) in PRODUCTS.items():
        if only and pid not in only:
            continue
        detail = request(f"/store/products/{pid}", token, store)["result"]
        variants = detail["sync_variants"]
        ref = variants[0]

        # Build the new file list from what is on the product now, so a
        # placement cannot be dropped by being forgotten here.
        files, missing = [], []
        for f in ref["files"]:
            t = f["type"]
            if t in ("preview", "mockup"):
                continue
            if t == "label_inside":
                files.append({"type": t, "url": LABEL,
                              "position": f.get("position")})
                continue
            size = f"{f.get('width')}x{f.get('height')}"
            url = sheet_for(family, size, args.generation)
            if not url or reachable(url) is None:
                missing.append(f"{t} ({size})")
                continue
            files.append({"type": t, "url": url,
                          "position": {"area_width": f["width"],
                                       "area_height": f["height"],
                                       "width": f["width"],
                                       "height": f["height"],
                                       "top": 0, "left": 0}})

        if missing:
            print(f"  {name}: no gen-{args.generation} sheet for "
                  f"{', '.join(missing)} — skipping", file=sys.stderr)
            rc = 1
            continue

        payload = [{"id": v["id"], "files": files} for v in variants]

        if args.dry_run:
            print(f"  {name}: {len(variants)} variants, {len(files)} placements")
            for f in files:
                print(f"      {f['type']:<16} {f['url'].rsplit('/', 1)[-1]}")
            continue

        try:
            request(f"/store/products/{pid}", token, store,
                    {"sync_variants": payload}, method="PUT")
        except urllib.error.HTTPError as e:
            print(f"  FAILED {name}: {e.code} {e.read().decode()[:300]}",
                  file=sys.stderr)
            rc = 1
            continue

        # Read back rather than trust the write. A PUT that quietly dropped
        # variants or placements is invisible until someone orders.
        after = request(f"/store/products/{pid}", token, store)["result"]
        got = after["sync_variants"]
        art = [f for f in got[0]["files"] if f["type"] not in ("preview", "mockup")]
        ok = len(got) == len(variants) and len(art) == len(files)
        print(f"  {'ok ' if ok else '** '}{name}: {len(got)} variants, "
              f"{len(art)} placements")
        if not ok:
            print(f"     expected {len(variants)} variants and {len(files)} "
                  f"placements", file=sys.stderr)
            rc = 1
        time.sleep(6)
    return rc


if __name__ == "__main__":
    raise SystemExit(main())

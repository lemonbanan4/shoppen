#!/usr/bin/env python3
"""
Extend the Solstice monogram onto outerwear and accessories.

The tracksuit proved the pattern works. This is the wave that makes it a
monogram rather than a one-off: a bucket hat, a duffle and a bandana carry a
repeat better than any garment does, which is why the houses that built their
name on a monogram sell far more bags and hats than coats. None of the three
has meaningful sizing risk either — a duffle has one size, and a bag that does
not fit is not a return.

Every sheet is tiled at the same 1100px cell, so a sun is the same size on the
bandana as on the jacket. A monogram that changes scale by product reads as a
different pattern each time.

Variant ids are read from the catalogue at run time rather than pasted in.
Five products across eleven size runs is a lot of six-digit numbers to
transcribe, and a wrong one does not fail — it silently lists a different size.

    python3 scripts/create-solkast-aop-wave2.py --dry-run
    python3 scripts/create-solkast-aop-wave2.py

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
LABEL = ("https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
         "/main/solkast-labels/solkast-label-inside.png")

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

# Sizes carried, by catalogue id. Deliberately narrower than Printful offers:
# the blanks run to 6XL and the rest of the shop stops at 2XL, and carrying
# sizes no other product carries is a returns problem on an untested fit.
SIZES = {
    717: ["XS", "S", "M", "L", "XL", "2XL"],
    792: ["XS", "S", "M", "L", "XL", "2XL"],
    654: ["S/M", "L/XL"],
    465: None,          # one size
    630: ["S", "M", "L"],
    390: ["XS", "S", "M", "L", "XL", "2XL"],
}

# name, catalogue id, retail (SEK), {placement: sheet}, blank cost for the note
PRODUCTS = [
    ("Solstice Zip Hoodie", 717, "1299.00", {
        "front": "zip-hoodie-5250x6000", "back": "zip-hoodie-5250x6000",
        "sleeve_left": "zip-hoodie-5250x6000",
        "sleeve_right": "zip-hoodie-5250x6000",
        "hood": "zip-hoodie-5250x6000",
        "pocket": "zip-hoodie-5250x3750",
        "label_panel": "zip-hoodie-5250x3750",
    }),
    ("Solstice Baseball Jersey", 792, "999.00", {
        "front": "baseball-jersey-5700x6900",
        "back": "baseball-jersey-5700x6900",
        "details": "baseball-jersey-5700x6900",
        "sleeve_left": "baseball-jersey-5700x2250",
        "sleeve_right": "baseball-jersey-5700x2250",
    }),
    ("Solstice Bucket Hat", 654, "599.00", {
        "outside_front": "bucket-hat-2700x3150",
        "outside_back": "bucket-hat-2700x3150",
        "inside_front": "bucket-hat-2700x3150",
        "inside_back": "bucket-hat-2700x3150",
    }),
    ("Solstice Duffle", 465, "1499.00", {
        "front": "duffle-4050x2700", "back": "duffle-4050x2700",
        "sides": "duffle-4050x2700", "top": "duffle-4050x2700",
        "bottom": "duffle-4050x2700", "pocket": "duffle-4050x2700",
    }),
    ("Solstice Bandana", 630, "299.00", {
        "front": "bandana-4125x4125",
    }),
    # The one piece here that is not recycled polyester. Printful has no
    # recycled bomber and this is the statement outerwear, so it is listed with
    # its real composition rather than under the range's claim — which is what
    # MATERIALS keying by blank is for.
    ("Solstice Bomber Jacket", 390, "1399.00", {
        "front": "bomber-4650x5400", "back": "bomber-4650x5400",
        "sleeve_left": "bomber-4650x5400", "sleeve_right": "bomber-4650x5400",
        "details": "bomber-7950x2700",
    }),
]

# The label artwork's own pixel size. NOT the print area — those differ by
# product: most blanks here have a 375x150 label area, the bucket hat has
# 450x300. Anchoring a 375x150 image at 0,0 in a 450x300 area prints it in the
# corner of the tag, so the area is read per product and the label centred in
# it.
LABEL_W, LABEL_H = 375, 150


def label_area(cid, token):
    """The label_inside print area for this blank, or None if it has none."""
    pf = request(f"/mockup-generator/printfiles/{cid}", token)["result"]
    dims = {f["printfile_id"]: f for f in pf["printfiles"]}
    for vp in pf["variant_printfiles"]:
        fid = vp["placements"].get("label_inside")
        if fid and fid in dims:
            return dims[fid]["width"], dims[fid]["height"]
    return None


def request(path, token, store=None, body=None, attempts=6):
    for attempt in range(attempts):
        headers = {"Authorization": f"Bearer {token}", "User-Agent": UA,
                   "Content-Type": "application/json"}
        if store:
            headers["X-PF-Store-Id"] = str(store)
        req = urllib.request.Request(
            "https://api.printful.com" + path,
            data=json.dumps(body).encode() if body is not None else None,
            headers=headers, method="POST" if body is not None else "GET")
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


def sheet_dims(name):
    """The sheet filenames carry their own dimensions; use them.

    The position must match the print area exactly or Printful scales the
    artwork to fit, which on a tiled pattern shifts the repeat off the panel
    edges. Deriving it from the filename means the two cannot drift apart.
    """
    m = re.search(r"-(\d+)x(\d+)$", name)
    if not m:
        raise ValueError(f"cannot read dimensions from sheet name: {name}")
    return int(m.group(1)), int(m.group(2))


def files_for(placements, area):
    files = []
    for placement, sheet in placements.items():
        w, h = sheet_dims(sheet)
        files.append({
            "type": placement,
            "url": f"{AOP}/solkast-aop-{sheet}.jpg",
            "position": {"area_width": w, "area_height": h,
                         "width": w, "height": h, "top": 0, "left": 0},
        })
    if area:
        aw, ah = area
        files.append({
            "type": "label_inside", "url": LABEL,
            "position": {"area_width": aw, "area_height": ah,
                         "width": LABEL_W, "height": LABEL_H,
                         "top": (ah - LABEL_H) // 2, "left": (aw - LABEL_W) // 2},
        })
    return files


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    # Printful has no upsert, so re-running this whole file would duplicate
    # everything already created. --only names the products to build.
    ap.add_argument("--only", help="comma-separated substrings of product names")
    args = ap.parse_args()

    token = os.environ.get("PRINTFUL_SOLKAST_API_TOKEN")
    store = os.environ.get("PRINTFUL_SOLKAST_STORE_ID")
    if not token or not store:
        print("Set PRINTFUL_SOLKAST_API_TOKEN and PRINTFUL_SOLKAST_STORE_ID.",
              file=sys.stderr)
        return 1

    wanted_names = [w.strip().lower() for w in (args.only or "").split(",") if w.strip()]

    created = {}
    for name, cid, retail, placements in PRODUCTS:
        if wanted_names and not any(w in name.lower() for w in wanted_names):
            continue
        catalog = request(f"/products/{cid}", token)["result"]["variants"]
        wanted = SIZES.get(cid)
        chosen = [v for v in catalog
                  if wanted is None or v.get("size") in wanted]
        if wanted and len(chosen) != len(wanted):
            got = sorted({v.get("size") for v in chosen})
            print(f"  {name}: wanted {wanted}, catalogue gave {got} — skipping",
                  file=sys.stderr)
            continue

        area = label_area(cid, token)
        files = files_for(placements, area)
        variants = [{"variant_id": v["id"], "retail_price": retail,
                     "files": files} for v in chosen]

        if args.dry_run:
            sheets = sorted({f["url"].rsplit("/", 1)[-1] for f in files})
            print(f"\n  {name}  (catalogue {cid})")
            print(f"    {len(variants)} variants  "
                  f"{[v.get('size') for v in chosen]}  @ {retail} SEK")
            print(f"    {len(files)} placements from {len(sheets)} sheet(s)"
                  f"  label area {area}")
            for s in sheets:
                print(f"      {s}")
            continue

        try:
            res = request("/store/products", token, store,
                          {"sync_product": {"name": name},
                           "sync_variants": variants})
            pid = (res.get("result") or {}).get("id") or res.get("result")
            created[str(pid)] = name
            print(f"  ok {name:<28} id={pid}  ({len(variants)} variants, "
                  f"{len(files)} placements)")
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

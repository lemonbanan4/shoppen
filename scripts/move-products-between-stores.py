#!/usr/bin/env python3
"""
Recreate sync products in another Printful store, then delete the originals.

Printful has no "move" — a product is recreated from its variant list and
print files, then removed from the source store. Used for the brand split:
the original store (18510270) stays as the Solkast archive, Ångerköp
products live in their own store, and the Medusa sync pins to one store id
so each storefront only ever sees its own brand.

Print files are re-referenced by their public URL (the assets repo), never by
file id — Printful file ids are store-scoped and do not resolve across
stores.

    PRINTFUL_API_TOKEN=... python move-products-between-stores.py \
        --from 18510270 --to <new-store-id> --ids 452617529,452617557,452617586
        [--delete]

Without --delete it only copies, so the result can be inspected in the
dashboard before the originals are removed.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.request

TOKEN = os.environ.get("PRINTFUL_API_TOKEN")
if not TOKEN:
    sys.exit("PRINTFUL_API_TOKEN not set")

# File types that describe production config rather than artwork placements;
# they are store-independent settings Printful re-derives, not files to copy.
SKIP_FILE_TYPES = {"preview", "mockup"}


def call(path, store, body=None, method="GET", tries=6):
    for _ in range(tries):
        req = urllib.request.Request(
            "https://api.printful.com" + path,
            data=json.dumps(body).encode() if body else None,
            method=method,
            headers={
                "Authorization": "Bearer " + TOKEN,
                "X-PF-Store-Id": str(store),
                "Content-Type": "application/json",
            },
        )
        try:
            return json.load(urllib.request.urlopen(req, timeout=90))
        except urllib.error.HTTPError as e:
            text = e.read().decode()
            if e.code == 429:
                m = re.search(r"after (\d+) seconds", text)
                wait = (int(m.group(1)) if m else 60) + 3
                print(f"    429 — waiting {wait}s")
                time.sleep(wait)
                continue
            print(f"  ERR {e.code} {text[:300]}")
            return None
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="src", required=True)
    ap.add_argument("--to", dest="dst", required=True)
    ap.add_argument("--ids", required=True, help="comma-separated sync product ids")
    ap.add_argument("--delete", action="store_true",
                    help="delete the source product after a successful copy")
    args = ap.parse_args()

    for pid in [i.strip() for i in args.ids.split(",") if i.strip()]:
        d = call(f"/store/products/{pid}", args.src)
        if not d:
            print(f"{pid}: could not read from source store")
            continue
        sp = d["result"]["sync_product"]
        variants = d["result"]["sync_variants"]

        new_variants = []
        for v in variants:
            files = []
            for f in v.get("files", []):
                if f.get("type") in SKIP_FILE_TYPES:
                    continue
                # Only URL-referenced artwork survives a store change. A file
                # with no retrievable URL would silently create an empty
                # placement, so refuse loudly instead.
                url = f.get("url") or f.get("preview_url")
                if not url:
                    print(f"{pid}: file {f.get('id')} ({f.get('type')}) has no URL — skipping file")
                    continue
                entry = {"type": f["type"], "url": url}
                if f.get("position"):
                    entry["position"] = f["position"]
                files.append(entry)
            new_variants.append({
                "variant_id": v["variant_id"],
                "retail_price": v.get("retail_price"),
                "files": files,
            })

        r = call("/store/products", args.dst, method="POST",
                 body={"sync_product": {"name": sp["name"]},
                       "sync_variants": new_variants})
        if not r:
            print(f"{pid}: copy FAILED — source left untouched")
            continue
        new_id = r["result"]["id"]
        print(f"{pid} -> {new_id}  {sp['name']}  ({len(new_variants)} variants)")

        if args.delete:
            dr = call(f"/store/products/{pid}", args.src, method="DELETE")
            print(f"    deleted from source" if dr else "    DELETE FAILED — remove manually")
        time.sleep(3)


if __name__ == "__main__":
    main()

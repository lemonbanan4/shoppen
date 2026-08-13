#!/usr/bin/env python3
"""
Add French Navy to products whose artwork was drawn for a dark garment.

Navy came back after being retired on a premise that did not survive testing:
Stanley/Stella French Navy is #091629 against Black's #171717, about one
percent apart in luminance, and every design in the range reads at least as
well on it. Eleven products already carried navy variants and regained them by
deleting one line. These six do not — they were created Black-only — so the
colourway has to be added to the Printful product itself.

Done by PUT rather than by re-listing, which matters: creating a replacement
product would issue a new id, and every id here is referenced by CURATED,
mockups.json and the live Medusa catalogue.

The dangerous part is that PUT replaces the sync_variants array wholesale. A
variant present in the store and absent from the payload is deleted, so every
existing variant is sent back with its own id alongside the new navy ones —
and this refuses to run if that would reduce the variant count.

Deliberately not applied to everything that could take navy. The light-field
designs (Rose Sun, Rise Above, Nebula, From Matter) print near-black type and
would repeat the exact failure navy was wrongly blamed for the first time. The
Mono capsule is one-colour black on Heather Grey and would vanish entirely.

    python3 scripts/add-navy-colourway.py --dry-run
    python3 scripts/add-navy-colourway.py
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

# Products to extend, and why each qualifies: artwork drawn on a dark field,
# already sold on Black, on a blank that offers French Navy.
TARGETS = {
    "455299329": "Built in Sunlight Tee",
    "455299333": "Driven by Light Tee",
    "455595267": "Chemistry of Light Tee",
    "455433316": "From Shadow Sweatshirt",
    "455433319": "Solar Crown Sweatshirt",
    "455433329": "Built in Sunlight Sweatshirt",
}

NAVY = "French Navy"


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


def catalog_navy_variants(cid, sizes, token, store):
    """Navy catalogue variant ids for the sizes this product already sells."""
    vs = request(f"/products/{cid}", token, store)["result"]["variants"]
    by_size = {v["size"]: v["id"] for v in vs if v.get("color") == NAVY}
    return {s: by_size[s] for s in sizes if s in by_size}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
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
    for pid, name in TARGETS.items():
        if only and pid not in only:
            continue
        detail = request(f"/store/products/{pid}", token, store)["result"]
        variants = detail["sync_variants"]
        if any(v.get("color") == NAVY for v in variants):
            print(f"  {name}: already has navy, skipping")
            continue

        cid = variants[0]["product"]["product_id"]
        # Match the sizes actually sold, not every size the blank offers.
        sizes = sorted({v.get("size") for v in variants if v.get("size")})
        navy = catalog_navy_variants(cid, sizes, token, store)
        if len(navy) != len(sizes):
            print(f"  {name}: navy missing for {sorted(set(sizes) - set(navy))}"
                  f" — skipping", file=sys.stderr)
            rc = 1
            continue

        # The artwork to repeat on the navy variants: whatever the existing
        # dark-garment variant prints. Taken from a Black variant specifically,
        # since a product may carry a light colourway with different files.
        ref = next((v for v in variants if v.get("color") == "Black"), variants[0])
        files = [{"type": f["type"], "url": f["url"], "position": f.get("position")}
                 for f in ref["files"]
                 if f["type"] not in ("preview", "mockup") and f.get("url")]
        if not files:
            print(f"  {name}: no artwork files on the reference variant",
                  file=sys.stderr)
            rc = 1
            continue

        # Every existing variant, by id, or PUT deletes the ones left out.
        payload = [{"id": v["id"]} for v in variants]
        payload += [{"variant_id": vid, "retail_price": ref["retail_price"],
                     "files": files}
                    for vid in navy.values()]

        if args.dry_run:
            print(f"  {name}: {len(variants)} existing + {len(navy)} navy "
                  f"({'/'.join(navy)}) = {len(payload)} variants")
            continue

        try:
            request(f"/store/products/{pid}", token, store,
                    {"sync_variants": payload}, method="PUT")
        except urllib.error.HTTPError as e:
            print(f"  FAILED {name}: {e.code} {e.read().decode()[:300]}",
                  file=sys.stderr)
            rc = 1
            continue

        # Read back rather than trust the write: a PUT that silently dropped
        # variants is the failure worth catching, and it is invisible until
        # someone picks that size.
        after = request(f"/store/products/{pid}", token, store)["result"]
        got = after["sync_variants"]
        colours = sorted({v.get("color") for v in got})
        ok = len(got) == len(payload) and NAVY in colours
        print(f"  {'ok ' if ok else '** '}{name}: "
              f"{len(variants)} -> {len(got)} variants, colours {colours}")
        if not ok:
            print(f"     expected {len(payload)} variants including navy",
                  file=sys.stderr)
            rc = 1
        time.sleep(6)
    return rc


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
Push the designv4 printfiles into Printful's file library. Nothing else.

Deliberately does NOT create products. POST /files adds a file to the store's
library and stops there — no sync_product, no sync_variants, nothing that
appears in the shop or can be ordered. The files sit in Printful ready to be
attached to a product later, from the dashboard or from a script, once the
designs have been chosen.

That distinction matters because Printful has no upsert for products: a second
run of a product script creates a second set of duplicates. Files are the safe
half of the operation, and this script is only the safe half.

Printful ingests by URL — there is no binary upload in the public API — so the
files have to be publicly reachable first. It also caches by URL at the moment
of fetch, which is why a corrected file has to be published under a new
filename rather than overwritten in place.

    python3 scripts/upload-designv4-files.py --dry-run
    python3 scripts/upload-designv4-files.py

Idempotent in effect: Printful returns the existing file record when the same
URL is submitted twice, so re-running does not duplicate.
"""
import argparse
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

BASE = ("https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
        "/main/solkast-v4")
PRINT_DIR = pathlib.Path(
    "/Users/lemon/development/shoppen/designv4/build/print")


def request(path, token, store, body=None, attempts=6):
    """Printful rate-limits store writes and names the window to wait."""
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

    files = sorted(p.name for p in PRINT_DIR.glob("*.png"))
    if not files:
        print(f"No printfiles in {PRINT_DIR}", file=sys.stderr)
        return 1

    uploaded = {}
    for name in files:
        url = f"{BASE}/{name}"
        if args.dry_run:
            print(f"  would upload  {name}")
            continue
        try:
            res = request("/files", token, store,
                          {"type": "default", "url": url, "filename": name,
                           "visible": True})
            f = res.get("result") or {}
            uploaded[name] = {"id": f.get("id"), "status": f.get("status"),
                              "w": f.get("width"), "h": f.get("height"),
                              "dpi": f.get("dpi")}
            print(f"  ok {name:<36} id={f.get('id')}  "
                  f"{f.get('width')}x{f.get('height')}  {f.get('status')}")
        except urllib.error.HTTPError as e:
            print(f"  FAILED {name}: {e.code} {e.read().decode()[:200]}",
                  file=sys.stderr)
        time.sleep(2)

    if uploaded:
        out = PRINT_DIR.parent / "printful-files.json"
        json.dump(uploaded, open(out, "w"), indent=1)
        print(f"\n  {len(uploaded)} file(s) in the library. "
              f"No products created.\n  ids -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

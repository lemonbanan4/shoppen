#!/usr/bin/env python3
"""
Render Printful mockups for candidate print files, without creating products.

Deciding which of 37 designs to sell means seeing them on a garment, and the
obvious route — create a product, look at it, delete it — leaves rate-limit
damage and orphaned sync products behind. The Mockup Generator renders any
catalogue variant straight from a file URL, so nothing is created and nothing
has to be cleaned up.

Designs that could go either way are rendered on Black *and* Stone in the same
task, because the whole question is which garment suits them.

    python mockup-candidates.py            # all groups
    python mockup-candidates.py --only black

Writes into designv2/build/mockups/ and prints a manifest. Printful throttles
this endpoint hard, so a full run takes the best part of an hour; it is
resumable — files already downloaded are skipped.
"""
import argparse
import json
import os
import time
import urllib.error
import urllib.request

TOKEN = os.environ["PRINTFUL_SOLKAST_API_TOKEN"]
STORE = os.environ["PRINTFUL_SOLKAST_STORE_ID"]
BASE = ("https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
        "/main/solkast-v2")
OUT = "/Users/lemon/development/shoppen/designv2/build/mockups"

CATALOG_PRODUCT = 823          # Stanley/Stella Blaster 2.0
BLACK_M, STONE_M = 21006, 21010

# The front printfile Printful actually uses for this product. Sending the
# design at the placement's own dimensions avoids the generator guessing.
AREA_W, AREA_H = 1800, 2400

# Fine dark-linework pieces: they need a light ground, so there is nothing to
# compare and rendering them on black would only waste a call.
LIGHT_ONLY = {"light-03", "light-05", "light-10", "light-13", "light-14", "light-17"}
DARK_LOGOS = {"logo-01", "logo-03"}


def call(path, body=None, attempts=6):
    """Printful rate-limits this endpoint hard and says how long to wait."""
    for attempt in range(attempts):
        req = urllib.request.Request(
            "https://api.printful.com" + path,
            data=json.dumps(body).encode() if body else None,
            headers={"Authorization": f"Bearer {TOKEN}",
                     "X-PF-Store-Id": STORE,
                     "Content-Type": "application/json"},
            method="POST" if body else "GET")
        try:
            with urllib.request.urlopen(req) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == attempts - 1:
                raise
            wait = int(e.headers.get("Retry-After") or 0) or 60
            print(f"     rate limited, waiting {wait + 2}s", flush=True)
            time.sleep(wait + 2)


def variants_for(stem):
    if stem.startswith("black"):
        return [BLACK_M]
    if stem in DARK_LOGOS:
        return [STONE_M]
    if stem.startswith("logo"):
        return [BLACK_M]
    if stem in LIGHT_ONLY:
        return [STONE_M]
    return [BLACK_M, STONE_M]      # undecided — render both and compare


def render(stem):
    task = call(f"/mockup-generator/create-task/{CATALOG_PRODUCT}", {
        "variant_ids": variants_for(stem),
        "format": "jpg",
        "files": [{"placement": "front",
                   "image_url": f"{BASE}/solkast-v2-{stem}.png",
                   "position": {"area_width": AREA_W, "area_height": AREA_H,
                                "width": AREA_W, "height": AREA_H,
                                "top": 0, "left": 0}}],
    })
    key = task["result"]["task_key"]
    for _ in range(60):
        time.sleep(8)
        r = call(f"/mockup-generator/task?task_key={key}")["result"]
        if r["status"] == "completed":
            return r["mockups"]
        if r["status"] == "failed":
            raise RuntimeError(r.get("error", "mockup task failed"))
    raise TimeoutError(f"{stem}: task never completed")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="stem prefix filter, e.g. black / light / logo")
    args = ap.parse_args()

    os.makedirs(OUT, exist_ok=True)
    src = "/Users/lemon/development/shoppen/designv2/build/final"
    stems = sorted(f.replace("solkast-v2-", "").replace(".png", "")
                   for f in os.listdir(src) if f.endswith(".png"))
    if args.only:
        stems = [s for s in stems if s.startswith(args.only)]

    done = failed = 0
    for i, stem in enumerate(stems, 1):
        # Resumable: a finished stem already has at least one file on disk.
        if [f for f in os.listdir(OUT) if f.startswith(stem + "__")]:
            print(f"[{i}/{len(stems)}] {stem} already done", flush=True)
            done += 1
            continue
        print(f"[{i}/{len(stems)}] {stem} ...", flush=True)
        try:
            for m in render(stem):
                colour = "black" if m["variant_ids"][0] == BLACK_M else "stone"
                dst = os.path.join(OUT, f"{stem}__{colour}.jpg")
                urllib.request.urlretrieve(m["mockup_url"], dst)
                print(f"     -> {os.path.basename(dst)}", flush=True)
            done += 1
        except Exception as e:
            print(f"     FAILED {stem}: {e}", flush=True)
            failed += 1

    print(f"\nrendered {done}, failed {failed}, in {OUT}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

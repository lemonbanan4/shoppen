"""
Generate multi-view mockups for every Printful sync product and re-host them.

Printful's sync API exposes only a single front-view mockup per variant, so
product pages can't show back prints or angle shots. The Mockup Generator API
renders any placement/view on demand — but returns temporary S3 URLs, so each
image is downloaded and committed to the public assets repo, which already
hosts the print files.

Writes mockups.json: {sync_product_id: {"name": str, "images": [url, ...]}}
consumed by apply-printful-mockups.ts.

Rate limit is strict (~2 calls/min), hence the deliberate throttling.
"""
import json
import os
import subprocess
import time
import urllib.request

TOKEN = os.environ["PRINTFUL_API_TOKEN"]
STORE = "18510270"
ASSETS_REPO = "/private/tmp/shoppen-merch-assets-repo2"
ASSETS_SUBDIR = "mockups"
RAW_BASE = "https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets/main"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mockups.json")

# The mockup-generator endpoints allow ~2 requests/minute, and polling counts
# against it — so every call to them goes through one global rate limiter.
MG_MIN_GAP = 34
POLL_MAX = 8

# Non-artwork files that must never be treated as a print placement.
SKIP_FILE_TYPES = {"preview", "mockup", "label_inside", "label_outside"}

# A product page only needs a handful of angles; the generator otherwise
# returns a mockup per variant colour, which runs to dozens of near-duplicates.
MAX_IMAGES_PER_PRODUCT = 6

# Single-placement products (hoodies, beanies, caps) store their artwork under
# the generic "default" type, which is not itself a valid generator placement.
DEFAULT_PLACEMENT_PREFERENCE = ("front", "embroidery_front", "embroidery_front_large")

_last_mg_call = [0.0]


def call(path, method="GET", body=None):
    if path.startswith("/mockup-generator"):
        wait = MG_MIN_GAP - (time.time() - _last_mg_call[0])
        if wait > 0:
            time.sleep(wait)
        _last_mg_call[0] = time.time()

    req = urllib.request.Request(
        f"https://api.printful.com{path}",
        method=method,
        data=json.dumps(body).encode() if body else None,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "X-PF-Store-Id": STORE,
            "Content-Type": "application/json",
            "User-Agent": "Solkast-Medusa/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        print(f"    HTTP {e.code}: {e.read().decode()[:180]}")
        return None


_printfile_cache = {}


def printfile_info(catalog_product_id):
    """area dimensions per (variant_id, placement), cached per catalog product."""
    if catalog_product_id in _printfile_cache:
        return _printfile_cache[catalog_product_id]
    res = call(f"/mockup-generator/printfiles/{catalog_product_id}")
    if not res:
        _printfile_cache[catalog_product_id] = None
        return None
    r = res["result"]
    info = (
        {p["printfile_id"]: p for p in r["printfiles"]},
        {v["variant_id"]: v["placements"] for v in r["variant_printfiles"]},
    )
    _printfile_cache[catalog_product_id] = info
    return info


def generate(catalog_product_id, variant_ids, files_by_placement):
    info = printfile_info(catalog_product_id)
    if not info:
        return []
    by_id, var_placements = info
    ref_variant = next((v for v in variant_ids if v in var_placements), None)
    if ref_variant is None:
        print("    no printfile data for these variants")
        return []

    req_files = []
    for placement, (src_url, src_w, src_h) in files_by_placement.items():
        pf_id = var_placements[ref_variant].get(placement)
        if pf_id is None or pf_id not in by_id:
            continue
        p = by_id[pf_id]
        area_w, area_h = p["width"], p["height"]

        # Fit inside the print area preserving aspect ratio, then centre.
        # Filling the area outright stretches square artwork into a portrait
        # print file, which both distorts it and misrepresents where it prints.
        if src_w and src_h:
            scale = min(area_w / src_w, area_h / src_h)
            w, h = int(src_w * scale), int(src_h * scale)
        else:
            w, h = area_w, area_h
        left, top = int((area_w - w) / 2), int((area_h - h) / 2)

        req_files.append({
            "placement": placement,
            "image_url": src_url,
            "position": {
                "area_width": area_w, "area_height": area_h,
                "width": w, "height": h,
                "top": top, "left": left,
            },
        })
    if not req_files:
        print("    no usable placements")
        return []

    res = call(f"/mockup-generator/create-task/{catalog_product_id}", "POST",
               {"variant_ids": variant_ids[:6], "format": "jpg", "files": req_files})
    if not res:
        return []
    key = res["result"]["task_key"]

    for _ in range(POLL_MAX):
        t = call(f"/mockup-generator/task?task_key={key}")
        if not t:
            return []
        t = t["result"]
        if t["status"] == "completed":
            # Primary view per placement first, then alternate angles, so the
            # cap keeps the most useful images rather than colour duplicates.
            mains, extras = [], []
            for m in t.get("mockups", []):
                mains.append(m["mockup_url"])
                extras += [e["url"] for e in m.get("extra", [])]
            ordered, seen = [], set()
            for u in mains + extras:
                if u not in seen:
                    seen.add(u)
                    ordered.append(u)
            return ordered[:MAX_IMAGES_PER_PRODUCT]
        if t["status"] == "failed":
            print(f"    task failed: {json.dumps(t)[:160]}")
            return []
    print("    task timed out")
    return []


def main():
    dest_dir = os.path.join(ASSETS_REPO, ASSETS_SUBDIR)
    os.makedirs(dest_dir, exist_ok=True)

    products = call("/store/products?limit=100")["result"]
    manifest = {}

    for idx, summary in enumerate(products):
        pid = summary["id"]
        detail = call(f"/store/products/{pid}")
        if not detail:
            continue
        sp = detail["result"]["sync_product"]
        variants = detail["result"]["sync_variants"]
        if not variants:
            continue

        catalog_product_id = variants[0]["product"]["product_id"]
        variant_ids = [v["variant_id"] for v in variants]

        print(f"[{idx+1}/{len(products)}] {sp['name']}  (catalog {catalog_product_id})")

        # Placement names vary by product type ("front"/"back" on tees,
        # "default" on hoodies/beanies, "embroidery_front_large" on caps), so
        # take whatever the printfiles endpoint actually accepts for this
        # catalog product and keep the variant's real artwork files that match.
        info = printfile_info(catalog_product_id)
        if not info:
            print("    no printfile data, skipping")
            continue
        _, var_placements = info
        ref = next((v for v in variant_ids if v in var_placements), None)
        if ref is None:
            print("    no printfile data for these variants, skipping")
            continue
        accepted = set(var_placements[ref].keys())

        # `url` is null for dashboard-uploaded files, but the rendered preview
        # is a usable image source for mockup purposes.
        files_by_placement = {}
        for f in variants[0]["files"]:
            t = f["type"]
            if t in SKIP_FILE_TYPES or not f.get("preview_url"):
                continue
            src = (f["url"] or f["preview_url"], f.get("width"), f.get("height"))
            if t in accepted:
                files_by_placement[t] = src
            elif t == "default":
                target = next(
                    (p for p in DEFAULT_PLACEMENT_PREFERENCE if p in accepted),
                    next(iter(sorted(accepted)), None),
                )
                if target:
                    files_by_placement[target] = src

        if not files_by_placement:
            have = [f["type"] for f in variants[0]["files"]]
            print(f"    no artwork placement matched (files={have}, accepted={sorted(accepted)})")
            continue

        urls = generate(catalog_product_id, variant_ids, files_by_placement)
        if not urls:
            continue

        hosted = []
        slug = f"pf-{pid}"
        for n, u in enumerate(urls):
            fn = f"{slug}-{n}.jpg"
            try:
                urllib.request.urlretrieve(u, os.path.join(dest_dir, fn))
            except Exception as e:
                print(f"    download failed: {e}")
                continue
            hosted.append(f"{RAW_BASE}/{ASSETS_SUBDIR}/{fn}")
        print(f"    {len(hosted)} mockup(s) saved")
        manifest[str(pid)] = {"name": sp["name"], "images": hosted}


    with open(OUT, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nwrote {OUT} ({len(manifest)} product(s))")

    subprocess.run(["git", "add", ASSETS_SUBDIR], cwd=ASSETS_REPO, check=True)
    r = subprocess.run(["git", "commit", "-m", "Add generated multi-view product mockups"],
                       cwd=ASSETS_REPO, capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip())
    subprocess.run(["git", "push", "origin", "main"], cwd=ASSETS_REPO, check=True)
    print("pushed to assets repo")


if __name__ == "__main__":
    main()

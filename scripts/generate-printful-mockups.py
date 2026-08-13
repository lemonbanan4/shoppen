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
# Ångerköp by default; the old Solkast store is 18510270 (archive).
STORE = os.environ.get("PRINTFUL_STORE_ID", "18510270")
# Not /private/tmp: macOS's periodic tmp cleaner reaps files older than a few
# days and it gutted the previous clone's .git (HEAD and config deleted).
ASSETS_REPO = "/Users/lemon/development/shoppen/shoppen-merch-assets"
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
_catalog_type_cache = {}
_catalog_meta_cache = {}


def catalog_meta(catalog_product_id):
    if catalog_product_id not in _catalog_meta_cache:
        res = call(f"/products/{catalog_product_id}")
        _catalog_meta_cache[catalog_product_id] = (res or {}).get("result", {}).get("product")
    return _catalog_meta_cache[catalog_product_id]


def catalog_type(catalog_product_id):
    if catalog_product_id not in _catalog_type_cache:
        res = call(f"/products/{catalog_product_id}")
        _catalog_type_cache[catalog_product_id] = (
            (res or {}).get("result", {}).get("product", {}).get("type") or ""
        )
    return _catalog_type_cache[catalog_product_id]


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


# On-model mockup styles. Printful photographs real models wearing the
# blank and composites the artwork onto them, so the print stays accurate —
# unlike generating a person and a garment from scratch.
ON_MODEL_GROUPS = {"womens": "Women's", "mens": "Men's", "unisex": "Men's"}


def classify_fit(product_name, catalog_title):
    hay = f"{catalog_title or ''} {product_name}".lower()
    if any(k in hay for k in ("women", "sports bra", "crop top", "leggings", "bodycon")):
        return "womens"
    if any(k in hay for k in ("men'", "mens ", "board shorts", "swim trunks")):
        return "mens"
    return "unisex"


def resolve_placement(file_type, accepted):
    """Map a stored file's `type` onto a placement the generator accepts.

    Three things make this not a lookup by name:

    Printful files a single-placement upload under the generic type "default"
    rather than the placement it was sent as.

    It also renames some placements between endpoints. Joggers are created with
    `leg_left`/`leg_right`, which is what /mockup-generator/printfiles lists,
    and come back from /store/products as `left_leg`/`right_leg` — the same
    placement with the words the other way round.

    And the last-resort fallback has to skip the label placements. They are
    accepted placements and `label_inside` sorts first alphabetically, so
    picking the first accepted name put a garment's artwork on its neck label.
    """
    if file_type in accepted:
        return file_type
    swapped = PLACEMENT_ALIASES.get(file_type)
    if swapped in accepted:
        return swapped
    if file_type != "default":
        return None
    artwork = sorted(p for p in accepted if not p.startswith("label_"))
    return next((p for p in DEFAULT_PLACEMENT_PREFERENCE if p in accepted),
                artwork[0] if artwork else None)


# Placements Printful reports under a different name than it accepts.
PLACEMENT_ALIASES = {
    "left_leg": "leg_left", "right_leg": "leg_right",
    "leg_left": "left_leg", "leg_right": "right_leg",
}


def exact_fit(catalog_product_id, variant_ids, files):
    """True when every artwork file already matches its print area exactly.

    The re-fit in generate() scales artwork to fit the panel and centres it.
    For a normal garment that is what you want. For a cut-and-sew one it moves
    the design relative to the seams, so the mockup shows the print somewhere
    it will not be. When the sheet was authored at the panel's own dimensions
    the scale factor is 1 and the offsets are 0, and the mockup is truthful.

    Anything unknown — a file with no dimensions reported, a placement with no
    printfile — counts as not exact, because the point is to be sure.
    """
    info = printfile_info(catalog_product_id)
    if not info:
        return False
    by_id, var_placements = info
    ref = next((v for v in variant_ids if v in var_placements), None)
    if ref is None:
        return False
    accepted = var_placements[ref]
    checked = 0
    for f in files:
        if f["type"] in SKIP_FILE_TYPES:
            continue
        placement = resolve_placement(f["type"], accepted)
        pf_id = accepted.get(placement) if placement else None
        if pf_id is None or pf_id not in by_id:
            return False
        p = by_id[pf_id]
        if (f.get("width"), f.get("height")) != (p["width"], p["height"]):
            return False
        checked += 1
    return checked > 0


def generate(catalog_product_id, variant_ids, files_by_placement, option_group=None):
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
               {
                   "variant_ids": variant_ids[:6],
                   "format": "jpg",
                   "files": req_files,
                   # On-model shots plus clean flat views. Restricting
                   # `options` as well collapsed most products to a single
                   # image, so let each group return its own angles.
                   **({"option_groups": [option_group, "Ghost"]}
                      if option_group else {}),
               })
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

    # Regenerating one product should not cost a full sweep: every mockup task
    # is rate limited to one call per MG_MIN_GAP seconds, so a whole-catalogue
    # run takes the better part of an hour.
    #
    #   ONLY_IDS=451936716 python scripts/generate-printful-mockups.py
    only = {
        i.strip() for i in os.environ.get("ONLY_IDS", "").split(",") if i.strip()
    }
    if only:
        products = [p for p in products if str(p["id"]) in only]
        print(f"ONLY_IDS set — regenerating {len(products)} product(s): {sorted(only)}")

    # Start from the existing manifest so a targeted run updates its entries
    # instead of dropping every other product's mockups on the floor.
    manifest = {}
    if os.path.exists(OUT):
        try:
            with open(OUT) as f:
                manifest = json.load(f)
            print(f"loaded existing manifest ({len(manifest)} product(s))")
        except Exception as e:
            print(f"could not read existing manifest ({e}), starting fresh")

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

        # All-over-print garments are assembled from per-panel print files, and
        # the danger with them is the re-fit below: artwork that is not already
        # the exact size of the panel gets scaled and centred, which slides the
        # design relative to the seams and produces mockups that misrepresent
        # where the print actually lands.
        #
        # That is a property of the artwork, not of the product type. A sheet
        # authored at the printfile's own dimensions re-fits by a factor of
        # exactly 1 — nothing moves — and those garments are the ones that most
        # need more than one image, being the most expensive things here and
        # the hardest to picture from a flat preview.
        #
        # So the check is now "would this be rescaled?" rather than "is this
        # cut-and-sew?". Anything that would move still falls back to
        # Printful's own preview file, which remains authoritative.
        if catalog_type(catalog_product_id) == "CUT-SEW" and not exact_fit(
            catalog_product_id, variant_ids, variants[0]["files"]
        ):
            print("    cut-and-sew with rescaled artwork — skipping, "
                  "preview file is authoritative")
            continue

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
            target = resolve_placement(t, accepted)
            if target:
                files_by_placement[target] = src

        if not files_by_placement:
            have = [f["type"] for f in variants[0]["files"]]
            print(f"    no artwork placement matched (files={have}, accepted={sorted(accepted)})")
            continue

        catalog_title = (catalog_meta(catalog_product_id) or {}).get("title")
        group = ON_MODEL_GROUPS.get(classify_fit(sp["name"], catalog_title))
        urls = generate(catalog_product_id, variant_ids, files_by_placement, group)
        if not urls and group:
            print("    on-model unavailable, falling back to flat")
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


    # Tag what this run produced with the store it came from, so a later run
    # against a different store can tell "this product was deleted" apart from
    # "this product was never mine". The manifest is shared across brands.
    for pid in list(manifest):
        if str(pid) in {str(p["id"]) for p in products}:
            manifest[pid]["store"] = str(STORE)

    # Drop entries for products that no longer exist upstream, so a deleted
    # product's mockups do not linger and get re-applied by the sync.
    #
    # Scoped two ways, both learned the hard way. A targeted run does not prune
    # at all: ONLY_IDS means "regenerate these two", and inferring catalogue-wide
    # deletions from it is not something the caller asked for. And a full run
    # only prunes entries belonging to the store it just queried — running this
    # for the second brand once declared all ten of the first brand's products
    # gone, because they were absent from a product list they were never in.
    if only:
        print("ONLY_IDS set — not pruning (a targeted run cannot see deletions)")
    else:
        live_ids = {str(p["id"]) for p in products}
        removed = [
            k for k, v in manifest.items()
            if k not in live_ids and str(v.get("store", STORE)) == str(STORE)
        ]
        for k in removed:
            print(f"pruning {k} ({manifest[k].get('name','?')}) — gone from Printful")
            del manifest[k]
        kept = len(manifest) - len(live_ids & set(manifest))
        if kept:
            print(f"kept {kept} entry(s) belonging to other stores")

    # Write every location the sync looks in. These had drifted into two
    # copies once already, and because the sync takes the first candidate it
    # finds, a stale copy silently wins and newly generated mockups are never
    # applied — the sync reports success having used week-old image URLs.
    targets = [
        OUT,
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                     "apps", "backend", "mockups.json"),
    ]
    for t in targets:
        os.makedirs(os.path.dirname(t), exist_ok=True)
        with open(t, "w") as f:
            json.dump(manifest, f, indent=2)
        print(f"wrote {t} ({len(manifest)} product(s))")

    subprocess.run(["git", "add", ASSETS_SUBDIR], cwd=ASSETS_REPO, check=True)
    r = subprocess.run(["git", "commit", "-m", "Add generated multi-view product mockups"],
                       cwd=ASSETS_REPO, capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip())
    subprocess.run(["git", "push", "origin", "main"], cwd=ASSETS_REPO, check=True)
    print("pushed to assets repo")


if __name__ == "__main__":
    main()

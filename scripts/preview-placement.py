#!/usr/bin/env python3
"""
Render a Printful mockup for a placement idea without creating a product.

/mockup-generator/create-task takes a catalogue product id and a set of files
directly — it does not need a store product. So a placement can be seen on a
real garment before anything is listed, which matters here because Printful has
no upsert: a product created to look at is a product that has to be deleted, and
deleting one that has already been referenced is worse than not making it.

Written for the sleeve question. A repeating stripe down a hoodie arm is easy to
describe and hard to picture, and the flat 450x1800 strip does not show what it
looks like on a sleeve that tapers and turns.

    python3 scripts/preview-placement.py --catalog 831 --variant 10779 \\
        --file front=https://.../art.png --file sleeve_left=https://.../stripe.png

Writes the returned mockups to designv6/build/preview/.
"""
import argparse
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request

OUT = pathlib.Path("/Users/lemon/development/shoppen/designv6/build/preview")
UA = "Solkast-Medusa/1.0"
MG_MIN_GAP = 34
POLL_MAX = 10


def call(path, token, store, body=None):
    req = urllib.request.Request(
        "https://api.printful.com" + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {token}",
                 "X-PF-Store-Id": str(store),
                 "User-Agent": UA,
                 "Content-Type": "application/json"},
        method="POST" if body is not None else "GET")
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        print(f"    HTTP {e.code}: {e.read().decode()[:300]}", file=sys.stderr)
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalog", type=int, required=True)
    ap.add_argument("--variant", type=int, action="append", required=True)
    ap.add_argument("--file", action="append", required=True,
                    help="placement=url, repeatable")
    ap.add_argument("--slug", default="preview")
    args = ap.parse_args()

    token = os.environ.get("PRINTFUL_SOLKAST_API_TOKEN")
    store = os.environ.get("PRINTFUL_SOLKAST_STORE_ID")
    if not token or not store:
        print("Set PRINTFUL_SOLKAST_API_TOKEN and PRINTFUL_SOLKAST_STORE_ID.",
              file=sys.stderr)
        return 1

    pf = call(f"/mockup-generator/printfiles/{args.catalog}", token, store)
    if not pf:
        return 1
    dims = {f["printfile_id"]: f for f in pf["result"]["printfiles"]}
    placements = pf["result"]["variant_printfiles"][0]["placements"]

    files = []
    for spec in args.file:
        placement, url = spec.split("=", 1)
        fid = placements.get(placement)
        if fid is None:
            print(f"  {placement} is not a placement on catalogue "
                  f"{args.catalog}; have {sorted(placements)}", file=sys.stderr)
            return 1
        d = dims[fid]
        # Full-area position: the artwork was built to this placement, so
        # letting Printful fit it would move it.
        files.append({"placement": placement, "image_url": url,
                      "position": {"area_width": d["width"],
                                   "area_height": d["height"],
                                   "width": d["width"], "height": d["height"],
                                   "top": 0, "left": 0}})
        print(f"  {placement:<14} {d['width']}x{d['height']}  {url.rsplit('/',1)[-1]}")

    res = call(f"/mockup-generator/create-task/{args.catalog}", token, store,
               {"variant_ids": args.variant, "format": "jpg", "files": files})
    if not res:
        return 1
    key = res["result"]["task_key"]

    OUT.mkdir(parents=True, exist_ok=True)
    for _ in range(POLL_MAX):
        time.sleep(MG_MIN_GAP)
        t = call(f"/mockup-generator/task?task_key={key}", token, store)
        if not t:
            return 1
        t = t["result"]
        if t["status"] == "completed":
            urls = []
            for m in t.get("mockups", []):
                urls.append(m["mockup_url"])
                urls += [e["url"] for e in m.get("extra", [])]
            for i, u in enumerate(urls[:8]):
                dst = OUT / f"{args.slug}-{i}.jpg"
                urllib.request.urlretrieve(u, dst)
                print(f"  saved {dst}")
            return 0
        if t["status"] == "failed":
            print(f"  task failed: {json.dumps(t)[:200]}", file=sys.stderr)
            return 1
        print("  rendering...", flush=True)
    print("  timed out", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

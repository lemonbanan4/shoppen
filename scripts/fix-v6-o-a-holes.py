#!/usr/bin/env python3
"""
Point Chase the Light and Stay Golden at the corrected front printfile.

Both wordmarks draw a decorative star inside the counter of the O and a
triangular gap inside the A — enclosed shapes that the border-connected flood
fill correctly leaves alone, and which turn out to be holes rather than
artwork: they sit on a patch of the original field with nothing distinguishing
them as background except that they are not connected to the border. On the
navy design this printed as a solid blob and triangle; on the transparent
design it printed as Firefly's literal checkerboard.

Only the front placement changes. The sleeve wordmark is untouched — carried
back unmodified, by URL, exactly as it already was on the product.

    python3 scripts/fix-v6-o-a-holes.py --dry-run
    python3 scripts/fix-v6-o-a-holes.py
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

RAW = "https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets/main"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

FIXES = {
    "455671199": ("Chase the Light Tee", f"{RAW}/solkast-v6/solkast-v6-chase-the-light-fix.png"),
    "455671241": ("Stay Golden Tee", f"{RAW}/solkast-v6/solkast-v6-stay-golden-fix.png"),
}


def request(path, token, store, body=None, method=None):
    req = urllib.request.Request(
        "https://api.printful.com" + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {token}", "X-PF-Store-Id": str(store),
                 "User-Agent": UA, "Content-Type": "application/json"},
        method=method or ("POST" if body is not None else "GET"))
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def reachable(url):
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
        with urllib.request.urlopen(req) as r:
            return int(r.headers.get("content-length") or 0)
    except urllib.error.URLError:
        return None


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

    rc = 0
    for pid, (name, url) in FIXES.items():
        size = reachable(url)
        if size is None:
            print(f"  {name}: unreachable {url}", file=sys.stderr)
            rc = 1
            continue

        detail = request(f"/store/products/{pid}", token, store)["result"]
        variants = detail["sync_variants"]
        ref = variants[0]

        files = []
        for f in ref["files"]:
            if f["type"] in ("preview", "mockup"):
                continue
            files.append({
                "type": f["type"],
                "url": url if f["type"] == "front" else f["url"],
                "position": f.get("position"),
            })

        if args.dry_run:
            print(f"  {name}: {len(variants)} variants, {len(files)} placements")
            for f in files:
                print(f"      {f['type']:<14} {f['url'].rsplit('/', 1)[-1]}")
            continue

        payload = [{"id": v["id"], "files": files} for v in variants]
        try:
            request(f"/store/products/{pid}", token, store,
                    {"sync_variants": payload}, method="PUT")
        except urllib.error.HTTPError as e:
            print(f"  FAILED {name}: {e.code} {e.read().decode()[:300]}",
                  file=sys.stderr)
            rc = 1
            continue

        after = request(f"/store/products/{pid}", token, store)["result"]
        got = after["sync_variants"]
        art = [f for f in got[0]["files"] if f["type"] not in ("preview", "mockup")]
        front = next((f for f in art if f["type"] == "front"), {})
        ok = (len(got) == len(variants) and len(art) == len(files)
              and front.get("url") == url)
        print(f"  {'ok ' if ok else '** '}{name}: {len(got)} variants, "
              f"{len(art)} placements, front={front.get('url','?').rsplit('/',1)[-1]}")
        if not ok:
            rc = 1
    return rc


if __name__ == "__main__":
    raise SystemExit(main())

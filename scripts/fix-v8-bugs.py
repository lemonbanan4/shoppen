#!/usr/bin/env python3
"""Update the 3 buggy designv8 products with corrected printfiles."""
import json, os, sys, time, urllib.request, urllib.error

RAW = "https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets/main/solkast-v8"
UA = "Solkast-Fix/1.0"

FIXES = [
    (455912558, "solkast-horizon-head-v2.png", "back"),
    (455912627, "solkast-chaos3-head-v2.png", "back"),
    (455912608, "solkast-mindscape-head-v2.png", "back"),
]

POS = {"area_width": 1800, "area_height": 2400, "width": 1800, "height": 2400, "top": 0, "left": 0}


def call(path, token, store, body=None, method=None):
    req = urllib.request.Request(
        "https://api.printful.com" + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {token}", "X-PF-Store-Id": str(store),
                 "User-Agent": UA, "Content-Type": "application/json"},
        method=method or ("POST" if body is not None else "GET"))
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def main():
    token = os.environ.get("PRINTFUL_SOLKAST_API_TOKEN")
    store = os.environ.get("PRINTFUL_SOLKAST_STORE_ID")
    if not token or not store:
        print("Set PRINTFUL_SOLKAST_API_TOKEN and PRINTFUL_SOLKAST_STORE_ID.", file=sys.stderr)
        return 1

    for pid, art, placement in FIXES:
        url = f"{RAW}/{art}"
        res = call(f"/store/products/{pid}", token, store)
        variants = res["result"]["sync_variants"]
        for v in variants:
            v["files"] = [{"type": placement, "url": url, "position": POS}]
            v.pop("product", None)
        body = {"sync_variants": [
            {"id": v["id"], "retail_price": v["retail_price"], "files": v["files"]}
            for v in variants
        ]}
        try:
            r = call(f"/store/products/{pid}", token, store, body, method="PUT")
            print(f"  ok {pid} {art}")
        except urllib.error.HTTPError as e:
            print(f"  FAILED {pid}: {e.code} {e.read().decode()[:300]}", file=sys.stderr)
        time.sleep(3)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

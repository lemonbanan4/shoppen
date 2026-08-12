#!/usr/bin/env python3
"""
Push every published design asset into Printful's file library.

Files only — no products. POST /files adds to the library and stops there,
which is the half of the operation that is safe to repeat: Printful returns
the existing record when the same URL is submitted twice, whereas a product
script has no upsert and duplicates the whole store on a second run.

Ingest is by URL because the public API has no binary upload, so anything
listed here has to be committed and pushed to the assets repo first. Printful
also caches by URL at the moment it fetches, which is why a corrected file
must be published under a new name rather than overwritten — the old URL keeps
resolving to the old bytes on their side.

Note that /files cannot be listed back (the endpoint now returns 410 Gone), so
there is no way to diff against what is already there. Re-uploading everything
is the intended usage.

    python3 scripts/upload-assets-to-printful.py --dry-run
    python3 scripts/upload-assets-to-printful.py
    python3 scripts/upload-assets-to-printful.py --folder solkast-v4

Writes designv4/build/printful-library.json mapping filename -> file id.
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

REPO = pathlib.Path("/Users/lemon/development/shoppen/shoppen-merch-assets")
RAW = ("https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets"
       "/main")
OUT = pathlib.Path("/Users/lemon/development/shoppen/designv4/build/"
                   "printful-library.json")

FOLDERS = ["solkast-v2", "solkast-v3", "solkast-v4", "solkast-embroidery",
           "solkast-designs", "solkast-prints"]


def request(path, token, store, body=None, attempts=6):
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
    ap.add_argument("--folder", action="append", default=None)
    args = ap.parse_args()

    token = os.environ.get("PRINTFUL_SOLKAST_API_TOKEN")
    store = os.environ.get("PRINTFUL_SOLKAST_STORE_ID")
    if not token or not store:
        print("Set PRINTFUL_SOLKAST_API_TOKEN and PRINTFUL_SOLKAST_STORE_ID.",
              file=sys.stderr)
        return 1

    folders = args.folder or FOLDERS
    jobs = []
    for folder in folders:
        d = REPO / folder
        if not d.is_dir():
            print(f"  skipping {folder} (not in the assets repo)")
            continue
        for p in sorted(d.glob("*.png")):
            jobs.append((folder, p.name, f"{RAW}/{folder}/{p.name}"))

    print(f"  {len(jobs)} file(s) across {len(folders)} folder(s)")
    if args.dry_run:
        for folder, name, _ in jobs:
            print(f"    {folder}/{name}")
        return 0

    done, failed = {}, []
    for i, (folder, name, url) in enumerate(jobs, 1):
        try:
            res = request("/files", token, store,
                          {"type": "default", "url": url, "filename": name,
                           "visible": True})
            f = res.get("result") or {}
            done[name] = {"id": f.get("id"), "folder": folder,
                          "status": f.get("status")}
            print(f"  [{i:>3}/{len(jobs)}] ok {name[:52]:<54} id={f.get('id')}")
        except urllib.error.HTTPError as e:
            failed.append((name, e.code, e.read().decode()[:120]))
            print(f"  [{i:>3}/{len(jobs)}] FAILED {name}: {e.code}",
                  file=sys.stderr)
        time.sleep(1.5)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    json.dump(done, open(OUT, "w"), indent=1)
    print(f"\n  {len(done)} in the library, {len(failed)} failed. "
          f"No products created.\n  ids -> {OUT}")
    for name, code, msg in failed:
        print(f"    {name}: {code} {msg}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

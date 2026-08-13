#!/usr/bin/env python3
"""
Turn a batch of Firefly exports into DTG-ready printfiles.

The generalised form of prep-designv5.py, which was prep-designv4.py's method
with a different table bolted on. A third copy for designv6 would have been the
point where the three drifted apart, so the batch is described in a manifest
and the code is shared.

The method itself is unchanged and lives in prep-designv4.py, which this
imports rather than restates: upscale 4x and back down so edges are
reconstructed rather than interpolated, flood-fill the background from the
corners so interior blacks survive, then un-mat the edge so no halo of the old
background is left in the anti-aliasing.

What this adds is the field check. Each design declares the garment it was
drawn for, and a design whose corners disagree with its declaration stops the
build instead of being guessed at. That is the Rose Sun failure — a light-field
design listed on black, printing its wordmark black on black — caught before it
reaches a garment rather than after.

A manifest is a JSON list of {source, slug, field}, where field is "dark" or
"light":

    [{"source": "new1.png", "slug": "solkast-v6-monogram", "field": "dark"}]

    python3 scripts/prep-firefly-batch.py --root ~/development/shoppen/designv6 \
        --manifest designv6.json --dry-run

Writes <root>/build/print/<slug>.png at the placement size with real alpha.
"""
import argparse
import importlib.util
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent

# Blaster 2.0 (823) front placement at 150dpi, which the Radder 2.0 sweatshirt
# shares. Overridable for the blanks that differ — the Slammer 2.0 hoodie front
# is 1875x1875 square.
DEFAULT_SIZE = (1800, 2400)


def load_pipeline(build, print_dir, up, size):
    """Reuse the designv4 pipeline rather than restate it."""
    spec = importlib.util.spec_from_file_location(
        "prep_designv4", HERE / "prep-designv4.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    # Its helpers read these as module globals. Repointing them is what lets the
    # same code write into any batch directory at any placement size.
    mod.BUILD, mod.PRINT, mod.UP = build, print_dir, up
    mod.PW, mod.PH = size
    return mod


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--size", help="WxH placement, default 1800x2400")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    root = pathlib.Path(args.root).expanduser()
    manifest = pathlib.Path(args.manifest).expanduser()
    if not manifest.is_absolute() and not manifest.exists():
        manifest = HERE / "manifests" / manifest.name
    if not manifest.exists():
        print(f"No manifest at {manifest}", file=sys.stderr)
        return 1

    size = DEFAULT_SIZE
    if args.size:
        w, h = args.size.lower().split("x")
        size = (int(w), int(h))

    build = root / "build"
    print_dir, up = build / "print", build / "upscaled"
    print_dir.mkdir(parents=True, exist_ok=True)
    up.mkdir(parents=True, exist_ok=True)
    p4 = load_pipeline(build, print_dir, up, size)

    designs = json.loads(manifest.read_text())
    pw, ph = size
    rc = 0
    for d in designs:
        src = root / d["source"]
        slug, expected = d["slug"], d["field"]
        if not src.exists():
            print(f"  missing: {src}", file=sys.stderr)
            rc = 1
            continue

        kind = p4.classify(src)
        if kind != expected:
            print(f"  {d['source']}: corners say {kind}, manifest says "
                  f"{expected} — refusing to guess", file=sys.stderr)
            rc = 1
            continue

        dst = print_dir / f"{slug}.png"
        if args.dry_run:
            print(f"  {d['source'][:40]:<42} -> {slug:<34} {kind:<5} {pw}x{ph}")
            continue

        # Seed the fill on the design's own corner rather than assuming black
        # or white. One of these was drawn on navy (#04172F), which is far
        # enough from black that a "black" seed matched nothing and the entire
        # field survived as a solid rectangle.
        seed = d.get("seed") or p4.corner_colour(src)
        sw, sh_ = map(int, p4.sh(["magick", str(src), "-format", "%w %h",
                                  "info:"]).stdout.split())

        if d.get("key_first"):
            # Key at the source's own size, then upscale the keyed result.
            # Needed when the background is a baked-in checkerboard: crisp in
            # the original its two tones fall inside one fuzz, but upscaled
            # first every square gains a soft border that falls outside, and
            # the fill leaves a ghost grid behind.
            print(f"  {slug}: keying ({kind}) before upscale...", flush=True)
            keyed = up / f"{slug}-keyed.png"
            p4.key_only(src, keyed, kind, d.get("fuzz"), seed)
            p4.upscale(keyed, up / f"{slug}-4x.png")
            p4.fit_only(up / f"{slug}-4x.png", dst)
        else:
            print(f"  {slug}: upscaling...", flush=True)
            p4.upscale(src, up / f"{slug}-4x.png")
            print(f"  {slug}: keying ({kind}) and fitting...", flush=True)
            p4.key_and_fit(up / f"{slug}-4x.png", dst, kind, d.get("fuzz"), seed)
        p4.unmat(dst, kind)

        got = p4.sh(["magick", str(dst), "-format", "%wx%h", "info:"]).stdout
        opaque = float(p4.sh(["magick", str(dst), "-alpha", "extract",
                              "-format", "%[fx:mean]", "info:"]).stdout or 0)
        # The corner test, not a coverage band.
        #
        # A coverage number cannot tell "background removed" from "background
        # intact" — a 2:3 source in a 3:4 placement reads about 89% either way,
        # because the letterboxing alone accounts for the rest. Using a 5-95%
        # band here let two files through with their backgrounds fully intact:
        # a navy rectangle and a ghost checkerboard, both of which would have
        # printed. background_gone() looks just inside the content rectangle,
        # where the answer actually differs.
        cleared = p4.background_gone(dst, sw, sh_)
        ok = got == f"{pw}x{ph}" and cleared and opaque > 0.02
        print(f"  {'ok ' if ok else '** '}{dst.name}  {got}  ink {opaque*100:.1f}%"
              f"  background {'cleared' if cleared else 'STILL THERE'}")
        if not ok:
            print(f"     the artwork's own corner is still opaque — the fill "
                  f"seed ({seed}) did not match this background.",
                  file=sys.stderr)
            rc = 1
    return rc


if __name__ == "__main__":
    raise SystemExit(main())

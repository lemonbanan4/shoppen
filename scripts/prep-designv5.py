#!/usr/bin/env python3
"""
Turn the designv5 exports into DTG-ready printfiles.

Same three stages as designv4 — upscale, key from the corners, unmat the edge —
and deliberately the same code: this imports prep-designv4 and repoints its
paths rather than restating the method. Every one of those steps exists because
of a specific failure that cost a re-render, and a second copy would drift from
the first exactly when it mattered. The notes on why each stage is shaped the
way it is live there.

What is new here is the pair. new1 is drawn on black and new2 on white, which
means they are not two designs to be sold the same way: each is keyed against
its own field, and each belongs on the garment colour it was drawn for. The
shop already has one product that got this wrong — Rose Sun, a light-field
design listed on black, where the wordmark printed black on black.

So the garment colour is decided here, from the artwork, and carried through to
the product script rather than chosen later by eye.

    python3 scripts/prep-designv5.py --dry-run
    python3 scripts/prep-designv5.py

Writes designv5/build/print/<slug>.png at 1800x2400 with real alpha.
"""
import argparse
import importlib.util
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = pathlib.Path("/Users/lemon/development/shoppen/designv5")
BUILD = ROOT / "build"
PRINT = BUILD / "print"
UP = BUILD / "upscaled"

# Blaster 2.0 (823) front placement, 150dpi — same blank as the v4 tees.
PW, PH = 1800, 2400


def load_v4():
    """Reuse the designv4 pipeline rather than restate it."""
    path = HERE / "prep-designv4.py"
    spec = importlib.util.spec_from_file_location("prep_designv4", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    # Its helpers read these as module globals. Repointing them is what makes
    # the same code write into designv5.
    mod.BUILD, mod.PRINT, mod.UP = BUILD, PRINT, UP
    mod.PW, mod.PH = PW, PH
    return mod


# (source, slug, the garment the artwork was drawn for)
DESIGNS = [
    ("new1.png", "solkast-v5-sun-monogram-dark", "dark"),
    ("new2.png", "solkast-v5-sun-monogram-light", "light"),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    p4 = load_v4()
    PRINT.mkdir(parents=True, exist_ok=True)
    UP.mkdir(parents=True, exist_ok=True)

    rc = 0
    for src_name, slug, expected in DESIGNS:
        src = ROOT / src_name
        if not src.exists():
            print(f"  missing: {src}", file=sys.stderr)
            rc = 1
            continue

        # Classified from the corners, then checked against what the design was
        # meant for. A mismatch here is the Rose Sun failure caught before it
        # reaches a garment, so it stops the build rather than warning.
        kind = p4.classify(src)
        if kind != expected:
            print(f"  {src_name}: corners say {kind}, expected {expected} — "
                  f"refusing to guess", file=sys.stderr)
            rc = 1
            continue

        dst = PRINT / f"{slug}.png"
        if args.dry_run:
            print(f"  {src_name:<10} -> {dst.name:<38} {kind:<5} {PW}x{PH}")
            continue

        up = UP / f"{slug}-4x.png"
        print(f"  {src_name}: upscaling...", flush=True)
        p4.upscale(src, up)
        print(f"  {src_name}: keying ({kind}) and fitting...", flush=True)
        p4.key_and_fit(up, dst, kind)
        p4.unmat(dst, kind)

        # The checks that caught real breakage on the v4 run: a background that
        # survived, and an image so eroded there is nothing left to print.
        opaque = float(p4.sh(["magick", str(dst), "-alpha", "extract",
                              "-format", "%[fx:mean]", "info:"]).stdout or 0)
        size = p4.sh(["magick", str(dst), "-format", "%wx%h", "info:"]).stdout
        ok = size == f"{PW}x{PH}" and 0.05 < opaque < 0.95
        print(f"  {'ok ' if ok else '** '}{dst.name}  {size}  "
              f"ink {opaque*100:.1f}%")
        if not ok:
            print(f"     expected {PW}x{PH} and 5-95% coverage; "
                  f"a near-100% figure means the background survived.",
                  file=sys.stderr)
            rc = 1

    return rc


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
Turn one horizontal SOLKAST wordmark into both sleeve printfiles.

The two sleeves in this shop are not the same shape and cannot share a file:

    tee (Blaster 2.0)          600x525    4 x 3.5 in    almost square
    hoodie / sweatshirt        450x1800   3 x 12 in     a 1:4 strip

So this takes a single wide render and produces both — fitting it into the tee
patch as-is, and rotating it a quarter turn for the long sleeve. That rotation
is the reason to author the artwork horizontally in the first place: generators
handle a 4:1 landscape composition far better than a 1:4 portrait one, and
lettering drawn into a tall narrow box tends to come back stacked or cramped.

Which way it rotates is a real decision, not a default. Streetwear sleeve type
reads top-to-bottom on both arms, which means the left sleeve rotates one way
and the right the other, or the text runs upside down on one arm. Printful
prints exactly what it is given, so both are generated here.

Keying and unmatting are the designv4 pipeline, imported rather than restated
for the same reason as prep-designv5.

    python3 scripts/prep-sleeve-print.py <wordmark.png> --slug solkast-arch
    python3 scripts/prep-sleeve-print.py <wordmark.png> --slug x --dry-run

Writes designv5/build/sleeves/<slug>-{tee,sleeve-left,sleeve-right}.png
"""
import argparse
import importlib.util
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
OUT = pathlib.Path("/Users/lemon/development/shoppen/designv5/build/sleeves")

# Printful placements, read from /mockup-generator/printfiles.
TEE = (600, 525)          # 823 sleeve_left / sleeve_right
LONG = (450, 1800)        # 831 and 822 sleeve_left / sleeve_right


def sh(a):
    return subprocess.run(a, capture_output=True, text=True)


def fx(path, expr):
    return sh(["magick", str(path), "-format", expr, "info:"]).stdout.strip()


def load_v4(build_dir):
    """Reuse the proven keying pipeline rather than restate it."""
    spec = importlib.util.spec_from_file_location(
        "prep_designv4", HERE / "prep-designv4.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.BUILD = build_dir
    return mod


def fit(src, dst, size, rotate=0):
    """Fit inside the placement, centred, on transparency.

    Fitted rather than filled: a wordmark stretched to a print area is a
    different wordmark. The unused space is transparent, so the garment shows
    through and the type sits where it was drawn.
    """
    w, h = size
    cmd = ["magick", str(src)]
    if rotate:
        cmd += ["-background", "none", "-rotate", str(rotate)]
    cmd += ["-resize", f"{w}x{h}", "-background", "none",
            "-gravity", "center", "-extent", f"{w}x{h}", str(dst)]
    r = sh(cmd)
    if not dst.exists():
        raise RuntimeError(f"fit failed: {r.stderr[-300:]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("wordmark")
    ap.add_argument("--slug", required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    src = pathlib.Path(args.wordmark).expanduser()
    if not src.exists():
        print(f"No such file: {src}", file=sys.stderr)
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    p4 = load_v4(OUT)

    kind = p4.classify(src)
    w, h = int(fx(src, "%w")), int(fx(src, "%h"))
    print(f"  source {w}x{h}, {kind} field")
    if h > w:
        print("  Note: this is taller than it is wide. Author the wordmark "
              "horizontally — it is rotated here for the long sleeve.",
              file=sys.stderr)

    targets = [
        (f"{args.slug}-tee.png", TEE, 0),
        # Rotated in opposite directions so the type reads top-to-bottom on
        # whichever arm it is on.
        (f"{args.slug}-sleeve-left.png", LONG, 90),
        (f"{args.slug}-sleeve-right.png", LONG, -90),
    ]
    if args.dry_run:
        for name, size, rot in targets:
            print(f"  {name:<36} {size[0]}x{size[1]}  rotate {rot}")
        return 0

    keyed = OUT / f"_{args.slug}-keyed.png"
    p4.key_only(src, keyed, kind)
    p4.unmat(keyed, kind)

    rc = 0
    for name, size, rot in targets:
        dst = OUT / name
        fit(keyed, dst, size, rot)
        got = fx(dst, "%wx%h")
        ink = float(fx(dst, "%[fx:mean.a]") or 0)
        ok = got == f"{size[0]}x{size[1]}" and ink > 0.01
        if not ok:
            rc = 1
        print(f"  {'ok ' if ok else '** '}{name:<36} {got}  ink {ink*100:.1f}%")
        if ink <= 0.01:
            print("     nothing survived keying — check the background colour",
                  file=sys.stderr)
    keyed.unlink(missing_ok=True)

    if not rc:
        print(f"\n  sleeves in {OUT}")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())

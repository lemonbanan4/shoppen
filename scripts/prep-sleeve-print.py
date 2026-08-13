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


def fit(src, dst, size, rotate=0, repeat=1, gap=0.35):
    """Place the wordmark in the print area, once or repeated down it.

    Fitted rather than stretched: a wordmark pulled to fill a print area is a
    different wordmark. Unused space stays transparent so the garment shows
    through.

    Repeating matters on the long sleeve. A single mark fitted into the
    450x1800 strip lands at roughly 0.7 x 3.7 inches with about seventy percent
    of a twelve-inch sleeve left empty — technically correct and visually a
    small logo adrift. Streetwear sleeve type is a taped stripe: the same mark
    over and over down the arm. That needs no all-over print; the strip is an
    ordinary DTG area and this simply fills it.

    `gap` is the space between marks as a fraction of one mark's height.
    """
    w, h = size
    rot = ["-background", "none", "-rotate", str(rotate)] if rotate else []

    if repeat <= 1:
        r = sh(["magick", str(src), *rot, "-resize", f"{w}x{h}",
                "-background", "none", "-gravity", "center",
                "-extent", f"{w}x{h}", str(dst)])
        if not dst.exists():
            raise RuntimeError(f"fit failed: {r.stderr[-300:]}")
        return

    # Size one mark so `repeat` of them plus the gaps between fill the strip.
    unit_h = int(h / (repeat + gap * (repeat - 1)))
    step = int(unit_h * (1 + gap))
    tmp = dst.parent / f"_unit_{dst.stem}.png"
    r = sh(["magick", str(src), *rot, "-resize", f"{w}x{unit_h}",
            "-background", "none", "-gravity", "center",
            "-extent", f"{w}x{unit_h}", str(tmp)])
    if not tmp.exists():
        raise RuntimeError(f"unit failed: {r.stderr[-300:]}")

    # Centre the whole stack rather than starting at the top, so the run of
    # marks sits evenly on the sleeve instead of drifting toward the cuff.
    total = step * (repeat - 1) + unit_h
    top = (h - total) // 2
    cmd = ["magick", "-size", f"{w}x{h}", "xc:none"]
    for i in range(repeat):
        cmd += ["(", str(tmp), ")", "-geometry", f"+0+{top + i * step}",
                "-composite"]
    cmd += [str(dst)]
    r = sh(cmd)
    tmp.unlink(missing_ok=True)
    if not dst.exists():
        raise RuntimeError(f"repeat failed: {r.stderr[-300:]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("wordmark")
    ap.add_argument("--slug", required=True)
    # A wordmark drawn for a dark garment is invisible on a pale one. All three
    # of these measure 7:1 on Black and 1.1:1 on Stone — not faint, gone. The
    # letterforms live in the alpha channel, so a dark version is a recolour
    # rather than a re-render.
    ap.add_argument("--ink", help="recolour the letterforms, e.g. '#141414'")
    ap.add_argument("--repeat", type=int, default=1,
                    help="times the mark repeats down the long sleeve")
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

    # The tee patch is near square and takes one mark whatever --repeat says;
    # repeating belongs to the long strip.
    targets = [
        (f"{args.slug}-tee.png", TEE, 0, 1),
        # Rotated in opposite directions so the type reads top-to-bottom on
        # whichever arm it is on.
        (f"{args.slug}-sleeve-left.png", LONG, 90, args.repeat),
        (f"{args.slug}-sleeve-right.png", LONG, -90, args.repeat),
    ]
    if args.dry_run:
        for name, size, rot, rep in targets:
            print(f"  {name:<36} {size[0]}x{size[1]}  rotate {rot}  x{rep}")
        return 0

    keyed = OUT / f"_{args.slug}-keyed.png"
    p4.key_only(src, keyed, kind)
    p4.unmat(keyed, kind)

    if args.ink:
        # Recolour through the alpha, not by tinting the pixels: the
        # letterforms are the alpha channel, and colorizing the RGB would tint
        # the transparent surround along with them.
        r = sh(["magick", "(", str(keyed), "-alpha", "extract", ")",
                "(", "+clone", "-fill", args.ink, "-colorize", "100%", ")",
                "+swap", "-alpha", "off", "-compose", "CopyOpacity",
                "-composite", str(keyed)])
        if r.returncode:
            print(f"  recolour failed: {r.stderr[-200:]}", file=sys.stderr)
            return 1
        print(f"  recoloured to {args.ink}")

    rc = 0
    for name, size, rot, rep in targets:
        dst = OUT / name
        fit(keyed, dst, size, rot, rep)
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

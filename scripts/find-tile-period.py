#!/usr/bin/env python3
"""
Find the repeat a generated pattern actually has, and crop it to that.

A generator asked for a seamless tile usually produces something close: the
motifs march at a regular pitch, but the canvas is not cut on that pitch. The
result wraps on one axis and not the other, or on neither, while looking
perfectly regular. Three of the monogram candidates failed exactly that way —
two of them wrapped left-to-right and broke top-to-bottom.

That is not "regenerate and hope". If the artwork repeats every 947 rows and
the file is 1024 tall, cropping to 947 makes it a real tile. So this searches
for the period on each axis by cropping to each candidate size and scoring the
join the same way tile-for-aop.py does, then keeps the best.

The scoring has to be against the crop's own neighbour baseline rather than a
fixed threshold, or the search cheats: a very short crop has fewer rows and a
noisier baseline, which flatters the ratio. Same metric, computed per candidate.

Reports rather than guesses when nothing works. If no crop gets under the
threshold the pattern has no period at this size and needs regenerating —
which is a real answer, not a failure.

    python3 scripts/find-tile-period.py tile.png
    python3 scripts/find-tile-period.py tile.png --write out.png
"""
import argparse
import pathlib
import subprocess
import sys

# Search no smaller than this fraction of the original. Below it the crop
# starts throwing away whole motifs, and a "period" found there is usually the
# spacing of one element rather than the pattern's repeat.
MIN_FRACTION = 0.55
# Coarse pass then a fine pass around the winner: scoring every row of a
# 1024px tile is 1024 ImageMagick round trips per axis.
COARSE_STEP = 8
FINE_WINDOW = 10

SEAMLESS = 1.20
USABLE = 1.35


def sh(a):
    return subprocess.run(a, capture_output=True, text=True)


def fx(path, expr):
    return sh(["magick", str(path), "-format", expr, "info:"]).stdout.strip()


def strip_rmse(path, a_geom, b_geom):
    r = sh(["magick",
            "(", str(path), "-crop", a_geom, "+repage", ")",
            "(", str(path), "-crop", b_geom, "+repage", ")",
            "-metric", "RMSE", "-compare", "-format", "%[distortion]", "info:"])
    try:
        return float((r.stdout or r.stderr).strip().split()[0])
    except (ValueError, IndexError):
        return float("nan")


def score_axis(path, w, h, axis):
    """Seam ratio for a w x h image, on one axis. Lower is better; 1.0 is ideal."""
    if axis == "v":
        edge = strip_rmse(path, f"1x{h}+{w-1}+0", f"1x{h}+0+0")
        base = sum(strip_rmse(path, f"1x{h}+{x}+0", f"1x{h}+{x+1}+0")
                   for x in (w // 5, 2 * w // 5, 3 * w // 5, 4 * w // 5)) / 4
    else:
        edge = strip_rmse(path, f"{w}x1+0+{h-1}", f"{w}x1+0+0")
        base = sum(strip_rmse(path, f"{w}x1+0+{y}", f"{w}x1+0+{y+1}")
                   for y in (h // 5, 2 * h // 5, 3 * h // 5, 4 * h // 5)) / 4
    return edge / base if base else float("nan")


def search(src, tmp, full_w, full_h, axis):
    """Best crop length on one axis, cropping from the top-left."""
    span = full_w if axis == "v" else full_h
    lo = int(span * MIN_FRACTION)

    def measure(n):
        w, h = (n, full_h) if axis == "v" else (full_w, n)
        sh(["magick", str(src), "-crop", f"{w}x{h}+0+0", "+repage", str(tmp)])
        return score_axis(tmp, w, h, axis)

    best_n, best = span, measure(span)
    for n in range(lo, span, COARSE_STEP):
        s = measure(n)
        if s == s and s < best:
            best, best_n = s, n
    for n in range(max(lo, best_n - FINE_WINDOW),
                   min(span, best_n + FINE_WINDOW) + 1):
        s = measure(n)
        if s == s and s < best:
            best, best_n = s, n
    return best_n, best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tile")
    ap.add_argument("--write", help="write the best crop here")
    args = ap.parse_args()

    src = pathlib.Path(args.tile).expanduser()
    if not src.exists():
        print(f"No such file: {src}", file=sys.stderr)
        return 1

    w, h = int(fx(src, "%w")), int(fx(src, "%h"))
    tmp = src.parent / "_period_probe.png"
    print(f"  {src.name}  {w}x{h}")
    print(f"  as generated:  across {score_axis(src, w, h, 'v'):.2f}x   "
          f"down {score_axis(src, w, h, 'h'):.2f}x")

    bw, sw = search(src, tmp, w, h, "v")
    bh, sh_ = search(src, tmp, w, h, "h")
    print(f"  best width  {bw:>5}px  ({bw/w*100:.1f}% of original)  {sw:.2f}x")
    print(f"  best height {bh:>5}px  ({bh/h*100:.1f}% of original)  {sh_:.2f}x")

    # Score the two-axis crop together — fixing one axis can disturb the other.
    sh(["magick", str(src), "-crop", f"{bw}x{bh}+0+0", "+repage", str(tmp)])
    fv, fh = score_axis(tmp, bw, bh, "v"), score_axis(tmp, bw, bh, "h")
    worst = max(fv, fh)
    verdict = ("SEAMLESS" if worst < SEAMLESS else
               "BORDERLINE" if worst < USABLE else "STILL HAS A SEAM")
    print(f"  cropped {bw}x{bh}:  across {fv:.2f}x  down {fh:.2f}x  -> {verdict}")

    if args.write and worst < USABLE:
        dst = pathlib.Path(args.write).expanduser()
        sh(["magick", str(src), "-crop", f"{bw}x{bh}+0+0", "+repage", str(dst)])
        print(f"  wrote {dst}  ({fx(dst, '%wx%h')})")
    elif args.write:
        print("  not written: cropping did not produce a usable tile.",
              file=sys.stderr)
    tmp.unlink(missing_ok=True)
    return 0 if worst < USABLE else 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
Seam-check a folder of candidate tiles and rank them.

Because generating a seamless tile is a numbers game, not a prompting problem.
Eight candidates were tested by hand across this project and exactly one
passed — and the one whose prompt literally began "Seamless repeating tile
pattern" scored the worst of the eight. The word does not control the output.
The tile in production passed by luck.

So the workflow is: generate a batch, check the batch, keep what passes. This
makes that one command instead of eight.

Same metric as tile-for-aop.py, which is the point — a candidate that clears
this will clear the gate that refuses to build placements.

    python3 scripts/check-tiles.py ~/development/shoppen/designv7
    python3 scripts/check-tiles.py <dir> --keep-dir ~/tiles/passed
"""
import argparse
import pathlib
import shutil
import subprocess
import sys

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


# An edge strip flatter than this carries no artwork — it is margin.
EMPTY_EDGE_STD = 0.02


def edge_activity(path, w, h):
    """How much is actually happening on the four edges.

    Guards the seam ratio against its own blind spot. The ratio asks whether
    the two edges match, and two empty edges match perfectly — so a design with
    a plain border scores near zero and reads as a flawless tile. Pointed at a
    folder of finished artwork this rated three front graphics and two
    logotypes "SEAMLESS", all of which are single images on a black field.

    A pattern has ink at its edges by definition. This measures the standard
    deviation of the four edge strips, so "nothing there" is separable from
    "matches perfectly".
    """
    stds = []
    for geom in (f"1x{h}+0+0", f"1x{h}+{w-1}+0",
                 f"{w}x1+0+0", f"{w}x1+0+{h-1}"):
        v = sh(["magick", str(path), "-crop", geom, "+repage",
                "-format", "%[fx:standard_deviation]", "info:"]).stdout.strip()
        try:
            stds.append(float(v))
        except ValueError:
            stds.append(0.0)
    return max(stds)


def score(path):
    """Edge-to-edge difference against the tile's own neighbour average."""
    w, h = int(fx(path, "%w")), int(fx(path, "%h"))
    if not w or not h:
        return None
    activity = edge_activity(path, w, h)
    v_edge = strip_rmse(path, f"1x{h}+{w-1}+0", f"1x{h}+0+0")
    h_edge = strip_rmse(path, f"{w}x1+0+{h-1}", f"{w}x1+0+0")
    v_base = sum(strip_rmse(path, f"1x{h}+{x}+0", f"1x{h}+{x+1}+0")
                 for x in (w // 5, 2 * w // 5, 3 * w // 5, 4 * w // 5)) / 4
    h_base = sum(strip_rmse(path, f"{w}x1+0+{y}", f"{w}x1+0+{y+1}")
                 for y in (h // 5, 2 * h // 5, 3 * h // 5, 4 * h // 5)) / 4
    if not v_base or not h_base:
        return None
    return w, h, v_edge / v_base, h_edge / h_base, activity


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("directory")
    ap.add_argument("--keep-dir", help="copy the passing tiles here")
    args = ap.parse_args()

    d = pathlib.Path(args.directory).expanduser()
    if not d.is_dir():
        print(f"Not a directory: {d}", file=sys.stderr)
        return 1

    files = sorted(p for p in d.iterdir()
                   if p.suffix.lower() in (".png", ".jpg", ".jpeg")
                   and not p.name.startswith("_"))
    if not files:
        print(f"No images in {d}", file=sys.stderr)
        return 1

    rows = []
    for f in files:
        s = score(f)
        if s is None:
            print(f"  skipped {f.name}: could not measure")
            continue
        w, h, sv, shz, act = s
        rows.append((max(sv, shz), sv, shz, w, h, act, f))

    rows.sort()
    print(f"\n  {len(rows)} candidate(s), best first\n")
    print(f"  {'worst':>6}  {'across':>6} {'down':>6}  {'size':>11}  name")
    passed = []
    for worst, sv, shz, w, h, act, f in rows:
        if act < EMPTY_EDGE_STD:
            # Not a tile at all — a single image with a plain margin, which
            # scores near zero because its two empty edges match perfectly.
            mark = "not a pattern (empty edges)"
        elif worst < SEAMLESS:
            mark = "SEAMLESS"
            passed.append(f)
        elif worst < USABLE:
            mark = "borderline"
            passed.append(f)
        else:
            mark = "seam"
        print(f"  {worst:6.2f}  {sv:6.2f} {shz:6.2f}  {w:>5}x{h:<5}  "
              f"{f.name[:44]:<46} {mark}")

    print(f"\n  {len(passed)}/{len(rows)} usable "
          f"(under {USABLE}x, which is what tile-for-aop.py requires)")
    if not passed:
        print("  Generate more. Roughly one in eight has passed historically, "
              "and the prompt wording did not predict which.")

    if args.keep_dir and passed:
        keep = pathlib.Path(args.keep_dir).expanduser()
        keep.mkdir(parents=True, exist_ok=True)
        for f in passed:
            shutil.copy2(f, keep / f.name)
        print(f"  copied {len(passed)} to {keep}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

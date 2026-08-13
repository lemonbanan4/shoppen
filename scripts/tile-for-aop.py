#!/usr/bin/env python3
"""
Check a pattern tile for seams, then blow it up to Printful's AOP placements.

All-over print panels are enormous — a track jacket front is 6600x6900px, a
jogger leg 4950x7500 — so a 2400px tile repeats three or four times across a
single panel and a dozen times across a full kit. A join that is slightly off
is not a subtle flaw at that scale; it is a line down the sleeve, repeated.

So this refuses to build anything until the tile passes a seam test.

The test asks the question directly: on fabric, column W-1 is followed by
column 0, so on a tile that wraps they should differ about as much as any
neighbouring pair. It compares that edge-to-edge difference against the tile's
own neighbour-to-neighbour average, which keeps a dense pattern from being
punished for being dense.

Validated against both controls, which matters more than the idea sounding
right — an earlier version measured the gradient along a rolled join and got
both backwards, calling a wraparound-built tile "borderline" and an image that
plainly does not tile "seamless". The current one scores that same wraparound
tile at 0.83x and the non-tiling image at 3.94x.

    python3 scripts/tile-for-aop.py <tile.png> --check
    python3 scripts/tile-for-aop.py <tile.png> --product track-jacket

Writes designv4/build/aop/placements/<product>/<placement>.png
"""
import argparse
import pathlib
import subprocess
import sys

OUT = pathlib.Path("/Users/lemon/development/shoppen/designv4/build/aop/placements")

# Printful placements, read from /mockup-generator/printfiles.
PRODUCTS = {
    "track-jacket": {
        "id": 801,
        "placements": {"front": (6600, 6900), "back": (6600, 6900),
                       "sleeve_left": (6600, 6900), "sleeve_right": (6600, 6900),
                       "details": (6600, 6900), "pocket": (6600, 6900)},
    },
    "joggers": {
        "id": 400,
        "placements": {"leg_left": (4950, 7500), "leg_right": (4950, 7500)},
    },
    "hoodie": {
        "id": 388,
        "placements": {"front": (6000, 6000), "back": (6000, 6000),
                       "sleeve_left": (6000, 6000), "sleeve_right": (6000, 6000),
                       "pocket": (6000, 6000), "hood": (6000, 6000)},
    },
    "tee": {
        "id": 257,
        "placements": {"default": (4200, 5400), "back": (4200, 5400),
                       "sleeve_left": (3000, 1800), "sleeve_right": (3000, 1800)},
    },
}


def sh(a):
    return subprocess.run(a, capture_output=True, text=True)


def fx(path, expr, pre=None):
    out = sh(["magick", str(path), *(pre or []), "-format", expr,
              "info:"]).stdout.strip()
    try:
        return float(out)
    except ValueError:
        return float("nan")


def _strip_rmse(tile, a_geom, b_geom) -> float:
    """Difference between two one-pixel strips of the same image."""
    r = sh(["magick",
            "(", str(tile), "-crop", a_geom, "+repage", ")",
            "(", str(tile), "-crop", b_geom, "+repage", ")",
            "-metric", "RMSE", "-compare", "-format", "%[distortion]", "info:"])
    try:
        return float((r.stdout or r.stderr).strip().split()[0])
    except (ValueError, IndexError):
        return float("nan")


def seam_score(tile: pathlib.Path) -> dict:
    """Does the last column continue into the first, as smoothly as any pair?

    An earlier version rolled the tile and measured the gradient along the
    join, relative to the image's average. It failed both controls: a tile
    built with wraparound scored 1.29x "borderline", and an image that plainly
    does not tile scored 0.00x "seamless" — its dark edges met other dark
    edges, so there was nothing to detect. Measuring sharpness at a location
    cannot tell a real discontinuity from a place that happens to be busy.

    This asks the question directly instead. On a tile that wraps, column W-1
    is followed by column 0 in the real fabric, so they should differ about as
    much as any neighbouring pair does. On one that does not, they are two
    unrelated slices of artwork and differ far more.

    Expressed as a ratio against the tile's own neighbour-to-neighbour
    difference, so a dense pattern is not punished for being dense.
    """
    w = int(fx(tile, "%w"))
    h = int(fx(tile, "%h"))

    # The wrap: last column against first.
    v_edge = _strip_rmse(tile, f"1x{h}+{w-1}+0", f"1x{h}+0+0")
    h_edge = _strip_rmse(tile, f"{w}x1+0+{h-1}", f"{w}x1+0+0")

    # The baseline: genuinely adjacent pairs, sampled across the image so one
    # quiet region cannot set the scale.
    v_base = sum(_strip_rmse(tile, f"1x{h}+{x}+0", f"1x{h}+{x+1}+0")
                 for x in (w // 5, 2 * w // 5, 3 * w // 5, 4 * w // 5)) / 4
    h_base = sum(_strip_rmse(tile, f"{w}x1+0+{y}", f"{w}x1+0+{y+1}")
                 for y in (h // 5, 2 * h // 5, 3 * h // 5, 4 * h // 5)) / 4

    return {"w": w, "h": h,
            "v_edge": v_edge, "v_base": v_base,
            "h_edge": h_edge, "h_base": h_base,
            "v_ratio": v_edge / v_base if v_base else float("nan"),
            "h_ratio": h_edge / h_base if h_base else float("nan")}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tile")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--product", choices=sorted(PRODUCTS))
    ap.add_argument("--repeat", type=float, default=3.0,
                    help="times the tile repeats across the panel width")
    args = ap.parse_args()

    tile = pathlib.Path(args.tile).expanduser()
    if not tile.exists():
        print(f"No such file: {tile}", file=sys.stderr)
        return 1

    s = seam_score(tile)
    print(f"  tile {s['w']}x{s['h']}")
    print(f"  left|right edges   {s['v_edge']:.4f}  vs neighbours {s['v_base']:.4f}"
          f"  ({s['v_ratio']:.2f}x)")
    print(f"  top|bottom edges   {s['h_edge']:.4f}  vs neighbours {s['h_base']:.4f}"
          f"  ({s['h_ratio']:.2f}x)")
    worst = max(s["v_ratio"], s["h_ratio"])
    # A seamless tile lands near 1.0 — the join looks like everywhere else.
    # Much above ~1.35 and there is a real line, visible once it repeats
    # a dozen times across a kit.
    verdict = ("SEAMLESS" if worst < 1.20 else
               "BORDERLINE" if worst < 1.35 else "HAS A SEAM")
    print(f"  -> {verdict} (worst {worst:.2f}x)")

    if args.check or not args.product:
        return 0
    if worst >= 1.35:
        print("\n  Refusing to build placements from a tile with a seam.",
              file=sys.stderr)
        return 1

    spec = PRODUCTS[args.product]
    d = OUT / args.product
    d.mkdir(parents=True, exist_ok=True)
    bad = 0
    for name, (pw, ph) in spec["placements"].items():
        # Scale the tile so it repeats the requested number of times across the
        # panel, then fill the panel with it.
        #
        # Done in two explicit steps through an mpr: register rather than with
        # a `tile:file[WxH]` read-modifier. That shorthand silently ignored the
        # canvas size for some inputs and wrote a single scaled tile — a
        # 1052x1100 file where a 6600x6900 panel was wanted.
        cell = int(pw / args.repeat)
        dst = d / f"{name}.png"
        r = sh(["magick", str(tile), "-resize", f"{cell}x{cell}!",
                "-write", "mpr:t", "+delete",
                "-size", f"{pw}x{ph}", "tile:mpr:t", str(dst)])
        if not dst.exists():
            print(f"  {name}: {r.stderr[-200:]}", file=sys.stderr)
            bad += 1
            continue
        # Check what was actually written, not what was asked for. The previous
        # version printed the intended size from its own config and called it
        # done, which is how the wrong file size went unnoticed.
        aw, ah = int(fx(dst, "%w")), int(fx(dst, "%h"))
        ok = (aw, ah) == (pw, ph)
        if not ok:
            bad += 1
        print(f"  {args.product}/{name}.png  {aw}x{ah}"
              f"{'' if ok else f'  ** expected {pw}x{ph} **'}")

    if bad:
        print(f"\n  {bad} placement(s) came out the wrong size.", file=sys.stderr)
        return 1
    print(f"\n  placements in {d}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
Build a seamless Solkast tile for all-over print.

The hard requirement is that it tiles. An AOP garment is cut from a long roll
of printed fabric, so the artwork repeats every tile width down the whole
length — and a tile whose edges do not line up leaves a visible seam every
repeat, running through sleeves, legs and body panels. AI-generated "patterns"
almost never tile: they look like a pattern and break at the join.

The method here is wraparound placement. Every motif is drawn nine times, at
its position and at that position shifted by ±one tile in each direction. Only
the centre tile is kept, so anything crossing an edge is already drawn, whole,
on the opposite edge. Offset the result by half a tile and the joins are
invisible because there are none — the artwork genuinely continues.

Motifs are drawn rather than cut from the existing designs. Those are single
compositions with a focal point; repeated forty times across a legging they
read as the same face over and over. Geometry repeats without looking repeated,
which is why real house patterns are built from marks rather than pictures.

Deterministic: a fixed seed, so the same tile comes out every run and a
correction is a correction rather than a fresh roll of the dice.

    python3 scripts/build-aop-pattern.py

Writes designv4/build/aop/solkast-aop-tile.png plus a 2x2 proof for checking
the seams.
"""
import math
import pathlib
import random
import subprocess

OUT = pathlib.Path("/Users/lemon/development/shoppen/designv4/build/aop")

TILE = 2400              # px; at 150dpi that is a 16in repeat
BG = "#0a0a0a"
GOLD = "#E8B93F"
AMBER = "#DD6507"
CREAM = "#F2E4CE"
FAINT = "#3a2f1a"        # structure lines, well below the motifs

SEED = 20260813


def sh(args):
    return subprocess.run(args, capture_output=True, text=True)


def sun_ops(cx, cy, r, colour, rays=12):
    """A Solkast sun: solid disc plus tapered rays, in the brand geometry."""
    ops = [f"fill '{colour}'", "stroke none",
           "circle %.1f,%.1f %.1f,%.1f" % (cx, cy, cx, cy - r)]
    ops += ["fill none", f"stroke '{colour}'", "stroke-linecap round",
            "stroke-width %.1f" % max(2.0, r * 0.16)]
    for i in range(rays):
        a = math.radians(i * 360.0 / rays)
        ops.append("line %.1f,%.1f %.1f,%.1f" % (
            cx + r * 1.35 * math.sin(a), cy - r * 1.35 * math.cos(a),
            cx + r * 2.0 * math.sin(a), cy - r * 2.0 * math.cos(a)))
    return ops


def molecule_ops(cx, cy, r, colour, arms=4, rot=0.0):
    """A node with bonded satellites — the motif from the v4 designs."""
    ops = ["fill none", f"stroke '{colour}'",
           "stroke-width %.1f" % max(2.0, r * 0.20), "stroke-linecap round"]
    pts = []
    for i in range(arms):
        a = math.radians(rot + i * 360.0 / arms)
        px, py = cx + r * 2.4 * math.sin(a), cy - r * 2.4 * math.cos(a)
        pts.append((px, py))
        ops.append("line %.1f,%.1f %.1f,%.1f" % (cx, cy, px, py))
    ops += [f"fill '{colour}'", "stroke none",
            "circle %.1f,%.1f %.1f,%.1f" % (cx, cy, cx, cy - r)]
    for px, py in pts:
        ops.append("circle %.1f,%.1f %.1f,%.1f"
                   % (px, py, px, py - r * 0.55))
    return ops


def ring_ops(cx, cy, r, colour):
    """A faint orbit line, for depth behind the solid motifs."""
    return ["fill none", f"stroke '{colour}'", "stroke-width 3",
            "circle %.1f,%.1f %.1f,%.1f" % (cx, cy, cx, cy - r)]


def wrapped(fn, x, y, *a, **kw):
    """Draw a motif nine times so it survives the tile boundary."""
    ops = []
    for dx in (-TILE, 0, TILE):
        for dy in (-TILE, 0, TILE):
            ops += fn(x + dx, y + dy, *a, **kw)
    return ops


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rnd = random.Random(SEED)
    ops = []

    # Back layer: faint orbits, so the tile has depth rather than floating
    # motifs on flat black.
    for _ in range(14):
        ops += wrapped(ring_ops, rnd.uniform(0, TILE), rnd.uniform(0, TILE),
                       rnd.uniform(90, 300), FAINT)

    # Mid layer: molecules, the connective tissue the reference leans on.
    for _ in range(18):
        ops += wrapped(molecule_ops, rnd.uniform(0, TILE), rnd.uniform(0, TILE),
                       rnd.uniform(14, 30), rnd.choice([CREAM, GOLD]),
                       arms=rnd.choice([3, 4, 5]), rot=rnd.uniform(0, 90))

    # Front layer: suns, at three sizes so the eye has a hierarchy instead of
    # an even field. Big ones are sparse; small ones fill.
    for r, n, colour in ((150, 3, AMBER), (78, 7, GOLD), (34, 14, GOLD)):
        for _ in range(n):
            ops += wrapped(sun_ops, rnd.uniform(0, TILE), rnd.uniform(0, TILE),
                           r * rnd.uniform(0.85, 1.15), colour,
                           rays=rnd.choice([10, 12, 14]))

    tile = OUT / "solkast-aop-tile.png"
    r = sh(["magick", "-size", f"{TILE}x{TILE}", f"xc:{BG}",
            "-draw", " ".join(ops), str(tile)])
    if not tile.exists():
        raise SystemExit(f"draw failed: {r.stderr[-400:]}")
    print(f"  {tile.name}  {TILE}x{TILE}")

    # Proof 1: four copies side by side. Any seam shows as a line through the
    # middle of this image.
    sh(["magick", "montage", str(tile), str(tile), str(tile), str(tile),
        "-tile", "2x2", "-geometry", "+0+0", str(OUT / "_tiled.png")])
    sh(["magick", str(OUT / "_tiled.png"), "-resize", "900x900",
        str(OUT / "_proof_tiled.jpg")])

    # Proof 2: the tile rolled by half its size. If the edges match, this looks
    # like ordinary artwork; if they do not, the seam lands dead centre where
    # it cannot be missed.
    sh(["magick", str(tile), "-roll", f"+{TILE//2}+{TILE//2}",
        "-resize", "760x760", str(OUT / "_proof_rolled.jpg")])
    print(f"  proofs: _proof_tiled.jpg (2x2), _proof_rolled.jpg (seam test)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
Seamless Solkast tile, built from the real artwork rather than drawn shapes.

A first version drew suns and molecules with primitives. It tiled perfectly and
looked like a nursery print: flat discs with even rays, nothing like the gritty
textured suns the brand actually sells. Geometry repeats cleanly and reads
cheap, which is the wrong trade for a garment meant to look expensive.

So the motifs here are cut from the v4 printfiles. Those are already keyed to
transparency, so a crop of one is a finished element — real halftone, real
engraved linework, the same suns that are on the tees.

Seamlessness still comes from wraparound: every motif is composited nine times,
at its position and shifted by ±one tile on each axis, then the canvas is
cropped back. Anything crossing an edge is already present, whole, on the far
side. An AOP garment is cut from a long printed roll, so a tile that does not
join leaves a seam every repeat, straight through sleeves and legs.

    python3 scripts/build-aop-pattern-v2.py

Writes designv4/build/aop/solkast-aop-tile-v2.png plus seam proofs.
"""
import pathlib
import random
import subprocess

BUILD = pathlib.Path("/Users/lemon/development/shoppen/designv4/build")
OUT = BUILD / "aop"
MOTIFS = OUT / "motifs"

TILE = 2400
BG = "#0a0a0a"
SEED = 20260813

# (file, scale range, how many). Big motifs sparse, small ones dense — an even
# field of equal-sized marks reads as wallpaper rather than as a house pattern.
PLAN = [
    ("sun-molecule.png", (0.62, 0.80), 3),
    ("molecule-a.png",   (0.34, 0.46), 5),
    ("sun-small.png",    (0.30, 0.42), 6),
    ("molecule-b.png",   (0.22, 0.30), 8),
]


def sh(a):
    return subprocess.run(a, capture_output=True, text=True)


def main():
    rnd = random.Random(SEED)
    canvas = OUT / "solkast-aop-tile-v2.png"

    cmd = ["magick", "-size", f"{TILE}x{TILE}", f"xc:{BG}"]
    placed = 0
    for name, (lo, hi), count in PLAN:
        src = MOTIFS / name
        if not src.exists():
            print(f"  missing motif: {src}")
            continue
        w, h = map(int, sh(["magick", str(src), "-format", "%w %h",
                            "info:"]).stdout.split())
        for _ in range(count):
            s = rnd.uniform(lo, hi)
            mw, mh = int(w * s), int(h * s)
            x, y = rnd.uniform(0, TILE), rnd.uniform(0, TILE)
            rot = rnd.choice([0, 0, 0, 90, 180, 270])
            # Nine placements so the motif survives the boundary.
            for dx in (-TILE, 0, TILE):
                for dy in (-TILE, 0, TILE):
                    px, py = int(x + dx - mw / 2), int(y + dy - mh / 2)
                    # Skip copies that cannot touch the canvas at all.
                    if px > TILE or py > TILE or px + mw < 0 or py + mh < 0:
                        continue
                    cmd += ["(", str(src), "-resize", f"{mw}x{mh}!"]
                    if rot:
                        cmd += ["-background", "none", "-rotate", str(rot)]
                    cmd += [")", "-geometry", f"+{px}+{py}", "-composite"]
            placed += 1

    cmd += [str(canvas)]
    r = sh(cmd)
    if not canvas.exists():
        raise SystemExit(f"composite failed: {r.stderr[-400:]}")
    print(f"  {canvas.name}  {TILE}x{TILE}  {placed} motifs")

    sh(["magick", "montage", str(canvas), str(canvas), str(canvas), str(canvas),
        "-tile", "2x2", "-geometry", "+0+0", str(OUT / "_t2.png")])
    sh(["magick", str(OUT / "_t2.png"), "-resize", "900x900",
        str(OUT / "_proof_tiled_v2.jpg")])
    # Rolled by half a tile: a bad join lands dead centre.
    sh(["magick", str(canvas), "-roll", f"+{TILE//2}+{TILE//2}",
        "-resize", "760x760", str(OUT / "_proof_rolled_v2.jpg")])
    print("  proofs: _proof_tiled_v2.jpg, _proof_rolled_v2.jpg")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
Rebuild a near-miss pattern as a tile that wraps by construction.

Generators produce patterns that look regular and do not tile. Cropping to the
true period does not rescue them — searched every crop from 55% up on both axes
of three candidates and none had one. So the composition has to be rebuilt.

The method is wraparound placement, the same one behind build-aop-pattern-v2:
every motif is composited nine times, at its position and at that position
shifted by plus or minus one tile on each axis, then the canvas is cropped back
to one tile. Anything crossing an edge is already present, whole, on the far
side. It cannot fail to wrap, because the wrap is how it is drawn.

What is new here is where the motifs come from. Rather than drawing them —
which reads cheap, and was rejected once already on this project — they are cut
out of the generated artwork: key the flat background away, find the connected
blobs of remaining ink, and keep the largest. That preserves the engraving, the
halftone and the lettering, which is the part worth keeping.

Mirror tiling is the other way to guarantee a wrap and is deliberately not used.
It reverses everything on one axis, and these patterns contain the word SOLKAST.

    python3 scripts/rebuild-tile-wraparound.py <source.png> --out tile.png
"""
import argparse
import pathlib
import random
import subprocess
import sys

TILE = 1024
SEED = 20260813


def sh(a):
    return subprocess.run(a, capture_output=True, text=True)


def fx(path, expr):
    return sh(["magick", str(path), "-format", expr, "info:"]).stdout.strip()


def dominant_colour(src):
    """The image's most frequent colour, which for these patterns is the field."""
    r = sh(["magick", str(src), "-format", "%c", "-depth", "8",
            "histogram:info:"])
    best, best_n = "black", -1
    for line in (r.stdout or "").splitlines():
        parts = line.strip().split(":", 1)
        if len(parts) != 2:
            continue
        try:
            n = int(parts[0].strip())
        except ValueError:
            continue
        if n > best_n and "#" in parts[1]:
            best_n = n
            best = "#" + parts[1].split("#", 1)[1].split()[0]
    return best


def extract_motifs(src, work, min_area, want, erode):
    """Cut the artwork into separate motifs.

    Keys the background from the corner colour, then uses connected-components
    to find islands of ink. Blobs below min_area are noise — stray halftone
    dots and the ends of thin rules — and would each become a "motif" that is
    really one speck.
    """
    # Key globally on the image's most common colour, not by flood-filling
    # from a corner.
    #
    # A corner fill is right for a design with a margin around it and wrong
    # here: a repeating pattern runs edge to edge, so its corner pixel is
    # whatever motif happens to land there. On this artwork that was a brown —
    # srgb(67,34,9) — the fill matched nothing, the image stayed 100% opaque,
    # and connected-components duly reported one blob covering everything.
    #
    # The usual objection to a global key is that it eats artwork sharing the
    # background colour. That objection is about producing a final printfile.
    # Here the output is a set of motifs to re-place, and the background is
    # 36% of the pixels by frequency, so keying on it is unambiguous.
    keyed = work / "_keyed.png"
    bg = dominant_colour(src)
    sh(["magick", str(src), "-alpha", "set", "-fuzz", "25%",
        "-transparent", bg, str(keyed)])

    # Erode the mask before looking for islands, then read the boxes back
    # against the un-eroded artwork.
    #
    # These patterns draw molecular bonds between their motifs, so every mark
    # on the tile is joined to every other by a one-pixel line and
    # connected-components returns a single blob covering the whole image. A
    # few pixels of erosion severs the hairlines without touching the solid
    # marks; the crop still comes from the original, so nothing is lost.
    probe = work / "_probe.png"
    sh(["magick", str(keyed), "-alpha", "extract", "-threshold", "20%",
        "-morphology", "Erode", f"Disk:{erode}", str(probe)])

    r = sh(["magick", str(probe),
            "-define", "connected-components:verbose=true",
            "-define", f"connected-components:area-threshold={min_area}",
            "-connected-components", "8", "null:"])
    boxes = []
    for line in (r.stdout or "").splitlines():
        parts = line.split()
        if len(parts) < 5 or not parts[0].rstrip(":").isdigit():
            continue
        geom, _, area, colour = parts[1], parts[2], parts[3], parts[4]
        # gray(0) is the transparent surround; only keep the ink.
        if "gray(0)" in colour:
            continue
        try:
            area = float(area)
        except ValueError:
            continue
        wh, off = geom.split("+", 1)
        bw, bh = map(int, wh.split("x"))
        ox, oy = map(int, off.split("+"))
        boxes.append((area, bw, bh, ox, oy))

    boxes.sort(reverse=True)
    motifs = []
    for i, (_, bw, bh, ox, oy) in enumerate(boxes[:want]):
        m = work / f"_motif{i}.png"
        pad = int(erode) + 2
        sh(["magick", str(keyed), "-crop",
            f"{bw + 2 * pad}x{bh + 2 * pad}+{max(0, ox - pad)}+{max(0, oy - pad)}",
            "+repage", str(m)])
        if m.exists():
            motifs.append(m)
    return motifs


def build(motifs, out, counts, scale_lo, scale_hi):
    rnd = random.Random(SEED)
    cmd = ["magick", "-size", f"{TILE}x{TILE}", "xc:black"]
    placed = 0
    for m in motifs:
        w, h = int(fx(m, "%w")), int(fx(m, "%h"))
        for _ in range(counts):
            s = rnd.uniform(scale_lo, scale_hi)
            mw, mh = max(8, int(w * s)), max(8, int(h * s))
            x, y = rnd.uniform(0, TILE), rnd.uniform(0, TILE)
            # Nine placements, so a motif crossing the edge exists whole on the
            # opposite one. This is the entire reason the result tiles.
            for dx in (-TILE, 0, TILE):
                for dy in (-TILE, 0, TILE):
                    px, py = int(x + dx - mw / 2), int(y + dy - mh / 2)
                    if px > TILE or py > TILE or px + mw < 0 or py + mh < 0:
                        continue
                    cmd += ["(", str(m), "-resize", f"{mw}x{mh}!", ")",
                            "-geometry", f"+{px}+{py}", "-composite"]
            placed += 1
    cmd += [str(out)]
    r = sh(cmd)
    if not out.exists():
        raise RuntimeError(f"composite failed: {r.stderr[-400:]}")
    return placed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("--out", required=True)
    ap.add_argument("--motifs", type=int, default=10)
    ap.add_argument("--each", type=int, default=3)
    ap.add_argument("--min-area", type=int, default=900)
    ap.add_argument("--erode", type=float, default=2.5,
                    help="px of erosion used to sever hairline links")
    ap.add_argument("--scale", default="0.5x0.9")
    args = ap.parse_args()

    src = pathlib.Path(args.source).expanduser()
    if not src.exists():
        print(f"No such file: {src}", file=sys.stderr)
        return 1
    out = pathlib.Path(args.out).expanduser()
    out.parent.mkdir(parents=True, exist_ok=True)
    work = out.parent

    lo, hi = (float(x) for x in args.scale.split("x"))
    motifs = extract_motifs(src, work, args.min_area, args.motifs,
                            args.erode)
    print(f"  cut {len(motifs)} motif(s) from {src.name}")
    if not motifs:
        print("  nothing to build from — the background key found no islands.",
              file=sys.stderr)
        return 1
    for m in motifs[:6]:
        print(f"    {m.name}  {fx(m, '%wx%h')}")

    placed = build(motifs, out, args.each, lo, hi)
    print(f"  placed {placed} motifs -> {out.name} {fx(out, '%wx%h')}")
    for m in motifs:
        m.unlink(missing_ok=True)
    for f in ("_keyed.png", "_probe.png"):
        (work / f).unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

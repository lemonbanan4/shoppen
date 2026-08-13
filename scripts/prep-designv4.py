#!/usr/bin/env python3
"""
Turn the designv4 Firefly exports into DTG-ready printfiles.

Firefly flattens every export, so all ten arrive as RGB with no alpha —
including the four whose filenames say "transparent background". Two of them
have a literal checkerboard baked in as pixels. None can go to Printful as-is:
DTG prints whatever is opaque, so a black background prints as a black panel
of ink on a black shirt, which is visible, feels cheap, and is the single most
common way a print-on-demand tee looks like a print-on-demand tee.

Three stages:

  upscale   Real-ESRGAN digital-art-4x at 4x, then down to the placement size.
            The 4x-then-down route beats a direct 1.6x resample because the
            model reconstructs edges rather than interpolating them, and these
            designs are dense with small text that has to survive a 150dpi
            print at arm's length.

  key       Flood fill from the corners, NOT a global colour threshold. A
            threshold keyed on black would eat the hooded figure in B01 and
            the black spheres in the molecular designs, because those are the
            same colour as the background. Filling only from the edges removes
            what is connected to the border and leaves interior blacks alone.

  clean     Erode the alpha by a hair to swallow the dark fringe left by
            resampling an anti-aliased edge against a black field, which
            otherwise prints as a grey outline.

Backgrounds are classified by sampling the corners rather than by trusting the
filename, since the filenames are already wrong about transparency.

    python3 scripts/prep-designv4.py --dry-run
    python3 scripts/prep-designv4.py

Writes designv4/build/print/<slug>.png at 1800x2400 with real alpha.
"""
import argparse
import json
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path("/Users/lemon/development/shoppen/designv4")
BUILD = ROOT / "build"
PRINT = BUILD / "print"
UP = BUILD / "upscaled"

UPSCAYL = pathlib.Path(
    "/Applications/Upscayl.app/Contents/Resources/bin/upscayl-bin")
MODELS = pathlib.Path("/Applications/Upscayl.app/Contents/Resources/models")
MODEL = "digital-art-4x"

# Printful catalog product 823 front placement, 150dpi.
PW, PH = 1800, 2400

# Per-design fuzz, where the default gets it wrong.
#
# B01 silhouettes a black-robed figure against black. At the default 12% the
# flood fill walks straight through the figure and deletes it, leaving an
# orange sun over an empty hole; at 0% the background survives because Firefly's
# black is not perfectly flat. 2% clears the field and keeps the figure.
FUZZ_OVERRIDE = {"B01": "2%"}

# Designs keyed BEFORE upscaling rather than after.
#
# The default order is upscale-then-key, which gives the cleanest edges. B01
# cannot use it: separating its black figure from the black field needs a 2%
# tolerance, and Real-ESRGAN sprays enough noise into a flat black field that
# 2% no longer reaches across it — the background survives in patches while
# the figure still gets eaten. Firefly's original black is flat to within a
# hundredth, so the fill is unambiguous there. Upscayl carries the alpha
# through afterwards.
#
# T06 is the same failure with a different cause. Firefly baked its
# transparency in as a literal checkerboard, whose two tones are 20 levels
# apart. Crisp in the original, the fill crosses both and clears the field to
# alpha 0 exactly. Upscaled first, every square acquires a soft border that
# falls outside tolerance, and the fill leaves a faint grid behind at up to 23%
# opacity — invisible on screen against white, and a ghost pattern once printed
# on a denim tote.
KEY_FIRST = {"B01", "T06"}

# Designs that cannot be keyed at all, and why.
#
# T08 is cloud photography on white. The clouds ARE white, and they touch the
# border, so there is no tolerance that separates subject from background:
# below ~5% the background stays, above it the clouds fill with holes. Keying
# is the wrong tool — the background is part of the composition, which makes it
# a poster rather than a tee.
POSTER_ONLY = {"T08"}

# Names carry the design's intent so the product script can read them.
SLUGS = {
    "B01": "solkast-v4-liberty",
    "B02": "solkast-v4-energy-motion",
    "B03": "solkast-v4-formula",
    "B04": "solkast-v4-worldwide",
    "T05": "solkast-v4-dawn-coast",
    "T06": "solkast-v4-sun-face-logo",
    "T07": "solkast-v4-statue-dawn",
    "T08": "solkast-v4-beyond-noise",
    "E09": "solkast-v4-structure",
    "E10": "solkast-v4-sun-molecule",
    "E11": "solkast-v4-tuned-sun",
}


def sh(args, **kw):
    return subprocess.run(args, capture_output=True, text=True, **kw)


def pixel(f, x, y):
    return sh(["magick", str(f), "-format",
               "%[pixel:p{" + f"{x},{y}" + "}]", "info:"]).stdout.strip()


def classify(f):
    """dark | light — decided from the corners, not the filename."""
    w, h = map(int, sh(["magick", str(f), "-format", "%w %h", "info:"]).stdout.split())
    vals = []
    for x, y in [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]:
        p = pixel(f, x, y)
        nums = p[p.find("(") + 1:p.find(")")].split(",")
        try:
            vals.append(sum(float(n) for n in nums[:3]) / 3)
        except ValueError:
            vals.append(0.0)
    return "dark" if sum(vals) / len(vals) < 128 else "light"


def upscale(src, dst):
    if dst.exists():
        return
    r = sh([str(UPSCAYL), "-i", str(src), "-o", str(dst),
            "-s", "4", "-m", str(MODELS), "-n", MODEL])
    if not dst.exists():
        raise RuntimeError(f"upscayl failed for {src.name}: {r.stderr[-300:]}")


def corner_colour(src):
    """The literal colour of the source's top-left pixel.

    Better than assuming black or white. A design generated on navy has a
    #04172F field, which is 18% away from black in the blue channel and so
    falls outside the fuzz that a "black" seed uses — the fill matches nothing
    and the whole background survives as a solid rectangle on the garment.
    """
    p = pixel(src, 0, 0)
    return p if p else None


def key_only(src, dst, kind, fuzz_override=None, seed_override=None):
    """Flood-fill the background away, at the source's own size."""
    seed = seed_override or ("black" if kind == "dark" else "white")
    fuzz = fuzz_override or ("18%" if kind == "light" else "12%")
    w, h = map(int, sh(["magick", str(src), "-format", "%w %h",
                        "info:"]).stdout.split())
    cmd = ["magick", str(src), "-alpha", "set", "-fuzz", fuzz, "-fill", "none"]
    for pt in (f"+0+0", f"+{w-1}+0", f"+0+{h-1}", f"+{w-1}+{h-1}"):
        cmd += ["-floodfill", pt, seed]
    cmd += [str(dst)]
    r = sh(cmd)
    if not dst.exists():
        raise RuntimeError(f"key_only failed for {src.name}: {r.stderr[-300:]}")


def fit_only(src, dst):
    """Size an already-keyed image to the placement."""
    r = sh(["magick", str(src),
            "-resize", f"{PW}x{PH}", "-background", "none",
            "-gravity", "center", "-extent", f"{PW}x{PH}", str(dst)])
    if not dst.exists():
        raise RuntimeError(f"fit failed for {src.name}: {r.stderr[-300:]}")


def unmat(path, kind):
    """Take the old background back out of the anti-aliased edge.

    The flood fill sets matched pixels fully transparent but leaves their RGB
    alone, and the resize that follows then blends those pixels into their
    neighbours — so every edge pixel ends up part artwork, part background,
    at partial alpha. On the garment the design was keyed against this is
    invisible, which is why it survived: black bleeding into an edge does not
    show on a black shirt. On anything else it is a fringe, and it is why the
    dark discs in these designs let grey through when previewed on another
    colour.

    An edge pixel is observed = a*F + (1-a)*bg, so F = (C - (1-a)*bg)/a. For a
    black field that reduces to C/a — a straight divide by the alpha channel.
    For a white field, negating first turns it into the same black-field
    problem, so: negate, divide, negate back.

    Between 1.5% and 5% of each design is partial alpha, so this is a thin band
    — and a thin band of the wrong colour is exactly what reads as a halo.
    """
    a = BUILD / "_unmat_a.png"
    c = BUILD / "_unmat_c.png"
    d = BUILD / "_unmat_d.png"
    sh(["magick", str(path), "-alpha", "extract", str(a)])
    pre = ["-negate"] if kind == "light" else []
    sh(["magick", str(path), "-alpha", "off", *pre, str(c)])
    sh(["magick", str(c), str(a), "-compose", "Divide", "-composite", str(d)])
    post = ["-negate"] if kind == "light" else []
    r = sh(["magick", str(d), *post, str(a), "-alpha", "off",
            "-compose", "CopyOpacity", "-composite", str(path)])
    for tmp in (a, c, d):
        tmp.unlink(missing_ok=True)
    return r


def poster_fit(src, dst):
    """Full-bleed, background intact. For designs where the field is the art."""
    r = sh(["magick", str(src), "-alpha", "off",
            "-resize", f"{PW}x{PH}^", "-gravity", "center",
            "-extent", f"{PW}x{PH}", str(dst)])
    if not dst.exists():
        raise RuntimeError(f"poster fit failed for {src.name}: {r.stderr[-300:]}")


def key_and_fit(src, dst, kind, fuzz_override=None, seed_override=None):
    """Remove the border-connected background, THEN fit to the placement.

    Order matters and getting it wrong fails silently. Extending the canvas
    first pads it with transparency, so a flood fill seeded at +0+0 lands in
    that padding, matches nothing, and returns an untouched image with a fully
    opaque background — which still looks like a plausible result and would
    have gone to Printful as a black ink panel on a black shirt.
    """
    seed = seed_override or ("black" if kind == "dark" else "white")
    # Fuzz is generous for light backgrounds (Firefly's white is not flat, it
    # ranges 242-255) and tight for dark ones, where the artwork itself sits
    # close to the background and a wide fuzz starts eating it.
    fuzz = fuzz_override or ("18%" if kind == "light" else "12%")

    w, h = map(int, sh(["magick", str(src), "-format", "%w %h",
                        "info:"]).stdout.split())

    cmd = ["magick", str(src), "-alpha", "set", "-fuzz", fuzz, "-fill", "none"]
    # Seed every corner: the background is often split into disconnected
    # regions by artwork that reaches the edge.
    for pt in (f"+0+0", f"+{w-1}+0", f"+0+{h-1}", f"+{w-1}+{h-1}"):
        cmd += ["-floodfill", pt, seed]
    # No alpha erosion here, deliberately.
    #
    # An earlier version eroded the alpha by 1.5px to swallow the fringe left
    # where an anti-aliased edge had been blended against the old background.
    # That is harmless on a large shape and ruinous on type: these designs set
    # body text at 1-2px stroke weight, so a 1.5px bite from each side thinned
    # every letterform to a grey ghost and deleted the dry-brush speckle inside
    # the wordmarks entirely. The output looked plausible at thumbnail size and
    # was visibly degraded at 100%.
    #
    # It was also solving a problem that no longer exists. Dark designs print on
    # Black and light ones on White, so whatever fringe survives is the colour
    # of the garment behind it.
    # Size it to the placement.
    cmd += ["-resize", f"{PW}x{PH}", "-background", "none",
            "-gravity", "center", "-extent", f"{PW}x{PH}", str(dst)]
    r = sh(cmd)
    if not dst.exists():
        raise RuntimeError(f"key failed for {src.name}: {r.stderr[-300:]}")


def coverage(f):
    """Share of the canvas that survived as opaque."""
    out = sh(["magick", str(f), "-alpha", "extract",
              "-format", "%[fx:mean]", "info:"]).stdout.strip()
    try:
        return float(out)
    except ValueError:
        return -1.0


def background_gone(out_file, src_w, src_h):
    """Assert the artwork's own corner is transparent, not just the padding.

    A plain coverage number cannot tell "background removed" from "background
    intact": a 2:3 source fitted into a 3:4 placement reports 89% opaque in
    both cases, because the letterboxing alone accounts for the missing 11%.
    That is how the first run of this script produced eleven files that looked
    fine by the numbers and had every background still in place.

    So this looks where the answer actually differs — just inside the content
    rectangle, where the old background used to be.
    """
    scale = min(PW / src_w, PH / src_h)
    cw, ch = round(src_w * scale), round(src_h * scale)
    ox, oy = (PW - cw) // 2, (PH - ch) // 2
    p = pixel(out_file, ox + 4, oy + 4)
    # Fully transparent renders as alpha 0; ImageMagick writes it as "none" or
    # an rgba(...,0) tuple depending on version.
    return "none" in p or p.rstrip(") ").endswith(",0")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not UPSCAYL.exists():
        print(f"Missing upscayl: {UPSCAYL}", file=sys.stderr)
        return 1

    idx = json.load(open(BUILD / "index.json"))
    UP.mkdir(parents=True, exist_ok=True)
    PRINT.mkdir(parents=True, exist_ok=True)

    report = {}
    for key, fname in idx.items():
        src = ROOT / fname
        kind = classify(src)
        slug = SLUGS[key]
        route = "poster" if key in POSTER_ONLY else "tee"
        if args.dry_run:
            fz = FUZZ_OVERRIDE.get(key, "")
            print(f"  {key}  {kind:<6} {route:<7} -> {slug} {fz}")
            continue

        print(f"  {key} {kind:<6} {route:<7} upscaling...", flush=True)
        up = UP / f"{key}.png"
        if key in KEY_FIRST:
            pre = BUILD / f"_keyed_{key}.png"
            key_only(src, pre, kind, FUZZ_OVERRIDE.get(key))
            up = UP / f"{key}-keyed.png"
            upscale(pre, up)
        else:
            upscale(src, up)

        out = PRINT / f"{slug}.png"
        if route == "poster":
            poster_fit(up, out)
            report[key] = {"slug": slug, "kind": kind, "route": route}
            print(f"       {out.name}  full-bleed, background kept")
            continue

        if key in KEY_FIRST:
            fit_only(up, out)
        else:
            key_and_fit(up, out, kind, FUZZ_OVERRIDE.get(key))
        # Last, after the resize that introduced the contamination.
        unmat(out, kind)
        cov = coverage(out)
        sw, sh_ = map(int, sh(["magick", str(up), "-format", "%w %h",
                               "info:"]).stdout.split())
        ok = background_gone(out, sw, sh_)
        report[key] = {"slug": slug, "kind": kind, "route": route,
                       "coverage": round(cov, 3), "keyed": ok}
        flag = "" if ok else "  <-- BACKGROUND STILL OPAQUE"
        if ok and cov < 0.08:
            flag = "  <-- almost everything was removed"
        print(f"       {out.name}  opaque {cov*100:.0f}%  keyed={ok}{flag}")

    if not args.dry_run:
        json.dump(report, open(BUILD / "report.json", "w"), indent=1)
        print(f"\n  {len(report)} printfiles in {PRINT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

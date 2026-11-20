"""Auto-calibrate GRID world coordinates to the radar images in frontend/public/maps.

For every map we try the 8 axis orientations (swap / flip x / flip y) and two framings (bounds
mapped to the full image, or to the drawn-map bounding box), and keep the one where the most real
cast and kill positions land on drawn (walkable) pixels. Output: frontend/src/lib/scoutMaps.json

    python tools/calibrate_maps.py          # needs: pip install pillow  (dev-only tool)
"""

import glob
import itertools
import json
import pathlib

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
CACHE = ROOT / ".scout-cache"
MAPS = ROOT / "frontend" / "public" / "maps"
OUT = ROOT / "frontend" / "src" / "lib" / "scoutMaps.json"


def collect():
    pts, bounds = {}, {}
    for f in glob.glob(str(CACHE / "*.json")):
        d = json.load(open(f))
        for g in d["games"]:
            if not g.get("bounds"):
                continue
            m = g["map"]
            bounds[m] = g["bounds"]
            arr = pts.setdefault(m, [])
            for r in g["rounds"]:
                for c in r["casts"]:
                    arr.append((c["x"], c["y"]))
                for k in r["kills"]:
                    if k["kx"] is not None:
                        arr.append((k["kx"], k["ky"]))
    return pts, bounds


def main():
    pts, bounds = collect()
    result = {}
    for m, arr in sorted(pts.items()):
        png = MAPS / f"{m}.png"
        if not png.exists():
            print(f"{m}: no image")
            continue
        im = Image.open(png).convert("RGBA")
        W, H = im.size
        a = np.array(im)
        # Drawn pixels: opaque and not (near) white background.
        mask = (a[..., 3] > 128) & ~((a[..., :3] > 235).all(axis=-1))
        ys, xs = np.nonzero(mask)
        box = (xs.min() / W, ys.min() / H, (xs.max() + 1) / W, (ys.max() + 1) / H)
        b = bounds[m]
        mn, mx = b["min"], b["max"]
        p = np.array(arr, dtype=float)
        nx = (p[:, 0] - mn["x"]) / (mx["x"] - mn["x"])
        ny = (p[:, 1] - mn["y"]) / (mx["y"] - mn["y"])
        ok = (nx >= 0) & (nx <= 1) & (ny >= 0) & (ny <= 1)
        nx, ny = nx[ok], ny[ok]
        best = None
        for swap, fx, fy in itertools.product([False, True], repeat=3):
            u, v = (ny, nx) if swap else (nx, ny)
            if fx:
                u = 1 - u
            if fy:
                v = 1 - v
            for framing, fb in (("full", (0.0, 0.0, 1.0, 1.0)), ("box", box)):
                px = (fb[0] + u * (fb[2] - fb[0])) * (W - 1)
                py = (fb[1] + v * (fb[3] - fb[1])) * (H - 1)
                score = float(mask[py.astype(int).clip(0, H - 1), px.astype(int).clip(0, W - 1)].mean())
                cand = {"swap": swap, "flipX": fx, "flipY": fy, "framing": framing, "box": list(fb), "score": round(score, 4)}
                if best is None or score > best["score"]:
                    best = cand
        best["points"] = int(len(nx))
        best["bounds"] = {"minX": mn["x"], "maxX": mx["x"], "minY": mn["y"], "maxY": mx["y"]}
        best["image"] = f"/maps/{m}.png"
        result[m] = best
        print(f"{m:9s} score={best['score']:.3f} swap={best['swap']} fx={best['flipX']} fy={best['flipY']} {best['framing']} n={best['points']}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()

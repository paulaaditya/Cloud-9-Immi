"""Site locations per map, learned from where attackers planted the spike across the whole dataset.

The GRID feed carries no site labels, so we cluster plant positions (k-means, deterministic) with
k = 3 for Haven and Lotus and 2 elsewhere. Sites are numbered by x position ("Site 1", "Site 2", ...);
the map overlay shows where each one is. Results are cached in `.scout-cache/` (git-ignored).
"""

import json
from collections import Counter
from functools import lru_cache
from typing import Any, Dict, List, Tuple

import numpy as np

from src.scouting.store import CACHE_VERSION, cache_dir

SITE_COUNT = {"haven": 3, "lotus": 3}
DEFAULT_SITES = 2
MIN_PLANTS = 12


def kmeans(points: np.ndarray, k: int, seed: int = 0, iters: int = 40) -> Tuple[np.ndarray, np.ndarray]:
    """Plain k-means with k-means++ seeding. Returns (centers, labels). Deterministic for a given seed."""
    rng = np.random.default_rng(seed)
    centers = [points[rng.integers(len(points))]]
    while len(centers) < k:
        d2 = np.min([((points - c) ** 2).sum(axis=1) for c in centers], axis=0)
        total = d2.sum()
        probs = d2 / total if total > 0 else np.full(len(points), 1.0 / len(points))
        centers.append(points[rng.choice(len(points), p=probs)])
    c = np.array(centers, dtype=float)
    labels = np.zeros(len(points), dtype=int)
    for it in range(iters):
        d = ((points[:, None, :] - c[None, :, :]) ** 2).sum(axis=2)
        new = d.argmin(axis=1)
        if it > 0 and np.array_equal(new, labels):
            break
        labels = new
        for i in range(k):
            if (labels == i).any():
                c[i] = points[labels == i].mean(axis=0)
    return c, labels


def site_centers_from_plants(plants: List[Tuple[float, float]], k: int) -> List[Dict[str, Any]]:
    """Cluster plant positions into `k` sites. Sites are numbered left to right."""
    if len(plants) < MIN_PLANTS:
        return []
    pts = np.array(plants, dtype=float)
    centers, labels = kmeans(pts, k)
    order = np.argsort(centers[:, 0])
    out = []
    for n, i in enumerate(order, start=1):
        out.append(
            {
                "id": f"S{n}",
                "name": f"Site {n}",
                "x": round(float(centers[i][0]), 1),
                "y": round(float(centers[i][1]), 1),
                "plants": int((labels == i).sum()),
            }
        )
    return out


def _cache_file():
    return cache_dir() / f"sites.v{CACHE_VERSION}.json"


@lru_cache(maxsize=1)
def all_sites() -> Dict[str, List[Dict[str, Any]]]:
    p = _cache_file()
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
    plants: Dict[str, List[Tuple[float, float]]] = {}
    suffix = f".v{CACHE_VERSION}.json"
    for f in cache_dir().glob(f"*{suffix}"):
        if f.name.startswith("sites."):
            continue
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        for g in data.get("games", []):
            for r in g.get("rounds", []):
                pl = r.get("plant")
                if pl and pl.get("x") is not None and pl.get("y") is not None:
                    plants.setdefault(g["map"], []).append((pl["x"], pl["y"]))
    out = {m: site_centers_from_plants(pts, SITE_COUNT.get(m, DEFAULT_SITES)) for m, pts in plants.items()}
    out = {m: s for m, s in out.items() if s}
    try:
        p.write_text(json.dumps(out), encoding="utf-8")
    except OSError:
        pass
    return out


def sites_for(map_name: str) -> List[Dict[str, Any]]:
    return all_sites().get(map_name, [])


def nearest_zone(x: float, y: float, sites: List[Dict[str, Any]], radius: float) -> str:
    """Site id if within `radius` cm of a site centre, else 'mid' (anything not anchored to a site)."""
    best, best_d = "mid", radius
    for s in sites:
        d = ((x - s["x"]) ** 2 + (y - s["y"]) ** 2) ** 0.5
        if d <= best_d:
            best, best_d = s["id"], d
    return best


def zone_counts(zones: List[str]) -> Dict[str, int]:
    return dict(Counter(zones))

"""Attack defaults and executes: where a team takes a site, how fast, with what utility, and how it works out.

Each attacking round is described by:
  * target   - the site the spike was planted on (nearest site centre within PLANT_RADIUS), or "no plant";
  * pace     - when it was planted: early / standard / late (seconds after freezetime ends);
  * lean     - where the living attackers are heading at ~`at` s: each within LEAN_RADIUS of a site counts toward it,
               the rest are "uncommitted", so a round reads like "3 toward Site 1 · 2 uncommitted";
  * package  - utility cast by the team before the plant (average per round, by ability).
Counts and win rates only. Nothing here is a fitted model.
"""

from collections import Counter
from dataclasses import replace
from statistics import median
from typing import Any, Dict, List, Optional

from src.scouting.aggregate import MAX_POINTS, Filters, _confidence, _norm, _pct, iter_rounds
from src.scouting.setups import MIN_ALIVE, MIN_ROUNDS_FOR_NOTE, NeedsOneMap
from src.scouting.sites import nearest_zone, sites_for

LEAN_RADIUS = 4500.0  # cm: an attacker within 45 m of a site is counted as heading there
PLANT_RADIUS = 3500.0  # cm: a plant within 35 m of a centre counts as on that site
EARLY_BEFORE = 40.0  # planted by this many seconds: a fast execute
LATE_AFTER = 65.0  # planted after this: a slow default
AT_CHOICES = (20, 30, 45)
DEFAULT_AT = 45
SNAP_KS = (20, 30, 45)
PACES = ("early", "standard", "late")
PACE_LABEL = {"early": f"early (by {EARLY_BEFORE:.0f}s)", "standard": "standard", "late": f"late (after {LATE_AFTER:.0f}s)"}


def pace_of(t: float) -> str:
    return "early" if t <= EARLY_BEFORE else ("late" if t > LATE_AFTER else "standard")


def pick_snapshot(rnd: Dict[str, Any], at: float) -> Optional[Dict[str, Any]]:
    cands = [s for s in rnd.get("snaps", []) if s["k"] in SNAP_KS]
    return min(cands, key=lambda s: abs(s["t"] - at)) if cands else None


def lean_of(x: float, y: float, sites: List[Dict[str, Any]]) -> str:
    """Nearest site if within LEAN_RADIUS, else 'mid' (still grouped up or in transit, not yet committed)."""
    return nearest_zone(x, y, sites, LEAN_RADIUS)


def lean_key(counts: Dict[str, int], order: List[str]) -> str:
    return "|".join(f"{z}:{counts[z]}" for z in order + ["mid"] if counts.get(z))


def lean_label(counts: Dict[str, int], sites: List[Dict[str, Any]]) -> str:
    names = {s["id"]: s["name"] for s in sites}
    parts = [f"{counts[s['id']]} toward {names[s['id']]}" for s in sites if counts.get(s["id"])]
    if counts.get("mid"):
        parts.append(f"{counts['mid']} uncommitted")
    return " · ".join(parts)


def attack_profile(f: Filters, at: float = float(DEFAULT_AT), limit_points: int = MAX_POINTS) -> Dict[str, Any]:
    if not f.maps or len(f.maps) != 1:
        raise NeedsOneMap("pick exactly one map")
    f = replace(f, side="attacker")
    map_name = next(iter(f.maps))
    sites = sites_for(map_name)
    order = [s["id"] for s in sites]

    total = wins = 0
    series_seen = set()
    bounds: Optional[Dict[str, Any]] = None
    targets: Dict[str, Dict[str, Any]] = {}
    paces: Dict[str, List[int]] = {p: [0, 0] for p in PACES}
    leans: Dict[str, Dict[str, Any]] = {}
    lean_rounds = lean_wins = 0
    planters: Dict[str, Dict[str, Any]] = {}
    pts: List[Dict[str, Any]] = []
    no_plant = [0, 0]  # rounds, wins

    for ctx in iter_rounds(f):
        total += 1
        series_seen.add(ctx.series["series_id"])
        won = ctx.rnd.get("winner") == ctx.tid
        wins += won
        if ctx.game.get("bounds"):
            bounds = ctx.game["bounds"]
        plant = ctx.rnd.get("plant")
        target = None
        if plant and plant.get("x") is not None and plant.get("y") is not None and plant.get("tid") == ctx.tid and sites:
            target = nearest_zone(plant["x"], plant["y"], sites, PLANT_RADIUS)
            target = "other" if target == "mid" else target
        if target is None:
            no_plant[0] += 1
            no_plant[1] += won
        else:
            tg = targets.setdefault(target, {"rounds": 0, "wins": 0, "times": [], "paces": Counter(), "casts": Counter(), "ability": Counter()})
            tg["rounds"] += 1
            tg["wins"] += won
            tg["times"].append(plant["t"])
            pc = pace_of(plant["t"])
            tg["paces"][pc] += 1
            paces[pc][0] += 1
            paces[pc][1] += won
            for c in ctx.rnd.get("casts", []):
                if c.get("tid") == ctx.tid and c["t"] <= plant["t"]:
                    tg["casts"][c["cat"]] += 1
                    tg["ability"][c["ability"]] += 1
            info = ctx.players.get(plant["pid"], {})
            pl = planters.setdefault(plant["pid"], {"name": info.get("name") or plant["pid"], "plants": 0, "agents": Counter()})
            pl["plants"] += 1
            if info.get("agent"):
                pl["agents"][info["agent"]] += 1
            pts.append({"x": plant["x"], "y": plant["y"], "t": plant["t"], "ability": "plant", "player": pl["name"], "zone": target})

        snap = pick_snapshot(ctx.rnd, at)
        if snap and sites:
            own = {pid: xy for pid, xy in snap["p"].items() if ctx.players.get(pid, {}).get("tid") == ctx.tid}
            if len(own) >= MIN_ALIVE:
                counts = dict(Counter(lean_of(xy[0], xy[1], sites) for xy in own.values()))
                key = lean_key(counts, order)
                ln = leans.setdefault(
                    key, {"counts": counts, "rounds": 0, "wins": 0, "targets": Counter(), "plants": 0}
                )
                ln["rounds"] += 1
                ln["wins"] += won
                if target:
                    ln["targets"][target] += 1
                    ln["plants"] += 1
                lean_rounds += 1
                lean_wins += won

    planted = total - no_plant[0]
    names = {s["id"]: s["name"] for s in sites} | {"other": "Other"}
    target_rows = []
    for z, tg in sorted(targets.items(), key=lambda kv: -kv[1]["rounds"]):
        n = tg["rounds"]
        target_rows.append(
            {
                "zone": z,
                "name": names.get(z, z),
                "rounds": n,
                "share_pct": _pct(n, total),
                "win_pct": _pct(tg["wins"], n),
                "median_plant_t": round(float(median(tg["times"])), 1),
                "paces": {p: tg["paces"].get(p, 0) for p in PACES},
                "avg_utility": round(sum(tg["casts"].values()) / n, 1),
                "top_abilities": [{"ability": a, "per_round": round(c / n, 2)} for a, c in tg["ability"].most_common(5)],
            }
        )

    lean_rows = []
    for key, ln in sorted(leans.items(), key=lambda kv: -kv[1]["rounds"]):
        lean_rows.append(
            {
                "key": key,
                "label": lean_label(ln["counts"], sites),
                "rounds": ln["rounds"],
                "share_pct": _pct(ln["rounds"], lean_rounds),
                "win_pct": _pct(ln["wins"], ln["rounds"]),
                "planted_on": [
                    {"zone": z, "name": names.get(z, z), "pct": _pct(c, ln["plants"])} for z, c in ln["targets"].most_common(3)
                ],
            }
        )

    planter_rows = sorted(
        (
            {"id": pid, "name": d["name"], "plants": d["plants"], "main_agent": d["agents"].most_common(1)[0][0] if d["agents"] else None,
             "share_pct": _pct(d["plants"], planted)}
            for pid, d in planters.items()
        ),
        key=lambda r: -r["plants"],
    )

    site_rows = []
    for s in sites:
        nx, ny = _norm(s["x"], s["y"], bounds) if bounds else (None, None)
        site_rows.append({**s, "nx": nx, "ny": ny})
    sample = pts if len(pts) <= limit_points else pts[:: -(-len(pts) // limit_points)]
    out_points = []
    for p in sample:
        nx, ny = _norm(p["x"], p["y"], bounds) if bounds else (None, None)
        out_points.append({"nx": nx, "ny": ny, "t": p["t"], "player": p["player"], "zone": p["zone"], "ability": "plant"})

    result = {
        "filters": f.applied(),
        "map": map_name,
        "bounds": bounds,
        "snapshot_seconds": at,
        "evidence": {
            "series": len(series_seen),
            "rounds_analyzed": total,
            "rounds_planted": planted,
            "plant_pct": _pct(planted, total),
            "attack_win_pct": _pct(wins, total),
            "rounds_with_lean": lean_rounds,
            "confidence": _confidence(total),
        },
        "sites": site_rows,
        "targets": target_rows,
        "no_plant": {"rounds": no_plant[0], "win_pct": _pct(no_plant[1], no_plant[0])},
        "pace": [
            {"pace": p, "label": PACE_LABEL[p], "rounds": paces[p][0], "share_pct": _pct(paces[p][0], planted), "win_pct": _pct(paces[p][1], paces[p][0])}
            for p in PACES
        ],
        "leans": lean_rows,
        "planters": planter_rows,
        "points": out_points,
    }
    result["insights"] = attack_insights(result)
    result["counter_notes"] = attack_counter_notes(result)
    return result


def attack_insights(res: Dict[str, Any]) -> List[str]:
    ev = res["evidence"]
    if not ev["rounds_analyzed"]:
        return ["No attacking rounds match this selection."]
    notes = [
        f"{ev['rounds_analyzed']} attacking rounds on {res['map'].title()}; the spike was planted in {ev['rounds_planted']} "
        f"({ev['plant_pct']}%) and attack won {ev['attack_win_pct']}% (confidence: {ev['confidence']})."
    ]
    if res["targets"]:
        parts = [f"{t['name']} {t['share_pct']}%" for t in res["targets"]]
        notes.append("Plant sites: " + ", ".join(parts) + ".")
        top = res["targets"][0]
        notes.append(
            f"Most planted: {top['name']} ({top['rounds']} rounds), median plant at {top['median_plant_t']}s, "
            f"about {top['avg_utility']} abilities used before the plant, round won {top['win_pct']}%."
        )
    if res["leans"]:
        top = res["leans"][0]
        notes.append(f"Most common attacker spread at ~{res['snapshot_seconds']:.0f}s: {top['label']} ({top['rounds']} rounds, {top['share_pct']}%).")
    if res["planters"]:
        p = res["planters"][0]
        notes.append(f"{p['name']} plants most often: {p['plants']} of {ev['rounds_planted']} plants ({p['share_pct']}%).")
    return notes


def attack_counter_notes(res: Dict[str, Any]) -> List[str]:
    ev, notes = res["evidence"], []
    if ev["rounds_planted"] < MIN_ROUNDS_FOR_NOTE * 2 or not res["targets"]:
        return notes
    top = res["targets"][0]
    if top["share_pct"] >= 40:
        notes.append(f"They plant {top['name']} in {top['share_pct']}% of attacking rounds. Anchor it by default and keep rotation help ready for the other site.")
    sites = [t for t in res["targets"] if t["zone"] != "other"]
    if len(sites) >= 2 and sites[-1]["rounds"] >= MIN_ROUNDS_FOR_NOTE and sites[-1]["win_pct"] <= sites[0]["win_pct"] - 15:
        weak = sites[-1]
        notes.append(f"{weak['name']} is their weaker hit: {weak['win_pct']}% won over {weak['rounds']} rounds, against {sites[0]['win_pct']}% on {sites[0]['name']}.")
    fast = next((p for p in res["pace"] if p["pace"] == "early"), None)
    if fast and fast["share_pct"] >= 35 and fast["rounds"] >= MIN_ROUNDS_FOR_NOTE:
        notes.append(f"{fast['share_pct']}% of plants come early (by {EARLY_BEFORE:.0f}s), winning {fast['win_pct']}%. Expect fast executes; save utility for the first push.")
    late = next((p for p in res["pace"] if p["pace"] == "late"), None)
    if late and late["rounds"] >= MIN_ROUNDS_FOR_NOTE and late["win_pct"] <= ev["attack_win_pct"] - 15:
        notes.append(f"Late plants (after {LATE_AFTER:.0f}s) are their weak spot: {late['win_pct']}% won over {late['rounds']} rounds, so slow the round down.")
    return notes

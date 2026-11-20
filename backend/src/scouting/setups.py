"""Defensive setups: how many defenders a team puts on each site (or mid) early in the round, and how it works out.

Every round on the defender side contributes one snapshot of its living players taken about `at` seconds
after freezetime ends (the nearest of the 10/15/20 s snapshots). Each player is placed on the site whose
centre is nearest, provided it is within SITE_RADIUS; otherwise on "mid". A round's setup is its count per
zone, for example "2 on Site 1, 2 on Site 2, 1 mid". Setups are counted, with win rates, so a coach can see
what the team does and whether it works. Nothing here is a fitted model.
"""

from collections import Counter
from dataclasses import replace
from typing import Any, Dict, List, Optional

from src.scouting.aggregate import (
    MAX_POINTS,
    Filters,
    _confidence,
    _norm,
    _pct,
    find_hotspots,
    iter_rounds,
)
from src.scouting.sites import nearest_zone, sites_for

SITE_RADIUS = 2200.0  # cm: a defender within 22 m of a site centre is anchoring that site
SNAP_KS = (10, 15, 20)
MIN_ALIVE = 4  # a snapshot needs at least this many living defenders to describe a setup
MIN_ROUNDS_FOR_NOTE = 8
AT_CHOICES = (10, 15, 20)


class NeedsOneMap(ValueError):
    """Setups are map-specific, so exactly one map must be selected."""


def pick_snapshot(rnd: Dict[str, Any], at: float) -> Optional[Dict[str, Any]]:
    cands = [s for s in rnd.get("snaps", []) if s["k"] in SNAP_KS]
    return min(cands, key=lambda s: abs(s["t"] - at)) if cands else None


def setup_key(counts: Dict[str, int], zone_order: List[str]) -> str:
    return "|".join(f"{z}:{counts[z]}" for z in zone_order if counts.get(z))


def setup_label(counts: Dict[str, int], sites: List[Dict[str, Any]]) -> str:
    names = {s["id"]: s["name"] for s in sites} | {"mid": "mid / other"}
    order = [s["id"] for s in sites] + ["mid"]
    return " · ".join(f"{counts[z]} {names[z]}" for z in order if counts.get(z))


def defense_setups(f: Filters, at: float = 15.0, limit_points: int = MAX_POINTS) -> Dict[str, Any]:
    if not f.maps or len(f.maps) != 1:
        raise NeedsOneMap("pick exactly one map")
    f = replace(f, side="defender")
    map_name = next(iter(f.maps))
    sites = sites_for(map_name)
    zone_order = [s["id"] for s in sites] + ["mid"]

    rounds_total = 0
    series_seen = set()
    setups: Dict[str, Dict[str, Any]] = {}
    rounds_with_setup = 0
    team_wins = 0
    team_wins_with_setup = 0
    zone_totals: Counter = Counter()
    load: Dict[str, Dict[int, List[int]]] = {z: {n: [0, 0] for n in range(4)} for z in zone_order}  # zone -> defenders(0..3+) -> [rounds, wins]
    players: Dict[str, Dict[str, Any]] = {}
    pts: List[Dict[str, Any]] = []
    bounds: Optional[Dict[str, Any]] = None

    for ctx in iter_rounds(f):
        rounds_total += 1
        series_seen.add(ctx.series["series_id"])
        won = ctx.rnd.get("winner") == ctx.tid
        team_wins += won
        if ctx.game.get("bounds"):
            bounds = ctx.game["bounds"]
        snap = pick_snapshot(ctx.rnd, at)
        if not snap:
            continue
        own = {pid: xy for pid, xy in snap["p"].items() if ctx.players.get(pid, {}).get("tid") == ctx.tid}
        if len(own) < MIN_ALIVE or not sites:
            continue
        zones = {pid: nearest_zone(xy[0], xy[1], sites, SITE_RADIUS) for pid, xy in own.items()}
        counts = dict(Counter(zones.values()))
        key = setup_key(counts, zone_order)
        rounds_with_setup += 1
        team_wins_with_setup += won
        zone_totals.update(counts)
        for z in zone_order:
            cell = load[z][min(counts.get(z, 0), 3)]
            cell[0] += 1
            cell[1] += won
        s = setups.setdefault(key, {"counts": counts, "rounds": 0, "wins": 0})
        s["rounds"] += 1
        s["wins"] += won
        rk = ctx.key
        for pid, xy in own.items():
            info = ctx.players.get(pid, {})
            if f.players and pid not in f.players:
                continue
            if f.agents and info.get("agent") not in f.agents:
                continue
            d = players.setdefault(pid, {"name": info.get("name") or pid, "rounds": 0, "zones": Counter(), "agents": Counter()})
            d["rounds"] += 1
            d["zones"][zones[pid]] += 1
            if info.get("agent"):
                d["agents"][info["agent"]] += 1
            pts.append({"x": xy[0], "y": xy[1], "t": snap["t"], "ability": "hold", "player": d["name"], "rk": rk, "zone": zones[pid], "setup": key})

    team_win_pct = _pct(team_wins, rounds_total)
    setup_rows = []
    for key, s in sorted(setups.items(), key=lambda kv: -kv[1]["rounds"]):
        setup_rows.append(
            {
                "key": key,
                "label": setup_label(s["counts"], sites),
                "counts": s["counts"],
                "rounds": s["rounds"],
                "share_pct": _pct(s["rounds"], rounds_with_setup),
                "wins": s["wins"],
                "win_pct": _pct(s["wins"], s["rounds"]),
            }
        )

    player_rows = []
    for pid, d in players.items():
        zs = [{"zone": z, "rounds": c, "pct": _pct(c, d["rounds"])} for z, c in d["zones"].most_common(3)]
        player_rows.append(
            {
                "id": pid,
                "name": d["name"],
                "rounds": d["rounds"],
                "main_agent": d["agents"].most_common(1)[0][0] if d["agents"] else None,
                "zones": zs,
            }
        )
    player_rows.sort(key=lambda p: -p["rounds"])

    hotspots = find_hotspots(pts, bounds, rounds_with_setup) if pts else []
    sample = pts if len(pts) <= limit_points else pts[:: -(-len(pts) // limit_points)]
    out_points = []
    for p in sample:
        nx, ny = _norm(p["x"], p["y"], bounds) if bounds else (None, None)
        out_points.append({"nx": nx, "ny": ny, "t": p["t"], "player": p["player"], "zone": p["zone"], "setup": p["setup"]})

    site_rows = []
    for s in sites:
        nx, ny = _norm(s["x"], s["y"], bounds) if bounds else (None, None)
        n = zone_totals.get(s["id"], 0)
        site_rows.append(
            {
                **s,
                "nx": nx,
                "ny": ny,
                "avg_defenders": round(n / rounds_with_setup, 2) if rounds_with_setup else 0.0,
            }
        )

    result = {
        "filters": f.applied(),
        "map": map_name,
        "bounds": bounds,
        "snapshot_seconds": at,
        "site_radius_m": SITE_RADIUS / 100,
        "evidence": {
            "series": len(series_seen),
            "rounds_analyzed": rounds_total,
            "rounds_with_setup": rounds_with_setup,
            "rounds_with_setup_pct": _pct(rounds_with_setup, rounds_total),
            "defense_win_pct": team_win_pct,
            "confidence": _confidence(rounds_with_setup),
        },
        "sites": site_rows,
        "avg_mid_defenders": round(zone_totals.get("mid", 0) / rounds_with_setup, 2) if rounds_with_setup else 0.0,
        "setups": setup_rows,
        "site_load": [
            {
                "zone": z,
                "name": next((x["name"] for x in sites if x["id"] == z), "mid / other"),
                "rows": [
                    {"defenders": ("3+" if n == 3 else str(n)), "rounds": load[z][n][0], "win_pct": _pct(load[z][n][1], load[z][n][0])}
                    for n in range(4)
                ],
            }
            for z in zone_order
        ],
        "players": player_rows,
        "hotspots": hotspots,
        "points": out_points,
    }
    result["insights"] = setup_insights(result)
    result["counter_notes"] = setup_counter_notes(result)
    return result


def setup_insights(res: Dict[str, Any]) -> List[str]:
    ev, notes = res["evidence"], []
    if not ev["rounds_with_setup"]:
        return ["No defensive setups could be read for this selection (too few rounds with a position snapshot)."]
    notes.append(
        f"{ev['rounds_with_setup']} defensive rounds on {res['map'].title()} read at ~{res['snapshot_seconds']:.0f}s "
        f"(of {ev['rounds_analyzed']}); defense won {ev['defense_win_pct']}% of them (confidence: {ev['confidence']})."
    )
    top = res["setups"][0]
    notes.append(f"Most common setup: {top['label']} in {top['rounds']} rounds ({top['share_pct']}%), won {top['win_pct']}%.")
    if res["sites"]:
        parts = [f"{s['name']} {s['avg_defenders']}" for s in res["sites"]] + [f"mid/other {res['avg_mid_defenders']}"]
        notes.append("Average defenders by zone: " + ", ".join(parts) + ".")
    for p in res["players"][:5]:
        z = p["zones"][0] if p["zones"] else None
        if z and z["pct"] >= 50 and p["rounds"] >= MIN_ROUNDS_FOR_NOTE:
            name = next((s["name"] for s in res["sites"] if s["id"] == z["zone"]), "mid / other")
            notes.append(f"{p['name']} is on {name} in {z['pct']}% of rounds ({z['rounds']}/{p['rounds']}).")
    return notes


def setup_counter_notes(res: Dict[str, Any]) -> List[str]:
    ev, notes = res["evidence"], []
    if ev["rounds_with_setup"] < MIN_ROUNDS_FOR_NOTE * 2 or not res["sites"]:
        return notes
    sites = sorted(res["sites"], key=lambda s: s["avg_defenders"])
    light, heavy = sites[0], sites[-1]
    if heavy["avg_defenders"] - light["avg_defenders"] >= 0.5:
        notes.append(
            f"{light['name']} is the lightest site: {light['avg_defenders']} defenders on average at "
            f"~{res['snapshot_seconds']:.0f}s against {heavy['avg_defenders']} on {heavy['name']}. "
            f"Attacking {light['name']} meets the fewest early defenders."
        )
    top = res["setups"][0]
    if top["share_pct"] >= 25:
        notes.append(
            f"They run {top['label']} in {top['share_pct']}% of rounds, so expect it by default; "
            f"it has won {top['win_pct']}% ({top['rounds']} rounds)."
        )
    for sl in res["site_load"]:
        if sl["zone"] == "mid":
            continue
        light = [r for r in sl["rows"] if r["defenders"] in ("0", "1")]
        heavy = [r for r in sl["rows"] if r["defenders"] in ("2", "3+")]
        lr, hr = sum(r["rounds"] for r in light), sum(r["rounds"] for r in heavy)
        if lr < MIN_ROUNDS_FOR_NOTE or hr < MIN_ROUNDS_FOR_NOTE:
            continue
        lw = sum(r["rounds"] * r["win_pct"] for r in light) / lr
        hw = sum(r["rounds"] * r["win_pct"] for r in heavy) / hr
        if hw - lw >= 15:
            notes.append(
                f"With 0-1 defenders on {sl['name']} at ~{res['snapshot_seconds']:.0f}s they won {lw:.0f}% ({lr} rounds), "
                f"against {hw:.0f}% with 2+ ({hr} rounds). A light hold there is where they are beatable."
            )
    base = ev["defense_win_pct"]
    for s in res["setups"]:
        if s["rounds"] >= MIN_ROUNDS_FOR_NOTE and s["win_pct"] <= base - 15:
            notes.append(f"Their {s['label']} setup is the soft spot: {s['win_pct']}% won over {s['rounds']} rounds, against {base}% overall.")
            break
    return notes

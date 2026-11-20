"""Scouting aggregation: filterable utility heatmaps and an Operator profiler, with evidence.

Every number returned carries its denominator (rounds / matches analyzed) so a coach can judge how
strongly a pattern is supported. Nothing here is a model fit: these are counts and shares over the
selected sample, and the sample size is always reported alongside.
"""

import math
import statistics
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, Iterator, List, Optional, Set, Tuple

import numpy as np

from src.scouting.catalog import load_catalog
from src.scouting.store import get_series
from src.scouting.taxonomy import CATEGORIES

BAD_QUALITY = {"gap_exceeded", "missing_both"}
MAX_POINTS = 4000
TIME_BUCKETS = [(0, 20, "0-20s"), (20, 40, "20-40s"), (40, 60, "40-60s"), (60, 10_000, "60s+")]


@dataclass
class Filters:
    team_ids: List[str]
    maps: Optional[Set[str]] = None
    side: Optional[str] = None  # "attacker" | "defender"
    agents: Optional[Set[str]] = None
    players: Optional[Set[str]] = None
    abilities: Optional[Set[str]] = None
    categories: Optional[Set[str]] = None
    patches: Optional[Set[str]] = None
    events: Optional[Set[str]] = None
    exclude_low_rate: bool = False
    last_n_series: Optional[int] = None

    def applied(self) -> Dict[str, Any]:
        out: Dict[str, Any] = {}
        for k in ("maps", "agents", "players", "abilities", "categories", "patches", "events"):
            v = getattr(self, k)
            if v:
                out[k] = sorted(v)
        if self.side:
            out["side"] = self.side
        if self.exclude_low_rate:
            out["exclude_low_rate"] = True
        if self.last_n_series:
            out["last_n_series"] = self.last_n_series
        return out


@dataclass
class RoundCtx:
    series: Dict[str, Any]
    game: Dict[str, Any]
    rnd: Dict[str, Any]
    tid: str
    side: str
    players: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    @property
    def key(self) -> Tuple[str, str, int]:
        return (self.series["series_id"], self.game["game_id"], self.rnd["n"])


def _series_ids(f: Filters) -> List[str]:
    cat = load_catalog()
    ids: List[str] = []
    for tid in f.team_ids:
        for sid in cat.team_series.get(tid, []):
            if sid not in ids:
                ids.append(sid)
    ids.sort(key=lambda s: cat.series[s].scheduled_start if s in cat.series else "")
    if f.events:
        ids = [s for s in ids if cat.series[s].event in f.events]
    if f.exclude_low_rate:
        ids = [s for s in ids if not cat.series[s].low_rate]
    if f.last_n_series:
        ids = ids[-f.last_n_series :]
    return ids


def iter_rounds(f: Filters) -> Iterator[RoundCtx]:
    for sid in _series_ids(f):
        data = get_series(sid)
        if not data:
            continue
        for g in data["games"]:
            if f.maps and g["map"] not in f.maps:
                continue
            if f.patches and g.get("patch") not in f.patches:
                continue
            for r in g["rounds"]:
                tid = next((t for t in f.team_ids if t in r["sides"]), None)
                if tid is None:
                    continue
                side = r["sides"][tid]
                if f.side and side != f.side:
                    continue
                yield RoundCtx(data, g, r, tid, side, {p["id"]: p for p in r["players"]})


# ----------------------------------------------------------------------------- helpers


def _pct(n: int, d: int) -> float:
    return round(100.0 * n / d, 1) if d else 0.0


def _confidence(rounds: int) -> str:
    if rounds >= 80:
        return "high"
    if rounds >= 25:
        return "medium"
    return "low"


def _norm(x: float, y: float, bounds: Optional[Dict[str, Any]]) -> Tuple[Optional[float], Optional[float]]:
    if not bounds:
        return None, None
    mn, mx = bounds["min"], bounds["max"]
    w, h = mx["x"] - mn["x"], mx["y"] - mn["y"]
    if not w or not h:
        return None, None
    return round((x - mn["x"]) / w, 4), round((y - mn["y"]) / h, 4)


def _percentile(vals: List[float], q: float) -> float:
    if not vals:
        return 0.0
    s = sorted(vals)
    i = min(len(s) - 1, max(0, int(round(q * (len(s) - 1)))))
    return s[i]


def find_hotspots(
    points: List[Dict[str, Any]], bounds: Optional[Dict[str, Any]], total_rounds: int, k: int = 5, cell: float = 500.0
) -> List[Dict[str, Any]]:
    """Greedy density hotspots on a coarse grid (5 m cells, 3x3 smoothing).

    Each hotspot reports how many *distinct rounds* it appears in, which is the number a coach
    cares about ("in 24 of 60 rounds"), not just the raw cast count.
    """
    if len(points) < 3:
        return []
    xs = np.array([p["x"] for p in points], dtype=float)
    ys = np.array([p["y"] for p in points], dtype=float)
    alive = np.ones(len(points), dtype=bool)
    min_members = max(3, int(0.03 * len(points)))
    out: List[Dict[str, Any]] = []
    for _ in range(k):
        if alive.sum() < min_members:
            break
        ax, ay = xs[alive], ys[alive]
        x0, y0 = ax.min(), ay.min()
        gx = ((ax - x0) // cell).astype(int)
        gy = ((ay - y0) // cell).astype(int)
        grid = np.zeros((gx.max() + 3, gy.max() + 3), dtype=int)
        np.add.at(grid, (gx + 1, gy + 1), 1)
        sm = np.zeros_like(grid)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                sm += np.roll(np.roll(grid, dx, axis=0), dy, axis=1)
        ci, cj = np.unravel_index(np.argmax(sm), sm.shape)
        cx, cy = x0 + (ci - 1 + 0.5) * cell, y0 + (cj - 1 + 0.5) * cell
        near = alive & (np.abs(xs - cx) <= 1.5 * cell) & (np.abs(ys - cy) <= 1.5 * cell)
        n = int(near.sum())
        if n < min_members:
            break
        idx = np.nonzero(near)[0]
        mem = [points[i] for i in idx]
        mx, my = float(np.mean([p["x"] for p in mem])), float(np.mean([p["y"] for p in mem]))
        rounds_with = len({p["rk"] for p in mem})
        ts = [p["t"] for p in mem]
        abil = Counter(p["ability"] for p in mem)
        plr = Counter(p["player"] for p in mem)
        nx, ny = _norm(mx, my, bounds)
        out.append(
            {
                "rank": len(out) + 1,
                "x": round(mx, 1),
                "y": round(my, 1),
                "nx": nx,
                "ny": ny,
                "casts": n,
                "share_of_casts_pct": _pct(n, len(points)),
                "rounds_with": rounds_with,
                "rounds_total": total_rounds,
                "rounds_with_pct": _pct(rounds_with, total_rounds),
                "median_t": round(statistics.median(ts), 1),
                "p25_t": round(_percentile(ts, 0.25), 1),
                "p75_t": round(_percentile(ts, 0.75), 1),
                "top_abilities": [{"ability": a, "casts": c} for a, c in abil.most_common(3)],
                "top_players": [{"player": p, "casts": c} for p, c in plr.most_common(3)],
            }
        )
        alive &= ~near
    return out


# ----------------------------------------------------------------------------- options


def team_options(team_ids: List[str]) -> Dict[str, Any]:
    """Values available for each filter, taken from the team's own matches."""
    cat = load_catalog()
    maps: Counter = Counter()
    patches: Counter = Counter()
    agents: Counter = Counter()
    abilities: Counter = Counter()
    players: Dict[str, Dict[str, Any]] = {}
    events: Counter = Counter()
    series_n = 0
    rounds = 0
    first = last = ""
    f = Filters(team_ids=team_ids)
    seen_series: Set[str] = set()
    for ctx in iter_rounds(f):
        rounds += 1
        maps[ctx.game["map"]] += 1
        if ctx.game.get("patch"):
            patches[ctx.game["patch"]] += 1
        sid = ctx.series["series_id"]
        if sid not in seen_series:
            seen_series.add(sid)
            events[ctx.series["event"]] += 1
            start = ctx.series.get("scheduled_start") or ""
            first = start if not first or start < first else first
            last = start if start > last else last
        for p in ctx.rnd["players"]:
            if p["tid"] == ctx.tid:
                if p["agent"]:
                    agents[p["agent"]] += 1
                d = players.setdefault(p["id"], {"id": p["id"], "name": p["name"], "rounds": 0})
                d["rounds"] += 1
        for c in ctx.rnd["casts"]:
            if c["tid"] == ctx.tid:
                abilities[c["ability"]] += 1
    series_n = len(seen_series)
    return {
        "team_ids": team_ids,
        "series": series_n,
        "rounds": rounds,
        "date_range": [first, last],
        "maps": [{"map": m, "rounds": c} for m, c in maps.most_common()],
        "patches": [{"patch": p, "rounds": c} for p, c in sorted(patches.items(), reverse=True)],
        "agents": [{"agent": a, "rounds": c} for a, c in agents.most_common()],
        "abilities": [{"ability": a, "casts": c} for a, c in abilities.most_common()],
        "players": sorted(players.values(), key=lambda d: -d["rounds"]),
        "events": [{"event": e, "series": c} for e, c in events.most_common()],
        "categories": CATEGORIES,
    }


# ----------------------------------------------------------------------------- utility


def utility_query(f: Filters, limit_points: int = MAX_POINTS) -> Dict[str, Any]:
    cat_filter = f.categories
    points: List[Dict[str, Any]] = []
    rounds_total = 0
    rounds_with: Set[Tuple[str, str, int]] = set()
    series_seen: Set[str] = set()
    low_rate_rounds = 0
    by_map: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"rounds": 0, "casts": 0})
    by_ability: Counter = Counter()
    by_player: Counter = Counter()
    by_category: Counter = Counter()
    time_hist: Counter = Counter()
    bounds_by_map: Dict[str, Any] = {}
    dropped_quality = 0

    for ctx in iter_rounds(f):
        rounds_total += 1
        m = ctx.game["map"]
        by_map[m]["rounds"] += 1
        series_seen.add(ctx.series["series_id"])
        if ctx.series.get("low_rate"):
            low_rate_rounds += 1
        if ctx.game.get("bounds"):
            bounds_by_map[m] = ctx.game["bounds"]
        for c in ctx.rnd["casts"]:
            if c["tid"] != ctx.tid:
                continue
            if f.abilities and c["ability"] not in f.abilities:
                continue
            if cat_filter and c["cat"] not in cat_filter:
                continue
            p = ctx.players.get(c["pid"], {})
            if f.agents and p.get("agent") not in f.agents:
                continue
            if f.players and c["pid"] not in f.players:
                continue
            if c.get("q") in BAD_QUALITY:
                dropped_quality += 1
                continue
            rounds_with.add(ctx.key)
            by_map[m]["casts"] += 1
            by_ability[c["ability"]] += 1
            by_category[c["cat"]] += 1
            by_player[p.get("name") or c["pid"]] += 1
            time_hist[min(int(c["t"] // 10) * 10, 120)] += 1
            points.append(
                {
                    "x": c["x"],
                    "y": c["y"],
                    "t": c["t"],
                    "ability": c["ability"],
                    "cat": c["cat"],
                    "player": p.get("name") or c["pid"],
                    "agent": p.get("agent"),
                    "map": m,
                    "rk": ctx.key,
                }
            )

    single_map = next(iter(bounds_by_map)) if len(bounds_by_map) == 1 else None
    bounds = bounds_by_map.get(single_map) if single_map else None
    hotspots: List[Dict[str, Any]] = []
    if single_map:
        hotspots = find_hotspots(points, bounds, rounds_total)

    sample = points if len(points) <= limit_points else points[:: math.ceil(len(points) / limit_points)]
    out_points = []
    for p in sample:
        nx, ny = _norm(p["x"], p["y"], bounds) if bounds else (None, None)
        out_points.append(
            {k: v for k, v in p.items() if k not in ("rk",)} | {"nx": nx, "ny": ny}
        )

    evidence = {
        "series": len(series_seen),
        "rounds_analyzed": rounds_total,
        "rounds_with_event": len(rounds_with),
        "rounds_with_event_pct": _pct(len(rounds_with), rounds_total),
        "casts": len(points),
        "low_rate_rounds_pct": _pct(low_rate_rounds, rounds_total),
        "dropped_low_quality_casts": dropped_quality,
        "confidence": _confidence(rounds_total),
        "points_returned": len(out_points),
    }
    result = {
        "filters": f.applied(),
        "map": single_map,
        "bounds": bounds,
        "evidence": evidence,
        "hotspots": hotspots,
        "by_ability": [{"ability": a, "casts": c} for a, c in by_ability.most_common(20)],
        "by_category": [{"category": c, "casts": n} for c, n in by_category.most_common()],
        "by_player": [{"player": p, "casts": c} for p, c in by_player.most_common(10)],
        "by_map": [{"map": m, **v} for m, v in sorted(by_map.items(), key=lambda kv: -kv[1]["rounds"])],
        "timing": [{"bucket_start": b, "casts": c} for b, c in sorted(time_hist.items())],
        "points": out_points,
    }
    result["insights"] = utility_insights(result)
    result["counter_notes"] = utility_counter_notes(result, f)
    return result


def utility_counter_notes(res: Dict[str, Any], f: Filters) -> List[str]:
    """Suggested responses for Cloud9, derived only from frequency and timing in the sample.

    These do not model where an ability lands or what lineup clears it; they say where and when
    to expect the utility and are phrased as suggestions to verify in VOD.
    """
    notes: List[str] = []
    for h in res["hotspots"][:3]:
        if h["rounds_with_pct"] < 20 or not h["top_abilities"]:
            continue
        ab = h["top_abilities"][0]["ability"]
        who = h["top_players"][0]["player"] if h["top_players"] else "the player"
        if f.side == "defender":
            notes.append(
                f"Zone #{h['rank']}: expect {ab} ({who}) in {h['rounds_with_pct']}% of rounds, usually set "
                f"{h['p25_t']}-{h['p75_t']}s in. Probe or clear it with recon/initiator utility before committing "
                f"a trade-dependent entry, and consider executing before ~{h['p25_t']}s while it is still unset."
            )
        elif f.side == "attacker":
            notes.append(
                f"Zone #{h['rank']}: {ab} ({who}) appears in {h['rounds_with_pct']}% of attacking rounds around "
                f"{h['median_t']}s. Hold crossfires on this approach and have a flash/recon ready for that window."
            )
        else:
            notes.append(
                f"Zone #{h['rank']}: {ab} ({who}) in {h['rounds_with_pct']}% of rounds, typically {h['p25_t']}-{h['p75_t']}s in. "
                "Pick a side filter for a side-specific response."
            )
    if notes and res["evidence"]["confidence"] == "low":
        notes.append("Low sample: treat these as leads to check in VOD, not established tendencies.")
    return notes


def utility_insights(res: Dict[str, Any]) -> List[str]:
    ev = res["evidence"]
    out: List[str] = []
    if not ev["casts"]:
        return ["No casts match these filters in the analyzed matches."]
    flt = res["filters"]
    what = (
        "/".join(flt["abilities"])
        if flt.get("abilities")
        else "/".join(flt["categories"]) + " utility"
        if flt.get("categories")
        else "utility"
    )
    side = f" as {flt['side']}s" if flt.get("side") else ""
    on_map = f" on {res['map']}" if res.get("map") else ""
    out.append(
        f"{ev['casts']} {what} casts{on_map}{side} across {ev['rounds_with_event']} of "
        f"{ev['rounds_analyzed']} rounds ({ev['rounds_with_event_pct']}%), {ev['series']} matches "
        f"(sample confidence: {ev['confidence']})."
    )
    for h in res["hotspots"][:3]:
        who = h["top_players"][0]["player"] if h["top_players"] else "?"
        ab = h["top_abilities"][0]["ability"] if h["top_abilities"] else "?"
        out.append(
            f"Zone #{h['rank']}: {h['rounds_with']} of {h['rounds_total']} rounds ({h['rounds_with_pct']}%), "
            f"{h['share_of_casts_pct']}% of casts; mostly {ab} by {who}, typically {h['p25_t']}-{h['p75_t']}s "
            f"into the round (median {h['median_t']}s)."
        )
    if ev["low_rate_rounds_pct"] >= 50:
        out.append(
            f"Caution: {ev['low_rate_rounds_pct']}% of these rounds come from VCT Americas 2025 feeds, which "
            "sample positions once per second, so cast locations are less precise. Use the 'exclude low-rate' filter to check."
        )
    return out


# ----------------------------------------------------------------------------- operator


def operator_query(f: Filters, limit_points: int = MAX_POINTS) -> Dict[str, Any]:
    rounds_total = 0
    rounds_with_op = 0
    series_seen: Set[str] = set()
    by_side: Dict[str, Dict[str, int]] = defaultdict(lambda: {"rounds": 0, "with_op": 0})
    by_map: Dict[str, Dict[str, int]] = defaultdict(lambda: {"rounds": 0, "with_op": 0})
    players: Dict[str, Dict[str, Any]] = {}
    kills: List[Dict[str, Any]] = []
    loadouts: List[float] = []
    bounds_by_map: Dict[str, Any] = {}
    holders_per_round: List[int] = []
    low_rate_rounds = 0

    for ctx in iter_rounds(f):
        rounds_total += 1
        series_seen.add(ctx.series["series_id"])
        m = ctx.game["map"]
        by_side[ctx.side]["rounds"] += 1
        by_map[m]["rounds"] += 1
        if ctx.series.get("low_rate"):
            low_rate_rounds += 1
        if ctx.game.get("bounds"):
            bounds_by_map[m] = ctx.game["bounds"]
        mine = [p for p in ctx.rnd["players"] if p["tid"] == ctx.tid]
        for p in mine:
            d = players.setdefault(
                p["id"],
                {"id": p["id"], "name": p["name"], "rounds": 0, "op_rounds": 0, "agents": Counter(), "op_agents": Counter(),
                 "loadouts": [], "kills": 0, "sides": Counter()},
            )
            d["rounds"] += 1
        holders = [p for p in mine if p["op"]]
        if holders:
            rounds_with_op += 1
            by_side[ctx.side]["with_op"] += 1
            by_map[m]["with_op"] += 1
            holders_per_round.append(len(holders))
        for p in holders:
            d = players[p["id"]]
            d["op_rounds"] += 1
            d["op_agents"][p["agent"] or "?"] += 1
            d["sides"][ctx.side] += 1
            if p.get("loadout") is not None:
                d["loadouts"].append(p["loadout"])
                loadouts.append(p["loadout"])
        for p in mine:
            if p["agent"]:
                players[p["id"]]["agents"][p["agent"]] += 1
        for k in ctx.rnd["kills"]:
            if k["ktid"] != ctx.tid or k.get("weapon") != "operator":
                continue
            if f.players and k["kid"] not in f.players:
                continue
            kp = ctx.players.get(k["kid"], {})
            if f.agents and kp.get("agent") not in f.agents:
                continue
            adv = None
            if k["kx"] is not None and kp.get("sx") is not None:
                adv = round(math.hypot(k["kx"] - kp["sx"], k["ky"] - kp["sy"]) / 100.0, 1)  # metres from spawn
            if k["kid"] in players:
                players[k["kid"]]["kills"] += 1
            kills.append(
                {
                    "x": k["kx"],
                    "y": k["ky"],
                    "vx": k["vx"],
                    "vy": k["vy"],
                    "t": k["t"],
                    "player": kp.get("name") or k["kid"],
                    "agent": kp.get("agent"),
                    "side": k["kside"],
                    "first": k["first"],
                    "from_spawn_m": adv,
                    "map": m,
                    "rk": ctx.key,
                }
            )

    # Optional player/agent filter also narrows who is profiled.
    prof: List[Dict[str, Any]] = []
    for pid, d in players.items():
        if f.players and pid not in f.players:
            continue
        if f.agents and not any(a in f.agents for a in d["agents"]):
            continue
        prof.append(
            {
                "id": pid,
                "name": d["name"],
                "rounds_played": d["rounds"],
                "op_rounds": d["op_rounds"],
                "op_share_of_team_op_rounds_pct": _pct(d["op_rounds"], rounds_with_op),
                "op_rate_when_playing_pct": _pct(d["op_rounds"], d["rounds"]),
                "main_op_agent": d["op_agents"].most_common(1)[0][0] if d["op_agents"] else None,
                "agents": [{"agent": a, "rounds": c} for a, c in d["agents"].most_common(3)],
                "median_loadout_with_op": round(statistics.median(d["loadouts"])) if d["loadouts"] else None,
                "op_kills": d["kills"],
                "sides": dict(d["sides"]),
            }
        )
    prof = [p for p in prof if p["op_rounds"] > 0 or p["op_kills"] > 0]
    prof.sort(key=lambda p: -p["op_rounds"])

    single_map = next(iter(bounds_by_map)) if len(bounds_by_map) == 1 else None
    bounds = bounds_by_map.get(single_map) if single_map else None

    # Time-in-round distribution and spawn distance of Operator kills.
    tb = []
    for lo, hi, label in TIME_BUCKETS:
        n = sum(1 for k in kills if lo <= k["t"] < hi)
        tb.append({"bucket": label, "kills": n, "pct": _pct(n, len(kills))})
    adv_vals = [k["from_spawn_m"] for k in kills if k["from_spawn_m"] is not None]
    kill_points = [k for k in kills if k["x"] is not None]
    hotspots = (
        find_hotspots(
            [{"x": k["x"], "y": k["y"], "t": k["t"], "ability": "operator", "player": k["player"], "rk": k["rk"]} for k in kill_points],
            bounds,
            rounds_with_op,
        )
        if single_map
        else []
    )
    sample = kill_points if len(kill_points) <= limit_points else kill_points[:: math.ceil(len(kill_points) / limit_points)]
    out_points = []
    for k in sample:
        nx, ny = _norm(k["x"], k["y"], bounds) if bounds else (None, None)
        out_points.append({kk: vv for kk, vv in k.items() if kk != "rk"} | {"nx": nx, "ny": ny})

    result = {
        "filters": f.applied(),
        "map": single_map,
        "bounds": bounds,
        "evidence": {
            "series": len(series_seen),
            "rounds_analyzed": rounds_total,
            "rounds_with_operator": rounds_with_op,
            "rounds_with_operator_pct": _pct(rounds_with_op, rounds_total),
            "operator_kills": len(kills),
            "low_rate_rounds_pct": _pct(low_rate_rounds, rounds_total),
            "confidence": _confidence(rounds_total),
            "rounds_with_two_or_more_operators": sum(1 for n in holders_per_round if n >= 2),
        },
        "by_side": {s: {**v, "pct": _pct(v["with_op"], v["rounds"])} for s, v in by_side.items()},
        "by_map": [{"map": m, **v, "pct": _pct(v["with_op"], v["rounds"])} for m, v in sorted(by_map.items(), key=lambda kv: -kv[1]["rounds"])],
        "players": prof,
        "kill_timing": tb,
        "kill_distance_from_spawn_m": {
            "median": round(statistics.median(adv_vals), 1) if adv_vals else None,
            "p25": round(_percentile(adv_vals, 0.25), 1) if adv_vals else None,
            "p75": round(_percentile(adv_vals, 0.75), 1) if adv_vals else None,
            "n": len(adv_vals),
        },
        "median_loadout_with_op": round(statistics.median(loadouts)) if loadouts else None,
        "hotspots": hotspots,
        "points": out_points,
    }
    result["insights"] = operator_insights(result, f)
    result["counter_notes"] = operator_counter_notes(result)
    return result


def operator_counter_notes(res: Dict[str, Any]) -> List[str]:
    notes: List[str] = []
    ev = res["evidence"]
    if not ev["rounds_with_operator"]:
        return notes
    p = res["players"][0] if res["players"] else None
    if p and p["op_share_of_team_op_rounds_pct"] >= 75 and p["op_rounds"] >= 5:
        notes.append(
            f"{p['name']} carries {p['op_share_of_team_op_rounds_pct']}% of Operator rounds ({p['op_rounds']} of "
            f"{ev['rounds_with_operator']}). Plan to deny or trade that player early; without them the team rarely has an Operator."
        )
    sides = res["by_side"]
    for s, v in sides.items():
        if v["rounds"] >= 20 and v["pct"] >= 15:
            notes.append(
                f"As {s}s they hold an Operator in {v['pct']}% of rounds ({v['with_op']}/{v['rounds']}): "
                "expect long-range contests and prepare smokes/flashes to cross those lanes."
            )
    tb = {b["bucket"]: b for b in res["kill_timing"]}
    if ev["operator_kills"] >= 10 and tb["0-20s"]["pct"] + tb["20-40s"]["pct"] < 50:
        notes.append(
            f"Only {tb['0-20s']['pct'] + tb['20-40s']['pct']:.0f}% of Operator kills come in the first 40s; "
            "they tend to win with it later in the round, so early default pressure may bait fewer Operator duels."
        )
    if ev["confidence"] == "low":
        notes.append("Low sample: treat these as leads to check in VOD, not established tendencies.")
    return notes


def operator_insights(res: Dict[str, Any], f: Filters) -> List[str]:
    ev = res["evidence"]
    out: List[str] = []
    if not ev["rounds_analyzed"]:
        return ["No rounds match these filters."]
    where = f" on {res['map']}" if res.get("map") else ""
    side = f" as {f.side}s" if f.side else ""
    out.append(
        f"Operator held in {ev['rounds_with_operator']} of {ev['rounds_analyzed']} rounds{where}{side} "
        f"({ev['rounds_with_operator_pct']}%) across {ev['series']} matches (sample confidence: {ev['confidence']})."
    )
    sides = res["by_side"]
    if len(sides) == 2 and not f.side:
        a, d = sides.get("attacker"), sides.get("defender")
        if a and d:
            out.append(
                f"Attack: {a['with_op']}/{a['rounds']} rounds ({a['pct']}%). Defense: {d['with_op']}/{d['rounds']} rounds ({d['pct']}%)."
            )
    if res["players"]:
        p = res["players"][0]
        if p["op_rounds"]:
            agent = f" on {p['main_op_agent']}" if p["main_op_agent"] else ""
            out.append(
                f"Primary Operator: {p['name']}{agent}, {p['op_rounds']} of {ev['rounds_with_operator']} Operator rounds "
                f"({p['op_share_of_team_op_rounds_pct']}%)."
            )
        meaningful = [x for x in res["players"] if x["op_share_of_team_op_rounds_pct"] >= 10]
        if len(meaningful) > 1:
            names = ", ".join(f"{x['name']} {x['op_rounds']}" for x in meaningful[:4])
            out.append(f"Operator is shared between players ({names} rounds), so do not assume a single sniper.")
        elif p["op_rounds"] and p["op_share_of_team_op_rounds_pct"] >= 75:
            out.append(f"{p['name']} is the dedicated Operator player; other players rarely pick it up.")
    if ev["operator_kills"]:
        tb = {b["bucket"]: b for b in res["kill_timing"]}
        out.append(
            f"{ev['operator_kills']} Operator kills: {tb['0-20s']['pct']}% in 0-20s, {tb['20-40s']['pct']}% in 20-40s, "
            f"{tb['40-60s']['pct'] + tb['60s+']['pct']:.1f}% after 40s."
        )
        d = res["kill_distance_from_spawn_m"]
        if d["median"] is not None:
            out.append(
                f"Median Operator kill is {d['median']} m from the round-start position (middle half {d['p25']}-{d['p75']} m, n={d['n']})."
            )
    if res["hotspots"]:
        h = res["hotspots"][0]
        out.append(f"Top Operator kill zone: {h['casts']} kills ({h['share_of_casts_pct']}%), seen in {h['rounds_with']} Operator rounds.")
    if ev["low_rate_rounds_pct"] >= 50:
        out.append(
            f"Caution: {ev['low_rate_rounds_pct']}% of these rounds are VCT Americas 2025, where positions are sampled once per second."
        )
    return out

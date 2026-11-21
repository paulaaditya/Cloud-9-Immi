"""2D replay data for one game: every round's player positions over time, kills, plants and utility.

The scouting cache keeps only a few position snapshots per round. A replay needs a denser track, so this module
makes one extra pass over a single series and reads the positions that GRID attaches to many event types
(ability casts, damage, kills, item pickups, clock ticks). Positions appear when something happens, so the track is
dense in fights and sparse in quiet stretches; the viewer interpolates between frames. The result is cached per
series on disk (git-ignored) and combined with the facts already in the scouting cache.
"""

import io
import json
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple

import zstandard

from src.data.streamer import _resolve_events_path, load_ability_supplement
from src.scouting.catalog import clean_team_name, load_catalog
from src.scouting.extractor import MAX_ROUND_SECONDS, _find_game, _secs
from src.scouting.store import CACHE_VERSION, cache_dir, get_series

POSITION_EVENTS = (
    "player-used-ability",
    "player-damaged-player",
    "player-killed-player",
    "game-set-gameClock",
    "player-pickedUp-item",
    "player-dropped-item",
)
STRUCTURE_EVENTS = (
    "series-started-game",
    "series-!started-game",
    "game-started-round",
    "game-!started-round",
    "round-ended-freezetime",
)
_WANTED = POSITION_EVENTS + STRUCTURE_EVENTS
BUCKET_SECONDS = 0.5  # frames closer than this are merged (the later one wins)
SHOT_MERGE_SECONDS = 0.4  # repeated hits from the same attacker on the same target within this are one shot


def _iter_lines(path):
    with open(path, "rb") as fh:
        with zstandard.ZstdDecompressor().stream_reader(fh) as reader:
            for line in io.TextIOWrapper(reader, encoding="utf-8"):
                if any(w in line for w in _WANTED):
                    yield json.loads(line)


def _positions(game: Dict[str, Any]) -> Dict[str, List[int]]:
    out: Dict[str, List[int]] = {}
    for tm in game.get("teams") or []:
        for p in tm.get("players") or []:
            pos = p.get("position") or {}
            x, y = pos.get("x"), pos.get("y")
            if x is not None and y is not None:
                out[str(p.get("id"))] = [int(round(x)), int(round(y))]
    return out


def extract_frames(series_id: str) -> Dict[str, Dict[int, Dict[str, Any]]]:
    """game_id -> round number -> {frames, shots, aims}. Times are seconds after freezetime ends.

    frames: [{t, p: {player_id: [x, y]}}]; shots: damage events as attacker -> target; aims: the caster's view
    direction at an ability cast (the only place the feed records where a player is facing).
    """
    path = _resolve_events_path(series_id)
    if not path.is_file():
        raise FileNotFoundError(f"Series event file not found for series ID: {series_id}")
    try:
        supplements = load_ability_supplement(series_id)
    except FileNotFoundError:
        supplements = {}
    buckets: Dict[str, Dict[int, Dict[str, Any]]] = {}
    rounds_in: Dict[str, int] = {}
    t0: Optional[str] = None
    active: Optional[str] = None

    def fresh() -> Dict[str, Any]:
        return {"f": {}, "s": [], "a": []}

    for env in _iter_lines(path):
        at = env.get("occurredAt", "")
        for e in env.get("events", []):
            et = e.get("type", "")
            if et == "series-started-game":
                active = str((e.get("target") or {}).get("id") or len(buckets) + 1)
                buckets[active] = {}
                rounds_in[active] = 0
                t0 = None
            elif et == "series-!started-game":
                gid = str((e.get("target") or {}).get("id"))
                buckets.pop(gid, None)
                rounds_in.pop(gid, None)
                if active == gid:
                    active = None
            elif active is None or active not in buckets:
                continue
            elif et == "game-started-round":
                rounds_in[active] += 1
                buckets[active][rounds_in[active]] = fresh()
                t0 = None
            elif et == "game-!started-round":
                buckets[active].pop(rounds_in[active], None)
                rounds_in[active] = max(0, rounds_in[active] - 1)
                t0 = None
            elif et == "round-ended-freezetime":
                t0 = at
            elif et in POSITION_EVENTS and t0 and rounds_in[active] in buckets[active]:
                t = _secs(at, t0)
                if t < 0 or t > MAX_ROUND_SECONDS:
                    continue
                rb = buckets[active][rounds_in[active]]
                game = _find_game(e.get("seriesState") or {}, active)
                pos = _positions(game) if game else {}
                if pos:
                    rb["f"][int(t / BUCKET_SECONDS)] = (round(t, 2), pos)
                if et == "player-damaged-player":
                    aid = str((e.get("actor") or {}).get("id"))
                    vid = str((e.get("target") or {}).get("id"))
                    if aid != "None" and vid != "None":
                        rb["s"].append({"t": round(t, 2), "a": aid, "v": vid})
                elif et == "player-used-ability":
                    view = (((supplements.get(e.get("id", "")) or {}).get("interpolated")) or {}).get("view")
                    if isinstance(view, dict) and view.get("x") is not None and view.get("y") is not None:
                        rb["a"].append(
                            {"t": round(t, 2), "pid": str((e.get("actor") or {}).get("id")), "dx": round(view["x"], 3), "dy": round(view["y"], 3)}
                        )

    return {
        gid: {
            n: {"frames": [{"t": t, "p": p} for _, (t, p) in sorted(b["f"].items())], "shots": merge_shots(b["s"]), "aims": sorted(b["a"], key=lambda x: x["t"])}
            for n, b in rounds.items()
        }
        for gid, rounds in buckets.items()
    }


def merge_shots(shots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Collapse a burst of hits from one attacker on one target into a single shot."""
    out: List[Dict[str, Any]] = []
    last: Dict[Tuple[str, str], float] = {}
    for s in sorted(shots, key=lambda x: x["t"]):
        key = (s["a"], s["v"])
        if key in last and s["t"] - last[key] <= SHOT_MERGE_SECONDS:
            last[key] = s["t"]
            continue
        last[key] = s["t"]
        out.append(s)
    return out


def _frames_path(series_id: str):
    d = cache_dir() / "replay"
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{series_id}.v{CACHE_VERSION}.r2.json"


def get_frames(series_id: str) -> Dict[str, Dict[int, Dict[str, Any]]]:
    p = _frames_path(series_id)
    if p.exists():
        try:
            raw = json.loads(p.read_text(encoding="utf-8"))
            return {g: {int(n): f for n, f in rs.items()} for g, rs in raw.items()}
        except (OSError, ValueError):
            pass
    frames = extract_frames(series_id)
    try:
        p.write_text(json.dumps(frames, separators=(",", ":")), encoding="utf-8")
    except OSError:
        pass
    return frames


def round_end(rnd: Dict[str, Any]) -> Dict[str, Any]:
    """How the round probably ended, inferred from the plant, the winner and who was killed.

    The feed's round-end reason is not kept, so this is an inference: it can only tell elimination from
    spike (detonation or defuse) and from time running out.
    """
    sides = rnd.get("sides") or {}
    attackers = {t for t, s in sides.items() if s == "attacker"}
    defenders = {t for t, s in sides.items() if s == "defender"}
    winner = rnd.get("winner")
    dead = {tid: len({k["vid"] for k in rnd.get("kills", []) if k.get("vtid") == tid}) for tid in sides}
    all_att_dead = any(dead.get(t, 0) >= 5 for t in attackers)
    all_def_dead = any(dead.get(t, 0) >= 5 for t in defenders)
    plant = rnd.get("plant")
    if winner in attackers:
        kind = "elimination" if all_def_dead else ("detonation" if plant else "elimination")
    elif winner in defenders:
        if all_att_dead:
            kind = "elimination"
        else:
            kind = "defuse" if plant else "time"
    else:
        kind = "unknown"
    return {"type": kind, "inferred": True}


def game_duration(rnd: Dict[str, Any], frames: List[Dict[str, Any]]) -> float:
    ends = [k["t"] for k in rnd.get("kills", [])] + [f["t"] for f in frames]
    if rnd.get("plant"):
        ends.append(rnd["plant"]["t"])
    return round(max(ends), 1) if ends else 0.0


def build_replay(series_id: str, game_id: str) -> Optional[Dict[str, Any]]:
    data = get_series(series_id)
    if not data:
        return None
    game = next((g for g in data["games"] if g["game_id"] == game_id), None)
    if game is None:
        return None
    frames_all = get_frames(series_id).get(game_id, {})
    cat = load_catalog()
    names: Dict[str, str] = {}
    for gi in cat.games.get(series_id, []):
        for tid, nm in zip(gi.team_ids, gi.team_names):
            names[tid] = clean_team_name(nm)
    rounds = []
    for r in game["rounds"]:
        rd = frames_all.get(r["n"], {})
        fr = list(rd.get("frames", []))
        start = {
            p["id"]: [int(round(p["sx"])), int(round(p["sy"]))]
            for p in r["players"]
            if p.get("sx") is not None and p.get("sy") is not None
        }
        if start and (not fr or fr[0]["t"] > 0.5):
            fr.insert(0, {"t": 0.0, "p": start})  # where everyone stands when the round goes live
        rounds.append(
            {
                "n": r["n"],
                "sides": r["sides"],
                "winner": r["winner"],
                "end": round_end(r),
                "duration": game_duration(r, fr),
                "plant": r.get("plant"),
                "players": [
                    {k: p.get(k) for k in ("id", "name", "tid", "side", "agent", "loadout", "money", "weapons", "op")}
                    for p in r["players"]
                ],
                "kills": r["kills"],
                "casts": [{k: c[k] for k in ("t", "pid", "ability", "cat", "x", "y")} for c in r["casts"]],
                "frames": fr,
                "shots": rd.get("shots", []),
                "aims": rd.get("aims", []),
            }
        )
    return {
        "series_id": series_id,
        "game_id": game_id,
        "map": game["map"],
        "bounds": game.get("bounds"),
        "teams": names,
        "rounds": rounds,
    }


def series_for_teams(team_ids: List[str], limit: int = 60) -> List[Dict[str, Any]]:
    cat = load_catalog()
    seen: Counter = Counter()
    out: List[Dict[str, Any]] = []
    for tid in team_ids:
        for sid in cat.team_series.get(tid, []):
            if seen[sid]:
                continue
            seen[sid] += 1
            info = cat.series.get(sid)
            if not info:
                continue
            games = [
                {
                    "game_id": g.game_id,
                    "number": g.game_number,
                    "map": g.map,
                    "winner": clean_team_name(dict(zip(g.team_ids, g.team_names)).get(g.winner_team_id or "", "")) or None,
                }
                for g in sorted(cat.games.get(sid, []), key=lambda g: g.game_number)
            ]
            out.append(
                {
                    "series_id": sid,
                    "date": info.scheduled_start,
                    "event": info.event,
                    "stage": info.stage,
                    "teams": info.teams,
                    "games": games,
                }
            )
    out.sort(key=lambda s: s["date"], reverse=True)
    return out[:limit]

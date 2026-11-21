"""Extract scouting facts (utility casts, Operator possession and kills) from one GRID series.

The GRID feed carries a full snapshot on every event, so a series can inflate to hundreds of MB.
We therefore stream it, skip lines that cannot contain a type we need, and keep only compact
per-round facts. The result is plain JSON-able dicts so it can be cached per series.

Time convention: `t` is seconds since the end of freezetime (live round start). Casts made during
the buy phase (t < 0) are ignored; they are signature abilities, not tactical utility.
"""

import datetime
import io
import json
from bisect import bisect_right
from typing import Any, Dict, Iterator, List, Optional

import zstandard

from src.data.parser import _extract_position, _extract_weapon
from src.data.streamer import _resolve_events_path, load_ability_supplement
from src.scouting.catalog import load_catalog
from src.scouting.taxonomy import category_of

# Substrings that mark a line as worth JSON-parsing.
_WANTED = (
    "player-used-ability",
    "player-killed-player",
    "game-started-round",
    "game-!started-round",
    "round-ended-freezetime",
    "series-started-game",
    "series-!started-game",
    "player-completed-plantBomb",
    "team-won-round",
)

MAX_ROUND_SECONDS = 180.0  # ignore anything implausibly late (post-round noise)

# Where every living player stands, sampled at these seconds after freezetime ends (for setups and defaults).
SNAP_TIMES = (5, 10, 15, 20, 30, 45, 60, 80)
SNAP_TOLERANCE = 8.0  # a snapshot is kept only if its source event is within this many seconds of the target


def _maybe_snapshot(r: Dict[str, Any], e: Dict[str, Any], game_id: Optional[str], t: float) -> None:
    """Record all living players' positions from the full-roster `seriesState` carried by this event.

    Ability and kill events are frequent, so the nearest one lands within a second or two of each target.
    Positions of all ten players are stored; `_drop_dead` removes the dead once the round's kills are known
    (events can reach us out of timestamp order, so we cannot tell who is dead while streaming).
    """
    j = bisect_right(SNAP_TIMES, t) - 1  # latest target already reached
    if j < r["_ns"]:
        return
    r["_ns"] = j + 1
    if t - SNAP_TIMES[j] > SNAP_TOLERANCE:
        return
    game = _find_game(e.get("seriesState") or {}, game_id)
    if not game:
        return
    pos: Dict[str, List[float]] = {}
    for tm in game.get("teams") or []:
        for p in tm.get("players") or []:
            pid = str(p.get("id"))
            pp = p.get("position") or {}
            x, y = pp.get("x"), pp.get("y")
            if x is not None and y is not None:
                pos[pid] = [round(float(x), 1), round(float(y), 1)]
    if pos:
        r["snaps"].append({"k": SNAP_TIMES[j], "t": round(t, 2), "p": pos})


def _iter_envelopes(path) -> Iterator[Dict[str, Any]]:
    dctx = zstandard.ZstdDecompressor()
    with open(path, "rb") as fh:
        with dctx.stream_reader(fh) as reader:
            for line in io.TextIOWrapper(reader, encoding="utf-8"):
                if not any(w in line for w in _WANTED):
                    continue
                yield json.loads(line)


def _ts(iso: str) -> datetime.datetime:
    return datetime.datetime.fromisoformat(iso.replace("Z", "+00:00"))


def _secs(a: str, b: str) -> float:
    return (_ts(a) - _ts(b)).total_seconds()


def _pos2(entity: Optional[Dict[str, Any]]):
    v = _extract_position(entity)
    return (v.x, v.y) if v else (None, None)


def _drop_dead(r: Dict[str, Any]) -> None:
    """Remove from each snapshot the players killed before it (by timestamp), keeping only the living."""
    died_at: Dict[str, float] = {}
    for k in r["kills"]:
        died_at[k["vid"]] = min(k["t"], died_at.get(k["vid"], k["t"]))
    for s in r["snaps"]:
        s["p"] = {pid: xy for pid, xy in s["p"].items() if died_at.get(pid, float("inf")) >= s["t"]}
    r["snaps"] = [s for s in r["snaps"] if s["p"]]


def _find_game(series_state: Dict[str, Any], game_id: Optional[str]) -> Optional[Dict[str, Any]]:
    games = (series_state or {}).get("games") or []
    if not games:
        return None
    if game_id:
        for g in games:
            if g.get("id") == game_id:
                return g
    return games[-1]


def _round_players(game: Dict[str, Any], fallback_agents: Dict[str, str]) -> List[Dict[str, Any]]:
    """Per-player facts at the end of freezetime: team, side, agent, loadout, Operator, start position."""
    players: List[Dict[str, Any]] = []
    for team in game.get("teams") or []:
        for p in team.get("players") or []:
            items = {it.get("id") for it in ((p.get("inventory") or {}).get("items") or [])}
            char = p.get("character") or {}
            agent = (char.get("id") or char.get("name") or fallback_agents.get(str(p.get("id")), "") or "").lower()
            pos = p.get("position") or {}
            players.append(
                {
                    "id": str(p.get("id")),
                    "name": p.get("name"),
                    "tid": str(team.get("id")),
                    "side": team.get("side"),
                    "agent": agent,
                    "loadout": p.get("loadoutValue"),
                    "money": p.get("money"),
                    "weapons": sorted(i for i in items if i and i not in ("melee", "spike")),
                    "op": ("operator" in items),
                    "odin": ("odin" in items),
                    "sx": pos.get("x"),
                    "sy": pos.get("y"),
                }
            )
    return players


def extract_series(series_id: str) -> Dict[str, Any]:
    cat = load_catalog()
    info = cat.series.get(series_id)
    meta_games = {g.game_id: g for g in cat.games.get(series_id, [])}

    try:
        supplements = load_ability_supplement(series_id)
    except FileNotFoundError:
        supplements = {}

    path = _resolve_events_path(series_id)
    if not path.is_file():
        raise FileNotFoundError(f"Series event file not found for series ID: {series_id}")

    games: Dict[str, Dict[str, Any]] = {}
    order: List[str] = []
    team_names: Dict[str, str] = {}
    active_game: Optional[str] = None

    def cur_round() -> Optional[Dict[str, Any]]:
        g = games.get(active_game) if active_game else None
        return g["rounds"][-1] if g and g["rounds"] else None

    for env in _iter_envelopes(path):
        at = env.get("occurredAt", "")
        for e in env.get("events", []):
            etype = e.get("type", "")

            if etype == "series-started-game":
                tgt = e.get("target") or {}
                gid = str(tgt.get("id") or len(games) + 1)
                mp = ((tgt.get("state") or {}).get("map")) or {}
                mg = meta_games.get(gid)
                games[gid] = {
                    "game_id": gid,
                    "map": (mp.get("name") or (mg.map if mg else "") or "unknown").lower(),
                    "bounds": mp.get("bounds"),
                    "patch": mg.patch if mg else "",
                    "rounds": [],
                }
                if gid not in order:
                    order.append(gid)
                active_game = gid

            elif etype == "series-!started-game":
                gid = str((e.get("target") or {}).get("id"))
                games.pop(gid, None)
                if gid in order:
                    order.remove(gid)
                if active_game == gid:
                    active_game = None

            elif active_game is None or active_game not in games:
                continue

            elif etype == "game-started-round":
                g = games[active_game]
                state = (e.get("actor") or {}).get("state") or {}
                mp = state.get("map") or {}
                if mp.get("bounds") and not g.get("bounds"):
                    g["bounds"] = mp["bounds"]
                if mp.get("name") and g["map"] in ("", "unknown"):
                    g["map"] = mp["name"].lower()
                g["rounds"].append(
                    {
                        "n": len(g["rounds"]) + 1,
                        "start": at,
                        "t0": at,
                        "sides": {},
                        "winner": None,
                        "players": [],
                        "casts": [],
                        "kills": [],
                        "plant": None,
                        "snaps": [],
                        "_ns": 0,
                    }
                )

            elif etype == "game-!started-round":
                g = games[active_game]
                if g["rounds"]:
                    g["rounds"].pop()

            else:
                r = cur_round()
                if r is None:
                    continue
                g = games[active_game]

                if etype == "round-ended-freezetime":
                    r["t0"] = at
                    game = _find_game(e.get("seriesState") or {}, active_game)
                    if game:
                        for tm in game.get("teams") or []:
                            tid = str(tm.get("id"))
                            r["sides"][tid] = tm.get("side")
                            if tm.get("name"):
                                team_names[tid] = tm["name"]
                        r["players"] = _round_players(game, cat.agents.get((series_id, active_game), {}))

                elif etype == "player-used-ability":
                    t = _secs(at, r["t0"])
                    if t < 0 or t > MAX_ROUND_SECONDS:
                        continue
                    _maybe_snapshot(r, e, active_game, t)
                    actor = e.get("actor") or {}
                    st = actor.get("state") or {}
                    ability =(e.get("target") or {}).get("id") or ""
                    sup = supplements.get(e.get("id", ""))
                    x = y = z = None
                    quality = None
                    if sup:
                        quality = sup.get("quality")
                        ip = sup.get("interpolated")
                        if isinstance(ip, dict) and isinstance(ip.get("position"), dict):
                            p = ip["position"]
                            x, y, z = p.get("x"), p.get("y"), p.get("z")
                    if x is None:
                        x, y = _pos2(actor)
                        quality = "grid-2d"
                    if x is None or y is None:
                        continue
                    r["casts"].append(
                        {
                            "t": round(t, 2),
                            "pid": str(actor.get("id")),
                            "tid": str(st.get("teamId")),
                            "side": st.get("side"),
                            "ability": ability,
                            "cat": category_of(ability),
                            "slot": (sup or {}).get("slot"),
                            "x": round(float(x), 1),
                            "y": round(float(y), 1),
                            "z": None if z is None else round(float(z), 1),
                            "q": quality,
                        }
                    )

                elif etype == "player-killed-player":
                    t = _secs(at, r["t0"])
                    if t < 0 or t > MAX_ROUND_SECONDS:
                        continue
                    actor = e.get("actor") or {}
                    target = e.get("target") or {}
                    ast = actor.get("state") or {}
                    tst = target.get("state") or {}
                    kx, ky = _pos2(actor)
                    vx, vy = _pos2(target)
                    first = (((actor.get("stateDelta") or {}).get("round")) or {}).get("firstKill")
                    r["kills"].append(
                        {
                            "t": round(t, 2),
                            "kid": str(actor.get("id")),
                            "vid": str(target.get("id")),
                            "ktid": str(ast.get("teamId")),
                            "vtid": str(tst.get("teamId")),
                            "kside": ast.get("side"),
                            "weapon": _extract_weapon(e),
                            "kx": kx,
                            "ky": ky,
                            "vx": vx,
                            "vy": vy,
                            "first": bool(first),
                        }
                    )
                    _maybe_snapshot(r, e, active_game, t)

                elif etype == "player-completed-plantBomb":
                    actor = e.get("actor") or {}
                    st = actor.get("state") or {}
                    px, py = _pos2(actor)
                    r["plant"] = {
                        "t": round(_secs(at, r["t0"]), 2),
                        "pid": str(actor.get("id")),
                        "tid": str(st.get("teamId")),
                        "x": px,
                        "y": py,
                    }

                elif etype == "team-won-round":
                    r["winner"] = str((e.get("actor") or {}).get("id"))

    out_games = []
    for gid in order:
        g = games.get(gid)
        if not g:
            continue
        # Drop rounds that never reached live play (no freezetime-end snapshot, e.g. aborted starts).
        g["rounds"] = [r for r in g["rounds"] if r["players"]]
        for i, r in enumerate(g["rounds"], start=1):
            r["n"] = i
            r.pop("_ns", None)
            _drop_dead(r)
            r["snaps"].sort(key=lambda s: s["k"])
        if g["rounds"]:
            out_games.append(g)

    return {
        "series_id": series_id,
        "event": info.event if info else "",
        "stage": info.stage if info else "",
        "scheduled_start": info.scheduled_start if info else "",
        "low_rate": bool(info.low_rate) if info else False,
        "teams": team_names,
        "games": out_games,
    }

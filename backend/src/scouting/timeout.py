"""Timeout advisor: what to adjust before the next rounds, from how this opponent behaves in this situation.

The caller is the team taking the timeout; the scouted team is the opponent. Given the map, the opponent's side
in the next round, their current streak and (optionally) which sites they have planted in recent rounds, the advisor
compares the opponent's history in the same situation (for example "after losing two or more rounds in a row")
with their baseline on that map and side, and returns up to three adjustments. Every adjustment carries the rounds
behind it. Nothing here is a fitted model, and a situation with too few rounds is not used.
"""

from collections import Counter
from dataclasses import replace
from typing import Any, Callable, Dict, List, Optional

from src.scouting.aggregate import Filters, RoundCtx, _confidence, _pct, iter_rounds, operator_query
from src.scouting.attack import attack_profile
from src.scouting.setups import NeedsOneMap, defense_setups

SITUATION_MIN_ROUNDS = 10  # rounds needed in a situation before it replaces the baseline
SHIFT_POINTS = 15.0  # percentage-point change that counts as a behavioural shift
MAX_ADJUSTMENTS = 3
OBSERVED_MIN = 3
OBSERVED_GAP_POINTS = 25.0
BEHIND_AT = -2
AHEAD_AT = 2


def streak_before(game: Dict[str, Any], n: int, tid: str) -> int:
    """Signed run length for `tid` going into round `n`: +k won the last k rounds, -k lost the last k, 0 if none."""
    run = 0
    for r in reversed([r for r in game["rounds"] if r["n"] < n and r.get("winner")]):
        won = r["winner"] == tid
        if run == 0:
            run = 1 if won else -1
        elif (run > 0) == won:
            run += 1 if won else -1
        else:
            break
    return run


def situation_of(streak: int) -> str:
    return "behind" if streak <= BEHIND_AT else ("ahead" if streak >= AHEAD_AT else "even")


SITUATION_TEXT = {
    "behind": "after losing two or more rounds in a row",
    "ahead": "after winning two or more rounds in a row",
    "even": "overall",
}


def situation_filter(situation: str) -> Optional[Callable[[RoundCtx], bool]]:
    if situation == "even":
        return None
    return lambda ctx: situation_of(streak_before(ctx.game, ctx.rnd["n"], ctx.tid)) == situation


def buy_mix(f: Filters) -> Dict[str, Any]:
    c: Counter = Counter()
    total = 0
    for ctx in iter_rounds(f):
        total += 1
        c[ctx.buy or "unknown"] += 1
    return {"rounds": total, "pct": {k: _pct(v, total) for k, v in c.items()}}


def normalise_site(raw: str) -> str:
    """'S3', 's3', '3' and 'Site 3' all become 'Site 3'."""
    digits = "".join(ch for ch in raw if ch.isdigit())
    return f"Site {digits}" if digits else ""


def _adj(text: str, rounds: int, kind: str) -> Dict[str, Any]:
    return {"kind": kind, "text": text, "rounds": rounds, "confidence": _confidence(rounds)}


def _pick(base: Dict[str, Any], sit: Optional[Dict[str, Any]], key: str):
    """Use the situation profile when it has enough rounds, otherwise the baseline. Returns (profile, used_situation)."""
    if sit and sit["evidence"][key] >= SITUATION_MIN_ROUNDS:
        return sit, True
    return base, False


def timeout_advice(
    f: Filters,
    opp_side: str,
    streak: int = 0,
    observed_sites: Optional[List[str]] = None,
) -> Dict[str, Any]:
    if not f.maps or len(f.maps) != 1:
        raise NeedsOneMap("pick exactly one map")
    if opp_side not in ("attacker", "defender"):
        raise ValueError("opp_side must be 'attacker' or 'defender'")
    situation = situation_of(streak)
    f_side = replace(f, side=opp_side, round_ok=None)
    f_sit = replace(f_side, round_ok=situation_filter(situation)) if situation != "even" else None
    observed = [n for n in (normalise_site(x) for x in (observed_sites or [])) if n]

    adjustments: List[Dict[str, Any]] = []
    facts: List[str] = []

    if opp_side == "attacker":
        base = attack_profile(f_side)
        sit = attack_profile(f_sit) if f_sit else None
        prof, used = _pick(base, sit, "rounds_planted")
        ev = prof["evidence"]
        where = SITUATION_TEXT[situation] if used else "overall"
        facts.append(f"{ev['rounds_analyzed']} attacking rounds {where}: attack won {ev['attack_win_pct']}%, planted in {ev['plant_pct']}%.")
        if sit and not used:
            facts.append(f"Only {sit['evidence']['rounds_planted']} plants {SITUATION_TEXT[situation]}, so the overall picture is used instead.")
        if used and base["evidence"]["rounds_analyzed"]:
            facts.append(f"Overall on this map they win {base['evidence']['attack_win_pct']}% of attacking rounds.")
        if prof["targets"]:
            top = prof["targets"][0]
            if top["share_pct"] >= 35:
                adjustments.append(
                    _adj(
                        f"Expect {top['name']}: {top['share_pct']}% of their plants {where}, median plant at {top['median_plant_t']}s. "
                        f"Hold it with two and keep the next player ready to rotate.",
                        top["rounds"],
                        "site",
                    )
                )
        if observed and base["targets"]:
            names = {t["name"]: t for t in base["targets"]}
            seen = Counter(observed)
            for name, k in seen.most_common():
                share = _pct(k, len(observed))
                b = names.get(name)
                if k >= OBSERVED_MIN and b and share - b["share_pct"] >= OBSERVED_GAP_POINTS:
                    adjustments.append(
                        _adj(
                            f"They have planted {name} in {k} of the last {len(observed)} rounds, against {b['share_pct']}% normally. "
                            f"Decide whether to keep your stack there or bait a switch.",
                            len(observed),
                            "tell",
                        )
                    )
                    break
        early = next((p for p in prof["pace"] if p["pace"] == "early"), None)
        if early and early["share_pct"] >= 35 and early["rounds"] >= 8:
            adjustments.append(_adj(f"{early['share_pct']}% of their plants come early {where}. Save utility for the first push.", early["rounds"], "pace"))
    else:
        base = defense_setups(f_side)
        sit = defense_setups(f_sit) if f_sit else None
        prof, used = _pick(base, sit, "rounds_with_setup")
        ev = prof["evidence"]
        where = SITUATION_TEXT[situation] if used else "overall"
        facts.append(f"{ev['rounds_with_setup']} defender rounds read {where}: defense won {ev['defense_win_pct']}%.")
        if sit and not used:
            facts.append(f"Only {sit['evidence']['rounds_with_setup']} setups read {SITUATION_TEXT[situation]}, so the overall picture is used instead.")
        if used and base["evidence"]["rounds_with_setup"]:
            facts.append(f"Overall on this map defense wins {base['evidence']['defense_win_pct']}%.")
        sites = sorted(prof["sites"], key=lambda s: s["avg_defenders"])
        if len(sites) >= 2 and sites[-1]["avg_defenders"] - sites[0]["avg_defenders"] >= 0.5:
            light, heavy = sites[0], sites[-1]
            adjustments.append(
                _adj(
                    f"Go at {light['name']} first: they average {light['avg_defenders']} defenders there at ~{prof['snapshot_seconds']:.0f}s "
                    f"against {heavy['avg_defenders']} on {heavy['name']} ({where}).",
                    ev["rounds_with_setup"],
                    "site",
                )
            )
        for n in prof["counter_notes"]:
            if "beatable" in n or "soft spot" in n:
                adjustments.append(_adj(n, ev["rounds_with_setup"], "weakness"))
                break

    # Does the opponent buy differently in this situation?
    if f_sit:
        sm, bm = buy_mix(f_sit), buy_mix(f_side)
        if sm["rounds"] >= SITUATION_MIN_ROUNDS and bm["rounds"]:
            light_now = sm["pct"].get("eco", 0) + sm["pct"].get("half", 0)
            light_base = bm["pct"].get("eco", 0) + bm["pct"].get("half", 0)
            if abs(light_now - light_base) >= SHIFT_POINTS:
                direction = "more" if light_now > light_base else "fewer"
                adjustments.append(
                    _adj(
                        f"{SITUATION_TEXT[situation].capitalize()} they play {direction} light buys: {light_now:.0f}% eco or half buys "
                        f"against {light_base:.0f}% overall ({sm['rounds']} rounds).",
                        sm["rounds"],
                        "economy",
                    )
                )

    if opp_side == "defender":
        op = operator_query(replace(f_side, round_ok=None))
        if op["evidence"]["rounds_with_operator_pct"] >= 15 and op["counter_notes"]:
            adjustments.append(_adj(op["counter_notes"][0], op["evidence"]["rounds_with_operator"], "operator"))

    order = {"site": 0, "tell": 1, "weakness": 2, "economy": 3, "pace": 4, "operator": 5}
    adjustments.sort(key=lambda a: order[a["kind"]])
    adjustments = adjustments[:MAX_ADJUSTMENTS]

    caveats = [
        "Situations are small slices of the data. Rounds are shown on every line; treat thin ones as leads.",
        "The feed does not say which team called a timeout, so this uses the score situation instead of timeout history.",
        "Site numbers are left to right on the map, not Valorant site letters. Win rates are descriptive, not causal.",
    ]
    return {
        "map": next(iter(f.maps)),
        "opp_side": opp_side,
        "streak": streak,
        "situation": situation,
        "situation_text": SITUATION_TEXT[situation],
        "situation_used": used,
        "sites": prof["sites"],
        "adjustments": adjustments,
        "facts": facts,
        "caveats": caveats,
    }

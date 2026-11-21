"""Counter-card: one printable page per team and map that pulls the three profilers together.

The card does no new analysis. It runs the defensive-setup, attack and Operator profilers for one map and
arranges what they found into three plans: how to attack them, how to defend against them, and what to do
about their Operator. Every line comes from a profiler's own notes, so the card and the Scout tabs always agree.
"""

from dataclasses import replace
from typing import Any, Dict, List

from src.scouting.aggregate import Filters, operator_query
from src.scouting.attack import DEFAULT_AT as ATTACK_AT, attack_profile
from src.scouting.setups import NeedsOneMap, defense_setups

DEFENSE_AT = 15.0
LOW = "low"


def _section(title: str, evidence_line: str, confidence: str, notes: List[str], facts: List[str]) -> Dict[str, Any]:
    return {"title": title, "evidence": evidence_line, "confidence": confidence, "actions": notes, "facts": facts}


def build_card(f: Filters, team_name: str) -> Dict[str, Any]:
    if not f.maps or len(f.maps) != 1:
        raise NeedsOneMap("pick exactly one map")
    map_name = next(iter(f.maps))
    base = replace(f, side=None)
    d = defense_setups(base, at=DEFENSE_AT)
    a = attack_profile(base, at=float(ATTACK_AT))
    o = operator_query(base)

    de, ae, oe = d["evidence"], a["evidence"], o["evidence"]
    attack_them = _section(
        "Attacking them (their defense)",
        f"{de['rounds_with_setup']} defender rounds read at ~{DEFENSE_AT:.0f}s, {de['series']} matches",
        de["confidence"],
        d["counter_notes"],
        d["insights"][1:3],
    )
    defend_them = _section(
        "Defending against them (their attack)",
        f"{ae['rounds_analyzed']} attacking rounds, {ae['rounds_planted']} plants, {ae['series']} matches",
        ae["confidence"],
        a["counter_notes"],
        a["insights"][1:4],
    )
    op_facts = [i for i in o["insights"] if "Primary Operator" in i or "Operator held" in i][:2]
    operator = _section(
        "Their Operator",
        f"{oe['rounds_with_operator']} Operator rounds of {oe['rounds_analyzed']}, {oe['operator_kills']} kills",
        oe["confidence"],
        o["counter_notes"],
        op_facts,
    )

    if not operator["actions"] and oe["rounds_analyzed"] and oe["rounds_with_operator_pct"] < 5:
        operator["actions"].append(
            f"They rarely buy an Operator ({oe['rounds_with_operator_pct']}% of rounds), so there is no need to plan a dedicated Operator counter on this map."
        )

    sections = [attack_them, defend_them, operator]
    caveats = []
    for s in sections:
        if s["confidence"] == LOW:
            caveats.append(f"{s['title']}: small sample ({s['evidence']}). Treat as a lead, not a rule.")
    if not any(s["actions"] for s in sections):
        caveats.append("No pattern was strong enough to turn into advice for this map. The facts above are still worth a look.")
    caveats.append("Site numbers are left to right on the map overlay, not Valorant site letters. Win rates are descriptive, not causal.")

    return {
        "team": team_name,
        "map": map_name,
        "sections": sections,
        "caveats": caveats,
        "sites": d["sites"],
        "bounds": d["bounds"],
        "defense_points": d["points"],
        "attack_points": a["points"],
        "filters": base.applied(),
    }

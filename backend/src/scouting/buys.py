"""Buy-round classification from the team's average loadout value at the end of freezetime.

Thresholds come from the observed distribution across all scouted rounds (team mean loadout per round,
non-pistol rounds: 5th pct 860, 25th 3730, median 4770, 75th 5520): below ~1,500 a team has saved
(eco), 1,500-3,500 is a partial buy (half), and 3,500+ is a full buy. Round 1 and 13 of regulation
are pistol rounds, whatever the loadout reads.
"""

from typing import Any, Dict, Optional

BUY_TYPES = ("pistol", "eco", "half", "full")
ECO_BELOW = 1500
FULL_FROM = 3500
PISTOL_ROUNDS = (1, 13)


def team_loadout(rnd: Dict[str, Any], tid: str) -> Optional[float]:
    vals = [p["loadout"] for p in rnd.get("players", []) if p.get("tid") == tid and p.get("loadout") is not None]
    return sum(vals) / len(vals) if len(vals) >= 4 else None


def buy_type(rnd: Dict[str, Any], tid: str) -> Optional[str]:
    """pistol | eco | half | full, or None when the loadouts were not recorded."""
    if rnd.get("n") in PISTOL_ROUNDS:
        return "pistol"
    avg = team_loadout(rnd, tid)
    if avg is None:
        return None
    if avg < ECO_BELOW:
        return "eco"
    if avg < FULL_FROM:
        return "half"
    return "full"

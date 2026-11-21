"""Metadata catalog for scouting: teams, series, games (patch/map) and per-game agent picks.

Everything is read from the official `meta/` CSVs and `val/series.csv` at runtime. IDs are unique
only within a title, so only rows with title == "val" are used.
"""

import csv
import re
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Dict, List, Optional, Tuple

from src.config import get_settings

# VCT Americas 2025 feeds sample movement once per second instead of ~5 Hz, so ability
# positions are far less precise there (see the supplement README).
LOW_RATE_EVENT_PREFIXES = ("VCT Americas - Kickoff 2025", "VCT Americas - Stage 1 2025", "VCT Americas - Stage 2 2025")


def clean_team_name(name: str) -> str:
    return re.sub(r"\s*\(\d+\)$", "", name or "").strip()


@dataclass
class SeriesInfo:
    series_id: str
    event: str
    stage: str
    scheduled_start: str
    teams: str
    low_rate: bool


@dataclass
class GameInfo:
    series_id: str
    game_id: str
    game_number: int
    map: str
    patch: str
    team_ids: Tuple[str, str]
    team_names: Tuple[str, str]
    winner_team_id: Optional[str]


@dataclass
class Catalog:
    series: Dict[str, SeriesInfo] = field(default_factory=dict)
    games: Dict[str, List[GameInfo]] = field(default_factory=dict)  # series_id -> games
    teams: Dict[str, Dict[str, str]] = field(default_factory=dict)  # team_id -> row
    # (series_id, game_id) -> player_id -> character_name
    agents: Dict[Tuple[str, str], Dict[str, str]] = field(default_factory=dict)
    team_series: Dict[str, List[str]] = field(default_factory=dict)  # team_id -> series ids


def _rows(path):
    if not path.exists():
        return
    with open(path, "r", encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            yield row


@lru_cache(maxsize=1)
def load_catalog() -> Catalog:
    s = get_settings()
    cat = Catalog()

    for row in _rows(s.VAL_DIR / "series.csv"):
        sid = row["series_id"].strip()
        event = row["event"].strip()
        cat.series[sid] = SeriesInfo(
            series_id=sid,
            event=event,
            stage=row.get("stage", "").strip(),
            scheduled_start=row.get("scheduled_start", "").strip(),
            teams=row.get("teams", "").strip(),
            low_rate=event.startswith(LOW_RATE_EVENT_PREFIXES),
        )

    for row in _rows(s.META_DIR / "teams.csv"):
        if row.get("title") == "val":
            cat.teams[row["team_id"].strip()] = row

    for row in _rows(s.META_DIR / "games.csv"):
        if row.get("title") != "val":
            continue
        sid = row["series_id"].strip()
        g = GameInfo(
            series_id=sid,
            game_id=row["game_id"].strip(),
            game_number=int(row.get("game_number") or 0),
            map=(row.get("map") or "").strip(),
            patch=(row.get("patch") or "").strip(),
            team_ids=(row["team1_id"].strip(), row["team2_id"].strip()),
            team_names=(clean_team_name(row["team1_name"]), clean_team_name(row["team2_name"])),
            winner_team_id=(row.get("winner_team_id") or "").strip() or None,
        )
        cat.games.setdefault(sid, []).append(g)
        for tid in g.team_ids:
            lst = cat.team_series.setdefault(tid, [])
            if sid not in lst:
                lst.append(sid)

    for row in _rows(s.META_DIR / "rosters.csv"):
        if row.get("title") != "val":
            continue
        key = (row["series_id"].strip(), row["game_id"].strip())
        cat.agents.setdefault(key, {})[row["player_id"].strip()] = (row.get("character_name") or "").strip().lower()

    for lst in cat.team_series.values():
        lst.sort(key=lambda sid: cat.series[sid].scheduled_start if sid in cat.series else "")
    return cat


def team_list(min_series: int = 1) -> List[Dict[str, object]]:
    """Teams that appear in the dataset, most-played first, with the data to pick a scouting target."""
    cat = load_catalog()
    out = []
    for tid, sids in cat.team_series.items():
        if len(sids) < min_series:
            continue
        row = cat.teams.get(tid, {})
        out.append(
            {
                "team_id": tid,
                "name": clean_team_name(row.get("name", tid)),
                "series_count": len(sids),
                "events": [e.strip() for e in (row.get("events") or "").split(";") if e.strip()],
            }
        )
    out.sort(key=lambda t: (-int(t["series_count"]), str(t["name"])))
    return out


def find_team_ids(name: str) -> List[str]:
    """Team IDs whose current or former name matches `name` (case-insensitive, exact)."""
    cat = load_catalog()
    target = clean_team_name(name).lower()
    ids = []
    for tid, row in cat.teams.items():
        names = [row.get("name", "")] + [n for n in (row.get("other_names") or "").split(";")]
        if any(clean_team_name(n).lower() == target for n in names if n.strip()):
            ids.append(tid)
    return ids

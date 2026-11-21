import csv
import re
from functools import lru_cache
from typing import Any, Dict, List, Optional
from src.config import get_settings


def _clean_team_name(name: str) -> str:
    """Clean team name by removing trailing seed or score indicators like (1)."""
    return re.sub(r"\s*\(\d+\)$", "", name).strip()


@lru_cache(maxsize=1)
def _load_metadata():
    settings = get_settings()
    players_map: Dict[str, str] = {}
    fallback_players_map: Dict[str, str] = {}
    rosters_map: Dict[str, Dict[str, Dict[str, str]]] = {}
    featured_series: List[Dict[str, Any]] = []

    # 1. Load players.csv (filtered by title == 'val')
    players_path = settings.META_DIR / "players.csv"
    if players_path.exists():
        with open(players_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                pid = row.get("player_id", "").strip()
                name = row.get("name", "").strip()
                title = row.get("title", "").strip().lower()
                if pid and name:
                    if title == "val":
                        players_map[pid] = name
                    else:
                        fallback_players_map[pid] = name

    # 2. Load rosters.csv
    rosters_path = settings.META_DIR / "rosters.csv"
    if rosters_path.exists():
        with open(rosters_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                sid = row.get("series_id", "").strip()
                pid = row.get("player_id", "").strip()
                pname = row.get("player_name", "").strip()
                cname = row.get("character_name", "").strip()
                tname = row.get("team_name", "").strip()
                side = row.get("side", "").strip()

                if not sid or not pid:
                    continue

                if sid not in rosters_map:
                    rosters_map[sid] = {}

                # If entry exists, preserve existing non-empty character_name if new one is empty
                existing = rosters_map[sid].get(pid)
                if existing and not cname and existing.get("character_name"):
                    cname = existing["character_name"]

                rosters_map[sid][pid] = {
                    "player_name": pname,
                    "character_name": cname,
                    "team_name": _clean_team_name(tname),
                    "side": side,
                }

                if pname and pid not in players_map:
                    fallback_players_map[pid] = pname

    # 3. Load series.csv
    series_path = settings.VAL_DIR / "series.csv"
    priority_ids = ["2748746", "2748750", "2748754", "2775953", "2748743"]
    series_by_id: Dict[str, Dict[str, Any]] = {}
    all_c9_ids: List[str] = []

    if series_path.exists():
        with open(series_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                sid = row.get("series_id", "").strip()
                teams_raw = row.get("teams", "").strip()
                if not sid:
                    continue

                parts = [p.strip() for p in teams_raw.split(" vs ")]
                team1 = _clean_team_name(parts[0]) if len(parts) > 0 else ""
                team2 = _clean_team_name(parts[1]) if len(parts) > 1 else ""
                is_c9 = "Cloud9" in teams_raw

                series_item = {
                    "series_id": sid,
                    "event": row.get("event", "").strip(),
                    "stage": row.get("stage", "").strip(),
                    "scheduled_start": row.get("scheduled_start", "").strip(),
                    "teams": teams_raw,
                    "team1_name": team1,
                    "team2_name": team2,
                    "is_c9_match": is_c9,
                }
                series_by_id[sid] = series_item

                if is_c9 and sid not in priority_ids:
                    all_c9_ids.append(sid)

    # Order featured series: priority IDs first, then remaining Cloud9 matches
    for sid in priority_ids:
        if sid in series_by_id:
            featured_series.append(series_by_id[sid])

    for sid in all_c9_ids:
        if sid in series_by_id:
            featured_series.append(series_by_id[sid])

    return players_map, fallback_players_map, rosters_map, featured_series


def get_player_name(player_id: str) -> str:
    """Resolve a player ID to their competitive player tag/name."""
    if not player_id:
        return ""
    pid_str = str(player_id).strip()
    players_map, fallback_map, _, _ = _load_metadata()
    if pid_str in players_map:
        return players_map[pid_str]
    if pid_str in fallback_map:
        return fallback_map[pid_str]
    return pid_str


def get_series_roster(series_id: str) -> Dict[str, Dict[str, str]]:
    """Get player roster mapping for a given series_id: player_id -> metadata."""
    if not series_id:
        return {}
    sid_str = str(series_id).strip()
    _, _, rosters_map, _ = _load_metadata()
    return rosters_map.get(sid_str, {})


def get_featured_series() -> List[Dict[str, Any]]:
    """Return catalog of featured Cloud9 and marquee VCT series matches."""
    _, _, _, featured_series = _load_metadata()
    return featured_series

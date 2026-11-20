"""Client for a self-hosted vlrggapi (https://github.com/axsddlr/vlrggapi), an unofficial scraper API for vlr.gg.

VLR data is public-web context (team map win rates, rosters). It complements the GRID scouting data
and is always labelled as coming from VLR. Responses are cached on disk in `.vlr-cache/` (git-ignored)
so we stay far below the scraper's rate limits and keep working when the API is briefly unreachable.

Configuration (environment):
    VLR_API_URL    base URL of the vlrggapi instance, default http://127.0.0.1:3001
    C9_VLR_CACHE   cache directory, default <project root>/.vlr-cache
"""

import hashlib
import json
import os
import pathlib
import re
import time
from typing import Any, Dict, List, Optional

import httpx

from src.config import get_settings

SOURCE = "vlr.gg via vlrggapi"
DEFAULT_BASE_URL = "http://127.0.0.1:3001"
SEARCH_TTL = 24 * 3600
STATS_TTL = 6 * 3600
ROSTER_TTL = 6 * 3600


class VlrUnavailable(Exception):
    """The vlrggapi instance could not be reached and nothing usable is cached."""


def _norm(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (name or "").lower())


def _pct(v: Any) -> Optional[float]:
    if v is None:
        return None
    m = re.search(r"-?\d+(?:\.\d+)?", str(v))
    return float(m.group()) if m else None


def _int(v: Any) -> Optional[int]:
    if v is None or v == "":
        return None
    try:
        return int(float(str(v).replace(",", "")))
    except ValueError:
        return None


class VlrClient:
    def __init__(
        self,
        base_url: Optional[str] = None,
        cache_dir: Optional[pathlib.Path] = None,
        transport: Optional[httpx.BaseTransport] = None,
        timeout: float = 60.0,
    ):
        self.base_url = (base_url or os.environ.get("VLR_API_URL") or DEFAULT_BASE_URL).rstrip("/")
        self._cache_dir = cache_dir
        self._http = httpx.Client(base_url=self.base_url, timeout=timeout, transport=transport)

    # ---- cache -------------------------------------------------------------------------------

    def cache_dir(self) -> pathlib.Path:
        d = pathlib.Path(
            self._cache_dir or os.environ.get("C9_VLR_CACHE") or get_settings().PROJECT_ROOT / ".vlr-cache"
        )
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _cache_path(self, path: str, params: Dict[str, Any]) -> pathlib.Path:
        key = path + "?" + "&".join(f"{k}={params[k]}" for k in sorted(params))
        return self.cache_dir() / (hashlib.sha1(key.encode()).hexdigest()[:20] + ".json")

    def _get(self, path: str, params: Optional[Dict[str, Any]] = None, ttl: int = STATS_TTL) -> Dict[str, Any]:
        """Return {"segments": ..., "fetched_at": epoch, "stale": bool}. Serves stale cache if the API is down."""
        params = {k: v for k, v in (params or {}).items() if v is not None}
        cp = self._cache_path(path, params)
        cached: Optional[Dict[str, Any]] = None
        if cp.exists():
            try:
                cached = json.loads(cp.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                cached = None
        if cached and time.time() - cached["fetched_at"] < ttl:
            return {**cached, "stale": False}
        try:
            r = self._http.get(path, params=params)
            r.raise_for_status()
            body = r.json()
            segments = body["data"]["segments"]
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
            if cached:
                return {**cached, "stale": True}
            raise VlrUnavailable(f"{type(exc).__name__}: {exc}") from exc
        fresh = {"segments": segments, "fetched_at": time.time()}
        try:
            cp.write_text(json.dumps(fresh), encoding="utf-8")
        except OSError:
            pass
        return {**fresh, "stale": False}

    # ---- endpoints ---------------------------------------------------------------------------

    def find_team(self, name: str) -> Optional[Dict[str, str]]:
        """Resolve a team name to its active VLR team. Exact (punctuation-insensitive) match only."""
        res = self._get("/v2/search", {"q": name}, SEARCH_TTL)
        teams = (res["segments"].get("results") or {}).get("teams") or []
        target = _norm(name)
        for t in teams:
            label = t.get("name", "")
            if "inactive" in label.lower():
                continue
            if _norm(label) == target:
                return {"id": str(t["id"]), "name": label}
        return None

    def team_stats(self, team_id: str, date_start: Optional[str] = None) -> Dict[str, Any]:
        res = self._get(f"/v2/team/{team_id}/stats", {"date_start": date_start}, STATS_TTL)
        maps = []
        for s in res["segments"] or []:
            if not s.get("map"):
                continue
            atk_rounds = (_int(s.get("atk_rw")) or 0) + (_int(s.get("atk_rl")) or 0)
            def_rounds = (_int(s.get("def_rw")) or 0) + (_int(s.get("def_rl")) or 0)
            maps.append(
                {
                    "map": str(s["map"]).strip().lower(),
                    "games": _int(s.get("games")) or 0,
                    "wins": _int(s.get("wins")) or 0,
                    "losses": _int(s.get("losses")) or 0,
                    "win_pct": _pct(s.get("win_pct")),
                    "atk_round_win_pct": _pct(s.get("atk_rwin_pct")),
                    "def_round_win_pct": _pct(s.get("def_rwin_pct")),
                    "atk_rounds": atk_rounds,
                    "def_rounds": def_rounds,
                    "atk_first_games": _int(s.get("atk_first")),
                    "def_first_games": _int(s.get("def_first")),
                }
            )
        maps.sort(key=lambda m: -m["games"])
        return {"maps": maps, "fetched_at": res["fetched_at"], "stale": res["stale"]}

    def team_roster(self, team_id: str) -> Dict[str, Any]:
        res = self._get(f"/v2/team/{team_id}/roster", None, ROSTER_TTL)
        seg = res["segments"][0] if res["segments"] else {}
        active = [
            {
                "id": str(p.get("id", "")),
                "alias": p.get("alias", ""),
                "real_name": p.get("real_name", ""),
                "country": p.get("country", ""),
                "is_captain": bool(p.get("is_captain")),
                "role": p.get("role", ""),
                "url": p.get("url", ""),
            }
            for p in (seg.get("active") or [])
            if not p.get("is_staff")
        ]
        return {"players": active, "fetched_at": res["fetched_at"], "stale": res["stale"]}

    def team_profile(self, name: str, date_start: Optional[str] = None) -> Dict[str, Any]:
        """Everything we show for one opponent. Raises VlrUnavailable if the API is down and nothing is cached."""
        team = self.find_team(name)
        if not team:
            return {"available": True, "source": SOURCE, "found": False, "query": name}
        stats = self.team_stats(team["id"], date_start)
        roster = self.team_roster(team["id"])
        return {
            "available": True,
            "source": SOURCE,
            "found": True,
            "team": team,
            "maps": stats["maps"],
            "roster": roster["players"],
            "notes": map_notes(stats["maps"]),
            "stale": stats["stale"] or roster["stale"],
            "fetched_at": min(stats["fetched_at"], roster["fetched_at"]),
        }


# Thresholds so a 2-0 map never reads as a trend.
MIN_GAMES = 10
MIN_SIDE_ROUNDS = 150
SIDE_SKEW_POINTS = 8.0


def map_notes(maps: List[Dict[str, Any]]) -> List[str]:
    """Plain-language observations from VLR map stats. Only maps with enough games are used."""
    notes: List[str] = []
    solid = [m for m in maps if m["games"] >= MIN_GAMES and m["win_pct"] is not None]
    if len(solid) >= 2:
        best = max(solid, key=lambda m: m["win_pct"])
        worst = min(solid, key=lambda m: m["win_pct"])
        if best["win_pct"] - worst["win_pct"] >= 5:
            notes.append(
                f"Strongest map: {best['map'].title()} ({best['win_pct']:.0f}% over {best['games']} games). "
                f"Weakest: {worst['map'].title()} ({worst['win_pct']:.0f}% over {worst['games']}). "
                f"Consider steering the veto toward the weak map."
            )
    for m in solid:
        a, d = m["atk_round_win_pct"], m["def_round_win_pct"]
        if a is None or d is None or m["atk_rounds"] < MIN_SIDE_ROUNDS or m["def_rounds"] < MIN_SIDE_ROUNDS:
            continue
        if abs(a - d) >= SIDE_SKEW_POINTS:
            strong, weak = ("attack", "defense") if a > d else ("defense", "attack")
            notes.append(
                f"{m['map'].title()}: stronger on {strong} ({max(a, d):.0f}% round wins) "
                f"than on {weak} ({min(a, d):.0f}%)."
            )
    return notes

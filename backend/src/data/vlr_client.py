import time
from typing import Any, Dict, Optional
import httpx
from src.data.vlr_2026_season import (
    SEASON_2026_MATCH_IDS,
    get_2026_match_details,
    get_2026_match_logs,
    get_2026_matches_catalog,
)
from src.models.vlr_models import VLRMatchDetailsResponse, VLRMatchLogsResponse


class VLRClient:
    def __init__(
        self,
        base_url: str = "https://vlrggapi.vercel.app",
        cache_ttl_seconds: int = 300,
    ):
        self.base_url = base_url.rstrip("/")
        self.cache_ttl_seconds = cache_ttl_seconds
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _get_cache(self, key: str) -> Optional[Any]:
        if key in self._cache:
            entry = self._cache[key]
            if time.time() - entry["timestamp"] < self.cache_ttl_seconds:
                return entry["data"]
            del self._cache[key]
        return None

    def _set_cache(self, key: str, data: Any) -> None:
        self._cache[key] = {"timestamp": time.time(), "data": data}

    async def get_match_logs(
        self, match_id: str, game_id: str = "1"
    ) -> VLRMatchLogsResponse:
        cache_key = f"logs:{match_id}:{game_id}"
        cached = self._get_cache(cache_key)
        if cached is not None:
            return cached

        # Check 2026 season provider first
        if match_id in SEASON_2026_MATCH_IDS or "2026" in match_id:
            try:
                logs = get_2026_match_logs(match_id, game_id=game_id)
                self._set_cache(cache_key, logs)
                return logs
            except ValueError:
                pass

        url = f"{self.base_url}/v2/match/{match_id}/logs"
        params = {"game_id": game_id} if game_id else {}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                parsed = VLRMatchLogsResponse(**resp.json())
                self._set_cache(cache_key, parsed)
                return parsed
        except (httpx.HTTPStatusError, httpx.RequestError):
            if match_id in SEASON_2026_MATCH_IDS or "2026" in match_id:
                logs = get_2026_match_logs(match_id, game_id=game_id)
                self._set_cache(cache_key, logs)
                return logs
            raise

    async def get_match_details(self, match_id: str) -> VLRMatchDetailsResponse:
        cache_key = f"details:{match_id}"
        cached = self._get_cache(cache_key)
        if cached is not None:
            return cached

        # Check 2026 season provider first
        if match_id in SEASON_2026_MATCH_IDS or "2026" in match_id:
            try:
                details = get_2026_match_details(match_id)
                self._set_cache(cache_key, details)
                return details
            except ValueError:
                pass

        url = f"{self.base_url}/v2/match/{match_id}/details"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                parsed = VLRMatchDetailsResponse(**resp.json())
                self._set_cache(cache_key, parsed)
                return parsed
        except (httpx.HTTPStatusError, httpx.RequestError):
            if match_id in SEASON_2026_MATCH_IDS or "2026" in match_id:
                details = get_2026_match_details(match_id)
                self._set_cache(cache_key, details)
                return details
            raise

    async def get_matches_catalog(
        self, category: str = "results"
    ) -> Dict[str, Any]:
        cache_key = f"catalog:{category}"
        cached = self._get_cache(cache_key)
        if cached is not None:
            return cached

        url = f"{self.base_url}/v2/match"
        params = {"q": category}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
                season_2026 = get_2026_matches_catalog()
                if isinstance(data, dict) and isinstance(data.get("data"), list):
                    existing_ids = {m.get("id") or m.get("match_id") for m in data["data"]}
                    to_add = [m for m in season_2026 if (m.get("id") or m.get("match_id")) not in existing_ids]
                    data["data"] = to_add + data["data"]
                self._set_cache(cache_key, data)
                return data
        except (httpx.HTTPStatusError, httpx.RequestError):
            fallback_data = {
                "status": "success",
                "data": get_2026_matches_catalog(),
                "fallback": True,
            }
            self._set_cache(cache_key, fallback_data)
            return fallback_data

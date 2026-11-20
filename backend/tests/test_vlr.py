"""Offline tests for the VLR client: a mock transport stands in for vlrggapi, so no network is used."""

import httpx
import pytest

from src.vlr.client import VlrClient, VlrUnavailable, map_notes

STATS = [
    {"map": "Bind", "games": 72, "win_pct": "50%", "wins": 36, "losses": 36, "atk_first": 20, "def_first": 48,
     "atk_rwin_pct": "49%", "atk_rw": 320, "atk_rl": 336, "def_rwin_pct": "55%", "def_rw": 401, "def_rl": 328},
    {"map": "Haven", "games": 117, "win_pct": "60%", "wins": 70, "losses": 47, "atk_first": 66, "def_first": 47,
     "atk_rwin_pct": "59%", "atk_rw": 716, "atk_rl": 492, "def_rwin_pct": "50%", "def_rw": 557, "def_rl": 556},
    {"map": "Corrode", "games": 2, "win_pct": "100%", "wins": 2, "losses": 0, "atk_first": 1, "def_first": 1,
     "atk_rwin_pct": "70%", "atk_rw": 14, "atk_rl": 6, "def_rwin_pct": "30%", "def_rw": 6, "def_rl": 14},
]
SEARCH = {
    "query": "Cloud9",
    "results": {
        "players": [],
        "teams": [
            {"id": "22918", "name": "Cloud9 GC (inactive since November 19, 2026)"},
            {"id": "188", "name": "Cloud9"},
        ],
    },
}
ROSTER = [{"active": [
    {"id": "1", "alias": "OXY", "real_name": "Real Name", "country": "us", "is_captain": False, "role": "", "is_staff": False},
    {"id": "2", "alias": "Coach", "real_name": "C", "country": "us", "is_captain": False, "role": "", "is_staff": True},
]}]


def _envelope(segments):
    return {"status": "success", "data": {"status": 200, "segments": segments}}


def make_client(tmp_path, calls, down=False):
    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(str(request.url))
        if down:
            raise httpx.ConnectError("boom")
        p = request.url.path
        if p == "/v2/search":
            return httpx.Response(200, json=_envelope(SEARCH))
        if p.endswith("/stats"):
            return httpx.Response(200, json=_envelope(STATS))
        if p.endswith("/roster"):
            return httpx.Response(200, json=_envelope(ROSTER))
        return httpx.Response(404)

    return VlrClient(base_url="http://vlr.test", cache_dir=tmp_path, transport=httpx.MockTransport(handler))


def test_find_team_skips_inactive_and_matches_exactly(tmp_path):
    c = make_client(tmp_path, [])
    assert c.find_team("Cloud9") == {"id": "188", "name": "Cloud9"}
    assert c.find_team("Cloud 9") == {"id": "188", "name": "Cloud9"}  # punctuation/space-insensitive
    assert c.find_team("Cloud") is None


def test_profile_shapes_and_filters_staff(tmp_path):
    p = make_client(tmp_path, []).team_profile("Cloud9")
    assert p["found"] and p["team"]["id"] == "188" and not p["stale"]
    haven = next(m for m in p["maps"] if m["map"] == "haven")
    assert haven["games"] == 117 and haven["win_pct"] == 60.0 and haven["atk_rounds"] == 1208
    assert [r["alias"] for r in p["roster"]] == ["OXY"]


def test_unknown_team_is_not_an_error(tmp_path):
    c = make_client(tmp_path, [])
    c._http = httpx.Client(
        base_url="http://vlr.test",
        transport=httpx.MockTransport(lambda r: httpx.Response(200, json=_envelope({"query": "x", "results": {"teams": []}}))),
    )
    assert c.team_profile("Nobody FC") == {
        "available": True, "source": "vlr.gg via vlrggapi", "found": False, "query": "Nobody FC",
    }


def test_responses_are_cached(tmp_path):
    calls = []
    c = make_client(tmp_path, calls)
    c.team_profile("Cloud9")
    n = len(calls)
    c.team_profile("Cloud9")
    assert len(calls) == n and n == 3  # search + stats + roster, each fetched once


def test_serves_stale_cache_when_api_is_down(tmp_path):
    make_client(tmp_path, []).team_profile("Cloud9")
    down = make_client(tmp_path, [], down=True)
    for path in tmp_path.glob("*.json"):  # age every entry past its TTL
        import json
        d = json.loads(path.read_text())
        d["fetched_at"] = 0
        path.write_text(json.dumps(d))
    p = down.team_profile("Cloud9")
    assert p["found"] and p["stale"] is True


def test_unavailable_when_down_and_uncached(tmp_path):
    with pytest.raises(VlrUnavailable):
        make_client(tmp_path, [], down=True).team_profile("Cloud9")


def test_notes_ignore_small_samples_and_flag_real_skew(tmp_path):
    maps = make_client(tmp_path, []).team_stats("188")["maps"]
    text = " ".join(map_notes(maps))
    assert "Corrode" not in text  # 2 games is not a trend
    assert "Haven: stronger on attack" in text  # 59% vs 50% over 1,000+ rounds each side
    assert "Strongest map: Haven" in text

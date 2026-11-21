import pytest
import respx
from httpx import Response
from src.data.vlr_client import VLRClient


@pytest.mark.asyncio
async def test_get_match_logs_caching():
    client = VLRClient(base_url="https://vlrggapi.vercel.app")

    mock_payload = {
        "status": "success",
        "data": {
            "match_id": "12345",
            "game_id": "1",
            "map": "Haven",
            "teams": [{"name": "Cloud9"}, {"name": "Sentinels"}],
            "rounds": [
                {
                    "round_number": 1,
                    "winning_team": "Cloud9",
                    "win_type": "elimination",
                    "events": [],
                }
            ],
        },
    }

    with respx.mock(base_url="https://vlrggapi.vercel.app") as respx_mock:
        route = respx_mock.get("/v2/match/12345/logs?game_id=1").mock(
            return_value=Response(200, json=mock_payload)
        )

        # First call hits mock
        res1 = await client.get_match_logs("12345", game_id="1")
        assert res1.data.match_id == "12345"
        assert res1.data.map == "Haven"
        assert route.call_count == 1

        # Second call hits memory cache, no new HTTP request
        res2 = await client.get_match_logs("12345", game_id="1")
        assert res2.data.match_id == "12345"
        assert route.call_count == 1


@pytest.mark.asyncio
async def test_get_match_details_caching():
    client = VLRClient(base_url="https://vlrggapi.vercel.app")

    mock_payload = {
        "status": "success",
        "data": {
            "match_id": "12345",
            "event": {"name": "Champions Tour"},
            "teams": [
                {"name": "Cloud9", "score": "2"},
                {"name": "Sentinels", "score": "1"},
            ],
            "maps": [
                {
                    "map_id": "1",
                    "name": "Haven",
                    "status": "completed",
                    "stats": [],
                }
            ],
        },
    }

    with respx.mock(base_url="https://vlrggapi.vercel.app") as respx_mock:
        route = respx_mock.get("/v2/match/12345/details").mock(
            return_value=Response(200, json=mock_payload)
        )

        res1 = await client.get_match_details("12345")
        assert res1.data.match_id == "12345"
        assert route.call_count == 1

        res2 = await client.get_match_details("12345")
        assert res2.data.match_id == "12345"
        assert route.call_count == 1


@pytest.mark.asyncio
async def test_get_matches_catalog_caching():
    client = VLRClient(base_url="https://vlrggapi.vercel.app")

    mock_payload = {
        "status": "success",
        "data": [
            {"id": "12345", "team1": "Cloud9", "team2": "Sentinels"}
        ],
    }

    with respx.mock(base_url="https://vlrggapi.vercel.app") as respx_mock:
        route = respx_mock.get("/v2/match?q=results").mock(
            return_value=Response(200, json=mock_payload)
        )

        res1 = await client.get_matches_catalog("results")
        assert res1["status"] == "success"
        assert route.call_count == 1

        res2 = await client.get_matches_catalog("results")
        assert res2["status"] == "success"
        assert route.call_count == 1


@pytest.mark.asyncio
async def test_cache_ttl_expiration(monkeypatch):
    client = VLRClient(base_url="https://vlrggapi.vercel.app", cache_ttl_seconds=10)

    mock_payload = {
        "status": "success",
        "data": {
            "match_id": "999",
            "game_id": "1",
            "map": "Bind",
            "teams": [],
            "rounds": [],
        },
    }

    current_time = 1000.0
    monkeypatch.setattr("time.time", lambda: current_time)

    with respx.mock(base_url="https://vlrggapi.vercel.app") as respx_mock:
        route = respx_mock.get("/v2/match/999/logs?game_id=1").mock(
            return_value=Response(200, json=mock_payload)
        )

        res1 = await client.get_match_logs("999", game_id="1")
        assert route.call_count == 1

        # Within TTL
        current_time = 1005.0
        res2 = await client.get_match_logs("999", game_id="1")
        assert route.call_count == 1

        # Past TTL (10s elapsed)
        current_time = 1015.0
        res3 = await client.get_match_logs("999", game_id="1")
        assert route.call_count == 2


@pytest.mark.asyncio
async def test_get_2026_season_match_direct():
    client = VLRClient()
    logs = await client.get_match_logs("vlr-c9-sen-2026")
    assert logs.data.match_id == "vlr-c9-sen-2026"
    assert logs.data.teams[0].name == "Cloud9"
    assert logs.data.teams[1].name == "Sentinels"
    assert len(logs.data.rounds) >= 20

    details = await client.get_match_details("vlr-c9-sen-2026")
    assert details.data.match_id == "vlr-c9-sen-2026"
    assert len(details.data.maps[0].stats) >= 10
    oxy_stat = next(s for s in details.data.maps[0].stats if s.player == "OXY")
    assert oxy_stat.acs > 200


@pytest.mark.asyncio
async def test_get_matches_catalog_fallback_on_remote_error():
    client = VLRClient(base_url="https://vlrggapi.vercel.app")
    with respx.mock(base_url="https://vlrggapi.vercel.app") as respx_mock:
        respx_mock.get("/v2/match?q=results").mock(
            return_value=Response(429, text="Rate limit exceeded")
        )
        data = await client.get_matches_catalog("results")
        assert data["status"] == "success"
        assert len(data["data"]) >= 4
        events = [m["event"]["name"] for m in data["data"]]
        assert any("VCT Americas 2026" in e for e in events)


@pytest.mark.asyncio
async def test_get_matches_catalog_prioritizes_2026_matches():
    client = VLRClient(base_url="https://vlrggapi.vercel.app")
    mock_payload = {
        "status": "success",
        "data": [
            {"id": "external-match-999", "team1": "Team A", "team2": "Team B"}
        ],
    }
    with respx.mock(base_url="https://vlrggapi.vercel.app") as respx_mock:
        respx_mock.get("/v2/match?q=results").mock(
            return_value=Response(200, json=mock_payload)
        )
        data = await client.get_matches_catalog("results")
        assert data["status"] == "success"
        # 2026 matches should be included alongside remote matches
        ids = [m.get("id") or m.get("match_id") for m in data["data"]]
        assert "vlr-c9-sen-2026" in ids
        assert "external-match-999" in ids


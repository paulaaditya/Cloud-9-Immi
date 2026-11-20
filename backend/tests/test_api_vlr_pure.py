from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_featured_series_returns_2026_season():
    """Verify GET /api/v1/featured-series returns 2026 VCT matches with required flags."""
    resp = client.get("/api/v1/featured-series")
    assert resp.status_code == 200
    series = resp.json()
    assert len(series) >= 4

    for item in series:
        event_name = (
            item["event"]["name"]
            if isinstance(item.get("event"), dict)
            else item.get("event_name", item.get("event", ""))
        )
        assert "2026" in event_name
        assert "is_cloud9" in item
        assert isinstance(item["is_cloud9"], bool)
        assert "team1_name" in item or "team1" in item
        assert "team2_name" in item or "team2" in item
        assert "teams" in item

    # Check Cloud9 flag correctness
    c9_match = next((s for s in series if s.get("series_id") == "vlr-c9-sen-2026"), None)
    assert c9_match is not None
    assert c9_match["is_cloud9"] is True
    assert c9_match["team1_name"] == "Cloud9"
    assert c9_match["team2_name"] == "Sentinels"

    non_c9_match = next((s for s in series if s.get("series_id") == "vlr-sen-th-champions2026"), None)
    assert non_c9_match is not None
    assert non_c9_match["is_cloud9"] is False


def test_series_coaching_report_delegates_to_vlr_2026():
    """Verify GET /api/v1/series/{series_id}/coaching-report works with 2026 match ID."""
    resp = client.get("/api/v1/series/vlr-c9-sen-2026/coaching-report")
    assert resp.status_code == 200
    data = resp.json()

    assert data["series_id"] == "vlr-c9-sen-2026"
    assert data["team1_name"] == "Cloud9"
    assert data["team2_name"] == "Sentinels"
    assert "player_stats" in data
    assert len(data["player_stats"]) >= 10
    assert "OXY" in data["player_stats"]
    assert "mistakes" in data
    assert "player_reports" in data
    assert len(data["player_reports"]) > 0
    assert "round_insights" in data
    assert len(data["round_insights"]) >= 20
    assert "prescribed_drills" in data


def test_vlr_matches_returns_2026_matches_in_results():
    """Verify GET /api/v1/vlr/matches returns 2026 matches in results."""
    resp = client.get("/api/v1/vlr/matches?category=results")
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "success"
    assert "data" in data
    matches = data["data"]
    assert len(matches) >= 4

    match_ids = [m.get("id") or m.get("match_id") for m in matches]
    assert "vlr-c9-sen-2026" in match_ids
    assert "vlr-c9-nrg-2026" in match_ids
    assert any("2026" in str(mid) for mid in match_ids)


def test_vlr_match_coaching_report_full_2026():
    """Verify GET /api/v1/vlr/match/{match_id}/coaching-report returns full 2026 coaching report."""
    resp = client.get("/api/v1/vlr/match/vlr-c9-sen-2026/coaching-report")
    assert resp.status_code == 200
    data = resp.json()

    assert data["series_id"] == "vlr-c9-sen-2026"
    assert data["team1_name"] == "Cloud9"
    assert data["team2_name"] == "Sentinels"
    assert "player_stats" in data
    assert "OXY" in data["player_stats"]
    oxy_stat = data["player_stats"]["OXY"]
    assert oxy_stat["acs"] > 200
    assert "mistakes" in data
    assert "player_reports" in data
    assert "round_insights" in data
    assert len(data["round_insights"]) == 24


def test_vlr_match_round_insight_valid_round():
    """Verify GET /api/v1/vlr/match/{match_id}/round/{round_num}/insight returns insight for valid round."""
    resp = client.get("/api/v1/vlr/match/vlr-c9-sen-2026/round/1/insight")
    assert resp.status_code == 200
    data = resp.json()

    assert data["round_number"] == 1
    assert "narrative" in data
    assert len(data["narrative"]) > 0
    assert "tactical_directive" in data
    assert "recommended_drill" in data
    assert "drill_name" in data["recommended_drill"]


def test_featured_series_alternate_route():
    """Verify GET /api/v1/series/featured returns 2026 season catalog."""
    resp = client.get("/api/v1/series/featured")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 4

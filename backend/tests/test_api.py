import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_get_featured_series_api():
    for endpoint in ["/api/v1/featured-series", "/api/v1/series/featured"]:
        response = client.get(endpoint)
        assert response.status_code == 200
        series_list = response.json()
        assert isinstance(series_list, list)
        assert len(series_list) >= 5

    sids = [s["series_id"] for s in series_list]
    assert "2748746" in sids  # NRG vs Cloud9
    assert "2748750" in sids  # Cloud9 vs G2
    assert "2748754" in sids  # Cloud9 vs MIBR
    assert "2775953" in sids  # Cloud9 vs NRG
    assert "2748743" in sids  # EG vs LOUD

    for s in series_list:
        assert "event" in s
        assert "stage" in s
        assert "teams" in s
        assert "team1_name" in s
        assert "team2_name" in s
        assert "is_c9_match" in s


def test_get_coaching_report_real_series():
    # Test against series 2748743
    response = client.get(
        "/api/v1/series/2748743/coaching-report?game_index=0&max_envelopes=1000"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["series_id"] == "2748743"
    assert "games" in data
    assert "roster" in data
    assert isinstance(data["roster"], dict)
    assert len(data["roster"]) > 0
    assert data["selected_game_index"] == 0
    assert "total_mistakes_detected" in data
    assert "player_reports" in data
    assert "prescribed_drills" in data


def test_get_coaching_report_not_found():
    response = client.get("/api/v1/series/nonexistent_999/coaching-report")
    assert response.status_code == 404

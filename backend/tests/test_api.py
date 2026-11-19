import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_get_coaching_report_real_series():
    # Test against series 2748743
    response = client.get("/api/v1/series/2748743/coaching-report?max_envelopes=1000")
    assert response.status_code == 200
    data = response.json()
    assert data["series_id"] == "2748743"
    assert "games" in data
    assert "total_mistakes_detected" in data
    assert "player_reports" in data
    assert "prescribed_drills" in data


def test_get_coaching_report_not_found():
    response = client.get("/api/v1/series/nonexistent_999/coaching-report")
    assert response.status_code == 404

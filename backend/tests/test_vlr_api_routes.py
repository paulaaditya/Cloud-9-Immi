from unittest.mock import AsyncMock, patch
import httpx
import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.models.vlr_models import (
    VLRMapDetail,
    VLRMatchDetailsData,
    VLRMatchDetailsResponse,
    VLRMatchLogsData,
    VLRMatchLogsResponse,
    VLRPlayerStat,
    VLRRound,
    VLRRoundEvent,
    VLRTeam,
)

client = TestClient(app)


def _build_sample_logs(match_id: str = "999") -> VLRMatchLogsResponse:
    return VLRMatchLogsResponse(
        status="success",
        data=VLRMatchLogsData(
            match_id=match_id,
            game_id="1",
            map="Bind",
            teams=[
                VLRTeam(name="Cloud9"),
                VLRTeam(name="100 Thieves"),
            ],
            rounds=[
                VLRRound(
                    round_number=1,
                    winning_team="Cloud9",
                    win_type="elimination",
                    events=[
                        VLRRoundEvent(
                            time="0:20",
                            type="kill",
                            killer="OXY",
                            victim="Asuna",
                            weapon="Classic",
                        )
                    ],
                )
            ],
        ),
    )


def _build_sample_details(match_id: str = "999") -> VLRMatchDetailsResponse:
    return VLRMatchDetailsResponse(
        status="success",
        data=VLRMatchDetailsData(
            match_id=match_id,
            teams=[
                VLRTeam(name="Cloud9", score="1"),
                VLRTeam(name="100 Thieves", score="0"),
            ],
            maps=[
                VLRMapDetail(
                    map_id="1",
                    name="Bind",
                    stats=[
                        VLRPlayerStat(
                            player="OXY",
                            team="Cloud9",
                            agent="Raze",
                            k=1,
                            d=0,
                            a=0,
                            acs=260,
                            fk=1,
                            fd=0,
                        ),
                        VLRPlayerStat(
                            player="Asuna",
                            team="100 Thieves",
                            agent="Jett",
                            k=0,
                            d=1,
                            a=0,
                            acs=120,
                            fk=0,
                            fd=1,
                        ),
                    ],
                )
            ],
        ),
    )


@patch("src.data.vlr_client.VLRClient.get_matches_catalog", new_callable=AsyncMock)
def test_get_vlr_matches_catalog(mock_catalog):
    mock_catalog.return_value = {
        "status": "success",
        "data": [
            {"match_id": "999", "team1": "Cloud9", "team2": "100 Thieves"}
        ],
    }

    resp = client.get("/api/v1/vlr/matches?category=results")
    assert resp.status_code == 200
    json_data = resp.json()
    assert json_data["status"] == "success"
    assert len(json_data["data"]) == 1
    assert json_data["data"][0]["match_id"] == "999"
    mock_catalog.assert_awaited_once_with("results")


@patch("src.data.vlr_client.VLRClient.get_match_details", new_callable=AsyncMock)
@patch("src.data.vlr_client.VLRClient.get_match_logs", new_callable=AsyncMock)
def test_get_vlr_coaching_report_endpoint(mock_logs, mock_details):
    mock_logs.return_value = _build_sample_logs("999")
    mock_details.return_value = _build_sample_details("999")

    resp = client.get("/api/v1/vlr/match/999/coaching-report?game_id=1")
    assert resp.status_code == 200
    json_data = resp.json()

    assert json_data["series_id"] == "999"
    assert json_data["team1_name"] == "Cloud9"
    assert json_data["team2_name"] == "100 Thieves"
    assert json_data["total_games"] == 1
    assert "player_stats" in json_data
    assert "OXY" in json_data["player_stats"]
    assert "mistakes" in json_data
    assert "player_reports" in json_data
    assert "prescribed_drills" in json_data
    assert "round_insights" in json_data
    assert len(json_data["round_insights"]) == 1
    assert json_data["round_insights"][0]["round_number"] == 1


@patch("src.data.vlr_client.VLRClient.get_match_details", new_callable=AsyncMock)
@patch("src.data.vlr_client.VLRClient.get_match_logs", new_callable=AsyncMock)
def test_get_vlr_round_insight_endpoint(mock_logs, mock_details):
    mock_logs.return_value = _build_sample_logs("999")
    mock_details.return_value = _build_sample_details("999")

    resp = client.get("/api/v1/vlr/match/999/round/1/insight?game_id=1")
    assert resp.status_code == 200
    json_data = resp.json()

    assert json_data["round_number"] == 1
    assert "narrative" in json_data
    assert "tactical_directive" in json_data
    assert "recommended_drill" in json_data
    assert "drill_name" in json_data["recommended_drill"]


def test_get_llm_health():
    resp = client.get("/api/v1/llm/health")
    assert resp.status_code == 200
    json_data = resp.json()
    assert json_data["status"] in ("healthy", "ok")
    assert "backend" in json_data


@patch("src.data.vlr_client.VLRClient.get_match_details", new_callable=AsyncMock)
@patch("src.data.vlr_client.VLRClient.get_match_logs", new_callable=AsyncMock)
def test_vlr_match_not_found_error_404(mock_logs, mock_details):
    request = httpx.Request("GET", "https://vlrggapi.vercel.app/v2/match/notfound/logs")
    response = httpx.Response(404, request=request)
    mock_logs.side_effect = httpx.HTTPStatusError("Not found", request=request, response=response)

    resp = client.get("/api/v1/vlr/match/notfound/coaching-report")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


@patch("src.data.vlr_client.VLRClient.get_match_details", new_callable=AsyncMock)
@patch("src.data.vlr_client.VLRClient.get_match_logs", new_callable=AsyncMock)
def test_vlr_upstream_failure_error_502(mock_logs, mock_details):
    mock_logs.side_effect = httpx.ConnectError("Connection timed out")

    resp = client.get("/api/v1/vlr/match/fail502/coaching-report")
    assert resp.status_code == 502
    assert "failed to fetch" in resp.json()["detail"].lower()


@patch("src.data.vlr_client.VLRClient.get_match_details", new_callable=AsyncMock)
@patch("src.data.vlr_client.VLRClient.get_match_logs", new_callable=AsyncMock)
def test_vlr_round_not_found_error_404(mock_logs, mock_details):
    mock_logs.return_value = _build_sample_logs("999")
    mock_details.return_value = _build_sample_details("999")

    resp = client.get("/api/v1/vlr/match/999/round/99/insight?game_id=1")
    assert resp.status_code == 404
    assert "round 99 not found" in resp.json()["detail"].lower()


@patch("src.data.vlr_client.VLRClient.get_matches_catalog", new_callable=AsyncMock)
def test_vlr_matches_catalog_upstream_error_502(mock_catalog):
    mock_catalog.side_effect = httpx.ConnectError("VLR API is unreachable")

    resp = client.get("/api/v1/vlr/matches")
    assert resp.status_code == 502
    assert "failed to fetch" in resp.json()["detail"].lower()

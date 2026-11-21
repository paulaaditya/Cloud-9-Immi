import pytest
from src.models.vlr_models import (
    VLRMatchLogsResponse,
    VLRMatchDetailsResponse,
    VLRRoundEvent,
    VLRPlayerStat,
    VLRRound,
    VLRMapDetail,
    VLRTeam,
)


def test_parse_vlr_round_event():
    event = VLRRoundEvent(
        time="0:18",
        type="kill",
        killer="OXY",
        victim="crashies",
        weapon="Ghost",
        assistants=["vanity"],
    )
    assert event.time == "0:18"
    assert event.type == "kill"
    assert event.killer == "OXY"
    assert event.victim == "crashies"
    assert event.weapon == "Ghost"
    assert event.assistants == ["vanity"]


def test_parse_vlr_player_stat():
    stat = VLRPlayerStat(
        player="OXY",
        team="Cloud9",
        agent="Jett",
        k=22,
        d=12,
        a=5,
        kd_diff=10,
        acs=285,
        kast="78%",
        adr=182.4,
        hs_percent="31%",
        fk=5,
        fd=1,
        fk_fd_diff=4,
    )
    assert stat.player == "OXY"
    assert stat.acs == 285
    assert stat.fk == 5
    assert stat.adr == 182.4


def test_parse_vlr_match_logs_payload():
    payload = {
        "status": "success",
        "data": {
            "match_id": "773435",
            "game_id": "1",
            "map": "Ascent",
            "teams": [
                {"id": "cloud9", "name": "Cloud9", "side": "attack"},
                {"id": "nrg", "name": "NRG", "side": "defense"},
            ],
            "rounds": [
                {
                    "round_number": 1,
                    "winning_team": "Cloud9",
                    "win_type": "elimination",
                    "events": [
                        {
                            "time": "0:18",
                            "type": "kill",
                            "killer": "OXY",
                            "victim": "crashies",
                            "weapon": "Ghost",
                            "assistants": ["vanity"],
                        },
                        {
                            "time": "0:45",
                            "type": "plant",
                            "killer": "vanity",
                            "victim": "",
                            "weapon": "",
                            "assistants": [],
                        },
                    ],
                }
            ],
        },
    }
    parsed = VLRMatchLogsResponse(**payload)
    assert parsed.status == "success"
    assert parsed.data.match_id == "773435"
    assert parsed.data.game_id == "1"
    assert parsed.data.map == "Ascent"
    assert len(parsed.data.teams) == 2
    assert len(parsed.data.rounds) == 1
    assert parsed.data.rounds[0].events[0].killer == "OXY"
    assert parsed.data.rounds[0].events[0].type == "kill"


def test_parse_vlr_match_details_payload():
    payload = {
        "status": "success",
        "data": {
            "match_id": "773435",
            "event": {"name": "VCT Americas", "stage": "Regular Season"},
            "teams": [
                {"id": "c9", "name": "Cloud9", "score": "2", "is_winner": True},
                {"id": "nrg", "name": "NRG", "score": "1", "is_winner": False},
            ],
            "maps": [
                {
                    "map_id": "1",
                    "name": "Ascent",
                    "status": "completed",
                    "stats": [
                        {
                            "player": "OXY",
                            "team": "Cloud9",
                            "agent": "Jett",
                            "k": 22,
                            "d": 12,
                            "a": 5,
                            "kd_diff": 10,
                            "acs": 285,
                            "kast": "78%",
                            "adr": 182.4,
                            "hs_percent": "31%",
                            "fk": 5,
                            "fd": 1,
                            "fk_fd_diff": 4,
                        }
                    ],
                }
            ],
        },
    }
    parsed = VLRMatchDetailsResponse(**payload)
    assert parsed.status == "success"
    assert parsed.data.match_id == "773435"
    assert parsed.data.teams[0].name == "Cloud9"
    assert parsed.data.teams[0].is_winner is True
    stat = parsed.data.maps[0].stats[0]
    assert stat.player == "OXY"
    assert stat.acs == 285
    assert stat.fk == 5

import pytest
from src.models.vlr_models import (
    VLRMatchLogsResponse,
    VLRMatchDetailsResponse,
)
from src.data.vlr_parser import normalize_vlr_series


def test_normalize_vlr_series():
    logs = VLRMatchLogsResponse(
        status="success",
        data={
            "match_id": "773435",
            "game_id": "1",
            "map": "Ascent",
            "teams": [
                {"name": "Cloud9", "side": "attack"},
                {"name": "NRG", "side": "defense"},
            ],
            "rounds": [
                {
                    "round_number": 1,
                    "winning_team": "Cloud9",
                    "win_type": "elimination",
                    "events": [
                        {
                            "time": "0:25",
                            "type": "kill",
                            "killer": "OXY",
                            "victim": "crashies",
                            "weapon": "Ghost",
                            "assistants": [],
                        },
                        {
                            "time": "0:45",
                            "type": "plant",
                            "killer": "vanity",
                            "victim": "",
                            "weapon": "",
                            "assistants": [],
                        },
                        {
                            "time": "0:58",
                            "type": "kill",
                            "killer": "Xeppaa",
                            "victim": "Victor",
                            "weapon": "Classic",
                            "assistants": ["OXY"],
                        },
                    ],
                }
            ],
        },
    )

    details = VLRMatchDetailsResponse(
        status="success",
        data={
            "match_id": "773435",
            "teams": [
                {"name": "Cloud9", "score": "1"},
                {"name": "NRG", "score": "0"},
            ],
            "maps": [
                {
                    "map_id": "1",
                    "name": "Ascent",
                    "stats": [
                        {
                            "player": "OXY",
                            "team": "Cloud9",
                            "agent": "Jett",
                            "k": 1,
                            "d": 0,
                            "a": 1,
                            "acs": 250,
                            "fk": 1,
                            "fd": 0,
                        }
                    ],
                }
            ],
        },
    )

    series = normalize_vlr_series(logs, details)
    assert series.series_id == "773435"
    assert series.team1_name == "Cloud9"
    assert series.team2_name == "NRG"
    assert len(series.games) == 1
    assert series.games[0].map_name == "Ascent"
    assert len(series.games[0].rounds) == 1

    round1 = series.games[0].rounds[0]
    assert round1.round_number == 1
    assert round1.round_winner_name == "Cloud9"
    assert round1.winning_team_id == "Cloud9"
    assert round1.win_condition == "elimination"
    assert round1.spike_planted is True
    assert round1.spike_planter_id == "vanity"


def test_normalize_vlr_series_multi_map():
    logs = VLRMatchLogsResponse(
        status="success",
        data={
            "match_id": "vlr-multi-test",
            "game_id": "2",
            "map": "Abyss",
            "teams": [{"name": "Cloud9"}, {"name": "LOUD"}],
            "rounds": [
                {
                    "round_number": 1,
                    "winning_team": "Cloud9",
                    "win_type": "elimination",
                    "events": [
                        {
                            "time": "0:20",
                            "type": "kill",
                            "killer": "OXY",
                            "victim": "dgzin",
                            "weapon": "Ghost",
                        }
                    ],
                }
            ],
        },
    )

    details = VLRMatchDetailsResponse(
        status="success",
        data={
            "match_id": "vlr-multi-test",
            "teams": [{"name": "Cloud9"}, {"name": "LOUD"}],
            "maps": [
                {"map_id": "1", "name": "Haven", "stats": []},
                {"map_id": "2", "name": "Abyss", "stats": []},
                {"map_id": "3", "name": "Bind", "stats": []},
            ],
        },
    )

    series = normalize_vlr_series(logs, details)
    assert len(series.games) == 3
    assert series.games[0].map_name == "Haven"
    assert series.games[1].map_name == "Abyss"
    assert series.games[2].map_name == "Bind"
    # Active map (game_id 2) has the rounds populated
    assert len(series.games[1].rounds) == 1
    round1 = series.games[1].rounds[0]
    assert round1.round_number == 1
    assert len(round1.kills) == 1
    assert round1.kills[0].killer_name == "OXY"
    assert round1.kills[0].victim_name == "dgzin"
    assert round1.kills[0].is_first_blood is True


def test_normalize_vlr_series_without_details():
    logs = VLRMatchLogsResponse(
        status="success",
        data={
            "match_id": "888",
            "game_id": "2",
            "map": "Bind",
            "teams": [
                {"name": "Cloud9"},
                {"name": "Leviatan"},
            ],
            "rounds": [
                {
                    "round_number": 1,
                    "winning_team": "Leviatan",
                    "win_type": "defuse",
                    "events": [],
                }
            ],
        },
    )

    series = normalize_vlr_series(logs)
    assert series.series_id == "888"
    assert series.team1_name == "Cloud9"
    assert series.team2_name == "Leviatan"
    assert len(series.games) == 1
    assert series.games[0].game_id == "2"
    assert series.games[0].map_name == "Bind"
    assert series.games[0].rounds[0].round_winner_name == "Leviatan"
    assert series.games[0].rounds[0].win_condition == "defuse"


def test_normalize_vlr_series_fallback_from_details():
    logs = VLRMatchLogsResponse(
        status="success",
        data={
            "match_id": "777",
            "game_id": "1",
            "map": "",
            "teams": [],
            "rounds": [],
        },
    )
    details = VLRMatchDetailsResponse(
        status="success",
        data={
            "match_id": "777",
            "teams": [
                {"name": "Team Alpha"},
                {"name": "Team Beta"},
            ],
            "maps": [
                {
                    "map_id": "1",
                    "name": "Lotus",
                    "stats": [],
                }
            ],
        },
    )

    series = normalize_vlr_series(logs, details)
    assert series.series_id == "777"
    assert series.team1_name == "Team Alpha"
    assert series.team2_name == "Team Beta"
    assert series.games[0].map_name == "Lotus"

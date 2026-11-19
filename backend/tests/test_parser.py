import pytest
from src.data.parser import parse_series
from src.models.match_state import ParsedSeries, ParsedGame, ParsedRound, KillEvent, AbilityCast


def test_parse_series_extracts_structure():
    # Parse first 2000 envelopes of match 2748743
    parsed = parse_series("2748743", max_envelopes=2000)
    assert isinstance(parsed, ParsedSeries)
    assert parsed.series_id == "2748743"
    assert len(parsed.games) > 0
    game = parsed.games[0]
    assert game.map_name != "Unknown"
    assert len(game.rounds) > 0
    round_obj = game.rounds[0]
    assert round_obj.round_number == 1
    # Check that kills have valid timestamp and IDs
    assert len(round_obj.kills) > 0
    k = round_obj.kills[0]
    assert k.killer_id != ""
    assert k.victim_id != ""
    assert k.occurred_at != ""
    # Check ability casts exist and have 3D coordinates from supplement
    assert len(round_obj.ability_casts) > 0
    ability_with_coords = any(
        cast.position is not None for cast in round_obj.ability_casts
    )
    assert ability_with_coords


def test_parse_series_game_rollback(monkeypatch):
    mock_events = [
        {
            "sequenceNumber": 1,
            "occurredAt": "2025-01-01T00:00:00.000Z",
            "events": [
                {
                    "type": "series-started-game",
                    "target": {
                        "id": "game-rolled-back",
                        "state": {"map": {"name": "bind"}},
                    },
                },
                {"type": "game-started-round"},
                {
                    "type": "player-killed-player",
                    "id": "kill-001",
                    "actor": {"id": "p1"},
                    "target": {"id": "p2"},
                },
                {
                    "type": "series-!started-game",
                    "target": {"id": "game-rolled-back"},
                },
                {
                    "type": "series-started-game",
                    "target": {
                        "id": "game-valid",
                        "state": {"map": {"name": "ascent"}},
                    },
                },
                {"type": "game-started-round"},
                {
                    "type": "player-killed-player",
                    "id": "kill-002",
                    "actor": {"id": "p3"},
                    "target": {"id": "p4"},
                },
            ],
        }
    ]

    monkeypatch.setattr("src.data.parser.load_ability_supplement", lambda s: {})
    monkeypatch.setattr(
        "src.data.parser.stream_series_events",
        lambda s, max_envelopes=None: iter(mock_events),
    )

    parsed = parse_series("dummy_series")
    assert isinstance(parsed, ParsedSeries)
    assert len(parsed.games) == 1
    assert parsed.games[0].game_id == "game-valid"
    assert parsed.games[0].map_name == "ascent"
    assert len(parsed.games[0].rounds) == 1
    assert len(parsed.games[0].rounds[0].kills) == 1
    assert parsed.games[0].rounds[0].kills[0].killer_id == "p3"

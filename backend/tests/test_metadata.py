import pytest
from src.data.metadata import (
    get_player_name,
    get_series_roster,
    get_featured_series,
)


def test_get_player_name_known_val_players():
    # C9 players
    assert get_player_name("10636") == "OXY"
    assert get_player_name("10612") == "v1c"
    assert get_player_name("1193") == "Xeppaa"
    assert get_player_name("1195") == "mitch"
    assert get_player_name("2348") == "neT"

    # EG / NRG players from VCT Kickoff
    assert get_player_name("306") == "Derrek"
    assert get_player_name("866") == "yay"
    assert get_player_name("303") == "NaturE"
    assert get_player_name("2340") == "s0m"
    assert get_player_name("74432") == "FNS"


def test_get_player_name_unknown_fallback():
    # Unknown ID should fall back to ID string
    assert get_player_name("nonexistent_player_12345") == "nonexistent_player_12345"
    assert get_player_name("") == ""


def test_get_series_roster():
    # C9 vs NRG series 2748746
    roster = get_series_roster("2748746")
    assert isinstance(roster, dict)
    assert len(roster) >= 10

    # Check C9 player
    assert "10636" in roster
    assert roster["10636"]["player_name"] == "OXY"
    assert roster["10636"]["team_name"] == "Cloud9"
    assert roster["10636"]["character_name"] != ""

    # Check NRG player
    assert "74432" in roster
    assert roster["74432"]["player_name"] == "FNS"
    assert roster["74432"]["team_name"] == "NRG"


def test_get_series_roster_unknown():
    roster = get_series_roster("invalid_series_999")
    assert roster == {}


def test_get_featured_series():
    featured = get_featured_series()
    assert isinstance(featured, list)
    assert len(featured) >= 5

    series_ids = [s["series_id"] for s in featured]
    # Check that required featured series are present
    assert "2748746" in series_ids  # NRG vs Cloud9
    assert "2748750" in series_ids  # Cloud9 vs G2 Esports
    assert "2748754" in series_ids  # Cloud9 vs MIBR
    assert "2775953" in series_ids  # Cloud9 vs NRG
    assert "2748743" in series_ids  # Evil Geniuses vs LOUD

    # Check structure
    for item in featured:
        assert "series_id" in item
        assert "event" in item
        assert "stage" in item
        assert "teams" in item
        assert "team1_name" in item
        assert "team2_name" in item
        assert "is_c9_match" in item

    # Check Cloud9 flag
    c9_item = next(s for s in featured if s["series_id"] == "2748746")
    assert c9_item["is_c9_match"] is True
    assert "Cloud9" in c9_item["teams"]

import pytest
from src.data.vlr_2026_season import (
    get_2026_matches_catalog,
    get_2026_match_logs,
    get_2026_match_details,
    SEASON_2026_MATCH_IDS,
)


def test_get_2026_matches_catalog():
    catalog = get_2026_matches_catalog()
    assert len(catalog) >= 4
    events = [m["event"]["name"] for m in catalog]
    assert any("VCT Americas 2026" in e for e in events)
    assert any("VCT Masters 2026" in e for e in events)
    assert any("VCT Champions 2026" in e for e in events)

    # Check match id format and required catalog fields
    for match in catalog:
        assert "id" in match or "match_id" in match
        assert "teams" in match or ("team1" in match and "team2" in match)
        assert "event" in match
        assert isinstance(match["event"], dict)
        assert "name" in match["event"]


def test_get_2026_match_logs_and_details():
    match_id = "vlr-c9-sen-2026"
    logs = get_2026_match_logs(match_id)
    assert logs.status == "success"
    assert logs.data.match_id == match_id
    assert len(logs.data.rounds) >= 20
    assert logs.data.rounds[0].events[0].type == "kill"

    details = get_2026_match_details(match_id)
    assert details.status == "success"
    assert details.data.match_id == match_id
    assert len(details.data.maps[0].stats) >= 10
    oxy_stat = next(s for s in details.data.maps[0].stats if s.player == "OXY")
    assert oxy_stat.acs > 200
    assert oxy_stat.adr > 100.0
    assert oxy_stat.k > 0
    assert oxy_stat.fk >= 0


def test_all_2026_season_matches_loadable():
    for match_id in SEASON_2026_MATCH_IDS:
        logs = get_2026_match_logs(match_id)
        assert logs.status == "success"
        assert logs.data.match_id == match_id
        assert len(logs.data.rounds) >= 20
        assert len(logs.data.teams) == 2

        # Verify round consistency
        for r in logs.data.rounds:
            assert r.round_number >= 1
            assert r.winning_team in [logs.data.teams[0].name, logs.data.teams[1].name]
            assert len(r.events) > 0

        details = get_2026_match_details(match_id)
        assert details.status == "success"
        assert details.data.match_id == match_id
        assert len(details.data.maps) >= 1
        stats = details.data.maps[0].stats
        assert len(stats) >= 10
        # All player stats have required performance fields
        for s in stats:
            assert s.player
            assert s.team
            assert s.agent
            assert s.acs is not None and s.acs >= 0
            assert s.adr is not None and s.adr >= 0.0


def test_unknown_2026_match_raises_value_error():
    with pytest.raises(ValueError):
        get_2026_match_logs("vlr-unknown-9999")

    with pytest.raises(ValueError):
        get_2026_match_details("vlr-unknown-9999")

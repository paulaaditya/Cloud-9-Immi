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
        assert len(logs.data.rounds) >= 13
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


def test_2026_catalog_has_expanded_season_matches():
    catalog = get_2026_matches_catalog()
    assert len(catalog) >= 20
    # Verify 2026 rosters: Sentinels has N4RRATE, not TenZ
    sen_match = next(m for m in catalog if m["match_id"] == "vlr-c9-sen-2026")
    details = get_2026_match_details(sen_match["match_id"])
    players = [p.player for p in details.data.maps[0].stats]
    assert "N4RRATE" in players
    assert "TenZ" not in players


def test_2026_catalog_filtering():
    # Filter by team
    c9_matches = get_2026_matches_catalog(team="Cloud9")
    assert len(c9_matches) >= 10
    assert all("Cloud9" in (m["team1"], m["team2"]) for m in c9_matches)

    # Filter by event
    kickoff = get_2026_matches_catalog(event="VCT Americas 2026 Kickoff")
    assert len(kickoff) >= 3
    assert all("Kickoff" in m["event"]["name"] for m in kickoff)

    # Filter by date range
    early_season = get_2026_matches_catalog(start_date="2026-02-01", end_date="2026-03-31")
    assert len(early_season) >= 4


def test_cloud9_only_in_vct_americas():
    catalog = get_2026_matches_catalog()
    for item in catalog:
        team1 = item.get("team1") or item.get("team1_name", "")
        team2 = item.get("team2") or item.get("team2_name", "")
        event_name = item.get("event", {}).get("name") or item.get("event_name", "")
        if "cloud9" in team1.lower() or "cloud9" in team2.lower():
            assert "VCT Americas" in event_name, f"Cloud9 found in non-Americas event: {event_name}"
            assert "Masters" not in event_name, f"Cloud9 should not be in Masters: {event_name}"
            assert "Champions" not in event_name, f"Cloud9 should not be in Champions: {event_name}"


def test_tournaments_present_in_catalog():
    catalog = get_2026_matches_catalog()
    events = {item.get("event", {}).get("name") or item.get("event_name", "") for item in catalog}
    assert any("Kickoff" in e for e in events), "Kickoff missing"
    assert any("Stage 1" in e for e in events), "Stage 1 missing"
    assert any("Stage 2" in e for e in events), "Stage 2 missing"
    assert any("Santiago" in e for e in events), "Santiago missing"
    assert any("London" in e for e in events), "London missing"
    assert any("Shanghai" in e for e in events), "Shanghai missing"


def test_all_matches_have_multiple_maps():
    catalog = get_2026_matches_catalog()
    for item in catalog:
        match_id = item["id"] if "id" in item else item["match_id"]
        details = get_2026_match_details(match_id)
        assert len(details.data.maps) >= 2, f"Match {match_id} has fewer than 2 maps"
        map_ids = [m.map_id for m in details.data.maps]
        assert map_ids[0] == "1"
        assert map_ids[1] == "2"


def test_distinct_logs_for_different_game_ids():
    match_id = "vlr-c9-loud-kickoff2026"
    logs_map1 = get_2026_match_logs(match_id, game_id="1")
    logs_map2 = get_2026_match_logs(match_id, game_id="2")

    assert logs_map1.data.game_id == "1"
    assert logs_map2.data.game_id == "2"
    assert logs_map1.data.map != logs_map2.data.map


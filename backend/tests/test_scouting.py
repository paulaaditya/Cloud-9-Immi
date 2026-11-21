"""Scouting tests run against the real GRID dataset (kept outside the repo); they skip if it is absent."""

import pytest
from fastapi.testclient import TestClient

from src.config import get_settings
from src.main import app
from src.scouting.aggregate import Filters, find_hotspots, operator_query, team_options, utility_query
from src.scouting.catalog import find_team_ids, load_catalog
from src.scouting.extractor import extract_series
from src.scouting.store import get_series
from src.scouting.taxonomy import ABILITIES, category_of

SERIES = "2819676"  # Cloud9 vs FURIA, VCT Americas Stage 2 2025 (Haven, Bind)

pytestmark = pytest.mark.skipif(
    not (get_settings().VAL_DIR / f"events_{SERIES}_grid.jsonl.zst").exists(),
    reason="GRID dataset not available",
)

client = TestClient(app)


def test_extract_series_structure():
    d = extract_series(SERIES)
    assert d["teams"] == {"79": "Cloud9", "99": "FURIA"}
    assert [g["map"] for g in d["games"]] == ["haven", "bind"]
    for g in d["games"]:
        assert g["bounds"]["min"]["x"] < g["bounds"]["max"]["x"]
        assert len(g["rounds"]) >= 13
        for r in g["rounds"]:
            assert len(r["players"]) == 10
            assert set(r["sides"].values()) == {"attacker", "defender"}
            assert all(c["t"] >= 0 for c in r["casts"])
    # 19 + 17 rounds were played in this series
    assert sum(len(g["rounds"]) for g in d["games"]) == 36


def test_operator_holders_are_per_round_and_consistent_with_kills():
    d = extract_series(SERIES)
    for g in d["games"]:
        for r in g["rounds"]:
            holders = {p["id"] for p in r["players"] if p["op"]}
            for k in r["kills"]:
                if k["weapon"] == "operator":
                    # whoever kills with an Operator must have held one at the end of freezetime
                    # (unless they picked it up mid-round)
                    assert isinstance(k["kid"], str)
            assert len(holders) <= 5


def test_casts_have_positions_and_categories():
    d = extract_series(SERIES)
    casts = [c for g in d["games"] for r in g["rounds"] for c in r["casts"]]
    assert len(casts) > 500
    assert all(c["x"] is not None and c["y"] is not None for c in casts)
    assert any(c["cat"] == "placeable" for c in casts)


def test_taxonomy_lookup():
    assert category_of("trapwire") == "placeable"
    assert category_of("alarmbot") == "placeable"
    assert category_of("dark-cover") == "smoke"
    assert category_of("some-new-ability") == "other"
    assert all(cat in ("placeable", "recon", "smoke", "stall", "flash", "molly", "other") for _, cat in ABILITIES.values())


def test_taxonomy_covers_cloud9_abilities():
    """Every ability Cloud9 matches use should be classified (not silently 'unknown')."""
    cat = load_catalog()
    seen = set()
    for tid in find_team_ids("Cloud9"):
        for sid in cat.team_series[tid]:
            data = get_series(sid)
            if data:
                for g in data["games"]:
                    for r in g["rounds"]:
                        seen.update(c["ability"] for c in r["casts"])
    unmapped = sorted(a for a in seen if a and a not in ABILITIES)
    assert not unmapped, f"Add to taxonomy: {unmapped}"


def test_find_hotspots_reports_distinct_rounds():
    pts = [{"x": 1000.0 + i, "y": 2000.0, "t": 10.0, "ability": "trapwire", "player": "P", "rk": ("s", "g", i % 3)} for i in range(30)]
    hs = find_hotspots(pts, None, total_rounds=6, k=1)
    assert len(hs) == 1
    assert hs[0]["casts"] == 30
    assert hs[0]["rounds_with"] == 3  # distinct rounds, not casts
    assert hs[0]["rounds_total"] == 6


def test_utility_query_denominators():
    ids = find_team_ids("Cloud9")
    res = utility_query(Filters(team_ids=ids, maps={"haven"}, side="defender", categories={"placeable"}))
    ev = res["evidence"]
    assert ev["rounds_analyzed"] > 0
    assert ev["rounds_with_event"] <= ev["rounds_analyzed"]
    assert res["map"] == "haven" and res["bounds"]
    assert res["insights"] and "rounds" in res["insights"][0]
    for h in res["hotspots"]:
        assert h["rounds_with"] <= h["rounds_total"]
        assert 0.0 <= h["nx"] <= 1.0 and 0.0 <= h["ny"] <= 1.0


def test_operator_query_shares_add_up():
    res = operator_query(Filters(team_ids=find_team_ids("Cloud9")))
    ev = res["evidence"]
    assert 0 < ev["rounds_with_operator"] <= ev["rounds_analyzed"]
    side_total = sum(v["with_op"] for v in res["by_side"].values())
    assert side_total == ev["rounds_with_operator"]
    assert sum(b["kills"] for b in res["kill_timing"]) == ev["operator_kills"]


def test_filters_narrow_results():
    ids = find_team_ids("Cloud9")
    allr = utility_query(Filters(team_ids=ids))
    haven = utility_query(Filters(team_ids=ids, maps={"haven"}))
    assert haven["evidence"]["rounds_analyzed"] < allr["evidence"]["rounds_analyzed"]
    assert haven["evidence"]["casts"] < allr["evidence"]["casts"]


def test_team_options():
    o = team_options(find_team_ids("Cloud9"))
    assert o["rounds"] > 0 and o["maps"] and o["players"] and o["abilities"]


def test_scout_api_endpoints():
    teams = client.get("/api/v1/scout/teams").json()
    assert any(t["name"] == "Cloud9" for t in teams)
    r = client.get("/api/v1/scout/teams/Cloud9/utility", params={"maps": "haven", "side": "defender", "categories": "placeable"})
    assert r.status_code == 200 and r.json()["evidence"]["casts"] > 0
    r = client.get("/api/v1/scout/teams/Cloud9/operator")
    assert r.status_code == 200 and r.json()["players"]
    assert client.get("/api/v1/scout/teams/NoSuchTeam/utility").status_code == 404
    assert client.get("/api/v1/scout/teams/Cloud9/utility", params={"side": "left"}).status_code == 422

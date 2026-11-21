"""Phase 2: site detection from plants and defensive setups."""

import numpy as np
import pytest
from fastapi.testclient import TestClient

from src.config import get_settings
from src.main import app
from src.scouting.aggregate import Filters
from src.scouting.catalog import find_team_ids
from src.scouting.setups import NeedsOneMap, defense_setups, pick_snapshot, setup_key, setup_label
from src.scouting.sites import kmeans, nearest_zone, site_centers_from_plants


def test_kmeans_separates_two_obvious_clusters_deterministically():
    rng = np.random.default_rng(1)
    pts = np.vstack([rng.normal([0, 0], 50, (40, 2)), rng.normal([5000, 0], 50, (40, 2))])
    c1, l1 = kmeans(pts, 2)
    c2, l2 = kmeans(pts, 2)
    assert np.array_equal(c1, c2) and np.array_equal(l1, l2)
    assert sorted(round(float(x) / 1000) for x in c1[:, 0]) == [0, 5]


def test_site_centers_are_numbered_left_to_right_and_need_enough_plants():
    plants = [(0.0 + i, 0.0) for i in range(20)] + [(5000.0 + i, 100.0) for i in range(20)]
    sites = site_centers_from_plants(plants, 2)
    assert [s["id"] for s in sites] == ["S1", "S2"] and sites[0]["x"] < sites[1]["x"]
    assert sum(s["plants"] for s in sites) == 40
    assert site_centers_from_plants(plants[:5], 2) == []


def test_nearest_zone_uses_radius_then_mid():
    sites = [{"id": "S1", "x": 0, "y": 0}, {"id": "S2", "x": 3000, "y": 0}]
    assert nearest_zone(500, 0, sites, 2200) == "S1"
    assert nearest_zone(2900, 100, sites, 2200) == "S2"
    assert nearest_zone(1500, 5000, sites, 2200) == "mid"


def test_pick_snapshot_prefers_the_closest_allowed_time():
    rnd = {"snaps": [{"k": 5, "t": 15.0, "p": {}}, {"k": 10, "t": 12.0, "p": {}}, {"k": 20, "t": 21.0, "p": {}}]}
    assert pick_snapshot(rnd, 15)["k"] == 10  # k=5 is not an allowed setup time
    assert pick_snapshot({"snaps": []}, 15) is None


def test_setup_key_and_label():
    sites = [{"id": "S1", "name": "Site 1"}, {"id": "S2", "name": "Site 2"}]
    counts = {"S2": 2, "S1": 2, "mid": 1}
    assert setup_key(counts, ["S1", "S2", "mid"]) == "S1:2|S2:2|mid:1"
    assert setup_label(counts, sites) == "2 Site 1 · 2 Site 2 · 1 mid / other"


SERIES = "2819676"
needs_data = pytest.mark.skipif(
    not (get_settings().VAL_DIR / f"events_{SERIES}_grid.jsonl.zst").is_file(),
    reason="GRID dataset not available",
)


@needs_data
def test_defense_setups_rounds_add_up_and_use_defender_rounds_only():
    f = Filters(team_ids=find_team_ids("Cloud9"), maps={"haven"})
    res = defense_setups(f)
    ev = res["evidence"]
    assert ev["rounds_with_setup"] == sum(s["rounds"] for s in res["setups"]) <= ev["rounds_analyzed"]
    assert res["filters"]["side"] == "defender"
    assert all(sum(s["counts"].values()) >= 4 for s in res["setups"])
    for sl in res["site_load"]:
        assert sum(r["rounds"] for r in sl["rows"]) == ev["rounds_with_setup"]


@needs_data
def test_defense_setups_needs_exactly_one_map():
    with pytest.raises(NeedsOneMap):
        defense_setups(Filters(team_ids=find_team_ids("Cloud9")))
    with pytest.raises(NeedsOneMap):
        defense_setups(Filters(team_ids=find_team_ids("Cloud9"), maps={"haven", "lotus"}))


@needs_data
def test_defense_endpoint():
    c = TestClient(app)
    ok = c.get("/api/v1/scout/teams/Cloud9/defense?maps=haven")
    assert ok.status_code == 200 and ok.json()["map"] == "haven" and ok.json()["sites"]
    assert c.get("/api/v1/scout/teams/Cloud9/defense?maps=haven,lotus").status_code == 422
    assert c.get("/api/v1/scout/teams/Cloud9/defense").status_code == 422
    assert c.get("/api/v1/scout/teams/Cloud9/defense?maps=haven&at=99").status_code == 422

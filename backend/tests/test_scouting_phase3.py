"""Phase 3: attack defaults and executes."""

import pytest
from fastapi.testclient import TestClient

from src.config import get_settings
from src.main import app
from src.scouting.aggregate import Filters
from src.scouting.attack import attack_profile, lean_key, lean_label, lean_of, pace_of, pick_snapshot
from src.scouting.catalog import find_team_ids
from src.scouting.setups import NeedsOneMap

SITES = [{"id": "S1", "name": "Site 1", "x": 0, "y": 0}, {"id": "S2", "name": "Site 2", "x": 5000, "y": 0}]


def test_pace_buckets():
    assert pace_of(30) == "early" and pace_of(40) == "early"
    assert pace_of(50) == "standard" and pace_of(65) == "standard"
    assert pace_of(66) == "late"


def test_lean_assigns_nearest_site_and_labels():
    assert lean_of(900, 0, SITES) == "S1" and lean_of(4000, 100, SITES) == "S2"
    assert lean_of(2500, 9000, SITES) == "mid"
    counts = {"S2": 2, "S1": 2, "mid": 1}
    assert lean_key(counts, ["S1", "S2"]) == "S1:2|S2:2|mid:1"
    assert lean_label(counts, SITES) == "2 toward Site 1 · 2 toward Site 2 · 1 uncommitted"


def test_pick_snapshot_only_uses_attack_times():
    rnd = {"snaps": [{"k": 10, "t": 30.0, "p": {}}, {"k": 45, "t": 44.0, "p": {}}, {"k": 30, "t": 33.0, "p": {}}]}
    assert pick_snapshot(rnd, 30)["k"] == 30
    assert pick_snapshot({"snaps": [{"k": 10, "t": 10.0, "p": {}}]}, 30) is None


SERIES = "2819676"
needs_data = pytest.mark.skipif(
    not (get_settings().VAL_DIR / f"events_{SERIES}_grid.jsonl.zst").is_file(),
    reason="GRID dataset not available",
)


@needs_data
def test_attack_profile_rounds_add_up_and_use_attack_rounds_only():
    res = attack_profile(Filters(team_ids=find_team_ids("Cloud9"), maps={"haven"}))
    ev = res["evidence"]
    assert res["filters"]["side"] == "attacker"
    assert sum(t["rounds"] for t in res["targets"]) == ev["rounds_planted"]
    assert ev["rounds_planted"] + res["no_plant"]["rounds"] == ev["rounds_analyzed"]
    assert sum(p["rounds"] for p in res["pace"]) == ev["rounds_planted"]
    assert sum(r["rounds"] for r in res["leans"]) == ev["rounds_with_lean"] <= ev["rounds_analyzed"]


@needs_data
def test_attack_needs_exactly_one_map():
    with pytest.raises(NeedsOneMap):
        attack_profile(Filters(team_ids=find_team_ids("Cloud9")))


@needs_data
def test_attack_endpoint():
    c = TestClient(app)
    ok = c.get("/api/v1/scout/teams/Cloud9/attack?maps=haven")
    assert ok.status_code == 200 and ok.json()["targets"]
    assert c.get("/api/v1/scout/teams/Cloud9/attack").status_code == 422
    assert c.get("/api/v1/scout/teams/Cloud9/attack?maps=haven&at=99").status_code == 422

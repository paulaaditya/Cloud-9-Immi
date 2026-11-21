"""Phase 1: buy-type classification, position snapshots, and the Operator split by buy."""

import pytest
from fastapi.testclient import TestClient

from src.config import get_settings
from src.main import app
from src.scouting.aggregate import Filters, operator_query
from src.scouting.buys import BUY_TYPES, buy_type
from src.scouting.catalog import find_team_ids
from src.scouting.extractor import SNAP_TIMES, SNAP_TOLERANCE, extract_series


def _rnd(n, loadouts, tid="T"):
    return {"n": n, "players": [{"tid": tid, "loadout": v} for v in loadouts]}


def test_buy_type_thresholds():
    assert buy_type(_rnd(1, [800] * 5), "T") == "pistol"
    assert buy_type(_rnd(13, [4000] * 5), "T") == "pistol"  # round 13 is a pistol round whatever the reading
    assert buy_type(_rnd(2, [400] * 5), "T") == "eco"
    assert buy_type(_rnd(2, [2400] * 5), "T") == "half"
    assert buy_type(_rnd(2, [4700] * 5), "T") == "full"
    assert buy_type(_rnd(25, [800] * 5), "T") == "eco"  # overtime has no pistol round
    assert buy_type(_rnd(3, [4700] * 5), "other") is None  # no loadouts for that team


def test_buy_type_needs_enough_players():
    assert buy_type(_rnd(3, [4700, 4700]), "T") is None


SERIES = "2819676"
needs_data = pytest.mark.skipif(
    not (get_settings().VAL_DIR / f"events_{SERIES}_grid.jsonl.zst").is_file(),
    reason="GRID dataset not available",
)


@pytest.fixture(scope="module")
def series():
    return extract_series(SERIES)


@needs_data
def test_snapshots_are_taken_near_their_targets_and_only_living_players(series):
    rounds = [r for g in series["games"] for r in g["rounds"]]
    assert any(r["snaps"] for r in rounds)
    for r in rounds:
        assert "_ns" not in r
        seen = set()
        for s in r["snaps"]:
            assert s["k"] in SNAP_TIMES and s["k"] not in seen
            seen.add(s["k"])
            assert 0 <= s["t"] - s["k"] <= SNAP_TOLERANCE
            # nobody killed before the snapshot is still shown on it
            dead = {k["vid"] for k in r["kills"] if k["t"] < s["t"]}
            assert not dead & set(s["p"])
            assert len(s["p"]) <= 10 - len(dead)


@needs_data
def test_operator_split_by_buy_adds_up_to_all_rounds():
    f = Filters(team_ids=find_team_ids("Cloud9"))
    res = operator_query(f)
    by_buy = {b["buy"]: b for b in res["by_buy"]}
    assert set(by_buy) <= set(BUY_TYPES) | {"unknown"}
    assert sum(b["rounds"] for b in by_buy.values()) == res["evidence"]["rounds_analyzed"]
    assert sum(b["with_op"] for b in by_buy.values()) == res["evidence"]["rounds_with_operator"]
    assert sum(b["op_kills"] for b in by_buy.values()) == res["evidence"]["operator_kills"]


@needs_data
def test_buys_filter_narrows_rounds_and_is_echoed():
    ids = find_team_ids("Cloud9")
    allr = operator_query(Filters(team_ids=ids))["evidence"]["rounds_analyzed"]
    eco = operator_query(Filters(team_ids=ids, buys={"eco"}))
    assert 0 < eco["evidence"]["rounds_analyzed"] < allr
    assert eco["filters"]["buys"] == ["eco"]
    assert [b["buy"] for b in eco["by_buy"]] == ["eco"]


@needs_data
def test_buys_query_param_validated():
    c = TestClient(app)
    assert c.get("/api/v1/scout/teams/Cloud9/operator?buys=full,eco").status_code == 200
    assert c.get("/api/v1/scout/teams/Cloud9/operator?buys=banana").status_code == 422
    assert c.get("/api/v1/scout/teams/Cloud9/utility?maps=haven&buys=pistol").status_code == 200

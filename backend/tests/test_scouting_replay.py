"""2D replay data."""

import pytest
from fastapi.testclient import TestClient

from src.config import get_settings
from src.main import app
from src.scouting.catalog import load_catalog
from src.scouting.replay import build_replay, game_duration, round_end

A, D = "att", "def"


def rnd(winner, kills=(), plant=None):
    return {"sides": {A: "attacker", D: "defender"}, "winner": winner, "plant": plant,
            "kills": [{"t": 10 + i, "vid": f"{vt}{i}", "vtid": vt} for i, vt in enumerate(kills)]}


def test_round_end_is_inferred_from_plant_winner_and_deaths():
    assert round_end(rnd(A, [D] * 5))["type"] == "elimination"
    assert round_end(rnd(A, [D] * 2, plant={"t": 40}))["type"] == "detonation"
    assert round_end(rnd(D, [A] * 5, plant={"t": 40}))["type"] == "elimination"
    assert round_end(rnd(D, [A] * 2, plant={"t": 40}))["type"] == "defuse"
    assert round_end(rnd(D, [A] * 2))["type"] == "time"
    assert round_end(rnd(D, [A] * 2))["inferred"] is True
    assert round_end(rnd(None))["type"] == "unknown"


def test_game_duration_uses_the_latest_event():
    r = rnd(A, [D], plant={"t": 50})
    assert game_duration(r, [{"t": 62.5, "p": {}}]) == 62.5
    assert game_duration({"kills": [], "plant": None}, []) == 0.0


SERIES = "2819676"
needs_data = pytest.mark.skipif(
    not (get_settings().VAL_DIR / f"events_{SERIES}_grid.jsonl.zst").is_file(),
    reason="GRID dataset not available",
)


@needs_data
def test_replay_has_dense_ordered_frames_for_every_round():
    gid = load_catalog().games[SERIES][0].game_id
    rep = build_replay(SERIES, gid)
    assert rep["map"] and rep["bounds"] and rep["rounds"]
    assert sum(1 for r in rep["rounds"] if len(r["frames"]) >= 15) >= len(rep["rounds"]) * 0.8
    for r in rep["rounds"]:
        ts = [f["t"] for f in r["frames"]]
        assert ts == sorted(ts) and all(len(r["players"]) == 10 for _ in [0])
        assert r["end"]["type"] in ("elimination", "detonation", "defuse", "time", "unknown")


@needs_data
def test_replay_endpoints():
    c = TestClient(app)
    gid = load_catalog().games[SERIES][0].game_id
    ok = c.get(f"/api/v1/scout/series/{SERIES}/games/{gid}/replay")
    assert ok.status_code == 200 and ok.json()["rounds"]
    assert c.get(f"/api/v1/scout/series/{SERIES}/games/nope/replay").status_code == 404
    lst = c.get("/api/v1/scout/teams/Cloud9/series?limit=5")
    assert lst.status_code == 200 and lst.json() and lst.json()[0]["games"]

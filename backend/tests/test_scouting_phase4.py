"""Phase 4: counter-card."""

import pytest
from fastapi.testclient import TestClient

from src.config import get_settings
from src.main import app
from src.scouting.aggregate import Filters
from src.scouting.card import build_card
from src.scouting.catalog import find_team_ids
from src.scouting.setups import NeedsOneMap

SERIES = "2819676"
needs_data = pytest.mark.skipif(
    not (get_settings().VAL_DIR / f"events_{SERIES}_grid.jsonl.zst").is_file(),
    reason="GRID dataset not available",
)


@needs_data
def test_card_has_three_sections_and_caveats():
    card = build_card(Filters(team_ids=find_team_ids("Cloud9"), maps={"haven"}), "Cloud9")
    assert card["team"] == "Cloud9" and card["map"] == "haven"
    assert [s["title"] for s in card["sections"]] == [
        "Attacking them (their defense)",
        "Defending against them (their attack)",
        "Their Operator",
    ]
    assert all(s["confidence"] in ("high", "medium", "low") for s in card["sections"])
    assert card["caveats"] and card["sites"]


@needs_data
def test_card_needs_exactly_one_map():
    with pytest.raises(NeedsOneMap):
        build_card(Filters(team_ids=find_team_ids("Cloud9")), "Cloud9")


@needs_data
def test_card_endpoint():
    c = TestClient(app)
    ok = c.get("/api/v1/scout/teams/Cloud9/card?maps=lotus")
    assert ok.status_code == 200 and ok.json()["team"].startswith("Cloud9")
    assert c.get("/api/v1/scout/teams/Cloud9/card").status_code == 422
    assert c.get("/api/v1/scout/teams/Cloud9/card?maps=haven,lotus").status_code == 422

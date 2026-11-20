"""Timeout advisor and the optional Gemini layer."""

import json

import httpx
import pytest
from fastapi.testclient import TestClient

from src.ai import gemini
from src.config import get_settings
from src.main import app
from src.scouting.aggregate import Filters
from src.scouting.catalog import find_team_ids
from src.scouting.setups import NeedsOneMap
from src.scouting.timeout import normalise_site, situation_of, streak_before, timeout_advice


def test_streak_before_counts_the_run_going_into_a_round():
    game = {"rounds": [{"n": i, "winner": w} for i, w in enumerate(["A", "B", "B", "B", "A"], start=1)]}
    assert streak_before(game, 5, "B") == 3 and streak_before(game, 5, "A") == -3
    assert streak_before(game, 2, "A") == 1 and streak_before(game, 1, "A") == 0
    assert streak_before(game, 6, "A") == 1


def test_situation_buckets_and_site_names():
    assert [situation_of(s) for s in (-3, -2, -1, 0, 1, 2, 4)] == ["behind", "behind", "even", "even", "even", "ahead", "ahead"]
    assert normalise_site("s3") == "Site 3" and normalise_site("Site 2") == "Site 2" and normalise_site("x") == ""


FACTS = {
    "map": "lotus", "opp_side": "attacker", "situation_text": "overall", "facts": ["155 attacking rounds overall: attack won 49.7%."],
    "adjustments": [{"kind": "site", "text": "Expect Site 3: 35.5% of their plants.", "rounds": 55, "confidence": "high"}],
}


def test_validate_rejects_numbers_that_are_not_in_the_facts():
    facts = gemini.build_facts(FACTS)
    assert gemini.validate({"call": "Expect Site 3, 35.5% of plants.", "priorities": ["Hold Site 3"]}, facts)
    assert gemini.validate({"call": "They win 80% there.", "priorities": []}, facts) is None
    assert gemini.validate({"call": 3}, facts) is None


def _settings(monkeypatch, key):
    s = get_settings()
    monkeypatch.setattr(s, "GEMINI_API_KEY", key)
    return s


def test_gemini_is_off_without_a_key(monkeypatch):
    _settings(monkeypatch, None)
    assert gemini.gemini_call(FACTS)["available"] is False


def test_gemini_call_uses_the_key_header_and_returns_checked_text(monkeypatch):
    _settings(monkeypatch, "test-key")
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["key"] = request.headers.get("x-goog-api-key")
        seen["body"] = json.loads(request.content)
        answer = {"call": "Expect Site 3, 35.5% of plants.", "priorities": ["Hold Site 3"]}
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": json.dumps(answer)}]}}]})

    out = gemini.gemini_call(FACTS, transport=httpx.MockTransport(handler))
    assert out["available"] and out["call"].startswith("Expect Site 3") and seen["key"] == "test-key"
    assert "35.5%" in seen["body"]["contents"][0]["parts"][0]["text"]


def test_gemini_failures_and_invented_numbers_never_raise(monkeypatch):
    _settings(monkeypatch, "test-key")
    bad = httpx.MockTransport(lambda r: httpx.Response(500))
    assert gemini.gemini_call(FACTS, transport=bad)["available"] is False
    invented = {"call": "They win 91% there.", "priorities": []}
    ok = httpx.MockTransport(lambda r: httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": json.dumps(invented)}]}}]}))
    out = gemini.gemini_call(FACTS, transport=ok)
    assert out["available"] is False and "rejected" in out["reason"]


SERIES = "2819676"
needs_data = pytest.mark.skipif(
    not (get_settings().VAL_DIR / f"events_{SERIES}_grid.jsonl.zst").is_file(),
    reason="GRID dataset not available",
)


@needs_data
@pytest.mark.parametrize("side", ["attacker", "defender"])
def test_advice_has_at_most_three_adjustments_with_rounds(side):
    adv = timeout_advice(Filters(team_ids=find_team_ids("Cloud9"), maps={"lotus"}), side, streak=-2, observed_sites=["S3", "S3", "S3", "S1"])
    assert adv["situation"] == "behind" and len(adv["adjustments"]) <= 3
    assert all(a["rounds"] > 0 and a["confidence"] in ("high", "medium", "low") for a in adv["adjustments"])
    assert adv["facts"] and adv["caveats"]


@needs_data
def test_advice_needs_one_map():
    with pytest.raises(NeedsOneMap):
        timeout_advice(Filters(team_ids=find_team_ids("Cloud9")), "attacker")


@needs_data
def test_timeout_endpoint():
    c = TestClient(app)
    ok = c.get("/api/v1/scout/teams/Cloud9/timeout?maps=lotus&side=attacker&streak=-2&observed=S3,S3,S3")
    assert ok.status_code == 200 and ok.json()["situation"] == "behind" and "ai" not in ok.json()
    assert c.get("/api/v1/scout/teams/Cloud9/timeout?maps=lotus&side=nope").status_code == 422
    assert c.get("/api/v1/scout/teams/Cloud9/timeout?side=attacker").status_code == 422

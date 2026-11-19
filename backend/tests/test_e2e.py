import pytest
from src.data.parser import parse_series
from src.analytics.mistake_detector import detect_round_mistakes
from src.coaching.report_card import build_player_report_cards
from src.coaching.prescription import generate_prescribed_drills


def test_full_pipeline_on_vct_series():
    """
    End-to-end integration test validating the entire C9 Oracle pipeline
    on official VCT match telemetry (series 2748743).
    """
    # 1. Parse series envelopes (zstd stream -> game state accumulator -> 3D ability join)
    parsed = parse_series("2748743", max_envelopes=1500)
    assert parsed is not None
    assert parsed.series_id == "2748743"
    assert len(parsed.games) > 0

    game = parsed.games[0]
    assert len(game.rounds) > 0

    # 2. Extract mistakes across all games and rounds
    mistakes = []
    for g in parsed.games:
        for r in g.rounds:
            mistakes.extend(detect_round_mistakes(r))

    assert len(mistakes) > 0

    # Verify mistake structure and bounds
    for m in mistakes:
        assert m.player_id != ""
        assert m.round_number >= 1
        assert m.win_prob_delta <= 0.0
        assert m.description != ""
        assert m.coaching_fix != ""

    # 3. Generate player report cards
    cards = build_player_report_cards(mistakes)
    assert len(cards) > 0
    for card in cards:
        assert card.player_id != ""
        assert card.mistake_count > 0
        assert card.cumulative_xrw_tax <= 0.0
        assert card.primary_vulnerability in {
            "UNTRADED_FIRST_DEATH",
            "ISOLATED_DUEL",
            "UTILITY_DELAY",
        }
        assert len(card.actionable_summary) > 0

    # 4. Generate prescribed drills
    drills = generate_prescribed_drills(mistakes)
    assert len(drills) > 0
    for drill in drills:
        assert drill.drill_name != ""
        assert len(drill.target_players) > 0
        assert drill.drill_objective != ""
        assert len(drill.setup_steps) > 0
        assert drill.success_criterion != ""

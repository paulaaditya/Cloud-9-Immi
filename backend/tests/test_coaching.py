import pytest
from src.analytics.mistake_detector import AttributedMistake
import src.coaching as coaching
from src.coaching.report_card import PlayerReportCard, build_player_report_cards
from src.coaching.prescription import PrescribedDrill, generate_prescribed_drills


def test_package_exports():
    assert hasattr(coaching, "PlayerReportCard")
    assert hasattr(coaching, "build_player_report_cards")
    assert hasattr(coaching, "PrescribedDrill")
    assert hasattr(coaching, "generate_prescribed_drills")


def test_builds_player_report_cards():
    # Setup mistakes for two players
    m1 = AttributedMistake(
        mistake_type="UNTRADED_FIRST_DEATH",
        player_id="player_alpha",
        round_number=1,
        occurred_at="2025-01-16T22:15:10.000Z",
        win_prob_delta=-0.21,
        description="Untraded opening death.",
        coaching_fix="Establish buddy-system spacing (< 6 meters).",
    )
    m2 = AttributedMistake(
        mistake_type="UNTRADED_FIRST_DEATH",
        player_id="player_alpha",
        round_number=3,
        occurred_at="2025-01-16T22:18:10.000Z",
        win_prob_delta=-0.19,
        description="Untraded opening death.",
        coaching_fix="Establish buddy-system spacing (< 6 meters).",
    )
    m3 = AttributedMistake(
        mistake_type="ISOLATED_DUEL",
        player_id="player_beta",
        round_number=2,
        occurred_at="2025-01-16T22:16:30.000Z",
        win_prob_delta=-0.15,
        description="Overextended solo peek.",
        coaching_fix="Hold crossfire angles with teammates.",
    )

    cards = build_player_report_cards([m1, m2, m3])

    assert len(cards) == 2

    # player_alpha has cumulative loss of -0.400, player_beta has -0.150
    # Ascending sort puts highest loss (-0.400) first
    alpha_card = cards[0]
    assert alpha_card.player_id == "player_alpha"
    assert alpha_card.mistake_count == 2
    assert alpha_card.cumulative_xrw_tax == -0.4
    assert alpha_card.primary_vulnerability == "UNTRADED_FIRST_DEATH"
    assert "player_alpha" in alpha_card.actionable_summary
    assert "spacing" in alpha_card.actionable_summary.lower()

    beta_card = cards[1]
    assert beta_card.player_id == "player_beta"
    assert beta_card.mistake_count == 1
    assert beta_card.cumulative_xrw_tax == -0.15
    assert beta_card.primary_vulnerability == "ISOLATED_DUEL"
    assert len(beta_card.actionable_summary) > 0


def test_builds_player_report_cards_multiple_players_ordering():
    # Verify sorting with 3 players
    m_alpha = AttributedMistake(
        mistake_type="UNTRADED_FIRST_DEATH",
        player_id="player_alpha",
        round_number=1,
        occurred_at="2025-01-16T22:15:10.000Z",
        win_prob_delta=-0.10,
        description="Opening death",
        coaching_fix="Trade spacing",
    )
    m_beta = AttributedMistake(
        mistake_type="UNTRADED_FIRST_DEATH",
        player_id="player_beta",
        round_number=2,
        occurred_at="2025-01-16T22:16:10.000Z",
        win_prob_delta=-0.50,
        description="Opening death",
        coaching_fix="Trade spacing",
    )
    m_gamma = AttributedMistake(
        mistake_type="ISOLATED_DUEL",
        player_id="player_gamma",
        round_number=3,
        occurred_at="2025-01-16T22:17:10.000Z",
        win_prob_delta=-0.25,
        description="Solo duel",
        coaching_fix="Crossfire",
    )

    cards = build_player_report_cards([m_alpha, m_beta, m_gamma])
    assert len(cards) == 3
    # Ordered ascending by tax (most negative to least negative)
    assert cards[0].player_id == "player_beta"
    assert cards[0].cumulative_xrw_tax == -0.50
    assert cards[1].player_id == "player_gamma"
    assert cards[1].cumulative_xrw_tax == -0.25
    assert cards[2].player_id == "player_alpha"
    assert cards[2].cumulative_xrw_tax == -0.10


def test_builds_player_report_cards_empty():
    cards = build_player_report_cards([])
    assert cards == []


def test_generates_prescribed_drills():
    m1 = AttributedMistake(
        mistake_type="UNTRADED_FIRST_DEATH",
        player_id="player_alpha",
        round_number=1,
        occurred_at="2025-01-16T22:15:10.000Z",
        win_prob_delta=-0.21,
        description="Untraded opening death.",
        coaching_fix="Establish buddy-system spacing (< 6 meters).",
    )
    m2 = AttributedMistake(
        mistake_type="UNTRADED_FIRST_DEATH",
        player_id="player_gamma",
        round_number=5,
        occurred_at="2025-01-16T22:25:00.000Z",
        win_prob_delta=-0.22,
        description="Untraded opening death.",
        coaching_fix="Establish buddy-system spacing (< 6 meters).",
    )

    drills = generate_prescribed_drills([m1, m2])

    assert len(drills) >= 1
    drill = drills[0]
    assert isinstance(drill, PrescribedDrill)
    assert "Buddy-System" in drill.drill_name or "Trade" in drill.drill_name
    assert "player_alpha" in drill.target_players
    assert "player_gamma" in drill.target_players
    assert len(drill.drill_objective) > 0
    assert len(drill.setup_steps) >= 2
    assert len(drill.success_criterion) > 0


def test_generates_prescribed_drills_multiple_types():
    m1 = AttributedMistake(
        mistake_type="ISOLATED_DUEL",
        player_id="player_1",
        round_number=1,
        occurred_at="2025-01-16T22:15:10.000Z",
        win_prob_delta=-0.15,
        description="Solo peek",
        coaching_fix="Hold angle",
    )
    m2 = AttributedMistake(
        mistake_type="UTILITY_DELAY",
        player_id="player_2",
        round_number=2,
        occurred_at="2025-01-16T22:16:10.000Z",
        win_prob_delta=-0.12,
        description="Late utility",
        coaching_fix="Flash earlier",
    )
    m3 = AttributedMistake(
        mistake_type="CUSTOM_ERROR_TYPE",
        player_id="player_3",
        round_number=3,
        occurred_at="2025-01-16T22:17:10.000Z",
        win_prob_delta=-0.08,
        description="Custom mistake",
        coaching_fix="Review VOD",
    )

    drills = generate_prescribed_drills([m1, m2, m3])
    assert len(drills) == 3
    drill_names = [d.drill_name for d in drills]
    assert any("Crossfire" in name for name in drill_names)
    assert any("Utility" in name for name in drill_names)
    assert any("Custom Error Type" in name for name in drill_names)


def test_generates_prescribed_drills_empty():
    drills = generate_prescribed_drills([])
    assert drills == []

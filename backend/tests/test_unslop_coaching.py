import pytest
from src.analytics.mistake_detector import detect_round_mistakes, AttributedMistake
from src.coaching.report_card import build_player_report_cards, PlayerReportCard
from src.coaching.prescription import generate_prescribed_drills, PrescribedDrill
from src.models.match_state import ParsedRound, KillEvent


def test_humanized_mistake_description_and_fix():
    # Setup round with real player ID (306 = Derrek from EG)
    round_obj = ParsedRound(round_number=1)
    round_obj.kills.append(
        KillEvent(
            event_id="k-1",
            killer_id="3301",  # v1nNy
            victim_id="306",   # Derrek
            killer_name="v1nNy",
            victim_name="Derrek",
            occurred_at="2025-01-16T22:15:10.000Z",
            is_first_blood=True,
        )
    )
    # Late kill 15 seconds later (untraded)
    round_obj.kills.append(
        KillEvent(
            event_id="k-2",
            killer_id="3301",
            victim_id="303",   # NaturE
            killer_name="v1nNy",
            victim_name="NaturE",
            occurred_at="2025-01-16T22:15:25.000Z",
            is_first_blood=False,
        )
    )

    mistakes = detect_round_mistakes(round_obj, series_id="2748743")
    assert len(mistakes) == 1
    m = mistakes[0]

    # Verify real player tag resolution
    assert m.player_id == "306"
    assert m.player_name == "Derrek"

    # Verify unslop, punchy coaching debrief
    assert "Derrek" in m.description
    assert "dry-peeking" in m.description or "dry-peek" in m.description
    assert "4v5" in m.description

    # Verify actionable tactical coaching fix
    assert "crossfire" in m.coaching_fix.lower()
    assert "choke" in m.coaching_fix.lower() or "spacing" in m.coaching_fix.lower()


def test_player_report_card_resolves_player_name():
    m = AttributedMistake(
        mistake_type="UNTRADED_FIRST_DEATH",
        player_id="10636",  # OXY from C9
        player_name="OXY",
        character_name="raze",
        round_number=3,
        occurred_at="2025-01-18T01:10:00.000Z",
        win_prob_delta=-0.28,
        description="OXY died dry-peeking early with zero support flash or drone. Left team in a 4v5 disadvantage.",
        coaching_fix="Hold crossfire angle with your teammate. Maintain buddy spacing and do not swing until initiator utility clears the choke.",
    )

    cards = build_player_report_cards([m])
    assert len(cards) == 1
    card = cards[0]

    assert card.player_id == "10636"
    assert card.player_name == "OXY"
    assert card.character_name == "raze"
    assert card.mistake_count == 1
    assert card.cumulative_xrw_tax == -0.28
    assert "OXY" in card.actionable_summary


def test_prescribed_drills_includes_target_player_names():
    m = AttributedMistake(
        mistake_type="UNTRADED_FIRST_DEATH",
        player_id="10636",  # OXY
        player_name="OXY",
        round_number=2,
        occurred_at="2025-01-18T01:05:00.000Z",
        win_prob_delta=-0.25,
        description="OXY died dry-peeking early.",
        coaching_fix="Hold crossfire angle with your teammate.",
    )

    drills = generate_prescribed_drills([m])
    assert len(drills) >= 1
    d = drills[0]

    assert "10636" in d.target_players
    assert "OXY" in d.target_player_names
    assert len(d.setup_steps) >= 2
    assert len(d.success_criterion) > 0

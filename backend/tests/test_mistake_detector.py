import pytest
from src.models.match_state import ParsedRound, KillEvent, Vector3D
from src.analytics.spatial_math import euclidean_distance_3d, is_within_trade_distance
from src.analytics.mistake_detector import detect_round_mistakes, AttributedMistake


def test_detects_untraded_first_death():
    # Setup round with opening kill untraded past 3.0s window
    r = ParsedRound(round_number=1)
    r.kills.append(
        KillEvent(
            event_id="k1",
            killer_id="player_enemy",
            victim_id="player_victim",
            occurred_at="2025-01-16T22:15:10.000Z",
            is_first_blood=True,
        )
    )
    r.kills.append(
        KillEvent(
            event_id="k2",
            killer_id="player_enemy",
            victim_id="player_teammate",
            occurred_at="2025-01-16T22:15:20.000Z",  # 10s later, not a trade
            is_first_blood=False,
        )
    )
    mistakes = detect_round_mistakes(r)
    untraded = [m for m in mistakes if m.mistake_type == "UNTRADED_FIRST_DEATH"]
    assert len(untraded) == 1
    m = untraded[0]
    assert m.player_id == "player_victim"
    assert m.win_prob_delta < -0.15  # Lost over 15% round win probability
    assert "re-peek" in m.coaching_fix.lower() or "spacing" in m.coaching_fix.lower()


def test_traded_kill_does_not_flag_untraded():
    r = ParsedRound(round_number=2)
    # Opening kill
    r.kills.append(
        KillEvent(
            event_id="k1",
            killer_id="player_enemy",
            victim_id="player_c9",
            occurred_at="2025-01-16T22:15:10.000Z",
            is_first_blood=True,
        )
    )
    # Trade within 1.2 seconds
    r.kills.append(
        KillEvent(
            event_id="k2",
            killer_id="player_c9_trader",
            victim_id="player_enemy",
            occurred_at="2025-01-16T22:15:11.200Z",
            is_first_blood=False,
        )
    )
    mistakes = detect_round_mistakes(r)
    untraded = [m for m in mistakes if m.mistake_type == "UNTRADED_FIRST_DEATH"]
    assert len(untraded) == 0


def test_spatial_math_distance():
    p1 = Vector3D(x=0.0, y=0.0, z=0.0)
    p2 = Vector3D(x=300.0, y=400.0, z=0.0)
    dist = euclidean_distance_3d(p1, p2)
    assert dist is not None
    assert pytest.approx(dist, 0.001) == 500.0

    p3 = Vector3D(x=1.0, y=2.0, z=3.0)
    p4 = Vector3D(x=4.0, y=6.0, z=3.0)
    assert pytest.approx(euclidean_distance_3d(p3, p4), 0.001) == 5.0

    # None handling
    assert euclidean_distance_3d(None, p1) is None
    assert euclidean_distance_3d(p1, None) is None
    assert euclidean_distance_3d(None, None) is None

    # Trade distance check
    # 500.0 is <= 800.0
    assert is_within_trade_distance(p1, p2, max_units=800.0) is True
    # 500.0 is > 400.0
    assert is_within_trade_distance(p1, p2, max_units=400.0) is False

    # Exact boundary
    p_edge = Vector3D(x=800.0, y=0.0, z=0.0)
    assert is_within_trade_distance(p1, p_edge, max_units=800.0) is True

    # Missing coordinates defaults to True
    assert is_within_trade_distance(None, p1) is True
    assert is_within_trade_distance(p1, None) is True
    assert is_within_trade_distance(None, None) is True

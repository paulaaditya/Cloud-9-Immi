import pytest
from src.models.match_state import KillEvent, ParsedRound
from src.models.vlr_models import VLRPlayerStat
from src.analytics.xrw_model import calculate_xrw
from src.analytics.vlr_mistake_detector import detect_vlr_round_mistakes


def test_detect_untraded_first_death_in_vlr_round():
    round_data = ParsedRound(
        round_number=1,
        winning_team_id="NRG",
        kills=[
            KillEvent(
                event_id="k1",
                killer_id="crashies",
                victim_id="OXY",
                killer_name="crashies",
                victim_name="OXY",
                weapon="Ghost",
                occurred_at="00:0:15",
                is_first_blood=True,
            ),
            # Next kill occurs 15 seconds later (well beyond 3.5s window), untraded
            KillEvent(
                event_id="k2",
                killer_id="crashies",
                victim_id="vanity",
                killer_name="crashies",
                victim_name="vanity",
                weapon="Ghost",
                occurred_at="00:0:30",
                is_first_blood=False,
            ),
        ],
    )
    stats = {
        "OXY": VLRPlayerStat(
            player="OXY",
            team="Cloud9",
            agent="Jett",
            k=15,
            d=14,
            a=3,
            acs=240,
            fk=1,
            fd=4,
        )
    }
    mistakes = detect_vlr_round_mistakes(
        round_data, player_stats=stats, target_team="Cloud9"
    )
    assert len(mistakes) == 1
    m = mistakes[0]
    assert m.player_id == "OXY"
    assert m.player_name == "OXY"
    assert m.character_name == "Jett"
    assert m.team_name == "Cloud9"
    assert m.round_number == 1
    assert m.mistake_type == "UNTRADED_FIRST_DEATH"
    assert m.win_prob_delta < -0.15
    assert "rely on trade support" in m.coaching_fix.lower()
    assert "untraded opening casualty by oxy to crashies" in m.description.lower()


def test_traded_opening_kill_no_mistake():
    # Victim eliminated, but teammate trades killer within 3.5 seconds
    round_data = ParsedRound(
        round_number=2,
        winning_team_id="Cloud9",
        kills=[
            KillEvent(
                event_id="k1",
                killer_id="crashies",
                victim_id="OXY",
                killer_name="crashies",
                victim_name="OXY",
                weapon="Vandal",
                occurred_at="00:0:20",
                is_first_blood=True,
            ),
            # Teammate vanity trades crashies 2.0 seconds later (within 3.5s window)
            KillEvent(
                event_id="k2",
                killer_id="vanity",
                victim_id="crashies",
                killer_name="vanity",
                victim_name="crashies",
                weapon="Phantom",
                occurred_at="00:0:22",
                is_first_blood=False,
            ),
        ],
    )
    stats = {
        "OXY": VLRPlayerStat(
            player="OXY", team="Cloud9", agent="Jett", k=12, d=10, a=2, acs=220
        ),
        "vanity": VLRPlayerStat(
            player="vanity", team="Cloud9", agent="Omen", k=10, d=8, a=6, acs=180
        ),
        "crashies": VLRPlayerStat(
            player="crashies", team="NRG", agent="Sova", k=8, d=11, a=4, acs=170
        ),
    }
    mistakes = detect_vlr_round_mistakes(
        round_data, player_stats=stats, target_team="Cloud9"
    )
    assert len(mistakes) == 0


def test_target_team_filtering():
    # Opening death is an NRG player, target team is Cloud9
    round_data = ParsedRound(
        round_number=3,
        winning_team_id="Cloud9",
        kills=[
            KillEvent(
                event_id="k1",
                killer_id="OXY",
                victim_id="crashies",
                killer_name="OXY",
                victim_name="crashies",
                weapon="Vandal",
                occurred_at="00:0:18",
                is_first_blood=True,
            ),
        ],
    )
    stats = {
        "OXY": VLRPlayerStat(player="OXY", team="Cloud9", agent="Jett", k=15, d=10),
        "crashies": VLRPlayerStat(
            player="crashies", team="NRG", agent="Sova", k=8, d=11
        ),
    }
    # When filtering for Cloud9, NRG opening death should not be attributed as a Cloud9 mistake
    c9_mistakes = detect_vlr_round_mistakes(
        round_data, player_stats=stats, target_team="Cloud9"
    )
    assert len(c9_mistakes) == 0

    # When filtering for NRG, the mistake should be attributed to crashies
    nrg_mistakes = detect_vlr_round_mistakes(
        round_data, player_stats=stats, target_team="NRG"
    )
    assert len(nrg_mistakes) == 1
    assert nrg_mistakes[0].player_id == "crashies"
    assert nrg_mistakes[0].team_name == "NRG"


def test_xrw_delta_calculation():
    # Verify xRW delta is correctly computed via calculate_xrw and is < -0.15
    round_data = ParsedRound(
        round_number=4,
        winning_team_id="NRG",
        kills=[
            KillEvent(
                event_id="k1",
                killer_id="crashies",
                victim_id="OXY",
                killer_name="crashies",
                victim_name="OXY",
                weapon="Sheriff",
                occurred_at="00:0:12",
                is_first_blood=True,
            ),
        ],
    )
    stats = {
        "OXY": VLRPlayerStat(player="OXY", team="Cloud9", agent="Jett"),
    }
    mistakes = detect_vlr_round_mistakes(
        round_data, player_stats=stats, target_team="Cloud9"
    )
    assert len(mistakes) == 1
    m = mistakes[0]

    # Calculate expected xRW values
    xrw_before = calculate_xrw(5, 5, spike_planted=False, round_time_remaining=80.0)
    xrw_after = calculate_xrw(4, 5, spike_planted=False, round_time_remaining=80.0)
    expected_delta = round(xrw_after - xrw_before, 3)

    assert m.win_prob_delta == expected_delta
    assert m.win_prob_delta < -0.15


def test_coaching_fix_and_description_generation():
    # Check that role-specific agent coaching fix and detailed description are properly generated
    round_data = ParsedRound(
        round_number=5,
        winning_team_id="NRG",
        kills=[
            KillEvent(
                event_id="k1",
                killer_id="Victor",
                victim_id="Xeppaa",
                killer_name="Victor",
                victim_name="Xeppaa",
                weapon="Vandal",
                occurred_at="00:0:25",
                is_first_blood=True,
            ),
        ],
    )
    stats = {
        "Xeppaa": VLRPlayerStat(player="Xeppaa", team="Cloud9", agent="Fade"),
        "Victor": VLRPlayerStat(player="Victor", team="NRG", agent="Killjoy"),
    }
    mistakes = detect_vlr_round_mistakes(
        round_data, player_stats=stats, target_team="Cloud9"
    )
    assert len(mistakes) == 1
    m = mistakes[0]
    assert m.player_id == "Xeppaa"
    assert m.character_name == "Fade"
    assert "Xeppaa" in m.description
    assert "Victor" in m.description
    assert "Vandal" in m.description
    assert "3.5s" in m.description
    assert "rely on trade support" in m.coaching_fix.lower()

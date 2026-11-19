import pytest
from src.analytics.xrw_model import ExpectedRoundWinModel, RoundStateVector


def test_xrw_even_state():
    model = ExpectedRoundWinModel()
    state = RoundStateVector(
        alive_friendly=5,
        alive_enemy=5,
        loadout_diff=0.0,
        spike_planted=False,
        seconds_remaining=75.0,
    )
    prob = model.predict_probability(state)
    assert 0.45 <= prob <= 0.55


def test_xrw_man_advantage_impact():
    model = ExpectedRoundWinModel()
    even_state = RoundStateVector(
        alive_friendly=5,
        alive_enemy=5,
        loadout_diff=0.0,
        spike_planted=False,
        seconds_remaining=75.0,
    )
    five_v_four = RoundStateVector(
        alive_friendly=5,
        alive_enemy=4,
        loadout_diff=0.0,
        spike_planted=False,
        seconds_remaining=70.0,
    )
    four_v_five = RoundStateVector(
        alive_friendly=4,
        alive_enemy=5,
        loadout_diff=0.0,
        spike_planted=False,
        seconds_remaining=70.0,
    )

    p_even = model.predict_probability(even_state)
    p_adv = model.predict_probability(five_v_four)
    p_disadv = model.predict_probability(four_v_five)

    assert p_adv > p_even
    assert p_disadv < p_even
    assert (p_even - p_disadv) > 0.15


def test_xrw_spike_plant_impact():
    model = ExpectedRoundWinModel()
    pre_plant = RoundStateVector(
        alive_friendly=3,
        alive_enemy=3,
        loadout_diff=0.0,
        spike_planted=False,
        seconds_remaining=40.0,
    )
    post_plant = RoundStateVector(
        alive_friendly=3,
        alive_enemy=3,
        loadout_diff=0.0,
        spike_planted=True,
        seconds_remaining=40.0,
    )
    assert model.predict_probability(post_plant) > model.predict_probability(pre_plant)


def test_xrw_boundary_conditions():
    model = ExpectedRoundWinModel()
    dead_friendly = RoundStateVector(
        alive_friendly=0,
        alive_enemy=3,
        loadout_diff=0.0,
        spike_planted=True,
        seconds_remaining=30.0,
    )
    assert model.predict_probability(dead_friendly) == 0.0

    negative_friendly = RoundStateVector(
        alive_friendly=-1,
        alive_enemy=3,
        loadout_diff=0.0,
        spike_planted=False,
        seconds_remaining=30.0,
    )
    assert model.predict_probability(negative_friendly) == 0.0

    dead_enemy = RoundStateVector(
        alive_friendly=3,
        alive_enemy=0,
        loadout_diff=0.0,
        spike_planted=False,
        seconds_remaining=30.0,
    )
    assert model.predict_probability(dead_enemy) == 1.0

    negative_enemy = RoundStateVector(
        alive_friendly=2,
        alive_enemy=-1,
        loadout_diff=0.0,
        spike_planted=False,
        seconds_remaining=30.0,
    )
    assert model.predict_probability(negative_enemy) == 1.0

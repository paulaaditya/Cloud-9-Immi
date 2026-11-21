import numpy as np
from pydantic import BaseModel


class RoundStateVector(BaseModel):
    alive_friendly: int
    alive_enemy: int
    loadout_diff: float = 0.0
    spike_planted: bool = False
    seconds_remaining: float = 100.0


class ExpectedRoundWinModel:
    """
    Calibrated logistic regression model for Expected Round Win (xRW).
    Weights represent log-odds contributions fitted against VCT Americas 2025/2026 data.
    """

    def __init__(self, intercept: float = 0.408):
        self.w_man_diff: float = 0.88
        self.w_spike: float = 0.72
        self.w_loadout: float = 0.00008
        self.w_time_decay: float = -0.012
        self.intercept: float = intercept

    def predict_probability(self, state: RoundStateVector) -> float:
        if state.alive_friendly <= 0:
            return 0.0
        if state.alive_enemy <= 0:
            return 1.0

        man_diff = state.alive_friendly - state.alive_enemy
        spike_val = 1.0 if state.spike_planted else -0.15

        # Logit calculation
        logit = (
            self.intercept
            + (man_diff * self.w_man_diff)
            + (spike_val * self.w_spike)
            + (state.loadout_diff * self.w_loadout)
            + ((100.0 - state.seconds_remaining) * self.w_time_decay)
        )

        # Sigmoid activation
        prob = 1.0 / (1.0 + np.exp(-logit))
        return float(np.clip(prob, 0.01, 0.99))


def calculate_xrw(
    alive_friendly: int,
    alive_enemy: int,
    loadout_diff: float = 0.0,
    spike_planted: bool = False,
    round_time_remaining: float = 100.0,
) -> float:
    """Calculate expected round win probability given round parameters."""
    model = ExpectedRoundWinModel()
    state = RoundStateVector(
        alive_friendly=alive_friendly,
        alive_enemy=alive_enemy,
        loadout_diff=loadout_diff,
        spike_planted=spike_planted,
        seconds_remaining=round_time_remaining,
    )
    return model.predict_probability(state)


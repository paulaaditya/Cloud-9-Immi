import datetime
from typing import List, Optional
from pydantic import BaseModel
from src.analytics.xrw_model import ExpectedRoundWinModel, RoundStateVector
from src.models.match_state import KillEvent, ParsedRound


class AttributedMistake(BaseModel):
    mistake_type: str  # UNTRADED_FIRST_DEATH, ISOLATED_DUEL, UTILITY_DELAY
    player_id: str
    round_number: int
    occurred_at: str
    win_prob_delta: float
    description: str
    coaching_fix: str


def parse_iso_time(timestamp: str) -> datetime.datetime:
    """Parse an ISO 8601 timestamp string into a timezone-aware datetime."""
    clean_ts = timestamp.replace("Z", "+00:00")
    return datetime.datetime.fromisoformat(clean_ts)


def detect_round_mistakes(
    round_obj: ParsedRound, trade_window_sec: float = 3.0
) -> List[AttributedMistake]:
    """Detect micro-mistakes in a round and attribute them with win probability delta (xRW impact)."""
    mistakes: List[AttributedMistake] = []
    model = ExpectedRoundWinModel()

    if not round_obj.kills:
        return mistakes

    # Baseline 5v5 state
    p_baseline = model.predict_probability(
        RoundStateVector(alive_friendly=5, alive_enemy=5)
    )
    p_disadvantage = model.predict_probability(
        RoundStateVector(alive_friendly=4, alive_enemy=5)
    )
    opening_death_penalty = round(p_disadvantage - p_baseline, 3)

    # Find the opening kill (first blood)
    first_kill: Optional[KillEvent] = None
    first_kill_idx = -1
    for idx, k in enumerate(round_obj.kills):
        if k.is_first_blood:
            first_kill = k
            first_kill_idx = idx
            break

    if first_kill is None and round_obj.kills:
        first_kill = round_obj.kills[0]
        first_kill_idx = 0

    if first_kill:
        t0 = parse_iso_time(first_kill.occurred_at)
        traded = False

        for k in round_obj.kills[first_kill_idx + 1 :]:
            t1 = parse_iso_time(k.occurred_at)
            delta_sec = (t1 - t0).total_seconds()
            if delta_sec <= trade_window_sec and k.victim_id == first_kill.killer_id:
                traded = True
                break

        if not traded:
            mistakes.append(
                AttributedMistake(
                    mistake_type="UNTRADED_FIRST_DEATH",
                    player_id=first_kill.victim_id,
                    round_number=round_obj.round_number,
                    occurred_at=first_kill.occurred_at,
                    win_prob_delta=opening_death_penalty,
                    description="Untraded opening death with no return trade within 3.0 seconds.",
                    coaching_fix="Establish buddy-system spacing (< 6 meters) and hold crossfire angles rather than dry-peeking before support utility.",
                )
            )

    return mistakes

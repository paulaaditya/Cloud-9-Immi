from collections import Counter
from typing import List
from pydantic import BaseModel
from src.analytics.mistake_detector import AttributedMistake


class PlayerReportCard(BaseModel):
    player_id: str
    mistake_count: int
    cumulative_xrw_tax: float
    primary_vulnerability: str
    actionable_summary: str


def build_player_report_cards(
    mistakes: List[AttributedMistake],
) -> List[PlayerReportCard]:
    """Aggregate mistakes per player into report cards sorted ascending by cumulative xRW tax."""
    if not mistakes:
        return []

    # Group mistakes by player_id preserving discovery order
    player_groups = {}
    for m in mistakes:
        player_groups.setdefault(m.player_id, []).append(m)

    cards: List[PlayerReportCard] = []
    for player_id, p_mistakes in player_groups.items():
        mistake_count = len(p_mistakes)
        cumulative_xrw_tax = round(sum(m.win_prob_delta for m in p_mistakes), 3)

        type_counts = Counter(m.mistake_type for m in p_mistakes)
        primary_vulnerability = type_counts.most_common(1)[0][0]

        fixes = [
            m.coaching_fix
            for m in p_mistakes
            if m.mistake_type == primary_vulnerability and m.coaching_fix
        ]
        fix_text = (
            fixes[0]
            if fixes
            else "Review positioning and trading fundamentals."
        )

        actionable_summary = (
            f"Player {player_id} incurred {cumulative_xrw_tax:.3f} cumulative xRW tax "
            f"across {mistake_count} mistakes (primary: {primary_vulnerability}). "
            f"Actionable fix: {fix_text}"
        )

        cards.append(
            PlayerReportCard(
                player_id=player_id,
                mistake_count=mistake_count,
                cumulative_xrw_tax=cumulative_xrw_tax,
                primary_vulnerability=primary_vulnerability,
                actionable_summary=actionable_summary,
            )
        )

    # Sort ascending by tax (highest loss / most negative first)
    cards.sort(key=lambda c: c.cumulative_xrw_tax)
    return cards

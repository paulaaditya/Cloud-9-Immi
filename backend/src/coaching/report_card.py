from collections import Counter
from typing import Dict, List, Optional
from pydantic import BaseModel
from src.analytics.mistake_detector import AttributedMistake
from src.data.metadata import get_player_name


class PlayerReportCard(BaseModel):
    player_id: str
    player_name: Optional[str] = None
    character_name: Optional[str] = None
    mistake_count: int
    cumulative_xrw_tax: float
    primary_vulnerability: str
    actionable_summary: str


def build_player_report_cards(
    mistakes: List[AttributedMistake],
    roster: Optional[Dict[str, Dict[str, str]]] = None,
) -> List[PlayerReportCard]:
    """Aggregate mistakes per player into report cards sorted ascending by cumulative xRW tax."""
    if not mistakes:
        return []

    # Group mistakes by player_id preserving discovery order
    player_groups: Dict[str, List[AttributedMistake]] = {}
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

        p_name = next((m.player_name for m in p_mistakes if m.player_name), None)
        c_name = next((m.character_name for m in p_mistakes if m.character_name), None)
        if not p_name:
            p_name = get_player_name(player_id)
        if not c_name and roster and player_id in roster:
            c_name = roster[player_id].get("character_name")

        display_name = f"{p_name} ({player_id})" if p_name and p_name != player_id else player_id

        actionable_summary = (
            f"{display_name} incurred {cumulative_xrw_tax:.3f} cumulative xRW tax "
            f"across {mistake_count} mistakes (primary: {primary_vulnerability}). "
            f"Actionable fix: {fix_text}"
        )

        cards.append(
            PlayerReportCard(
                player_id=player_id,
                player_name=p_name or player_id,
                character_name=c_name,
                mistake_count=mistake_count,
                cumulative_xrw_tax=cumulative_xrw_tax,
                primary_vulnerability=primary_vulnerability,
                actionable_summary=actionable_summary,
            )
        )

    # Sort ascending by tax (highest loss / most negative first)
    cards.sort(key=lambda c: c.cumulative_xrw_tax)
    return cards

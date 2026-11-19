from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from src.analytics.mistake_detector import detect_round_mistakes
from src.coaching.prescription import generate_prescribed_drills
from src.coaching.report_card import build_player_report_cards
from src.data.metadata import get_featured_series, get_series_roster
from src.data.parser import parse_series

router = APIRouter(prefix="/api/v1")


@router.get("/featured-series", response_model=List[Dict[str, Any]])
def get_featured_series_endpoint():
    """Return catalog of featured Cloud9 and marquee VCT series matches."""
    return get_featured_series()


@router.get("/series/{series_id}/coaching-report")
def get_coaching_report(
    series_id: str,
    game_index: Optional[int] = Query(
        0, description="Select specific game index (0-based) of the series"
    ),
    max_envelopes: Optional[int] = Query(
        None, description="Limit envelopes for fast demo"
    ),
):
    try:
        parsed = parse_series(series_id, max_envelopes=max_envelopes)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Series {series_id} not found in dataset"
        )

    roster = get_series_roster(series_id)

    # Determine games to analyze based on game_index
    if game_index is not None and 0 <= game_index < len(parsed.games):
        target_games = [parsed.games[game_index]]
        selected_index = game_index
    else:
        target_games = parsed.games
        selected_index = 0

    all_mistakes = []
    for g in target_games:
        for r in g.rounds:
            all_mistakes.extend(
                detect_round_mistakes(r, series_id=series_id, roster=roster)
            )

    cards = build_player_report_cards(all_mistakes, roster=roster)
    drills = generate_prescribed_drills(all_mistakes)

    return {
        "series_id": parsed.series_id,
        "team1_name": parsed.team1_name,
        "team2_name": parsed.team2_name,
        "total_games": len(parsed.games),
        "selected_game_index": selected_index,
        "games": parsed.games,
        "roster": roster,
        "total_mistakes_detected": len(all_mistakes),
        "mistakes": all_mistakes,
        "player_reports": cards,
        "prescribed_drills": drills,
    }

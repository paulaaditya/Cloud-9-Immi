from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from src.analytics.mistake_detector import detect_round_mistakes
from src.coaching.prescription import generate_prescribed_drills
from src.coaching.report_card import build_player_report_cards
from src.data.parser import parse_series

router = APIRouter(prefix="/api/v1")


@router.get("/series/{series_id}/coaching-report")
def get_coaching_report(
    series_id: str,
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

    all_mistakes = []
    for g in parsed.games:
        for r in g.rounds:
            all_mistakes.extend(detect_round_mistakes(r))

    cards = build_player_report_cards(all_mistakes)
    drills = generate_prescribed_drills(all_mistakes)

    return {
        "series_id": parsed.series_id,
        "team1_name": parsed.team1_name,
        "team2_name": parsed.team2_name,
        "total_games": len(parsed.games),
        "games": parsed.games,
        "total_mistakes_detected": len(all_mistakes),
        "mistakes": all_mistakes,
        "player_reports": cards,
        "prescribed_drills": drills,
    }

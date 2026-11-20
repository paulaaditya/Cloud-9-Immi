from typing import Any, Dict, List, Optional
import httpx
from fastapi import APIRouter, HTTPException, Query

from src.analytics.mistake_detector import detect_round_mistakes
from src.analytics.vlr_mistake_detector import detect_vlr_round_mistakes
from src.coaching.llm_coach import LLMCoachService
from src.coaching.prescription import generate_prescribed_drills
from src.coaching.report_card import build_player_report_cards
from src.data.metadata import get_featured_series, get_series_roster
from src.data.parser import parse_series
from src.data.vlr_client import VLRClient
from src.data.vlr_parser import normalize_vlr_series
from src.models.vlr_models import VLRPlayerStat

router = APIRouter(prefix="/api/v1")
vlr_client = VLRClient()
llm_coach = LLMCoachService(model_backend="mock")


@router.get("/featured-series", response_model=List[Dict[str, Any]])
@router.get("/series/featured", response_model=List[Dict[str, Any]])
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


@router.get("/llm/health")
async def get_llm_health():
    """Return backend status and model info for local SLM coaching service."""
    return {
        "status": "healthy",
        "backend": llm_coach.model_backend,
        "model_path": llm_coach.model_path,
        "ollama_url": llm_coach.ollama_url,
    }


@router.get("/vlr/matches")
async def get_vlr_matches(
    category: str = Query("results", description="results, live_score, or upcoming")
):
    """Fetch recent matches catalog from VLR API."""
    try:
        return await vlr_client.get_matches_catalog(category)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=404, detail=f"Catalog for {category} not found"
            )
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch matches catalog from VLR: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch matches catalog from VLR: {str(e)}",
        )


@router.get("/vlr/match/{match_id}/coaching-report")
async def get_vlr_coaching_report(
    match_id: str,
    game_id: Optional[str] = Query("1", description="Game index or map ID"),
    target_team: Optional[str] = Query(
        None, description="Target team name to attribute mistakes for. Defaults to team1."
    ),
):
    """Generate comprehensive coaching report for a VLR match."""
    try:
        logs = await vlr_client.get_match_logs(match_id, game_id=game_id)
        details = await vlr_client.get_match_details(match_id)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=404, detail=f"Match {match_id} not found in VLR"
            )
        raise HTTPException(
            status_code=502, detail=f"Failed to fetch data from VLR: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=502, detail=f"Failed to fetch data from VLR: {str(e)}"
        )

    parsed = normalize_vlr_series(logs, details)

    # Extract player stats dictionary for active map
    player_stats_map: Dict[str, VLRPlayerStat] = {}
    if details and details.data.maps:
        matched_map = next((m for m in details.data.maps if m.map_id == game_id), None)
        target_map = matched_map or details.data.maps[0]
        for s in target_map.stats:
            player_stats_map[s.player] = s

    all_mistakes = []
    round_insights = []
    coach_team = target_team or parsed.team1_name
    if parsed.games:
        game = parsed.games[0]
        for r in game.rounds:
            round_mistakes = detect_vlr_round_mistakes(
                r, player_stats_map, target_team=coach_team
            )
            all_mistakes.extend(round_mistakes)
            insight = await llm_coach.generate_round_insight(
                r, round_mistakes, player_stats_map
            )
            round_insights.append(insight)

    # Construct roster dictionary for report card enrichment
    roster_dict = {
        name: {
            "player_name": name,
            "character_name": stat.agent or "Agent",
            "team_name": stat.team or coach_team,
        }
        for name, stat in player_stats_map.items()
    }

    cards = build_player_report_cards(all_mistakes, roster=roster_dict)
    drills = generate_prescribed_drills(all_mistakes)

    return {
        "series_id": parsed.series_id,
        "team1_name": parsed.team1_name,
        "team2_name": parsed.team2_name,
        "total_games": len(parsed.games),
        "selected_game_index": 0,
        "games": parsed.games,
        "player_stats": player_stats_map,
        "total_mistakes_detected": len(all_mistakes),
        "mistakes": all_mistakes,
        "player_reports": cards,
        "prescribed_drills": drills,
        "round_insights": round_insights,
    }


@router.get("/vlr/match/{match_id}/round/{round_num}/insight")
async def get_vlr_round_insight(
    match_id: str,
    round_num: int,
    game_id: Optional[str] = Query("1", description="Game index or map ID"),
    target_team: Optional[str] = Query(
        None, description="Target team name to attribute mistakes for. Defaults to team1."
    ),
):
    """Generate tactical coaching insight for a specific round of a VLR match."""
    try:
        logs = await vlr_client.get_match_logs(match_id, game_id=game_id)
        details = await vlr_client.get_match_details(match_id)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=404, detail=f"Match {match_id} not found in VLR"
            )
        raise HTTPException(
            status_code=502, detail=f"Failed to fetch data from VLR: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=502, detail=f"Failed to fetch data from VLR: {str(e)}"
        )

    parsed = normalize_vlr_series(logs, details)

    player_stats_map: Dict[str, VLRPlayerStat] = {}
    if details and details.data.maps:
        matched_map = next((m for m in details.data.maps if m.map_id == game_id), None)
        target_map = matched_map or details.data.maps[0]
        for s in target_map.stats:
            player_stats_map[s.player] = s

    if not parsed.games:
        raise HTTPException(
            status_code=404, detail=f"No games found for match {match_id}"
        )

    game = parsed.games[0]
    target_round = next((r for r in game.rounds if r.round_number == round_num), None)
    if not target_round:
        raise HTTPException(
            status_code=404,
            detail=f"Round {round_num} not found in match {match_id}",
        )

    coach_team = target_team or parsed.team1_name
    round_mistakes = detect_vlr_round_mistakes(
        target_round, player_stats_map, target_team=coach_team
    )
    insight = await llm_coach.generate_round_insight(
        target_round, round_mistakes, player_stats_map
    )
    return insight

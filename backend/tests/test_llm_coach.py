import pytest
from src.analytics.mistake_detector import AttributedMistake
from src.coaching.llm_coach import LLMCoachService, RoundCoachingInsight, COACH_SYSTEM_PROMPT
from src.coaching.prescription import PrescribedDrill
from src.models.match_state import ParsedRound
from src.models.vlr_models import VLRPlayerStat


@pytest.mark.asyncio
async def test_generate_round_insight_with_mistake():
    service = LLMCoachService(model_backend="mock")
    round_obj = ParsedRound(
        round_number=4,
        winning_team_id="NRG",
        round_winner_name="NRG",
        win_condition="elimination",
    )
    mistake = AttributedMistake(
        mistake_type="UNTRADED_FIRST_DEATH",
        player_id="OXY",
        player_name="OXY",
        character_name="Jett",
        team_name="Cloud9",
        round_number=4,
        occurred_at="00:0:18",
        win_prob_delta=-0.21,
        description="Untraded opening casualty by OXY",
        coaching_fix="Establish tighter buddy spacing (< 5 meters)",
    )
    player_stats = {
        "OXY": VLRPlayerStat(
            player="OXY",
            team="Cloud9",
            agent="Jett",
            k=15,
            d=10,
            a=2,
            acs=240,
            fk=3,
            fd=4,
        )
    }
    insight = await service.generate_round_insight(round_obj, [mistake], player_stats=player_stats)

    assert isinstance(insight, RoundCoachingInsight)
    assert insight.round_number == 4
    assert insight.blunder_culprit == "OXY"
    assert insight.win_prob_tax == -0.21
    assert "Establish tighter buddy spacing" in insight.tactical_directive
    assert insight.player_stat_verdict is not None
    assert "OXY" in insight.player_stat_verdict
    assert "240 ACS" in insight.player_stat_verdict
    assert isinstance(insight.recommended_drill, PrescribedDrill)
    assert "OXY" in insight.recommended_drill.target_players
    assert len(insight.narrative) > 0


@pytest.mark.asyncio
async def test_generate_round_insight_clean_round():
    service = LLMCoachService(model_backend="mock")
    round_obj = ParsedRound(
        round_number=2,
        winning_team_id="Cloud9",
        round_winner_name="Cloud9",
        win_condition="defuse",
    )
    insight = await service.generate_round_insight(round_obj, [], player_stats={})

    assert isinstance(insight, RoundCoachingInsight)
    assert insight.round_number == 2
    assert insight.blunder_culprit is None
    assert insight.win_prob_tax == 0.0
    assert "spacing" in insight.tactical_directive.lower() or "maintain" in insight.tactical_directive.lower()
    assert insight.player_stat_verdict is not None
    assert "clean" in insight.player_stat_verdict.lower()
    assert isinstance(insight.recommended_drill, PrescribedDrill)
    assert "Team" in insight.recommended_drill.target_players


@pytest.mark.asyncio
async def test_system_prompt_structure():
    assert "Cloud9 VALORANT" in COACH_SYSTEM_PROMPT
    assert "RoundCoachingInsight" in COACH_SYSTEM_PROMPT


@pytest.mark.asyncio
async def test_llm_coach_fallback_on_invalid_backend():
    service = LLMCoachService(model_backend="llama_cpp", model_path="/nonexistent/model.gguf")
    round_obj = ParsedRound(
        round_number=1,
        winning_team_id="Cloud9",
        round_winner_name="Cloud9",
        win_condition="elimination",
    )
    insight = await service.generate_round_insight(round_obj, [])
    assert isinstance(insight, RoundCoachingInsight)
    assert insight.round_number == 1

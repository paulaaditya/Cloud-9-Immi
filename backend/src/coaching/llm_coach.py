import json
import logging
from typing import Any, Dict, List, Optional
import httpx
from pydantic import BaseModel, Field

from src.analytics.vlr_mistake_detector import AttributedMistake
from src.coaching.prescription import DRILL_CATALOG, PrescribedDrill
from src.models.match_state import ParsedRound
from src.models.vlr_models import VLRPlayerStat

logger = logging.getLogger(__name__)


class RoundCoachingInsight(BaseModel):
    round_number: int
    narrative: str
    blunder_culprit: Optional[str] = None
    win_prob_tax: float = 0.0
    tactical_directive: str
    player_stat_verdict: Optional[str] = None
    recommended_drill: PrescribedDrill


COACH_SYSTEM_PROMPT = """You are the Lead Assistant Coach for Cloud9 VALORANT.
Analyze the round event log, opening casualties, win probability delta (xRW), and player stats.
Deliver a direct, concise, professional tactical debrief and drill. No fluff, no emojis.
Output valid JSON matching the RoundCoachingInsight schema."""


class LLMCoachService:
    def __init__(
        self,
        model_backend: str = "mock",
        model_path: Optional[str] = None,
        ollama_url: str = "http://localhost:11434",
    ):
        self.model_backend = model_backend
        self.model_path = model_path
        self.ollama_url = ollama_url
        self._llm = None

        if self.model_backend == "llama_cpp" and model_path:
            try:
                from llama_cpp import Llama
                # 8GB VRAM configuration: offload layers to GPU, keep KV cache bounded
                self._llm = Llama(
                    model_path=model_path,
                    n_gpu_layers=-1,
                    n_ctx=4096,
                    verbose=False,
                )
                logger.info("Loaded llama.cpp model from %s", model_path)
            except Exception as e:
                logger.warning(
                    "Could not load llama.cpp: %s. Falling back to rule-based mock.", e
                )
                self.model_backend = "mock"

    async def generate_round_insight(
        self,
        round_obj: ParsedRound,
        mistakes: List[AttributedMistake],
        player_stats: Optional[Dict[str, VLRPlayerStat]] = None,
    ) -> RoundCoachingInsight:
        culprit = (
            mistakes[0].player_name or mistakes[0].player_id if mistakes else None
        )
        tax = sum(m.win_prob_delta for m in mistakes) if mistakes else 0.0

        if self.model_backend == "llama_cpp" and self._llm:
            try:
                prompt_text = (
                    f"Round {round_obj.round_number}. Winner: {round_obj.round_winner_name}. "
                    f"Mistakes: {[m.model_dump() for m in mistakes]}."
                )
                response = self._llm.create_chat_completion(
                    messages=[
                        {"role": "system", "content": COACH_SYSTEM_PROMPT},
                        {"role": "user", "content": prompt_text},
                    ],
                    temperature=0.2,
                    max_tokens=300,
                )
                raw_json = response["choices"][0]["message"]["content"]
                parsed = json.loads(raw_json)
                return RoundCoachingInsight(**parsed)
            except Exception as e:
                logger.warning(
                    "Local SLM generation failed (%s), using deterministic synthesis.", e
                )
        elif self.model_backend == "ollama":
            try:
                prompt_text = (
                    f"Round {round_obj.round_number}. Winner: {round_obj.round_winner_name}. "
                    f"Mistakes: {[m.model_dump() for m in mistakes]}."
                )
                async with httpx.AsyncClient(timeout=3.0) as client:
                    resp = await client.post(
                        f"{self.ollama_url}/api/chat",
                        json={
                            "model": "qwen2.5:3b",
                            "messages": [
                                {"role": "system", "content": COACH_SYSTEM_PROMPT},
                                {"role": "user", "content": prompt_text},
                            ],
                            "format": "json",
                            "stream": False,
                        },
                    )
                    if resp.status_code == 200:
                        content = resp.json().get("message", {}).get("content", "")
                        parsed = json.loads(content)
                        return RoundCoachingInsight(**parsed)
            except Exception as e:
                logger.warning(
                    "Ollama SLM generation failed (%s), using deterministic synthesis.", e
                )

        # Deterministic / Mock synthesis (fast and guaranteed schema compliant)
        narrative = (
            f"Round {round_obj.round_number} concluded with "
            f"{round_obj.round_winner_name or 'opponent'} victory by "
            f"{round_obj.win_condition or 'elimination'}."
        )

        if mistakes:
            primary_m = mistakes[0]
            directive = (
                f"Focus on {primary_m.coaching_fix}"
                if primary_m.coaching_fix
                else "Establish tighter spacing and reliable trade crossfires."
            )
            stat_verdict = None
            if player_stats and culprit and culprit in player_stats:
                st = player_stats[culprit]
                stat_verdict = (
                    f"{culprit} recorded {st.fk} first kills vs {st.fd} first deaths "
                    f"with {st.acs} ACS."
                )
            else:
                stat_verdict = (
                    f"Targeted review for {culprit}: reinforce spacing and utility coordination."
                )

            if primary_m.mistake_type in DRILL_CATALOG:
                tpl = DRILL_CATALOG[primary_m.mistake_type]
                drill = PrescribedDrill(
                    drill_name=str(tpl["drill_name"]),
                    target_players=[culprit] if culprit else ["Team"],
                    target_player_names=[culprit] if culprit else ["Team"],
                    drill_objective=str(tpl["drill_objective"]),
                    setup_steps=list(tpl["setup_steps"]),  # type: ignore
                    success_criterion=str(tpl["success_criterion"]),
                )
            else:
                drill = PrescribedDrill(
                    drill_name="Buddy-System Contact & Trade Timing 2v2",
                    target_players=[culprit] if culprit else ["Team"],
                    target_player_names=[culprit] if culprit else ["Team"],
                    drill_objective="Reinforce spacing and instant trade frags within 2.0s.",
                    setup_steps=[
                        "Pair entry fragger with trade partner at choke.",
                        "Execute timed peek against defender off-angle.",
                        "Complete 10 reps alternating angles.",
                    ],
                    success_criterion="Trade secured in >= 80% of contacts.",
                )
        else:
            directive = "Maintain clean spacing and utility cadence."
            stat_verdict = "Clean round execution with no high-penalty tactical blunders recorded."
            drill = PrescribedDrill(
                drill_name="Site Retention & Execute Cadence",
                target_players=["Team"],
                target_player_names=["Team"],
                drill_objective="Maintain disciplined map control and spacing.",
                setup_steps=["Run standard default setups across primary choke points."],
                success_criterion="Full utility deployment before site entry.",
            )

        return RoundCoachingInsight(
            round_number=round_obj.round_number,
            narrative=narrative,
            blunder_culprit=culprit,
            win_prob_tax=round(tax, 3),
            tactical_directive=directive,
            player_stat_verdict=stat_verdict,
            recommended_drill=drill,
        )

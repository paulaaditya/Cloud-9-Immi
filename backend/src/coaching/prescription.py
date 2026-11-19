from typing import Dict, List
from pydantic import BaseModel
from src.analytics.mistake_detector import AttributedMistake


class PrescribedDrill(BaseModel):
    drill_name: str
    target_players: List[str]
    drill_objective: str
    setup_steps: List[str]
    success_criterion: str


DRILL_CATALOG: Dict[str, Dict[str, object]] = {
    "UNTRADED_FIRST_DEATH": {
        "drill_name": "Buddy-System Contact & Trade Timing 2v2",
        "drill_objective": (
            "Reinforce sub-6m proximity spacing and synchronized peeking "
            "to guarantee trade kills on contact."
        ),
        "setup_steps": [
            "Pair target players as entry fragger and secondary trader at choke entrance.",
            "Opponent defender holds an aggressive off-angle.",
            "Entry initiates contact to draw fire; secondary peeks within 1.0 second.",
            "Run 10 repetitions per side, alternating roles.",
        ],
        "success_criterion": (
            "Trade kill completed within 2.0 seconds in at least 80% of repetitions "
            "without trader dying untraded."
        ),
    },
    "ISOLATED_DUEL": {
        "drill_name": "Crossfire & Spacing 2v2",
        "drill_objective": (
            "Eliminate isolated solo engagements by anchoring paired crossfire angles."
        ),
        "setup_steps": [
            "Position two defenders on site in complementary crossfire lines.",
            "Attackers execute onto site through main choke simultaneously.",
            "Defenders hold fire until both have confirmed line of sight on target.",
            "Execute 10 site defense repetitions.",
        ],
        "success_criterion": (
            "Zero untraded deaths across 10 rounds with confirmed dual-angle engagement."
        ),
    },
    "UTILITY_DELAY": {
        "drill_name": "Utility Timing & Flash Synchronization",
        "drill_objective": (
            "Synchronize support flashes and utility usage with entry player contact timing."
        ),
        "setup_steps": [
            "Support player lines up flash or concussive utility outside target zone.",
            "Entry player signals 3-second advance countdown.",
            "Utility detonates 0.5 seconds before entry player exposes to angle.",
            "Run 10 live-fire clearing repetitions.",
        ],
        "success_criterion": (
            "Target defender fully blinded or concussed before entry player duel "
            "initiation in 90% of reps."
        ),
    },
}


def generate_prescribed_drills(
    mistakes: List[AttributedMistake],
) -> List[PrescribedDrill]:
    """Detect error patterns and generate targeted tactical training drills."""
    if not mistakes:
        return []

    # Group mistakes by mistake_type
    mistakes_by_type: Dict[str, List[AttributedMistake]] = {}
    for m in mistakes:
        mistakes_by_type.setdefault(m.mistake_type, []).append(m)

    drills: List[PrescribedDrill] = []

    for mistake_type, type_mistakes in mistakes_by_type.items():
        # Unique players involved in this mistake pattern (preserves order)
        target_players = list(dict.fromkeys(m.player_id for m in type_mistakes))

        if mistake_type in DRILL_CATALOG:
            template = DRILL_CATALOG[mistake_type]
            drill_name = str(template["drill_name"])
            drill_objective = str(template["drill_objective"])
            setup_steps = list(template["setup_steps"])  # type: ignore
            success_criterion = str(template["success_criterion"])
        else:
            drill_name = f"Tactical Correction: {mistake_type.replace('_', ' ').title()}"
            drill_objective = (
                f"Remediate recurring {mistake_type} errors through structured tactical repetition."
            )
            setup_steps = [
                f"Review round VOD clips highlighting {mistake_type} occurrences.",
                "Position target players in matching tactical scenario on the practice server.",
                "Execute 5 dry-run walk-throughs followed by 5 live-fire contested rounds.",
            ]
            success_criterion = (
                "Clean execution with zero repeat errors in 8 out of 10 contested repetitions."
            )

        drills.append(
            PrescribedDrill(
                drill_name=drill_name,
                target_players=target_players,
                drill_objective=drill_objective,
                setup_steps=setup_steps,
                success_criterion=success_criterion,
            )
        )

    return drills

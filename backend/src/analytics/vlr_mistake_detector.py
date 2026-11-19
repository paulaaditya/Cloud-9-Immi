import datetime
from typing import Dict, List, Optional
from src.analytics.mistake_detector import AttributedMistake, get_agent_role
from src.analytics.xrw_model import calculate_xrw
from src.models.match_state import ParsedRound
from src.models.vlr_models import VLRPlayerStat


def _parse_time_sec(t_str: str) -> float:
    """Parse time representations into seconds."""
    try:
        t_str = t_str.strip()
        if not t_str:
            return 0.0
        if "T" in t_str:
            clean_ts = t_str.replace("Z", "+00:00")
            return datetime.datetime.fromisoformat(clean_ts).timestamp()
        parts = t_str.split(":")
        if len(parts) == 3:
            return float(parts[0]) * 3600.0 + float(parts[1]) * 60.0 + float(parts[2])
        elif len(parts) == 2:
            return float(parts[0]) * 60.0 + float(parts[1])
        return float(parts[0])
    except Exception:
        return 0.0


def _build_coaching_fix(role: str) -> str:
    """Build tactical coaching fix based on agent role."""
    if role == "duelist":
        return (
            "Coordinate entry timing with initiator utility. Establish tighter "
            "buddy spacing (< 5 meters) and rely on trade support before initiating contested opening duel."
        )
    elif role == "initiator":
        return (
            "Deploy recon utility from safety. Maintain buddy spacing and rely on "
            "trade support rather than taking opening dry duels."
        )
    elif role == "controller":
        return (
            "Drop site smokes from deep cover. Maintain buddy spacing and rely on "
            "trade support rather than taking risky opening duels."
        )
    elif role == "sentinel":
        return (
            "Play around deployed trap utility and anchor setups. Rely on trade "
            "support instead of dry-peeking early angles."
        )
    return (
        "Establish tighter buddy spacing (< 5 meters) and rely on trade support "
        "before initiating contested opening duel."
    )


def detect_vlr_round_mistakes(
    round_obj: ParsedRound,
    player_stats: Optional[Dict[str, VLRPlayerStat]] = None,
    target_team: Optional[str] = "Cloud9",
) -> List[AttributedMistake]:
    """Detect tactical mistakes in a VLR round and attribute to target team players."""
    mistakes: List[AttributedMistake] = []
    if not round_obj.kills:
        return mistakes

    fb_kill = next((k for k in round_obj.kills if k.is_first_blood), round_obj.kills[0])
    victim_name = fb_kill.victim_name or fb_kill.victim_id
    killer_name = fb_kill.killer_name or fb_kill.killer_id

    victim_team = None
    agent_name = "Agent"
    if player_stats and victim_name in player_stats:
        stat = player_stats[victim_name]
        victim_team = stat.team
        if stat.agent:
            agent_name = stat.agent

    # If target team specified and victim team is known, check match
    if target_team and victim_team and victim_team.strip().lower() != target_team.strip().lower():
        return mistakes

    # Check for return trade within 3.5 seconds
    fb_time = _parse_time_sec(fb_kill.occurred_at)
    traded = False
    for k in round_obj.kills:
        if k.event_id == fb_kill.event_id:
            continue
        k_time = _parse_time_sec(k.occurred_at)
        time_diff = k_time - fb_time
        if 0 <= time_diff <= 3.5:
            # Check if opening killer was eliminated in this trade window
            k_victim = (k.victim_name or k.victim_id or "").strip().lower()
            orig_killer = killer_name.strip().lower()
            orig_killer_id = (fb_kill.killer_id or "").strip().lower()
            if k_victim and (k_victim == orig_killer or k_victim == orig_killer_id):
                traded = True
                break

    if not traded:
        # Pre-kill: 5v5 -> xRW. Post-kill: 4v5 -> xRW
        xrw_before = calculate_xrw(5, 5, spike_planted=False, round_time_remaining=80.0)
        xrw_after = calculate_xrw(4, 5, spike_planted=False, round_time_remaining=80.0)
        delta = round(xrw_after - xrw_before, 3)

        role = get_agent_role(agent_name)
        coaching_fix = _build_coaching_fix(role)
        weapon_label = fb_kill.weapon or "Unknown weapon"

        mistakes.append(
            AttributedMistake(
                mistake_type="UNTRADED_FIRST_DEATH",
                player_id=victim_name,
                player_name=victim_name,
                character_name=agent_name,
                team_name=victim_team or target_team,
                round_number=round_obj.round_number,
                occurred_at=fb_kill.occurred_at,
                win_prob_delta=delta,
                description=(
                    f"Untraded opening casualty by {victim_name} to {killer_name} "
                    f"({weapon_label}). No return trade within 3.5s window."
                ),
                coaching_fix=coaching_fix,
            )
        )

    return mistakes

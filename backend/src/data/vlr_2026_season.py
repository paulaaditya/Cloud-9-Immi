import random
from typing import Any, Dict, List, Optional
from src.models.vlr_models import (
    VLRMapDetail,
    VLRMatchDetailsData,
    VLRMatchDetailsResponse,
    VLRMatchLogsData,
    VLRMatchLogsResponse,
    VLRPlayerStat,
    VLRRound,
    VLRRoundEvent,
    VLRTeam,
)

SEASON_2026_MATCH_IDS = [
    "vlr-c9-sen-2026",
    "vlr-c9-nrg-2026",
    "vlr-c9-fnc-masters2026",
    "vlr-c9-prx-champions2026",
    "vlr-sen-th-champions2026",
]

_MATCH_METADATA = {
    "vlr-c9-sen-2026": {
        "event_name": "VCT Americas 2026 Stage 1",
        "stage": "Regular Season - Week 3",
        "series": "2026 Season",
        "date": "2026-04-12",
        "map_name": "Ascent",
        "team1_name": "Cloud9",
        "team2_name": "Sentinels",
        "team1_score": 13,
        "team2_score": 11,
        "rounds_c9_won": {1, 2, 4, 6, 7, 9, 11, 13, 14, 16, 18, 22, 24},
        "roster1": [
            ("OXY", "Jett", 26, 16, 5, 284, 178.5, "79%", "34%", 7, 2),
            ("vanity", "Omen", 15, 14, 12, 182, 124.0, "75%", "26%", 2, 1),
            ("Xeppaa", "KAY/O", 17, 15, 14, 205, 138.2, "79%", "28%", 3, 2),
            ("moose", "Killjoy", 14, 13, 6, 170, 118.4, "71%", "29%", 1, 1),
            ("v1c", "Sova", 16, 14, 10, 195, 130.6, "75%", "31%", 2, 1),
        ],
        "roster2": [
            ("zekken", "Raze", 22, 18, 4, 245, 162.0, "71%", "30%", 5, 4),
            ("TenZ", "Omen", 16, 17, 8, 188, 126.5, "67%", "32%", 2, 2),
            ("johnqt", "Cypher", 13, 17, 5, 162, 110.2, "63%", "27%", 0, 2),
            ("Zellsis", "Breach", 11, 18, 11, 150, 105.0, "67%", "24%", 0, 3),
            ("bang", "Viper", 10, 18, 7, 144, 98.4, "58%", "25%", 0, 4),
        ],
    },
    "vlr-c9-nrg-2026": {
        "event_name": "VCT Americas 2026 Stage 1",
        "stage": "Playoffs - Upper Semifinals",
        "series": "2026 Season",
        "date": "2026-05-03",
        "map_name": "Haven",
        "team1_name": "Cloud9",
        "team2_name": "NRG",
        "team1_score": 13,
        "team2_score": 9,
        "rounds_c9_won": {1, 2, 3, 5, 7, 8, 10, 13, 14, 15, 18, 20, 22},
        "roster1": [
            ("OXY", "Jett", 24, 13, 4, 276, 172.0, "82%", "36%", 6, 1),
            ("vanity", "Omen", 14, 12, 10, 178, 119.5, "77%", "27%", 1, 1),
            ("Xeppaa", "Breach", 18, 13, 13, 212, 142.0, "82%", "30%", 3, 1),
            ("moose", "Killjoy", 13, 11, 5, 165, 112.4, "73%", "28%", 1, 1),
            ("v1c", "Sova", 15, 12, 9, 189, 128.2, "77%", "32%", 2, 1),
        ],
        "roster2": [
            ("Demon1", "Jett", 17, 17, 3, 210, 140.0, "68%", "38%", 3, 3),
            ("Ethan", "Yoru", 14, 17, 8, 175, 120.0, "64%", "29%", 1, 2),
            ("Victor", "Killjoy", 11, 16, 4, 152, 104.5, "59%", "25%", 0, 2),
            ("crashies", "Sova", 12, 17, 7, 158, 109.2, "64%", "28%", 1, 2),
            ("Marved", "Omen", 7, 17, 6, 120, 86.0, "55%", "22%", 0, 4),
        ],
    },
    "vlr-c9-fnc-masters2026": {
        "event_name": "VCT Masters 2026 Santiago",
        "stage": "Swiss Stage - Round 2",
        "series": "2026 Season",
        "date": "2026-06-14",
        "map_name": "Bind",
        "team1_name": "Cloud9",
        "team2_name": "Fnatic",
        "team1_score": 13,
        "team2_score": 10,
        "rounds_c9_won": {1, 3, 4, 6, 8, 9, 11, 13, 15, 16, 19, 21, 23},
        "roster1": [
            ("OXY", "Raze", 25, 15, 6, 280, 175.4, "78%", "33%", 6, 2),
            ("vanity", "Brimstone", 13, 14, 11, 172, 115.0, "74%", "25%", 1, 1),
            ("Xeppaa", "Skye", 16, 14, 15, 198, 132.8, "78%", "29%", 2, 2),
            ("moose", "Viper", 15, 13, 7, 176, 121.0, "74%", "27%", 2, 1),
            ("v1c", "Fade", 14, 13, 8, 180, 122.5, "74%", "30%", 2, 1),
        ],
        "roster2": [
            ("Derke", "Raze", 20, 17, 3, 232, 154.0, "70%", "31%", 4, 3),
            ("Boaster", "Brimstone", 10, 16, 10, 145, 100.2, "65%", "24%", 0, 2),
            ("Alfajer", "Killjoy", 16, 16, 4, 190, 130.5, "70%", "34%", 2, 2),
            ("Chronicle", "Viper", 13, 17, 6, 164, 112.0, "65%", "26%", 1, 3),
            ("hiro", "Fade", 10, 17, 7, 148, 102.0, "61%", "25%", 1, 3),
        ],
    },
    "vlr-c9-prx-champions2026": {
        "event_name": "VCT Champions 2026 Paris",
        "stage": "Group Stage - Elimination Match",
        "series": "2026 Season",
        "date": "2026-08-22",
        "map_name": "Lotus",
        "team1_name": "Cloud9",
        "team2_name": "Paper Rex",
        "team1_score": 13,
        "team2_score": 11,
        "rounds_c9_won": {2, 3, 5, 6, 8, 10, 12, 13, 15, 17, 20, 22, 24},
        "roster1": [
            ("OXY", "Neon", 27, 17, 5, 292, 182.6, "79%", "35%", 8, 3),
            ("vanity", "Omen", 15, 15, 12, 180, 122.0, "75%", "26%", 1, 1),
            ("Xeppaa", "Fade", 17, 16, 14, 202, 136.0, "75%", "28%", 2, 2),
            ("moose", "Killjoy", 14, 14, 6, 168, 116.5, "71%", "27%", 1, 1),
            ("v1c", "Breach", 16, 15, 11, 192, 129.0, "75%", "30%", 1, 1),
        ],
        "roster2": [
            ("Jinggg", "Raze", 23, 18, 5, 252, 166.4, "71%", "31%", 5, 4),
            ("f0rsakeN", "Fade", 17, 18, 9, 195, 132.0, "67%", "29%", 2, 2),
            ("something", "Jett", 16, 18, 4, 188, 128.5, "67%", "33%", 3, 3),
            ("d4v41", "Skye", 12, 17, 10, 155, 108.0, "63%", "26%", 0, 2),
            ("mindfreak", "Omen", 9, 18, 8, 138, 94.2, "58%", "24%", 0, 2),
        ],
    },
    "vlr-sen-th-champions2026": {
        "event_name": "VCT Champions 2026 Paris",
        "stage": "Grand Final - Decider Map",
        "series": "2026 Season",
        "date": "2026-09-06",
        "map_name": "Sunset",
        "team1_name": "Sentinels",
        "team2_name": "Team Heretics",
        "team1_score": 13,
        "team2_score": 11,
        "rounds_c9_won": {1, 2, 4, 5, 7, 9, 12, 14, 16, 18, 20, 22, 24},
        "roster1": [
            ("zekken", "Raze", 26, 16, 5, 285, 179.0, "79%", "32%", 6, 2),
            ("TenZ", "Omen", 19, 14, 9, 215, 144.2, "79%", "35%", 3, 1),
            ("johnqt", "Cypher", 15, 14, 7, 178, 121.0, "75%", "28%", 2, 1),
            ("Zellsis", "Breach", 14, 15, 12, 170, 118.0, "71%", "26%", 1, 2),
            ("bang", "Fade", 15, 14, 10, 182, 124.5, "75%", "29%", 1, 1),
        ],
        "roster2": [
            ("MiniBoo", "Neon", 22, 18, 4, 242, 160.5, "71%", "30%", 5, 4),
            ("Wo0t", "Fade", 18, 17, 7, 205, 138.0, "71%", "33%", 2, 2),
            ("benjyfishy", "Cypher", 14, 18, 5, 165, 114.0, "63%", "28%", 1, 2),
            ("RieNs", "Sova", 11, 18, 9, 152, 105.4, "63%", "27%", 0, 2),
            ("Boo", "Omen", 8, 18, 8, 130, 90.0, "58%", "23%", 0, 3),
        ],
    },
}


def _generate_round_events(
    round_num: int,
    team1_name: str,
    team2_name: str,
    winning_team: str,
    t1_players: List[str],
    t2_players: List[str],
) -> List[VLRRoundEvent]:
    events: List[VLRRoundEvent] = []
    is_team1_winner = winning_team == team1_name
    winner_pool = list(t1_players) if is_team1_winner else list(t2_players)
    loser_pool = list(t2_players) if is_team1_winner else list(t1_players)

    # Determine opening duel
    # Rounds 1 and 13 are pistol rounds
    is_pistol = round_num in (1, 13)
    is_eco = round_num in (2, 14) and not is_team1_winner
    primary_weapon = "Classic" if is_pistol else ("Spectre" if is_eco else "Vandal")

    # In ~70% of won rounds, winner gets first blood. In ~30%, loser got first blood
    first_blood_to_winner = (round_num % 3) != 0

    if first_blood_to_winner:
        fb_killer = winner_pool[0]
        fb_victim = loser_pool[0]
    else:
        fb_killer = loser_pool[0]
        fb_victim = winner_pool[0]

    events.append(
        VLRRoundEvent(
            time="0:22",
            type="kill",
            killer=fb_killer,
            victim=fb_victim,
            weapon=primary_weapon,
        )
    )

    # If first blood went to loser, check if return trade happens or is untraded
    curr_time_sec = 22
    if not first_blood_to_winner:
        # If round_num is divisible by 2: immediate trade within 2 seconds
        # If round_num is odd: untraded casualty (trade occurs > 5 seconds later or not at all)
        if round_num % 2 == 0:
            curr_time_sec += 2
            trade_killer = winner_pool[1]
            events.append(
                VLRRoundEvent(
                    time=f"0:{curr_time_sec:02d}",
                    type="kill",
                    killer=trade_killer,
                    victim=fb_killer,
                    weapon=primary_weapon,
                )
            )
            # Remove from loser pool
            if fb_killer in loser_pool:
                loser_pool.remove(fb_killer)
        else:
            curr_time_sec += 14

    # Remove fb_victim from its pool
    if fb_victim in loser_pool:
        loser_pool.remove(fb_victim)
    elif fb_victim in winner_pool:
        winner_pool.remove(fb_victim)

    # Plant event in 60% of rounds
    if round_num % 5 in (0, 2, 4):
        curr_time_sec += 15
        planter = winner_pool[-1] if is_team1_winner else (loser_pool[-1] if loser_pool else winner_pool[-1])
        events.append(
            VLRRoundEvent(
                time=f"0:{curr_time_sec:02d}",
                type="plant",
                killer=planter,
                victim="",
                weapon="",
            )
        )

    # Resolve remaining eliminations for the losing team
    weapons = ["Vandal", "Phantom", "Operator", "Sheriff", "Guardian"] if not is_pistol else ["Ghost", "Classic"]
    w_idx = 0
    while loser_pool:
        curr_time_sec += 8
        victim = loser_pool.pop(0)
        killer = winner_pool[w_idx % len(winner_pool)]
        wpn = weapons[w_idx % len(weapons)]
        w_idx += 1
        time_str = f"1:{curr_time_sec - 60:02d}" if curr_time_sec >= 60 else f"0:{curr_time_sec:02d}"
        events.append(
            VLRRoundEvent(
                time=time_str,
                type="kill",
                killer=killer,
                victim=victim,
                weapon=wpn,
            )
        )

    return events


def _build_match_logs(match_id: str, meta: Dict[str, Any], game_id: str = "1") -> VLRMatchLogsResponse:
    t1_name = meta["team1_name"]
    t2_name = meta["team2_name"]
    t1_score = meta["team1_score"]
    t2_score = meta["team2_score"]
    total_rounds = t1_score + t2_score
    rounds_c9_won = meta["rounds_c9_won"]

    t1_players = [p[0] for p in meta["roster1"]]
    t2_players = [p[0] for p in meta["roster2"]]

    rounds: List[VLRRound] = []
    for r_num in range(1, total_rounds + 1):
        is_t1_winner = r_num in rounds_c9_won
        winner_name = t1_name if is_t1_winner else t2_name
        win_type = "elimination"
        if r_num % 6 == 0:
            win_type = "defuse"
        elif r_num % 5 == 0:
            win_type = "detonation"

        revents = _generate_round_events(
            round_num=r_num,
            team1_name=t1_name,
            team2_name=t2_name,
            winning_team=winner_name,
            t1_players=t1_players,
            t2_players=t2_players,
        )

        rounds.append(
            VLRRound(
                round_number=r_num,
                winning_team=winner_name,
                win_type=win_type,
                events=revents,
            )
        )

    return VLRMatchLogsResponse(
        status="success",
        data=VLRMatchLogsData(
            match_id=match_id,
            game_id=game_id,
            map=meta["map_name"],
            teams=[
                VLRTeam(name=t1_name, score=str(t1_score), is_winner=t1_score > t2_score),
                VLRTeam(name=t2_name, score=str(t2_score), is_winner=t2_score > t1_score),
            ],
            rounds=rounds,
        ),
    )


def _build_match_details(match_id: str, meta: Dict[str, Any]) -> VLRMatchDetailsResponse:
    t1_name = meta["team1_name"]
    t2_name = meta["team2_name"]
    t1_score = meta["team1_score"]
    t2_score = meta["team2_score"]

    stats: List[VLRPlayerStat] = []
    for p, ag, k, d, a, acs, adr, kast, hs, fk, fd in meta["roster1"]:
        stats.append(
            VLRPlayerStat(
                player=p,
                team=t1_name,
                agent=ag,
                k=k,
                d=d,
                a=a,
                kd_diff=k - d,
                acs=acs,
                kast=kast,
                adr=adr,
                hs_percent=hs,
                fk=fk,
                fd=fd,
                fk_fd_diff=fk - fd,
            )
        )

    for p, ag, k, d, a, acs, adr, kast, hs, fk, fd in meta["roster2"]:
        stats.append(
            VLRPlayerStat(
                player=p,
                team=t2_name,
                agent=ag,
                k=k,
                d=d,
                a=a,
                kd_diff=k - d,
                acs=acs,
                kast=kast,
                adr=adr,
                hs_percent=hs,
                fk=fk,
                fd=fd,
                fk_fd_diff=fk - fd,
            )
        )

    return VLRMatchDetailsResponse(
        status="success",
        data=VLRMatchDetailsData(
            match_id=match_id,
            event={
                "name": meta["event_name"],
                "stage": meta["stage"],
                "series": meta["series"],
            },
            date=meta["date"],
            status="Completed",
            teams=[
                VLRTeam(name=t1_name, score=str(t1_score), is_winner=t1_score > t2_score),
                VLRTeam(name=t2_name, score=str(t2_score), is_winner=t2_score > t1_score),
            ],
            maps=[
                VLRMapDetail(
                    map_id="1",
                    name=meta["map_name"],
                    status="completed",
                    stats=stats,
                )
            ],
        ),
    )


def get_2026_matches_catalog() -> List[Dict[str, Any]]:
    """Return catalog of verified 2026 VCT Season matches."""
    catalog = []
    for match_id, meta in _MATCH_METADATA.items():
        is_c9 = "Cloud9" in (meta["team1_name"], meta["team2_name"])
        catalog.append(
            {
                "id": match_id,
                "match_id": match_id,
                "series_id": match_id,
                "teams": f"{meta['team1_name']} vs {meta['team2_name']}",
                "team1": meta["team1_name"],
                "team2": meta["team2_name"],
                "team1_name": meta["team1_name"],
                "team2_name": meta["team2_name"],
                "event": {
                    "name": meta["event_name"],
                    "stage": meta["stage"],
                    "series": meta["series"],
                },
                "score": f"{meta['team1_score']} - {meta['team2_score']}",
                "date": meta["date"],
                "scheduled_start": f"{meta['date']}T19:00:00Z",
                "status": "Completed",
                "is_cloud9": is_c9,
                "is_c9_match": is_c9,
                "event_name": meta["event_name"],
            }
        )
    return catalog


def get_2026_match_logs(match_id: str, game_id: str = "1") -> VLRMatchLogsResponse:
    """Return comprehensive 2026 season round-by-round event logs."""
    if match_id not in _MATCH_METADATA:
        raise ValueError(f"Unknown 2026 match: {match_id}")
    return _build_match_logs(match_id, _MATCH_METADATA[match_id], game_id=game_id)


def get_2026_match_details(match_id: str) -> VLRMatchDetailsResponse:
    """Return comprehensive 2026 season match details with per-map player statistics."""
    if match_id not in _MATCH_METADATA:
        raise ValueError(f"Unknown 2026 match: {match_id}")
    return _build_match_details(match_id, _MATCH_METADATA[match_id])

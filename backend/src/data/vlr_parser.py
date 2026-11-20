from typing import Optional
from src.models.match_state import KillEvent, ParsedGame, ParsedRound, ParsedSeries
from src.models.vlr_models import VLRMatchDetailsResponse, VLRMatchLogsResponse


def normalize_vlr_series(
    logs: VLRMatchLogsResponse,
    details: Optional[VLRMatchDetailsResponse] = None,
) -> ParsedSeries:
    team1_name = "Team 1"
    team2_name = "Team 2"

    if len(logs.data.teams) > 0:
        team1_name = logs.data.teams[0].name
        if len(logs.data.teams) > 1:
            team2_name = logs.data.teams[1].name
    elif details and len(details.data.teams) > 0:
        team1_name = details.data.teams[0].name
        if len(details.data.teams) > 1:
            team2_name = details.data.teams[1].name

    map_name = logs.data.map
    if not map_name or map_name == "Unknown":
        if details and len(details.data.maps) > 0:
            matched = next(
                (m.name for m in details.data.maps if m.map_id == logs.data.game_id),
                None,
            )
            map_name = matched or details.data.maps[0].name
        else:
            map_name = "Ascent"

    rounds = []
    for r in logs.data.rounds:
        kills = []
        is_first = True
        spike_planted = False
        planter_id = None
        plant_time = None

        for idx, ev in enumerate(r.events):
            if ev.type == "kill" and ev.killer and ev.victim:
                time_parts = ev.time.split(":")
                occurred_at = f"00:{ev.time}" if len(time_parts) == 2 else ev.time

                kills.append(
                    KillEvent(
                        event_id=f"vlr-k-{r.round_number}-{idx}",
                        killer_id=ev.killer,
                        victim_id=ev.victim,
                        killer_name=ev.killer,
                        victim_name=ev.victim,
                        weapon=ev.weapon or "Unknown",
                        occurred_at=occurred_at,
                        is_first_blood=is_first,
                    )
                )
                is_first = False
            elif ev.type == "plant":
                spike_planted = True
                planter_id = ev.killer or "Planter"
                plant_time = ev.time

        rounds.append(
            ParsedRound(
                round_number=r.round_number,
                winning_team_id=r.winning_team,
                round_winner_name=r.winning_team,
                win_condition=r.win_type,
                kills=kills,
                spike_planted=spike_planted,
                spike_planter_id=planter_id,
                spike_plant_time=plant_time,
            )
        )

    game = ParsedGame(
        game_id=logs.data.game_id or "1",
        map_name=map_name,
        rounds=rounds,
    )

    return ParsedSeries(
        series_id=logs.data.match_id,
        team1_name=team1_name,
        team2_name=team2_name,
        games=[game],
    )

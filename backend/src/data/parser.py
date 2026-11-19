from typing import Any, Dict, List, Optional
from src.data.metadata import get_player_name, _clean_team_name
from src.data.streamer import load_ability_supplement, stream_series_events
from src.models.match_state import (
    AbilityCast,
    KillEvent,
    ParsedGame,
    ParsedRound,
    ParsedSeries,
    Vector3D,
)


def _extract_position(entity: Optional[Dict[str, Any]]) -> Optional[Vector3D]:
    if not isinstance(entity, dict):
        return None
    state = entity.get("state")
    if not isinstance(state, dict):
        return None
    pos = state.get("position")
    if not pos:
        game_state = state.get("game")
        if isinstance(game_state, dict):
            pos = game_state.get("position")
    if isinstance(pos, dict) and "x" in pos and "y" in pos:
        x_val = float(pos.get("x", 0.0))
        y_val = float(pos.get("y", 0.0))
        z_val = float(pos.get("z", 0.0))
        return Vector3D(x=x_val, y=y_val, z=z_val)
    return None


def _extract_weapon(event: Dict[str, Any]) -> Optional[str]:
    actor = event.get("actor")
    if isinstance(actor, dict):
        delta = actor.get("stateDelta")
        if isinstance(delta, dict):
            for scope in ("round", "game", "series"):
                scope_delta = delta.get(scope)
                if isinstance(scope_delta, dict):
                    wk = scope_delta.get("weaponKills")
                    if isinstance(wk, dict) and wk:
                        return str(next(iter(wk.keys())))
    if event.get("weapon"):
        return str(event["weapon"])
    return None


def parse_series(series_id: str, max_envelopes: Optional[int] = None) -> ParsedSeries:
    supplements = load_ability_supplement(series_id)
    stream = stream_series_events(series_id, max_envelopes=max_envelopes)

    t1_name = "Team 1"
    t2_name = "Team 2"
    games_map: Dict[str, ParsedGame] = {}
    active_game_id: Optional[str] = None
    active_round: Optional[ParsedRound] = None
    invalidated_game_ids = set()

    for envelope in stream:
        occurred_at = envelope.get("occurredAt", "")
        events = envelope.get("events", [])

        for e in events:
            etype = e.get("type", "")

            # Extract team names from seriesState snapshot if present
            sstate = e.get("seriesState")
            if sstate and isinstance(sstate.get("teams"), list) and len(sstate["teams"]) >= 2:
                name1 = sstate["teams"][0].get("name")
                name2 = sstate["teams"][1].get("name")
                if name1:
                    t1_name = name1
                if name2:
                    t2_name = name2

            # Handle game start and rollback
            if etype == "series-started-game":
                target = e.get("target", {})
                gid = target.get("id") or str(len(games_map) + 1)
                map_name = target.get("state", {}).get("map", {}).get("name")
                if not map_name and sstate and "games" in sstate:
                    for g in sstate["games"]:
                        if g.get("id") == gid:
                            map_name = g.get("map", {}).get("name")
                            break
                if not map_name:
                    map_name = "Unknown"

                games_map[gid] = ParsedGame(game_id=gid, map_name=map_name)
                active_game_id = gid
                active_round = None

            elif etype == "series-!started-game":
                rolled_back_gid = e.get("target", {}).get("id")
                if rolled_back_gid:
                    invalidated_game_ids.add(rolled_back_gid)
                    games_map.pop(rolled_back_gid, None)
                    if active_game_id == rolled_back_gid:
                        active_game_id = None
                        active_round = None

            elif active_game_id and active_game_id not in invalidated_game_ids:
                game = games_map[active_game_id]

                if etype == "game-started-round":
                    r_num = len(game.rounds) + 1
                    active_round = ParsedRound(round_number=r_num)
                    game.rounds.append(active_round)

                elif active_round is not None:
                    if etype == "player-killed-player":
                        killer = e.get("actor", {}).get("id", "")
                        victim = e.get("target", {}).get("id", "")
                        is_first = len(active_round.kills) == 0

                        k_pos = _extract_position(e.get("actor"))
                        v_pos = _extract_position(e.get("target"))
                        weapon = _extract_weapon(e)

                        active_round.kills.append(
                            KillEvent(
                                event_id=e.get("id", ""),
                                killer_id=killer,
                                victim_id=victim,
                                killer_name=get_player_name(killer),
                                victim_name=get_player_name(victim),
                                weapon=weapon,
                                occurred_at=occurred_at,
                                killer_position=k_pos,
                                victim_position=v_pos,
                                is_first_blood=is_first,
                            )
                        )

                    elif etype == "player-used-ability":
                        eid = e.get("id", "")
                        pid = e.get("actor", {}).get("id", "")
                        ability_name = e.get("target", {}).get("id")
                        supp = supplements.get(eid)
                        slot = "UNKNOWN"
                        pos, view, vel = None, None, None

                        if supp:
                            slot = supp.get("slot", "UNKNOWN")
                            if not ability_name or ability_name == "used":
                                ability_name = supp.get("ability", ability_name)

                            interp = supp.get("interpolated")
                            if isinstance(interp, dict):
                                p = interp.get("position")
                                if isinstance(p, dict):
                                    pos = Vector3D(
                                        x=float(p.get("x", 0.0)),
                                        y=float(p.get("y", 0.0)),
                                        z=float(p.get("z", 0.0)),
                                    )
                                v = interp.get("view")
                                if isinstance(v, dict):
                                    view = Vector3D(
                                        x=float(v.get("x", 0.0)),
                                        y=float(v.get("y", 0.0)),
                                        z=float(v.get("z", 0.0)),
                                    )
                                ve = interp.get("velocity")
                                if isinstance(ve, dict):
                                    vel = Vector3D(
                                        x=float(ve.get("x", 0.0)),
                                        y=float(ve.get("y", 0.0)),
                                        z=float(ve.get("z", 0.0)),
                                    )
                            elif "x" in supp and "y" in supp and "z" in supp:
                                pos = Vector3D(
                                    x=float(supp["x"]),
                                    y=float(supp["y"]),
                                    z=float(supp["z"]),
                                )

                        if not ability_name:
                            ability_name = e.get("action", "ability")

                        active_round.ability_casts.append(
                            AbilityCast(
                                event_id=eid,
                                ability_id=ability_name,
                                slot=slot,
                                player_id=pid,
                                player_name=get_player_name(pid),
                                occurred_at=occurred_at,
                                position=pos,
                                view_direction=view,
                                velocity=vel,
                            )
                        )

                    elif etype == "player-completed-plantBomb":
                        active_round.spike_planted = True
                        active_round.spike_planter_id = e.get("actor", {}).get("id")
                        active_round.spike_plant_time = occurred_at

                    elif etype == "team-won-round":
                        active_round.winning_team_id = e.get("actor", {}).get("id")
                        win_cond = (
                            e.get("actor", {})
                            .get("stateDelta", {})
                            .get("round", {})
                            .get("winType")
                        )
                        if not win_cond:
                            teams_delta = (
                                e.get("target", {})
                                .get("stateDelta", {})
                                .get("teams", [])
                            )
                            if teams_delta and isinstance(teams_delta, list):
                                win_cond = teams_delta[0].get("winType")
                        active_round.win_condition = win_cond
                        raw_wname = e.get("actor", {}).get("state", {}).get("name")
                        if raw_wname:
                            active_round.round_winner_name = _clean_team_name(raw_wname)
                        elif active_round.winning_team_id:
                            active_round.round_winner_name = active_round.winning_team_id

    valid_games = [
        g for gid, g in games_map.items() if gid not in invalidated_game_ids
    ]
    return ParsedSeries(
        series_id=series_id,
        team1_name=t1_name,
        team2_name=t2_name,
        games=valid_games,
    )

from typing import List, Optional
from pydantic import BaseModel, Field


class Vector3D(BaseModel):
    x: float
    y: float
    z: float


class AbilityCast(BaseModel):
    event_id: str
    ability_id: str
    slot: str
    player_id: str
    player_name: Optional[str] = None
    occurred_at: str
    position: Optional[Vector3D] = None
    view_direction: Optional[Vector3D] = None
    velocity: Optional[Vector3D] = None


class KillEvent(BaseModel):
    event_id: str
    killer_id: str
    victim_id: str
    killer_name: Optional[str] = None
    victim_name: Optional[str] = None
    weapon: Optional[str] = None
    occurred_at: str
    killer_position: Optional[Vector3D] = None
    victim_position: Optional[Vector3D] = None
    is_first_blood: bool = False


class ParsedRound(BaseModel):
    round_number: int
    winning_team_id: Optional[str] = None
    round_winner_name: Optional[str] = None
    win_condition: Optional[str] = None
    kills: List[KillEvent] = Field(default_factory=list)
    ability_casts: List[AbilityCast] = Field(default_factory=list)
    spike_planted: bool = False
    spike_planter_id: Optional[str] = None
    spike_plant_time: Optional[str] = None


class ParsedGame(BaseModel):
    game_id: str
    map_name: str
    rounds: List[ParsedRound] = Field(default_factory=list)


class ParsedSeries(BaseModel):
    series_id: str
    team1_name: str
    team2_name: str
    games: List[ParsedGame] = Field(default_factory=list)

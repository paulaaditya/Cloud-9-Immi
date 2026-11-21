from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class VLRRoundEvent(BaseModel):
    time: str = ""
    type: str = "kill"
    killer: str = ""
    victim: Optional[str] = ""
    weapon: Optional[str] = ""
    assistants: List[str] = Field(default_factory=list)


class VLRRound(BaseModel):
    round_number: int
    winning_team: Optional[str] = ""
    win_type: Optional[str] = "elimination"
    events: List[VLRRoundEvent] = Field(default_factory=list)


class VLRTeam(BaseModel):
    id: Optional[str] = None
    name: str
    side: Optional[str] = None
    tag: Optional[str] = None
    score: Optional[Union[str, int]] = None
    is_winner: Optional[bool] = None


class VLRMatchLogsData(BaseModel):
    match_id: str
    game_id: Optional[str] = "1"
    map: Optional[str] = "Unknown"
    teams: List[VLRTeam] = Field(default_factory=list)
    rounds: List[VLRRound] = Field(default_factory=list)


class VLRMatchLogsResponse(BaseModel):
    status: str
    data: VLRMatchLogsData


class VLRPlayerStat(BaseModel):
    player: str
    team: Optional[str] = None
    agent: Optional[str] = None
    k: int = 0
    d: int = 0
    a: int = 0
    kd_diff: Optional[int] = 0
    acs: Optional[int] = 0
    kast: Optional[Union[str, float]] = None
    adr: Optional[float] = 0.0
    hs_percent: Optional[Union[str, float]] = None
    fk: int = 0
    fd: int = 0
    fk_fd_diff: Optional[int] = 0


class VLRMapDetail(BaseModel):
    map_id: Optional[str] = None
    name: str
    status: Optional[str] = "completed"
    stats: List[VLRPlayerStat] = Field(default_factory=list)


class VLRMatchDetailsData(BaseModel):
    match_id: str
    event: Optional[Dict[str, Any]] = Field(default_factory=dict)
    date: Optional[str] = None
    status: Optional[str] = None
    teams: List[VLRTeam] = Field(default_factory=list)
    maps: List[VLRMapDetail] = Field(default_factory=list)


class VLRMatchDetailsResponse(BaseModel):
    status: str
    data: VLRMatchDetailsData

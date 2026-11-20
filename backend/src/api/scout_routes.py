from typing import List, Optional, Set

from fastapi import APIRouter, HTTPException, Query

from src.scouting.aggregate import Filters, operator_query, team_options, utility_query
from src.scouting.buys import BUY_TYPES
from src.scouting.catalog import clean_team_name, find_team_ids, load_catalog, team_list
from src.vlr.client import SOURCE, VlrClient, VlrUnavailable

router = APIRouter(prefix="/api/v1/scout")

_vlr: Optional[VlrClient] = None


def get_vlr_client() -> VlrClient:
    global _vlr
    if _vlr is None:
        _vlr = VlrClient()
    return _vlr


def _csv(v: Optional[str]) -> Optional[Set[str]]:
    if not v:
        return None
    items = {x.strip().lower() for x in v.split(",") if x.strip()}
    return items or None


def _team_ids(team: str) -> List[str]:
    """`team` is a team ID, a comma list of IDs, or an exact team name."""
    cat = load_catalog()
    parts = [p.strip() for p in team.split(",") if p.strip()]
    if parts and all(p in cat.teams for p in parts):
        return parts
    ids = find_team_ids(team)
    if not ids:
        raise HTTPException(status_code=404, detail=f"Unknown team: {team}")
    return ids


def _filters(
    team: str,
    maps: Optional[str],
    side: Optional[str],
    agents: Optional[str],
    players: Optional[str],
    abilities: Optional[str],
    categories: Optional[str],
    patches: Optional[str],
    events: Optional[str],
    exclude_low_rate: bool,
    last_n_series: Optional[int],
    buys: Optional[str] = None,
) -> Filters:
    if side and side not in ("attacker", "defender"):
        raise HTTPException(status_code=422, detail="side must be 'attacker' or 'defender'")
    buy_set = _csv(buys)
    if buy_set and not buy_set <= set(BUY_TYPES):
        raise HTTPException(status_code=422, detail=f"buys must be a comma list of {', '.join(BUY_TYPES)}")
    return Filters(
        buys=buy_set,
        team_ids=_team_ids(team),
        maps=_csv(maps),
        side=side,
        agents=_csv(agents),
        players={p.strip() for p in players.split(",") if p.strip()} if players else None,
        abilities=_csv(abilities),
        categories=_csv(categories),
        patches={p.strip() for p in patches.split(",") if p.strip()} if patches else None,
        events={e.strip() for e in events.split("|") if e.strip()} if events else None,
        exclude_low_rate=exclude_low_rate,
        last_n_series=last_n_series,
    )


@router.get("/teams")
def teams(min_series: int = Query(1, ge=1)):
    """Teams in the dataset that can be scouted (most matches first)."""
    return team_list(min_series=min_series)


@router.get("/teams/{team}/vlr")
def vlr_context(team: str, date_start: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$")):
    """VLR.gg map win rates and roster for this team, via a self-hosted vlrggapi. Never raises if VLR is down."""
    cat = load_catalog()
    name = clean_team_name(cat.teams[team].get("name", team)) if team in cat.teams else team
    try:
        return get_vlr_client().team_profile(name, date_start)
    except VlrUnavailable as exc:
        return {"available": False, "source": SOURCE, "query": name, "reason": str(exc)}


@router.get("/teams/{team}/options")
def options(team: str):
    """Filter values (maps, agents, players, patches, events, abilities) drawn from this team's matches."""
    return team_options(_team_ids(team))


@router.get("/teams/{team}/utility")
def utility(
    team: str,
    maps: Optional[str] = Query(None, description="Comma list, e.g. haven,lotus. A single map enables heatmap hotspots"),
    side: Optional[str] = Query(None, description="attacker | defender"),
    agents: Optional[str] = None,
    players: Optional[str] = Query(None, description="Comma list of player IDs"),
    abilities: Optional[str] = Query(None, description="Comma list of ability IDs, e.g. trapwire,alarmbot"),
    categories: Optional[str] = Query(None, description="placeable,recon,smoke,stall,flash,molly,other"),
    patches: Optional[str] = None,
    events: Optional[str] = Query(None, description="Event names separated by |"),
    exclude_low_rate: bool = False,
    last_n_series: Optional[int] = Query(None, ge=1),
    buys: Optional[str] = Query(None, description="pistol,eco,half,full (this team's buy in the round)"),
):
    f = _filters(team, maps, side, agents, players, abilities, categories, patches, events, exclude_low_rate, last_n_series, buys)
    return utility_query(f)


@router.get("/teams/{team}/operator")
def operator(
    team: str,
    maps: Optional[str] = None,
    side: Optional[str] = None,
    agents: Optional[str] = None,
    players: Optional[str] = None,
    patches: Optional[str] = None,
    events: Optional[str] = None,
    exclude_low_rate: bool = False,
    last_n_series: Optional[int] = Query(None, ge=1),
    buys: Optional[str] = Query(None, description="pistol,eco,half,full (this team's buy in the round)"),
):
    f = _filters(team, maps, side, agents, players, None, None, patches, events, exclude_low_rate, last_n_series, buys)
    return operator_query(f)

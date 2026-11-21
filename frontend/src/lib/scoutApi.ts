export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface TeamSummary {
  team_id: string;
  name: string;
  series_count: number;
  events: string[];
}

export interface ScoutOptions {
  team_ids: string[];
  series: number;
  rounds: number;
  date_range: [string, string];
  maps: { map: string; rounds: number }[];
  patches: { patch: string; rounds: number }[];
  agents: { agent: string; rounds: number }[];
  abilities: { ability: string; casts: number }[];
  players: { id: string; name: string; rounds: number }[];
  events: { event: string; series: number }[];
  categories: string[];
}

export interface Hotspot {
  rank: number;
  x: number;
  y: number;
  nx: number | null;
  ny: number | null;
  casts: number;
  share_of_casts_pct: number;
  rounds_with: number;
  rounds_total: number;
  rounds_with_pct: number;
  median_t: number;
  p25_t: number;
  p75_t: number;
  top_abilities: { ability: string; casts: number }[];
  top_players: { player: string; casts: number }[];
}

export interface ScoutPoint {
  nx: number | null;
  ny: number | null;
  t: number;
  player: string;
  ability?: string;
}

export interface UtilityResult {
  filters: Record<string, unknown>;
  map: string | null;
  evidence: {
    series: number;
    rounds_analyzed: number;
    rounds_with_event: number;
    rounds_with_event_pct: number;
    casts: number;
    low_rate_rounds_pct: number;
    dropped_low_quality_casts: number;
    confidence: "high" | "medium" | "low";
    points_returned: number;
  };
  hotspots: Hotspot[];
  by_ability: { ability: string; casts: number }[];
  by_category: { category: string; casts: number }[];
  by_player: { player: string; casts: number }[];
  by_map: { map: string; rounds: number; casts: number }[];
  timing: { bucket_start: number; casts: number }[];
  points: ScoutPoint[];
  insights: string[];
  counter_notes: string[];
}

export interface OperatorPlayer {
  id: string;
  name: string;
  rounds_played: number;
  op_rounds: number;
  op_share_of_team_op_rounds_pct: number;
  op_rate_when_playing_pct: number;
  main_op_agent: string | null;
  agents: { agent: string; rounds: number }[];
  median_loadout_with_op: number | null;
  op_kills: number;
  sides: Record<string, number>;
}

export interface OperatorResult {
  filters: Record<string, unknown>;
  map: string | null;
  evidence: {
    series: number;
    rounds_analyzed: number;
    rounds_with_operator: number;
    rounds_with_operator_pct: number;
    operator_kills: number;
    low_rate_rounds_pct: number;
    confidence: "high" | "medium" | "low";
    rounds_with_two_or_more_operators: number;
  };
  by_side: Record<string, { rounds: number; with_op: number; pct: number }>;
  by_map: { map: string; rounds: number; with_op: number; pct: number }[];
  by_buy: { buy: string; rounds: number; with_op: number; op_kills: number; pct: number }[];
  players: OperatorPlayer[];
  kill_timing: { bucket: string; kills: number; pct: number }[];
  kill_distance_from_spawn_m: { median: number | null; p25: number | null; p75: number | null; n: number };
  median_loadout_with_op: number | null;
  hotspots: Hotspot[];
  points: ScoutPoint[];
  insights: string[];
  counter_notes: string[];
}

export interface DefenseSite {
  id: string;
  name: string;
  x: number;
  y: number;
  nx: number | null;
  ny: number | null;
  plants: number;
  avg_defenders: number;
}

export interface DefenseResult {
  filters: Record<string, unknown>;
  map: string;
  bounds: unknown;
  snapshot_seconds: number;
  site_radius_m: number;
  evidence: {
    series: number;
    rounds_analyzed: number;
    rounds_with_setup: number;
    rounds_with_setup_pct: number;
    defense_win_pct: number;
    confidence: "high" | "medium" | "low";
  };
  sites: DefenseSite[];
  avg_mid_defenders: number;
  setups: { key: string; label: string; counts: Record<string, number>; rounds: number; share_pct: number; wins: number; win_pct: number }[];
  site_load: { zone: string; name: string; rows: { defenders: string; rounds: number; win_pct: number }[] }[];
  players: { id: string; name: string; rounds: number; main_agent: string | null; zones: { zone: string; rounds: number; pct: number }[] }[];
  hotspots: Hotspot[];
  points: (ScoutPoint & { zone: string; setup: string })[];
  insights: string[];
  counter_notes: string[];
}

export interface AttackResult {
  filters: Record<string, unknown>;
  map: string;
  bounds: unknown;
  snapshot_seconds: number;
  evidence: {
    series: number;
    rounds_analyzed: number;
    rounds_planted: number;
    plant_pct: number;
    attack_win_pct: number;
    rounds_with_lean: number;
    confidence: "high" | "medium" | "low";
  };
  sites: DefenseSite[];
  targets: {
    zone: string;
    name: string;
    rounds: number;
    share_pct: number;
    win_pct: number;
    median_plant_t: number;
    paces: Record<string, number>;
    avg_utility: number;
    top_abilities: { ability: string; per_round: number }[];
  }[];
  no_plant: { rounds: number; win_pct: number };
  pace: { pace: string; label: string; rounds: number; share_pct: number; win_pct: number }[];
  leans: { key: string; label: string; rounds: number; share_pct: number; win_pct: number; planted_on: { zone: string; name: string; pct: number }[] }[];
  planters: { id: string; name: string; plants: number; main_agent: string | null; share_pct: number }[];
  points: (ScoutPoint & { zone: string })[];
  insights: string[];
  counter_notes: string[];
}

export interface ScoutFilters {
  maps: string;
  side: "" | "attacker" | "defender";
  agents: string;
  players: string;
  abilities: string[];
  categories: string[];
  patches: string;
  excludeLowRate: boolean;
  lastN: number | "";
}

export const EMPTY_FILTERS: ScoutFilters = {
  maps: "",
  side: "",
  agents: "",
  players: "",
  abilities: [],
  categories: [],
  patches: "",
  excludeLowRate: false,
  lastN: "",
};

function qs(f: ScoutFilters, kind: "utility" | "operator" | "defense" | "attack"): string {
  const p = new URLSearchParams();
  if (f.maps) p.set("maps", f.maps);
  if (f.side) p.set("side", f.side);
  if (f.agents) p.set("agents", f.agents);
  if (f.players) p.set("players", f.players);
  if (f.patches) p.set("patches", f.patches);
  if (f.excludeLowRate) p.set("exclude_low_rate", "true");
  if (f.lastN) p.set("last_n_series", String(f.lastN));
  if (kind === "utility") {
    if (f.abilities.length) p.set("abilities", f.abilities.join(","));
    if (f.categories.length) p.set("categories", f.categories.join(","));
  }
  return p.toString();
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const fetchTeams = (signal?: AbortSignal) =>
  getJson<TeamSummary[]>(`${API_BASE}/api/v1/scout/teams`, signal);

export const fetchOptions = (teamId: string, signal?: AbortSignal) =>
  getJson<ScoutOptions>(`${API_BASE}/api/v1/scout/teams/${encodeURIComponent(teamId)}/options`, signal);

export const fetchUtility = (teamId: string, f: ScoutFilters, signal?: AbortSignal) =>
  getJson<UtilityResult>(`${API_BASE}/api/v1/scout/teams/${encodeURIComponent(teamId)}/utility?${qs(f, "utility")}`, signal);

export const fetchOperator = (teamId: string, f: ScoutFilters, signal?: AbortSignal) =>
  getJson<OperatorResult>(`${API_BASE}/api/v1/scout/teams/${encodeURIComponent(teamId)}/operator?${qs(f, "operator")}`, signal);

export const fetchDefense = (teamId: string, f: ScoutFilters, at: number, signal?: AbortSignal) =>
  getJson<DefenseResult>(`${API_BASE}/api/v1/scout/teams/${encodeURIComponent(teamId)}/defense?${qs(f, "defense")}&at=${at}`, signal);

export const fetchAttack = (teamId: string, f: ScoutFilters, at: number, signal?: AbortSignal) =>
  getJson<AttackResult>(`${API_BASE}/api/v1/scout/teams/${encodeURIComponent(teamId)}/attack?${qs(f, "attack")}&at=${at}`, signal);

export interface CounterCard {
  team: string;
  map: string;
  sections: { title: string; evidence: string; confidence: "high" | "medium" | "low"; actions: string[]; facts: string[] }[];
  caveats: string[];
  sites: DefenseSite[];
  bounds: unknown;
  defense_points: (ScoutPoint & { zone: string })[];
  attack_points: (ScoutPoint & { zone: string })[];
}

export const fetchCard = (teamId: string, map: string, signal?: AbortSignal) =>
  getJson<CounterCard>(`${API_BASE}/api/v1/scout/teams/${encodeURIComponent(teamId)}/card?maps=${encodeURIComponent(map)}`, signal);

export interface TimeoutAdvice {
  map: string;
  opp_side: "attacker" | "defender";
  streak: number;
  situation: "behind" | "ahead" | "even";
  situation_text: string;
  situation_used: boolean;
  sites: DefenseSite[];
  adjustments: { kind: string; text: string; rounds: number; confidence: "high" | "medium" | "low" }[];
  facts: string[];
  caveats: string[];
  ai?: { available: boolean; model?: string; call?: string; priorities?: string[]; reason?: string };
}

export const fetchTimeout = (
  teamId: string,
  map: string,
  side: "attacker" | "defender",
  streak: number,
  observed: string[],
  ai: boolean,
  signal?: AbortSignal
) =>
  getJson<TimeoutAdvice>(
    `${API_BASE}/api/v1/scout/teams/${encodeURIComponent(teamId)}/timeout?maps=${encodeURIComponent(map)}&side=${side}&streak=${streak}` +
      `${observed.length ? `&observed=${encodeURIComponent(observed.join(","))}` : ""}${ai ? "&ai=true" : ""}`,
    signal
  );

export interface SeriesRow {
  series_id: string;
  date: string;
  event: string;
  stage: string;
  teams: string;
  games: { game_id: string; number: number; map: string; winner: string | null }[];
}

export interface ReplayPlayer {
  id: string;
  name: string;
  tid: string;
  side: "attacker" | "defender";
  agent: string;
  loadout: number | null;
  money: number | null;
  weapons: string[];
  op: boolean;
}

export interface ReplayRound {
  n: number;
  sides: Record<string, "attacker" | "defender">;
  winner: string | null;
  end: { type: "elimination" | "detonation" | "defuse" | "time" | "unknown"; inferred: boolean };
  duration: number;
  plant: { t: number; pid: string; tid: string; x: number; y: number } | null;
  players: ReplayPlayer[];
  kills: { t: number; kid: string; vid: string; ktid: string; vtid: string; weapon: string | null; kx: number | null; ky: number | null; vx: number | null; vy: number | null; first: boolean }[];
  casts: { t: number; pid: string; ability: string; cat: string; x: number; y: number }[];
  frames: { t: number; p: Record<string, [number, number]> }[];
  shots: { t: number; a: string; v: string }[];
  aims: { t: number; pid: string; dx: number; dy: number }[];
}

export interface ReplayData {
  series_id: string;
  game_id: string;
  map: string;
  bounds: { min: { x: number; y: number }; max: { x: number; y: number } } | null;
  teams: Record<string, string>;
  rounds: ReplayRound[];
}

export const fetchSeries = (teamId: string, signal?: AbortSignal) =>
  getJson<SeriesRow[]>(`${API_BASE}/api/v1/scout/teams/${encodeURIComponent(teamId)}/series?limit=60`, signal);

export const fetchReplay = (seriesId: string, gameId: string, signal?: AbortSignal) =>
  getJson<ReplayData>(`${API_BASE}/api/v1/scout/series/${encodeURIComponent(seriesId)}/games/${encodeURIComponent(gameId)}/replay`, signal);

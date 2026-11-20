export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface AbilityCast {
  event_id: string;
  ability_id: string;
  slot: string;
  player_id: string;
  player_name?: string | null;
  character_name?: string | null;
  occurred_at: string;
  position?: Vector3D | null;
  view_direction?: Vector3D | null;
  velocity?: Vector3D | null;
}

export interface KillEvent {
  event_id: string;
  killer_id: string;
  victim_id: string;
  player_name?: string | null;
  character_name?: string | null;
  killer_name?: string | null;
  victim_name?: string | null;
  weapon?: string | null;
  occurred_at: string;
  killer_position?: Vector3D | null;
  victim_position?: Vector3D | null;
  is_first_blood: boolean;
}

export interface ParsedRound {
  round_number: number;
  winning_team_id?: string | null;
  round_winner_name?: string | null;
  win_condition?: string | null;
  kills: KillEvent[];
  ability_casts: AbilityCast[];
  spike_planted: boolean;
  spike_planter_id?: string | null;
  spike_plant_time?: string | null;
}

export interface ParsedGame {
  game_id: string;
  map_name: string;
  rounds: ParsedRound[];
}

export interface AttributedMistake {
  mistake_type: string;
  player_id: string;
  player_name?: string | null;
  character_name?: string | null;
  team_name?: string | null;
  round_number: number;
  occurred_at: string;
  win_prob_delta: number;
  description: string;
  coaching_fix: string;
}

export interface PlayerReportCard {
  player_id: string;
  player_name?: string | null;
  character_name?: string | null;
  team_name?: string | null;
  mistake_count: number;
  cumulative_xrw_tax: number;
  primary_vulnerability: string;
  actionable_summary: string;
  mistakes?: AttributedMistake[];
}

export interface PrescribedDrill {
  drill_name: string;
  target_players: string[];
  target_player_names?: string[];
  drill_objective: string;
  setup_steps: string[];
  success_criterion: string;
}

export interface VLRPlayerStat {
  player: string;
  team?: string | null;
  agent?: string | null;
  k: number;
  d: number;
  a: number;
  kd_diff?: number | null;
  acs?: number | null;
  kast?: string | number | null;
  adr?: number | null;
  hs_percent?: string | number | null;
  fk: number;
  fd: number;
  fk_fd_diff?: number | null;
}

export interface RoundCoachingInsight {
  round_number: number;
  narrative: string;
  blunder_culprit?: string | null;
  win_prob_tax: number;
  tactical_directive: string;
  player_stat_verdict?: string | null;
  recommended_drill: PrescribedDrill;
}

export interface FeaturedSeries {
  series_id: string;
  event: string;
  teams: string;
  stage?: string;
  is_cloud9?: boolean;
  scheduled_start?: string;
  team1_name?: string;
  team2_name?: string;
  is_c9_match?: boolean;
}

export interface RosterEntry {
  player_id: string;
  player_name: string;
  character_name: string;
  team_name: string;
  side?: string;
}

export interface CoachingReportResponse {
  series_id: string;
  team1_name: string;
  team2_name: string;
  total_games: number;
  selected_game_index?: number;
  games: ParsedGame[];
  roster?: Record<string, RosterEntry>;
  featured_series?: FeaturedSeries[];
  player_stats?: Record<string, VLRPlayerStat>;
  total_mistakes_detected: number;
  mistakes: AttributedMistake[];
  player_reports: PlayerReportCard[];
  prescribed_drills: PrescribedDrill[];
  round_insights?: RoundCoachingInsight[];
}

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
  occurred_at: string;
  position?: Vector3D | null;
  view_direction?: Vector3D | null;
  velocity?: Vector3D | null;
}

export interface KillEvent {
  event_id: string;
  killer_id: string;
  victim_id: string;
  weapon?: string | null;
  occurred_at: string;
  killer_position?: Vector3D | null;
  victim_position?: Vector3D | null;
  is_first_blood: boolean;
}

export interface ParsedRound {
  round_number: number;
  winning_team_id?: string | null;
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
  round_number: number;
  occurred_at: string;
  win_prob_delta: number;
  description: string;
  coaching_fix: string;
}

export interface PlayerReportCard {
  player_id: string;
  mistake_count: number;
  cumulative_xrw_tax: number;
  primary_vulnerability: string;
  actionable_summary: string;
}

export interface PrescribedDrill {
  drill_name: string;
  target_players: string[];
  drill_objective: string;
  setup_steps: string[];
  success_criterion: string;
}

export interface CoachingReportResponse {
  series_id: string;
  team1_name: string;
  team2_name: string;
  total_games: number;
  games: ParsedGame[];
  total_mistakes_detected: number;
  mistakes: AttributedMistake[];
  player_reports: PlayerReportCard[];
  prescribed_drills: PrescribedDrill[];
}

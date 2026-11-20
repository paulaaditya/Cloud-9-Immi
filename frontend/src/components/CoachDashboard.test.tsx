import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import CoachDashboardPage from "../app/page";
import { useCoachStore } from "../store/coachStore";
import { CoachingReportResponse, FeaturedSeries } from "../types/api";

const TEST_2026_SERIES: FeaturedSeries[] = [
  {
    series_id: "vlr-c9-sen-2026",
    teams: "Cloud9 vs Sentinels",
    event: "VCT Americas 2026 Stage 1",
    is_cloud9: true,
  },
  {
    series_id: "vlr-c9-nrg-2026",
    teams: "Cloud9 vs NRG",
    event: "VCT Americas 2026 Playoffs",
    is_cloud9: true,
  },
  {
    series_id: "vlr-c9-fnc-masters2026",
    teams: "Cloud9 vs Fnatic",
    event: "VCT Masters 2026 Santiago",
    is_cloud9: true,
  },
  {
    series_id: "vlr-c9-prx-champions2026",
    teams: "Cloud9 vs Paper Rex",
    event: "VCT Champions 2026 Paris",
    is_cloud9: true,
  },
  {
    series_id: "vlr-sen-th-champions2026",
    teams: "Sentinels vs Team Heretics",
    event: "VCT Champions 2026 Paris Grand Final",
    is_cloud9: false,
  },
];

const TEST_2026_REPORT: CoachingReportResponse = {
  series_id: "vlr-c9-sen-2026",
  team1_name: "Cloud9",
  team2_name: "Sentinels",
  total_games: 2,
  selected_game_index: 0,
  games: [
    {
      game_id: "1",
      map_name: "Ascent",
      rounds: Array.from({ length: 24 }, (_, i) => ({
        round_number: i + 1,
        winning_team_id: i % 2 === 0 ? "Cloud9" : "Sentinels",
        round_winner_name: i % 2 === 0 ? "Cloud9" : "Sentinels",
        win_condition: i % 3 === 0 ? "SpikeDefused" : "Elimination",
        kills: [
          {
            event_id: `kill-${i}-1`,
            killer_id: "OXY",
            victim_id: "zekken",
            killer_name: "OXY",
            victim_name: "zekken",
            weapon: "Vandal",
            occurred_at: "00:0:15",
            killer_position: { x: 320, y: 220, z: 0 },
            victim_position: { x: 290, y: 280, z: 0 },
            is_first_blood: true,
          },
        ],
        ability_casts: [],
        spike_planted: i % 2 === 1,
        spike_planter_id: i % 2 === 1 ? "vanity" : null,
        spike_plant_time: null,
      })),
    },
    {
      game_id: "2",
      map_name: "Bind",
      rounds: [],
    },
  ],
  total_mistakes_detected: 1,
  mistakes: [
    {
      mistake_type: "UNTRADED_FIRST_DEATH",
      player_id: "OXY",
      player_name: "OXY",
      character_name: "Jett",
      team_name: "Cloud9",
      round_number: 1,
      occurred_at: "00:0:15",
      win_prob_delta: -0.312,
      description: "Untraded opening death with no return trade within 3.5 seconds.",
      coaching_fix: "Establish buddy-system spacing (< 6 meters) and hold crossfire angles rather than dry-peeking before support utility.",
    },
  ],
  player_reports: [
    {
      player_id: "OXY",
      player_name: "OXY",
      character_name: "Jett",
      team_name: "Cloud9",
      mistake_count: 1,
      cumulative_xrw_tax: -0.312,
      primary_vulnerability: "UNTRADED_FIRST_DEATH",
      actionable_summary: "OXY: Establish buddy-system spacing (< 6 meters) and hold crossfire angles rather than dry-peeking before support utility.",
      mistakes: [],
    },
  ],
  prescribed_drills: [
    {
      drill_name: "Buddy-System Contact & Trade Timing 2v2",
      target_players: ["OXY"],
      target_player_names: ["OXY"],
      drill_objective: "Reinforce sub-6m proximity spacing.",
      setup_steps: ["Pair entry fragger and secondary trader at choke entrance."],
      success_criterion: "Trade kill completed within 2.0 seconds in at least 80% of repetitions.",
    },
  ],
  player_stats: {
    OXY: {
      player: "OXY",
      team: "Cloud9",
      agent: "Jett",
      k: 22,
      d: 14,
      a: 4,
      acs: 284,
      adr: 182,
      fk: 7,
      fd: 2,
    },
  },
  round_insights: Array.from({ length: 24 }, (_, i) => ({
    round_number: i + 1,
    narrative: `Round ${i + 1} concluded with Cloud9 victory.`,
    blunder_culprit: "OXY",
    win_prob_tax: -0.24,
    tactical_directive: "Coordinate flash utility with duelist entry.",
    player_stat_verdict: "OXY has 7 FK and 2 FD (284 ACS).",
    recommended_drill: {
      drill_name: "Buddy-System Contact & Trade Timing 2v2",
      target_players: ["OXY"],
      target_player_names: ["OXY"],
      drill_objective: "Reinforce spacing.",
      setup_steps: [],
      success_criterion: "80%",
    },
  })),
};

global.fetch = jest.fn((url: string | URL | Request) => {
  const urlStr = url.toString();
  if (urlStr.includes("/featured-series")) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(TEST_2026_SERIES),
    });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(TEST_2026_REPORT),
  });
}) as jest.Mock;

describe("CoachDashboard Layout (Wireframe Specification)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCoachStore.setState({
      selectedSeriesId: "vlr-c9-sen-2026",
      currentGameIndex: 0,
      selectedPlayerId: null,
      selectedMistakeId: null,
      isPlaying: false,
      currentRound: 1,
      totalRounds: 24,
      selectedMistake: null,
      selectedRoundInsight: null,
    });
  });

  it("renders the top header bar with branding, series selector, map switcher, and live telemetry", async () => {
    await act(async () => {
      render(<CoachDashboardPage />);
    });

    // Brand title
    expect(screen.getByText("CLOUD9")).toBeInTheDocument();
    expect(screen.getByText("ORACLE")).toBeInTheDocument();

    // Series selector defaults to 2026 VCT Americas Cloud9 vs Sentinels
    const seriesSelect = screen.getByRole("combobox", { name: /select series/i });
    expect(seriesSelect).toBeInTheDocument();
    expect(seriesSelect).toHaveValue("vlr-c9-sen-2026");

    // Map switcher buttons
    expect(screen.getByRole("button", { name: /map 1: ascent/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /map 2: bind/i })).toBeInTheDocument();

    // Telemetry status badge
    expect(screen.getByText(/live telemetry/i)).toBeInTheDocument();
  });

  it("renders the 4 distinct layout cards matching the wireframe", async () => {
    await act(async () => {
      render(<CoachDashboardPage />);
    });

    // Left Column Card 1: Round Selection
    const roundSelectionCard = screen.getByTestId("round-selection-card");
    expect(roundSelectionCard).toBeInTheDocument();
    expect(roundSelectionCard).toHaveClass("c9-watercolor-card");
    expect(screen.getByText("Round Selection")).toBeInTheDocument();
    expect(screen.getByTestId("round-scrubber")).toBeInTheDocument();

    // Left Column Card 2: Tactical Map Replay
    const mapCard = screen.getByTestId("map-card");
    expect(mapCard).toBeInTheDocument();
    expect(screen.getByText("Tactical Minimap Replay")).toBeInTheDocument();
    expect(screen.getByTestId("minimap-canvas")).toBeInTheDocument();

    // Right Column Card 1: Player Error Report
    const playerErrorCard = screen.getByTestId("player-error-report-card");
    expect(playerErrorCard).toBeInTheDocument();
    expect(screen.getByText("Player Error Tax Report Cards")).toBeInTheDocument();
    expect(
      screen.getByText(/OXY: Establish buddy-system spacing/i)
    ).toBeInTheDocument();

    // Right Column Card 2: Training Drills
    const trainingDrillsCard = screen.getByTestId("training-drills-card");
    expect(trainingDrillsCard).toBeInTheDocument();
    expect(screen.getByText("Prescribed Tactical Training Drills")).toBeInTheDocument();
  });

  it("coordinates round selection between RoundSelection card and MinimapReplay card", async () => {
    await act(async () => {
      render(<CoachDashboardPage />);
    });

    // Initially Round 1
    expect(screen.getByTestId("current-round-display")).toHaveTextContent("Round 1 / 24");

    // Click R3 pill in RoundSelection
    const r3Pills = screen.getAllByRole("button", { name: /r3/i });
    await act(async () => {
      fireEvent.click(r3Pills[0]);
    });

    // Both round display and map telemetry update
    expect(screen.getByTestId("current-round-display")).toHaveTextContent("Round 3 / 24");
    expect(screen.getByText("Round 3 Telemetry")).toBeInTheDocument();
  });

  it("coordinates player selection filter between PlayerReportCards and MinimapReplay", async () => {
    await act(async () => {
      render(<CoachDashboardPage />);
    });

    // Click OXY card in Player Report Cards
    const oxyCard = screen.getByTestId("player-card-OXY");
    await act(async () => {
      fireEvent.click(oxyCard);
    });

    // Minimap focus badge should appear for OXY
    expect(screen.getByText("Focus: OXY")).toBeInTheDocument();
  });

  it("renders SLMCoachPanel and updates with round changes", async () => {
    await act(async () => {
      render(<CoachDashboardPage />);
    });

    expect(screen.getByTestId("slm-coach-panel-container")).toBeInTheDocument();
    expect(screen.getByText(/AI Assistant Coach: Round 1/i)).toBeInTheDocument();

    // Change to Round 3
    const r3Pills = screen.getAllByRole("button", { name: /r3/i });
    await act(async () => {
      fireEvent.click(r3Pills[0]);
    });

    expect(screen.getByText(/AI Assistant Coach: Round 3/i)).toBeInTheDocument();
  });

  it("renders individual player stats badges in PlayerReportCards", async () => {
    await act(async () => {
      render(<CoachDashboardPage />);
    });

    const reportCard = screen.getByTestId("player-error-report-card");
    expect(within(reportCard).getByText(/284 ACS/i)).toBeInTheDocument();
    expect(within(reportCard).getByText(/7 FK \/ 2 FD/i)).toBeInTheDocument();
  });

  it("allows switching matches across VCT Americas 2026, VCT Masters 2026, and VCT Champions 2026", async () => {
    await act(async () => {
      render(<CoachDashboardPage />);
    });

    const seriesSelect = screen.getByRole("combobox", { name: /select series/i });
    expect(seriesSelect).toHaveValue("vlr-c9-sen-2026");

    // Switch to VCT Americas 2026 Playoffs (Cloud9 vs NRG)
    await act(async () => {
      fireEvent.change(seriesSelect, { target: { value: "vlr-c9-nrg-2026" } });
    });
    expect(useCoachStore.getState().selectedSeriesId).toBe("vlr-c9-nrg-2026");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/vlr/match/vlr-c9-nrg-2026/coaching-report"),
      expect.any(Object)
    );

    // Switch to VCT Masters 2026 Santiago (Cloud9 vs Fnatic)
    await act(async () => {
      fireEvent.change(seriesSelect, { target: { value: "vlr-c9-fnc-masters2026" } });
    });
    expect(useCoachStore.getState().selectedSeriesId).toBe("vlr-c9-fnc-masters2026");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/vlr/match/vlr-c9-fnc-masters2026/coaching-report"),
      expect.any(Object)
    );

    // Switch to VCT Champions 2026 Paris (Cloud9 vs Paper Rex)
    await act(async () => {
      fireEvent.change(seriesSelect, { target: { value: "vlr-c9-prx-champions2026" } });
    });
    expect(useCoachStore.getState().selectedSeriesId).toBe("vlr-c9-prx-champions2026");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/vlr/match/vlr-c9-prx-champions2026/coaching-report"),
      expect.any(Object)
    );

    // Switch to VCT Champions 2026 Paris Grand Final (Sentinels vs Team Heretics)
    await act(async () => {
      fireEvent.change(seriesSelect, { target: { value: "vlr-sen-th-champions2026" } });
    });
    expect(useCoachStore.getState().selectedSeriesId).toBe("vlr-sen-th-champions2026");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/vlr/match/vlr-sen-th-champions2026/coaching-report"),
      expect.any(Object)
    );
  });
});

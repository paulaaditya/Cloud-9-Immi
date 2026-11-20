"use client";

import React, { useEffect, useState } from "react";
import { useCoachStore } from "../store/coachStore";
import { RoundSelection } from "../components/RoundSelection";
import { MinimapReplay } from "../components/MinimapReplay";
import { PlayerReportCards } from "../components/PlayerReportCards";
import { DrillPrescriptions } from "../components/DrillPrescriptions";
import { SLMCoachPanel } from "../components/SLMCoachPanel";
import { Cloud9Logo } from "../components/Cloud9Logo";
import { getMapDisplayName } from "../lib/mapCoords";
import {
  AttributedMistake,
  CoachingReportResponse,
  FeaturedSeries,
  RoundCoachingInsight,
  VLRPlayerStat,
} from "../types/api";

const DEFAULT_FEATURED_SERIES: FeaturedSeries[] = [
  {
    series_id: "2748746",
    teams: "NRG vs Cloud9",
    event: "VCT Americas Stage 1",
    is_cloud9: true,
  },
  {
    series_id: "vlr-773435",
    teams: "Cloud9 vs NRG (VLR Live)",
    event: "VCT Americas",
    is_cloud9: true,
  },
  {
    series_id: "2748750",
    teams: "Cloud9 vs G2 Esports",
    event: "VCT Americas Stage 1",
    is_cloud9: true,
  },
  {
    series_id: "2748754",
    teams: "Cloud9 vs MIBR",
    event: "VCT Americas Stage 1",
    is_cloud9: true,
  },
  {
    series_id: "2748743",
    teams: "Evil Geniuses vs LOUD",
    event: "VCT Americas Stage 1",
    is_cloud9: false,
  },
];

const MOCK_MISTAKES: AttributedMistake[] = [
  {
    mistake_type: "UNTRADED_FIRST_DEATH",
    player_id: "OXY",
    player_name: "OXY",
    character_name: "Jett",
    team_name: "Cloud9",
    round_number: 1,
    occurred_at: "2026-11-19T10:00:15Z",
    win_prob_delta: -0.312,
    description: "Untraded opening death with no return trade within 3.0 seconds.",
    coaching_fix: "Establish buddy-system spacing (< 6 meters) and hold crossfire angles rather than dry-peeking before support utility.",
  },
  {
    mistake_type: "ISOLATED_DUEL",
    player_id: "vanity",
    player_name: "vanity",
    character_name: "Omen",
    team_name: "Cloud9",
    round_number: 2,
    occurred_at: "2026-11-19T10:01:22Z",
    win_prob_delta: -0.245,
    description: "Isolated duel in A Main without trade support or escape utility.",
    coaching_fix: "Anchor crossfire with site partner before initiating contested duel.",
  },
  {
    mistake_type: "UTILITY_DELAY",
    player_id: "Xeppaa",
    player_name: "Xeppaa",
    character_name: "Fade",
    team_name: "Cloud9",
    round_number: 3,
    occurred_at: "2026-11-19T10:02:40Z",
    win_prob_delta: -0.180,
    description: "Utility delay on site execute flash, leaving duelist exposed.",
    coaching_fix: "Pre-align flash lineup and pop flash 0.5s before entry contact.",
  },
  {
    mistake_type: "UNTRADED_FIRST_DEATH",
    player_id: "runi",
    player_name: "runi",
    character_name: "Sova",
    team_name: "Cloud9",
    round_number: 4,
    occurred_at: "2026-11-19T10:03:18Z",
    win_prob_delta: -0.295,
    description: "Untraded opening death on B site defense.",
    coaching_fix: "Hold defensive angle with secondary partner trade line.",
  },
  {
    mistake_type: "ISOLATED_DUEL",
    player_id: "moose",
    player_name: "moose",
    character_name: "Cypher",
    team_name: "Cloud9",
    round_number: 5,
    occurred_at: "2026-11-19T10:04:30Z",
    win_prob_delta: -0.220,
    description: "Mid lurk caught without line of sight or crossfire.",
    coaching_fix: "Synchronize lurk timing with main site pressure.",
  },
  {
    mistake_type: "ISOLATED_DUEL",
    player_id: "crashies",
    player_name: "crashies",
    character_name: "Sova",
    team_name: "NRG",
    round_number: 6,
    occurred_at: "2026-11-19T10:05:22Z",
    win_prob_delta: -0.235,
    description: "Caught reloading in B Main without cover or fallback trade angle.",
    coaching_fix: "Conceal reload timing behind sentinel utility.",
  },
  {
    mistake_type: "UNTRADED_FIRST_DEATH",
    player_id: "OXY",
    player_name: "OXY",
    character_name: "Jett",
    team_name: "Cloud9",
    round_number: 7,
    occurred_at: "2026-11-19T10:06:12Z",
    win_prob_delta: -0.320,
    description: "Aggressive dry peek into Operator angle at Mid Courtyard.",
    coaching_fix: "Request drone or flash utility before contesting sniper lane.",
  },
  {
    mistake_type: "UTILITY_DELAY",
    player_id: "Xeppaa",
    player_name: "Xeppaa",
    character_name: "Fade",
    team_name: "Cloud9",
    round_number: 9,
    occurred_at: "2026-11-19T10:08:45Z",
    win_prob_delta: -0.175,
    description: "Late recon dart deployment after enemy had already secured site footprint.",
    coaching_fix: "Deploy early recon pulse during default phase to deny initial map control.",
  },
  {
    mistake_type: "UNTRADED_FIRST_DEATH",
    player_id: "Victor",
    player_name: "Victor",
    character_name: "Killjoy",
    team_name: "NRG",
    round_number: 10,
    occurred_at: "2026-11-19T10:09:50Z",
    win_prob_delta: -0.280,
    description: "Untraded death pushing Mid Catwalk during eco round.",
    coaching_fix: "Maintain discipline on eco rounds and group for trade frags.",
  },
  {
    mistake_type: "UNTRADED_FIRST_DEATH",
    player_id: "OXY",
    player_name: "OXY",
    character_name: "Jett",
    team_name: "Cloud9",
    round_number: 12,
    occurred_at: "2026-11-19T10:11:05Z",
    win_prob_delta: -0.315,
    description: "Untraded opening death during B Long retake.",
    coaching_fix: "Synchronize retake execute on smoke blossom timing with teammates.",
  },
];

const MOCK_COACHING_REPORT: CoachingReportResponse = {
  series_id: "2748746",
  team1_name: "NRG",
  team2_name: "Cloud9",
  total_games: 2,
  selected_game_index: 0,
  games: [
    {
      game_id: "game-1",
      map_name: "Ascent",
      rounds: Array.from({ length: 24 }, (_, i) => ({
        round_number: i + 1,
        winning_team_id: i % 2 === 0 ? "Cloud9" : "NRG",
        round_winner_name: i % 2 === 0 ? "Cloud9" : "NRG",
        win_condition: i % 3 === 0 ? "SpikeDefused" : "Elimination",
        kills: [
          {
            event_id: `kill-${i}-1`,
            killer_id: "crashies",
            victim_id: i % 2 === 0 ? "OXY" : "vanity",
            killer_name: "crashies",
            victim_name: i % 2 === 0 ? "OXY" : "vanity",
            weapon: "Vandal",
            occurred_at: `2026-11-19T10:0${i % 10}:15Z`,
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
      game_id: "game-2",
      map_name: "Bind",
      rounds: Array.from({ length: 21 }, (_, i) => ({
        round_number: i + 1,
        winning_team_id: i % 2 === 1 ? "Cloud9" : "NRG",
        round_winner_name: i % 2 === 1 ? "Cloud9" : "NRG",
        win_condition: "Elimination",
        kills: [],
        ability_casts: [],
        spike_planted: false,
      })),
    },
  ],
  total_mistakes_detected: MOCK_MISTAKES.length,
  mistakes: MOCK_MISTAKES,
  player_reports: [
    {
      player_id: "OXY",
      player_name: "OXY",
      character_name: "Jett",
      team_name: "Cloud9",
      mistake_count: 3,
      cumulative_xrw_tax: -0.947,
      primary_vulnerability: "UNTRADED_FIRST_DEATH",
      actionable_summary: "OXY: Establish buddy-system spacing (< 6 meters) and hold crossfire angles rather than dry-peeking before support utility.",
      mistakes: [MOCK_MISTAKES[0], MOCK_MISTAKES[6], MOCK_MISTAKES[9]],
    },
    {
      player_id: "vanity",
      player_name: "vanity",
      character_name: "Omen",
      team_name: "Cloud9",
      mistake_count: 1,
      cumulative_xrw_tax: -0.245,
      primary_vulnerability: "ISOLATED_DUEL",
      actionable_summary: "vanity: Anchor crossfire with site partner before initiating contested duel.",
      mistakes: [MOCK_MISTAKES[1]],
    },
    {
      player_id: "runi",
      player_name: "runi",
      character_name: "Sova",
      team_name: "Cloud9",
      mistake_count: 1,
      cumulative_xrw_tax: -0.295,
      primary_vulnerability: "UNTRADED_FIRST_DEATH",
      actionable_summary: "runi: Hold defensive angle with secondary partner trade line.",
      mistakes: [MOCK_MISTAKES[3]],
    },
    {
      player_id: "Xeppaa",
      player_name: "Xeppaa",
      character_name: "Fade",
      team_name: "Cloud9",
      mistake_count: 2,
      cumulative_xrw_tax: -0.355,
      primary_vulnerability: "UTILITY_DELAY",
      actionable_summary: "Xeppaa: Pre-align flash lineup and pop flash 0.5s before entry contact.",
      mistakes: [MOCK_MISTAKES[2], MOCK_MISTAKES[7]],
    },
    {
      player_id: "moose",
      player_name: "moose",
      character_name: "Cypher",
      team_name: "Cloud9",
      mistake_count: 1,
      cumulative_xrw_tax: -0.220,
      primary_vulnerability: "ISOLATED_DUEL",
      actionable_summary: "moose: Synchronize lurk timing with main site pressure.",
      mistakes: [MOCK_MISTAKES[4]],
    },
    {
      player_id: "crashies",
      player_name: "crashies",
      character_name: "Sova",
      team_name: "NRG",
      mistake_count: 1,
      cumulative_xrw_tax: -0.235,
      primary_vulnerability: "ISOLATED_DUEL",
      actionable_summary: "crashies: Conceal reload timing behind sentinel utility.",
      mistakes: [MOCK_MISTAKES[5]],
    },
    {
      player_id: "Victor",
      player_name: "Victor",
      character_name: "Killjoy",
      team_name: "NRG",
      mistake_count: 1,
      cumulative_xrw_tax: -0.280,
      primary_vulnerability: "UNTRADED_FIRST_DEATH",
      actionable_summary: "Victor: Maintain discipline on eco rounds and group for trade frags.",
      mistakes: [MOCK_MISTAKES[8]],
    },
  ],
  prescribed_drills: [
    {
      drill_name: "Buddy-System Contact & Trade Timing 2v2",
      target_players: ["OXY", "runi"],
      target_player_names: ["OXY", "runi"],
      drill_objective: "Reinforce sub-6m proximity spacing and synchronized peeking to guarantee trade kills on contact.",
      setup_steps: [
        "Pair target players as entry fragger and secondary trader at choke entrance.",
        "Opponent defender holds an aggressive off-angle.",
        "Entry initiates contact to draw fire; secondary peeks within 1.0 second.",
        "Run 10 repetitions per side, alternating roles.",
      ],
      success_criterion: "Trade kill completed within 2.0 seconds in at least 80% of repetitions without trader dying untraded.",
    },
    {
      drill_name: "Crossfire & Spacing 2v2",
      target_players: ["vanity", "moose"],
      target_player_names: ["vanity", "moose"],
      drill_objective: "Eliminate isolated solo engagements by anchoring paired crossfire angles.",
      setup_steps: [
        "Position two defenders on site in complementary crossfire lines.",
        "Attackers execute onto site through main choke simultaneously.",
        "Defenders hold fire until both have confirmed line of sight on target.",
        "Execute 10 site defense repetitions.",
      ],
      success_criterion: "Zero untraded deaths across 10 rounds with confirmed dual-angle engagement.",
    },
    {
      drill_name: "Utility Timing & Flash Synchronization",
      target_players: ["Xeppaa"],
      target_player_names: ["Xeppaa"],
      drill_objective: "Synchronize support flashes and utility usage with entry player contact timing.",
      setup_steps: [
        "Support player lines up flash or concussive utility outside target zone.",
        "Entry player signals 3-second advance countdown.",
        "Utility detonates 0.5 seconds before entry player exposes to angle.",
        "Run 10 live-fire clearing repetitions.",
      ],
      success_criterion: "Target defender fully blinded or concussed before entry player duel initiation in 90% of reps.",
    },
  ],
  player_stats: {
    OXY: {
      player: "OXY",
      team: "Cloud9",
      agent: "Jett",
      k: 22,
      d: 14,
      a: 5,
      acs: 280,
      adr: 182,
      fk: 5,
      fd: 2,
    },
    vanity: {
      player: "vanity",
      team: "Cloud9",
      agent: "Omen",
      k: 14,
      d: 12,
      a: 11,
      acs: 195,
      adr: 130,
      fk: 2,
      fd: 1,
    },
    runi: {
      player: "runi",
      team: "Cloud9",
      agent: "Sova",
      k: 16,
      d: 13,
      a: 8,
      acs: 210,
      adr: 145,
      fk: 3,
      fd: 2,
    },
    Xeppaa: {
      player: "Xeppaa",
      team: "Cloud9",
      agent: "Fade",
      k: 15,
      d: 14,
      a: 9,
      acs: 205,
      adr: 138,
      fk: 2,
      fd: 2,
    },
    moose: {
      player: "moose",
      team: "Cloud9",
      agent: "Cypher",
      k: 13,
      d: 12,
      a: 4,
      acs: 175,
      adr: 118,
      fk: 1,
      fd: 1,
    },
    crashies: {
      player: "crashies",
      team: "NRG",
      agent: "Sova",
      k: 18,
      d: 15,
      a: 7,
      acs: 225,
      adr: 152,
      fk: 3,
      fd: 1,
    },
    Victor: {
      player: "Victor",
      team: "NRG",
      agent: "Killjoy",
      k: 17,
      d: 16,
      a: 5,
      acs: 215,
      adr: 140,
      fk: 2,
      fd: 3,
    },
  },
  round_insights: Array.from({ length: 24 }, (_, i) => ({
    round_number: i + 1,
    narrative: `Round ${i + 1} concluded with ${i % 2 === 0 ? "Cloud9" : "NRG"} victory by ${i % 3 === 0 ? "SpikeDefused" : "Elimination"}.`,
    blunder_culprit: i % 2 === 0 ? "OXY" : "vanity",
    win_prob_tax: i % 2 === 0 ? -0.24 : -0.18,
    tactical_directive: i % 2 === 0 ? "Coordinate flash utility with duelist entry." : "Anchor crossfire with site partner.",
    player_stat_verdict: i % 2 === 0 ? "OXY has 5 FK and 2 FD (280 ACS)." : "vanity has 2 FK and 1 FD (195 ACS).",
    recommended_drill: {
      drill_name: "Buddy-System Contact & Trade Timing 2v2",
      target_players: [i % 2 === 0 ? "OXY" : "vanity"],
      target_player_names: [i % 2 === 0 ? "OXY" : "vanity"],
      drill_objective: "Reinforce spacing and instant trade frags.",
      setup_steps: ["Pair entry fragger with trade partner at choke."],
      success_criterion: "Trade secured in >= 80% of contacts.",
    },
  })),
};

export default function CoachDashboardPage() {
  const {
    selectedSeriesId,
    currentGameIndex,
    selectedPlayerId,
    isPlaying,
    currentRound,
    totalRounds,
    selectedMistake,
    selectedRoundInsight,
    setSeriesId,
    setMatchId,
    setGameIndex,
    setSelectedPlayerId,
    togglePlay,
    setCurrentRound,
    setTotalRounds,
    setSelectedMistake,
    setSelectedRoundInsight,
  } = useCoachStore();

  const [featuredSeries, setFeaturedSeries] = useState<FeaturedSeries[]>(
    DEFAULT_FEATURED_SERIES
  );
  const [data, setData] = useState<CoachingReportResponse>(MOCK_COACHING_REPORT);
  const [dataSource, setDataSource] = useState<"live" | "mock">("mock");

  // Synchronize store selectedRoundInsight with active round insight
  useEffect(() => {
    const matched =
      data.round_insights?.find((ri) => ri.round_number === currentRound) || null;
    setSelectedRoundInsight(matched);
  }, [currentRound, data.round_insights, setSelectedRoundInsight]);

  // Fetch featured series catalog
  useEffect(() => {
    let isMounted = true;
    async function fetchFeatured() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/v1/featured-series`);
        if (res.ok) {
          const list: FeaturedSeries[] = await res.json();
          if (isMounted && Array.isArray(list) && list.length > 0) {
            setFeaturedSeries(list);
          }
        }
      } catch {
        // Fallback to default series list
      }
    }
    fetchFeatured();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch coaching report for selected series and game index
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchReport() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const isVlrMatch =
          selectedSeriesId.startsWith("vlr-") || selectedSeriesId.startsWith("vlr_");
        const vlrMatchId = selectedSeriesId.replace(/^(vlr-|vlr_)/, "");
        const url = isVlrMatch
          ? `${apiUrl}/api/v1/vlr/match/${vlrMatchId}/coaching-report?game_id=${currentGameIndex + 1}`
          : `${apiUrl}/api/v1/series/${selectedSeriesId}/coaching-report?game_index=${currentGameIndex}&max_envelopes=2000`;

        const res = await fetch(url, { signal: controller.signal });
        if (res.ok) {
          const report: CoachingReportResponse = await res.json();
          if (isMounted) {
            setData(report);
            setDataSource("live");
            const activeMap = report.games?.[currentGameIndex] || report.games?.[0];
            if (activeMap?.rounds?.length) {
              setTotalRounds(activeMap.rounds.length);
            }
          }
        } else {
          if (isMounted) {
            setData((prev) => ({
              ...MOCK_COACHING_REPORT,
              series_id: selectedSeriesId,
            }));
            setDataSource("mock");
          }
        }
      } catch {
        if (isMounted) {
          setData((prev) => ({
            ...MOCK_COACHING_REPORT,
            series_id: selectedSeriesId,
          }));
          setDataSource("mock");
        }
      }
    }

    fetchReport();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [selectedSeriesId, currentGameIndex, setTotalRounds]);

  const activeRoundInsight =
    data.round_insights?.find((ri) => ri.round_number === currentRound) ||
    selectedRoundInsight ||
    null;

  const activeGame = data.games?.[currentGameIndex] || data.games?.[0];
  const activeRounds = activeGame?.rounds || [];
  const activeRoundKills =
    activeRounds.find((r) => r.round_number === currentRound)?.kills || [];

  // Match score calculation
  const team1Score = activeRounds.filter(
    (r) =>
      r.winning_team_id === data.team1_name ||
      r.round_winner_name === data.team1_name
  ).length;
  const team2Score = activeRounds.filter(
    (r) =>
      r.winning_team_id === data.team2_name ||
      r.round_winner_name === data.team2_name
  ).length;

  return (
    <div className="min-h-screen w-screen lg:h-screen lg:overflow-hidden flex flex-col c9-bg-ethereal text-slate-900 selection:bg-[#008cd4] selection:text-white">
      {/* Top Header Bar */}
      <header className="h-16 flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-sky-300/40 px-6 flex items-center justify-between z-20 shadow-[0_4px_20px_rgba(0,140,212,0.08)]">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <Cloud9Logo size={36} glow={true} showWatermark={true} />
          <span className="text-base font-black tracking-tight text-slate-900 flex items-center gap-1.5">
            CLOUD9 <span className="text-[#008cd4] font-black">ORACLE</span>
          </span>
        </div>

        {/* Center: Series Selector & Map Switcher */}
        <div className="flex items-center gap-3">
          {/* Series Switcher Dropdown */}
          <div className="flex items-center gap-2 glass-card rounded-lg px-3 py-1.5 text-xs border-sky-200 shadow-sm">
            <span className="text-[10px] text-[#0077b6] uppercase font-bold tracking-wider">
              Series:
            </span>
            <select
              aria-label="Select Series"
              value={selectedSeriesId}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith("vlr-")) {
                  setMatchId(val);
                } else {
                  setSeriesId(val);
                }
              }}
              className="bg-transparent text-slate-900 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {featuredSeries.map((s) => (
                <option key={s.series_id} value={s.series_id} className="bg-white text-slate-900">
                  {s.teams} ({s.series_id})
                </option>
              ))}
            </select>
          </div>

          {/* Game / Map Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-white/70 p-1.5 rounded-lg border border-sky-200 shadow-sm">
            {data.games && data.games.length > 0 ? (
              data.games.map((g, idx) => {
                const isSelectedMap = idx === currentGameIndex;
                const formattedMap = getMapDisplayName(g.map_name);
                return (
                  <button
                    key={g.game_id || idx}
                    type="button"
                    onClick={() => setGameIndex(idx)}
                    className={`px-3 py-1 rounded text-[11px] transition-all font-semibold ${
                      isSelectedMap
                        ? "c9-pill-active"
                        : "text-slate-600 hover:text-slate-900 hover:bg-sky-100/60"
                    }`}
                  >
                    Map {idx + 1}: {formattedMap}
                  </button>
                );
              })
            ) : (
              <span className="text-xs text-slate-500 px-2">Map 1: Ascent</span>
            )}
          </div>
        </div>

        {/* Right: Live Match Score Badge & Telemetry State */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 glass-card px-3.5 py-1 rounded-full text-xs font-mono font-bold border-sky-200 shadow-sm">
            <span className="text-slate-700">{data.team1_name || "NRG"}</span>
            <span className="text-slate-900 bg-sky-100 px-1.5 py-0.2 rounded border border-sky-200">
              {team1Score}
            </span>
            <span className="text-[#008cd4] font-bold">:</span>
            <span className="text-white bg-[#008cd4] px-1.5 py-0.2 rounded font-bold shadow-[0_0_8px_rgba(0,140,212,0.3)]">
              {team2Score}
            </span>
            <span className="text-[#0077b6] font-black">{data.team2_name || "Cloud9"}</span>
          </div>

          <div
            className={`px-3 py-1 rounded-lg border font-mono text-[10px] font-bold ${
              dataSource === "live"
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm"
                : "bg-sky-50 text-[#0077b6] border-sky-300 shadow-sm"
            }`}
          >
            {dataSource === "live" ? "LIVE TELEMETRY" : "BENCHMARK"}
          </div>
        </div>
      </header>

      {/* Main Grid Area */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 p-3 sm:p-4 overflow-y-auto lg:overflow-hidden">
        {/* Left Column: Round Selection (top) + Tactical Map (bottom) */}
        <section
          aria-label="Round Selection and Tactical Map"
          className="col-span-12 lg:col-span-7 flex flex-col min-h-0 lg:h-full gap-3.5"
        >
          {/* Card 1: Round Selection */}
          <RoundSelection
            currentRound={currentRound}
            totalRounds={totalRounds}
            onRoundChange={setCurrentRound}
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            rounds={activeRounds}
            mistakes={data.mistakes}
            mapName={activeGame?.map_name || "Ascent"}
          />

          {/* Card 2: Tactical Map Replay */}
          <MinimapReplay
            currentRound={currentRound}
            totalRounds={totalRounds}
            mistakes={data.mistakes}
            kills={activeRoundKills}
            rounds={activeRounds}
            onRoundChange={setCurrentRound}
            selectedMistake={selectedMistake}
            onSelectMistake={setSelectedMistake}
            mapName={activeGame?.map_name || "Ascent"}
            selectedPlayerId={selectedPlayerId}
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            standalone={false}
          />
        </section>

        {/* Right Column: SLM Coaching Debrief, Player Error Report & Training Drills */}
        <section
          aria-label="Player Error Report and Training Drills"
          className="col-span-12 lg:col-span-5 flex flex-col min-h-0 lg:h-full gap-3 overflow-y-auto pr-0.5"
        >
          {/* SLM Assistant Coach Real-Time Debrief Panel */}
          <div data-testid="slm-coach-panel-container" className="flex-shrink-0">
            <SLMCoachPanel
              insight={activeRoundInsight}
              roundNumber={currentRound}
            />
          </div>

          {/* Card 1: Player Error Report */}
          <div
            data-testid="player-error-report-card"
            className="flex-1 min-h-[220px] glass-panel rounded-xl p-3.5 sm:p-4 flex flex-col overflow-hidden shadow-lg border border-sky-300/40"
          >
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <PlayerReportCards
                reports={data.player_reports}
                selectedPlayerId={selectedPlayerId}
                onSelectPlayer={setSelectedPlayerId}
                playerStats={data.player_stats}
              />
            </div>
          </div>

          {/* Card 2: Training Drills */}
          <div
            data-testid="training-drills-card"
            className="flex-1 min-h-[200px] glass-panel rounded-xl p-3.5 sm:p-4 flex flex-col overflow-hidden shadow-lg border border-sky-300/40"
          >
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <DrillPrescriptions
                drills={data.prescribed_drills}
                selectedPlayerId={selectedPlayerId}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

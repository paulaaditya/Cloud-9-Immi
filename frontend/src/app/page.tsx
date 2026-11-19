"use client";

import React, { useEffect, useState } from "react";
import { useCoachStore } from "@/store/coachStore";
import { MinimapReplay } from "@/components/MinimapReplay";
import { PlayerReportCards } from "@/components/PlayerReportCards";
import { DrillPrescriptions } from "@/components/DrillPrescriptions";
import {
  CoachingReportResponse,
  FeaturedSeries,
} from "@/types/api";

const DEFAULT_FEATURED_SERIES: FeaturedSeries[] = [
  {
    series_id: "2748746",
    teams: "NRG vs Cloud9",
    event: "VCT Americas Stage 1",
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
  total_mistakes_detected: 8,
  mistakes: [
    {
      mistake_type: "UNTRADED_FIRST_DEATH",
      player_id: "OXY",
      player_name: "OXY",
      character_name: "Jett",
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
      round_number: 5,
      occurred_at: "2026-11-19T10:04:30Z",
      win_prob_delta: -0.220,
      description: "Mid lurk caught without line of sight or crossfire.",
      coaching_fix: "Synchronize lurk timing with main site pressure.",
    },
    {
      mistake_type: "UNTRADED_FIRST_DEATH",
      player_id: "OXY",
      player_name: "OXY",
      character_name: "Jett",
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
      round_number: 9,
      occurred_at: "2026-11-19T10:08:45Z",
      win_prob_delta: -0.175,
      description: "Late recon dart deployment after enemy had already secured site footprint.",
      coaching_fix: "Deploy early recon pulse during default phase to deny initial map control.",
    },
    {
      mistake_type: "UNTRADED_FIRST_DEATH",
      player_id: "OXY",
      player_name: "OXY",
      character_name: "Jett",
      round_number: 12,
      occurred_at: "2026-11-19T10:11:05Z",
      win_prob_delta: -0.315,
      description: "Untraded opening death during B Long retake.",
      coaching_fix: "Synchronize retake execute on smoke blossom timing with teammates.",
    },
  ],
  player_reports: [
    {
      player_id: "OXY",
      player_name: "OXY",
      character_name: "Jett",
      mistake_count: 3,
      cumulative_xrw_tax: -0.947,
      primary_vulnerability: "UNTRADED_FIRST_DEATH",
      actionable_summary: "Player OXY incurred -0.947 cumulative xRW tax across 3 mistakes (primary: UNTRADED_FIRST_DEATH). Actionable fix: Establish buddy-system spacing (< 6 meters) and hold crossfire angles rather than dry-peeking before support utility.",
    },
    {
      player_id: "vanity",
      player_name: "vanity",
      character_name: "Omen",
      mistake_count: 1,
      cumulative_xrw_tax: -0.245,
      primary_vulnerability: "ISOLATED_DUEL",
      actionable_summary: "Player vanity incurred -0.245 cumulative xRW tax across 1 mistakes (primary: ISOLATED_DUEL). Actionable fix: Anchor crossfire with site partner before initiating contested duel.",
    },
    {
      player_id: "runi",
      player_name: "runi",
      character_name: "Sova",
      mistake_count: 1,
      cumulative_xrw_tax: -0.295,
      primary_vulnerability: "UNTRADED_FIRST_DEATH",
      actionable_summary: "Player runi incurred -0.295 cumulative xRW tax across 1 mistakes (primary: UNTRADED_FIRST_DEATH). Actionable fix: Hold defensive angle with secondary partner trade line.",
    },
    {
      player_id: "Xeppaa",
      player_name: "Xeppaa",
      character_name: "Fade",
      mistake_count: 2,
      cumulative_xrw_tax: -0.355,
      primary_vulnerability: "UTILITY_DELAY",
      actionable_summary: "Player Xeppaa incurred -0.355 cumulative xRW tax across 2 mistakes (primary: UTILITY_DELAY). Actionable fix: Pre-align flash lineup and pop flash 0.5s before entry contact.",
    },
    {
      player_id: "moose",
      player_name: "moose",
      character_name: "Cypher",
      mistake_count: 1,
      cumulative_xrw_tax: -0.220,
      primary_vulnerability: "ISOLATED_DUEL",
      actionable_summary: "Player moose incurred -0.220 cumulative xRW tax across 1 mistakes (primary: ISOLATED_DUEL). Actionable fix: Synchronize lurk timing with main site pressure.",
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
    setSeriesId,
    setGameIndex,
    setSelectedPlayerId,
    togglePlay,
    setCurrentRound,
    setTotalRounds,
    setSelectedMistake,
  } = useCoachStore();

  const [featuredSeries, setFeaturedSeries] = useState<FeaturedSeries[]>(
    DEFAULT_FEATURED_SERIES
  );
  const [data, setData] = useState<CoachingReportResponse>(MOCK_COACHING_REPORT);
  const [dataSource, setDataSource] = useState<"live" | "mock">("mock");

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
        const res = await fetch(
          `${apiUrl}/api/v1/series/${selectedSeriesId}/coaching-report?game_index=${currentGameIndex}&max_envelopes=2000`,
          { signal: controller.signal }
        );
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
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#050b14] text-slate-100 selection:bg-cyan-500 selection:text-black">
      {/* Top Header Bar */}
      <header className="h-16 flex-shrink-0 bg-[#071122]/90 border-b border-cyan-500/20 px-5 flex items-center justify-between z-20">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#0077b6] to-[#00aeef] flex items-center justify-center font-black text-slate-950 text-base shadow-[0_0_15px_rgba(0,174,239,0.45)]">
            C9
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                CLOUD9 <span className="text-[#00aeef]">ORACLE</span>
              </span>
              <span className="text-[9px] font-mono font-bold uppercase bg-cyan-950/90 text-[#00aeef] border border-cyan-800/80 px-1.5 py-0.2 rounded">
                HUD v2.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              VCT Americas Counter-Strategy & Micro-Mistake Intelligence
            </p>
          </div>
        </div>

        {/* Center: Series Selector & Map Switcher */}
        <div className="flex items-center gap-3">
          {/* Series Switcher Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">
              Series:
            </span>
            <select
              aria-label="Select Series"
              value={selectedSeriesId}
              onChange={(e) => setSeriesId(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {featuredSeries.map((s) => (
                <option key={s.series_id} value={s.series_id} className="bg-slate-900 text-slate-200">
                  {s.teams} ({s.series_id})
                </option>
              ))}
            </select>
          </div>

          {/* Game / Map Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
            {data.games && data.games.length > 0 ? (
              data.games.map((g, idx) => {
                const isSelectedMap = idx === currentGameIndex;
                return (
                  <button
                    key={g.game_id || idx}
                    type="button"
                    onClick={() => setGameIndex(idx)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                      isSelectedMap
                        ? "bg-[#00aeef] text-black font-bold shadow-[0_0_10px_rgba(0,174,239,0.5)]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    Map {idx + 1}: {g.map_name}
                  </button>
                );
              })
            ) : (
              <span className="text-xs text-slate-400 px-2">Map 1: Ascent</span>
            )}
          </div>
        </div>

        {/* Right: Live Match Score Badge & Telemetry State */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950/80 border border-cyan-500/20 px-3 py-1 rounded-full text-xs font-mono font-bold">
            <span className="text-slate-200">{data.team1_name || "NRG"}</span>
            <span className="text-white bg-slate-800 px-1.5 py-0.2 rounded">
              {team1Score}
            </span>
            <span className="text-[#00aeef]">:</span>
            <span className="text-[#00aeef] bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800/60">
              {team2Score}
            </span>
            <span className="text-[#00aeef]">{data.team2_name || "Cloud9"}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[10px] font-bold ${
              dataSource === "live"
                ? "bg-emerald-950/50 text-emerald-300 border-emerald-700/80"
                : "bg-slate-900/90 text-cyan-300 border-slate-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                dataSource === "live" ? "bg-emerald-400 animate-pulse" : "bg-[#00aeef]"
              }`}
            ></span>
            {dataSource === "live" ? "LIVE TELEMETRY" : "BENCHMARK"}
          </div>
        </div>
      </header>

      {/* Main Grid Area */}
      <main className="flex-1 min-h-0 grid grid-cols-12 gap-5 p-5 overflow-hidden">
        {/* Left: MinimapReplay Container */}
        <section className="col-span-7 flex flex-col min-h-0 h-full">
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
          />
        </section>

        {/* Right: Dual Glass Cards */}
        <section className="col-span-5 flex flex-col min-h-0 h-full space-y-4 overflow-hidden">
          {/* Card 1: Player Error Tax & Vulnerabilities */}
          <div className="flex-1 min-h-0 glass-panel rounded-xl p-4 flex flex-col overflow-hidden shadow-xl">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <PlayerReportCards
                reports={data.player_reports}
                selectedPlayerId={selectedPlayerId}
                onSelectPlayer={setSelectedPlayerId}
              />
            </div>
          </div>

          {/* Card 2: Prescribed Team Practice Drills */}
          <div className="flex-1 min-h-0 glass-panel rounded-xl p-4 flex flex-col overflow-hidden shadow-xl">
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

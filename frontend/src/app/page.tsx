"use client";

import React, { useEffect, useState } from "react";
import { useCoachStore } from "@/store/coachStore";
import { MinimapReplay } from "@/components/MinimapReplay";
import { PlayerReportCards } from "@/components/PlayerReportCards";
import { DrillPrescriptions } from "@/components/DrillPrescriptions";
import { CoachingReportResponse, AttributedMistake } from "@/types/api";

const MOCK_COACHING_REPORT: CoachingReportResponse = {
  series_id: "2748743",
  team1_name: "Cloud9",
  team2_name: "Sentinels",
  total_games: 1,
  games: [
    {
      game_id: "game-1",
      map_name: "Ascent",
      rounds: Array.from({ length: 24 }, (_, i) => ({
        round_number: i + 1,
        winning_team_id: i % 2 === 0 ? "Cloud9" : "Sentinels",
        win_condition: i % 3 === 0 ? "SpikeDefused" : "Elimination",
        kills: [
          {
            event_id: `kill-${i}-1`,
            killer_id: "zekken",
            victim_id: i % 2 === 0 ? "OXY" : "vanity",
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
  ],
  total_mistakes_detected: 8,
  mistakes: [
    {
      mistake_type: "UNTRADED_FIRST_DEATH",
      player_id: "OXY",
      round_number: 1,
      occurred_at: "2026-11-19T10:00:15Z",
      win_prob_delta: -0.312,
      description: "Untraded opening death with no return trade within 3.0 seconds.",
      coaching_fix: "Establish buddy-system spacing (< 6 meters) and hold crossfire angles rather than dry-peeking before support utility.",
    },
    {
      mistake_type: "ISOLATED_DUEL",
      player_id: "vanity",
      round_number: 2,
      occurred_at: "2026-11-19T10:01:22Z",
      win_prob_delta: -0.245,
      description: "Isolated duel in A Main without trade support or escape utility.",
      coaching_fix: "Anchor crossfire with site partner before initiating contested duel.",
    },
    {
      mistake_type: "UTILITY_DELAY",
      player_id: "Xeppaa",
      round_number: 3,
      occurred_at: "2026-11-19T10:02:40Z",
      win_prob_delta: -0.180,
      description: "Utility delay on site execute flash, leaving duelist exposed.",
      coaching_fix: "Pre-align flash lineup and pop flash 0.5s before entry contact.",
    },
    {
      mistake_type: "UNTRADED_FIRST_DEATH",
      player_id: "runi",
      round_number: 4,
      occurred_at: "2026-11-19T10:03:18Z",
      win_prob_delta: -0.295,
      description: "Untraded opening death on B site defense.",
      coaching_fix: "Hold defensive angle with secondary partner trade line.",
    },
    {
      mistake_type: "ISOLATED_DUEL",
      player_id: "moose",
      round_number: 5,
      occurred_at: "2026-11-19T10:04:30Z",
      win_prob_delta: -0.220,
      description: "Mid lurk caught without line of sight or crossfire.",
      coaching_fix: "Synchronize lurk timing with main site pressure.",
    },
    {
      mistake_type: "UNTRADED_FIRST_DEATH",
      player_id: "OXY",
      round_number: 7,
      occurred_at: "2026-11-19T10:06:12Z",
      win_prob_delta: -0.320,
      description: "Aggressive dry peek into Operator angle at Mid Courtyard.",
      coaching_fix: "Request drone or flash utility before contesting sniper lane.",
    },
    {
      mistake_type: "UTILITY_DELAY",
      player_id: "Xeppaa",
      round_number: 9,
      occurred_at: "2026-11-19T10:08:45Z",
      win_prob_delta: -0.175,
      description: "Late recon dart deployment after enemy had already secured site footprint.",
      coaching_fix: "Deploy early recon pulse during default phase to deny initial map control.",
    },
    {
      mistake_type: "UNTRADED_FIRST_DEATH",
      player_id: "OXY",
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
      mistake_count: 3,
      cumulative_xrw_tax: -0.947,
      primary_vulnerability: "UNTRADED_FIRST_DEATH",
      actionable_summary: "Player OXY incurred -0.947 cumulative xRW tax across 3 mistakes (primary: UNTRADED_FIRST_DEATH). Actionable fix: Establish buddy-system spacing (< 6 meters) and hold crossfire angles rather than dry-peeking before support utility.",
    },
    {
      player_id: "vanity",
      mistake_count: 1,
      cumulative_xrw_tax: -0.245,
      primary_vulnerability: "ISOLATED_DUEL",
      actionable_summary: "Player vanity incurred -0.245 cumulative xRW tax across 1 mistakes (primary: ISOLATED_DUEL). Actionable fix: Anchor crossfire with site partner before initiating contested duel.",
    },
    {
      player_id: "runi",
      mistake_count: 1,
      cumulative_xrw_tax: -0.295,
      primary_vulnerability: "UNTRADED_FIRST_DEATH",
      actionable_summary: "Player runi incurred -0.295 cumulative xRW tax across 1 mistakes (primary: UNTRADED_FIRST_DEATH). Actionable fix: Hold defensive angle with secondary partner trade line.",
    },
    {
      player_id: "Xeppaa",
      mistake_count: 2,
      cumulative_xrw_tax: -0.355,
      primary_vulnerability: "UTILITY_DELAY",
      actionable_summary: "Player Xeppaa incurred -0.355 cumulative xRW tax across 2 mistakes (primary: UTILITY_DELAY). Actionable fix: Pre-align flash lineup and pop flash 0.5s before entry contact.",
    },
    {
      player_id: "moose",
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
    currentRound,
    totalRounds,
    selectedMistake,
    setCurrentRound,
    setTotalRounds,
    setSelectedMistake,
  } = useCoachStore();

  const [data, setData] = useState<CoachingReportResponse>(MOCK_COACHING_REPORT);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"live" | "mock">("mock");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchTelemetry() {
      setIsLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(
          `${apiUrl}/api/v1/series/${selectedSeriesId}/coaching-report?max_envelopes=2000`,
          {
            signal: controller.signal,
          }
        );
        if (response.ok) {
          const report: CoachingReportResponse = await response.json();
          if (isMounted) {
            setData(report);
            setDataSource("live");
            if (report.games?.[0]?.rounds?.length) {
              setTotalRounds(report.games[0].rounds.length);
            }
          }
        } else {
          if (isMounted) {
            setData(MOCK_COACHING_REPORT);
            setDataSource("mock");
          }
        }
      } catch {
        if (isMounted) {
          setData(MOCK_COACHING_REPORT);
          setDataSource("mock");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchTelemetry();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [selectedSeriesId, setTotalRounds]);

  const activeGame = data.games?.[0];
  const activeRoundKills =
    activeGame?.rounds?.find((r) => r.round_number === currentRound)?.kills || [];

  const cumulativeTax = data.mistakes
    .reduce((acc, m) => acc + m.win_prob_delta, 0)
    .toFixed(2);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Top Navigation HUD */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-600 to-sky-400 flex items-center justify-center font-black text-slate-950 tracking-tighter text-lg shadow-md shadow-cyan-900">
            C9
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">
                C9 ORACLE
              </h1>
              <span className="text-[10px] tracking-widest font-mono uppercase bg-cyan-950 text-cyan-300 border border-cyan-800/80 px-2 py-0.5 rounded">
                Tactical HUD v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              VCT Americas Counter-Strategy & Micro-Mistake Intelligence
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Match Series:</span>
            <span className="font-mono font-bold text-white">
              {data.team1_name} vs {data.team2_name}
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-[11px] font-semibold ${
              dataSource === "live"
                ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                : "bg-slate-800/90 text-cyan-300 border-slate-700"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                dataSource === "live" ? "bg-emerald-400 animate-ping" : "bg-cyan-400"
              }`}
            ></span>
            {dataSource === "live" ? "LIVE TELEMETRY (:8000)" : "BENCHMARK TELEMETRY"}
          </div>
        </div>
      </header>

      {/* KPI Overview Metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Active Series ID
          </span>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
            #{data.series_id}
          </div>
          <span className="text-[10px] text-slate-500">
            Map: {activeGame?.map_name || "Ascent"}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Analyzed Rounds
          </span>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {totalRounds} Rounds
          </div>
          <span className="text-[10px] text-slate-500">
            Current: Round {currentRound}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Mistakes Attributed
          </span>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {data.total_mistakes_detected} Flaws
          </div>
          <span className="text-[10px] text-slate-500">
            Across {data.player_reports.length} Players
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Cumulative Series xRW Tax
          </span>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">
            {cumulativeTax} xRW
          </div>
          <span className="text-[10px] text-slate-500">
            Total win probability lost
          </span>
        </div>
      </section>

      {/* Tactical Minimap Replay Component */}
      <MinimapReplay
        currentRound={currentRound}
        totalRounds={totalRounds}
        mistakes={data.mistakes}
        kills={activeRoundKills}
        onRoundChange={setCurrentRound}
        selectedMistake={selectedMistake}
        onSelectMistake={setSelectedMistake}
        mapName={activeGame?.map_name || "Ascent"}
      />

      {/* Player Error Tax Report Cards */}
      <PlayerReportCards
        reports={data.player_reports}
        selectedPlayerId={selectedPlayerId}
        onSelectPlayer={setSelectedPlayerId}
      />

      {/* Prescribed Tactical Training Drills */}
      <DrillPrescriptions
        drills={data.prescribed_drills}
        selectedPlayerId={selectedPlayerId}
      />

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-500 border-t border-slate-800/80 mt-4">
        C9 Oracle Tactical Analytics Engine | Cloud9 Esports x GRID Data Telemetry Pipeline
      </footer>
    </main>
  );
}

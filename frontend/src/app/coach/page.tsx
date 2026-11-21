"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useCoachStore } from "@/store/coachStore";
import { RoundSelection } from "@/components/RoundSelection";
import { MinimapReplay } from "@/components/MinimapReplay";
import { PlayerReportCards } from "@/components/PlayerReportCards";
import { DrillPrescriptions } from "@/components/DrillPrescriptions";
import { SLMCoachPanel } from "@/components/SLMCoachPanel";
import { Cloud9Logo } from "@/components/Cloud9Logo";
import { GameSelectionTool } from "@/components/GameSelectionTool";
import { getMapDisplayName } from "@/lib/mapCoords";
import { fetchCoachingReport, fetchFeaturedSeries } from "@/lib/api";
import {
  CoachingReportResponse,
  FeaturedSeries,
} from "@/types/api";

const DEFAULT_FEATURED_SERIES: FeaturedSeries[] = [
  // 1. VCT Americas 2026 Kickoff
  {
    series_id: "vlr-c9-loud-kickoff2026",
    teams: "Cloud9 vs LOUD",
    team1_name: "Cloud9",
    team2_name: "LOUD",
    event: "VCT Americas 2026 Kickoff",
    date: "2026-01-15",
    map_name: "Haven",
    score: "2 - 0",
    is_cloud9: true,
  },
  {
    series_id: "vlr-c9-nrg-kickoff2026",
    teams: "NRG vs Cloud9",
    team1_name: "NRG",
    team2_name: "Cloud9",
    event: "VCT Americas 2026 Kickoff",
    date: "2026-01-17",
    map_name: "Pearl",
    score: "2 - 0",
    is_cloud9: true,
  },
  {
    series_id: "vlr-c9-lev-kickoff2026",
    teams: "Cloud9 vs Leviatán",
    team1_name: "Cloud9",
    team2_name: "Leviatán",
    event: "VCT Americas 2026 Kickoff",
    date: "2026-02-07",
    map_name: "Bind",
    score: "2 - 0",
    is_cloud9: true,
  },
  {
    series_id: "vlr-c9-g2-kickoff2026",
    teams: "G2 Esports vs Cloud9",
    team1_name: "G2 Esports",
    team2_name: "Cloud9",
    event: "VCT Americas 2026 Kickoff",
    date: "2026-02-10",
    map_name: "Corrode",
    score: "2 - 0",
    is_cloud9: true,
  },
  {
    series_id: "vlr-c9-100t-kickoff2026",
    teams: "100 Thieves vs Cloud9",
    team1_name: "100 Thieves",
    team2_name: "Cloud9",
    event: "VCT Americas 2026 Kickoff",
    date: "2026-02-12",
    map_name: "Pearl",
    score: "2 - 1",
    is_cloud9: true,
  },
  {
    series_id: "vlr-furia-g2-kickoff2026",
    teams: "FURIA vs G2 Esports",
    team1_name: "FURIA",
    team2_name: "G2 Esports",
    event: "VCT Americas 2026 Kickoff",
    date: "2026-02-15",
    map_name: "Abyss",
    score: "2 - 1",
    is_cloud9: false,
  },

  // 2. VCT Masters 2026 Santiago (NO Cloud9)
  {
    series_id: "vlr-ns-prx-santiago2026",
    teams: "Nongshim RedForce vs Paper Rex",
    team1_name: "Nongshim RedForce",
    team2_name: "Paper Rex",
    event: "VCT Masters 2026 Santiago",
    date: "2026-03-15",
    map_name: "Corrode",
    score: "3 - 0",
    is_cloud9: false,
  },
  {
    series_id: "vlr-prx-furia-santiago2026",
    teams: "Paper Rex vs FURIA",
    team1_name: "Paper Rex",
    team2_name: "FURIA",
    event: "VCT Masters 2026 Santiago",
    date: "2026-03-06",
    map_name: "Haven",
    score: "2 - 1",
    is_cloud9: false,
  },
  {
    series_id: "vlr-nrg-furia-santiago2026",
    teams: "NRG vs FURIA",
    team1_name: "NRG",
    team2_name: "FURIA",
    event: "VCT Masters 2026 Santiago",
    date: "2026-03-04",
    map_name: "Ascent",
    score: "2 - 1",
    is_cloud9: false,
  },
  {
    series_id: "vlr-prx-nrg-santiago2026",
    teams: "Paper Rex vs NRG",
    team1_name: "Paper Rex",
    team2_name: "NRG",
    event: "VCT Masters 2026 Santiago",
    date: "2026-03-14",
    map_name: "Sunset",
    score: "3 - 1",
    is_cloud9: false,
  },

  // 3. VCT Americas 2026 Stage 1
  {
    series_id: "vlr-c9-lev-stage1-2026",
    teams: "Leviatán vs Cloud9",
    team1_name: "Leviatán",
    team2_name: "Cloud9",
    event: "VCT Americas 2026 Stage 1",
    date: "2026-04-12",
    map_name: "Pearl",
    score: "2 - 0",
    is_cloud9: true,
  },
  {
    series_id: "vlr-c9-envy-stage1-2026",
    teams: "Cloud9 vs Team Envy",
    team1_name: "Cloud9",
    team2_name: "Team Envy",
    event: "VCT Americas 2026 Stage 1",
    date: "2026-04-17",
    map_name: "Split",
    score: "1 - 2",
    is_cloud9: true,
  },
  {
    series_id: "vlr-mibr-c9-stage1-2026",
    teams: "Cloud9 vs MIBR",
    team1_name: "Cloud9",
    team2_name: "MIBR",
    event: "VCT Americas 2026 Stage 1",
    date: "2026-04-26",
    map_name: "Breeze",
    score: "2 - 0",
    is_cloud9: true,
  },
  {
    series_id: "vlr-g2-c9-stage1-2026",
    teams: "G2 Esports vs Cloud9",
    team1_name: "G2 Esports",
    team2_name: "Cloud9",
    event: "VCT Americas 2026 Stage 1",
    date: "2026-05-09",
    map_name: "Lotus",
    score: "2 - 0",
    is_cloud9: true,
  },
  {
    series_id: "vlr-c9-sen-2026",
    teams: "Cloud9 vs Sentinels",
    team1_name: "Cloud9",
    team2_name: "Sentinels",
    event: "VCT Americas 2026 Stage 1",
    date: "2026-05-16",
    map_name: "Ascent",
    score: "2 - 1",
    is_cloud9: true,
  },
  {
    series_id: "vlr-sen-100t-stage1-2026",
    teams: "Sentinels vs 100 Thieves",
    team1_name: "Sentinels",
    team2_name: "100 Thieves",
    event: "VCT Americas 2026 Stage 1",
    date: "2026-05-22",
    map_name: "Ascent",
    score: "2 - 0",
    is_cloud9: false,
  },

  // 4. VCT Masters 2026 London (NO Cloud9)
  {
    series_id: "vlr-lev-prx-london2026",
    teams: "Leviatán vs Paper Rex",
    team1_name: "Leviatán",
    team2_name: "Paper Rex",
    event: "VCT Masters 2026 London",
    date: "2026-06-21",
    map_name: "Fracture",
    score: "3 - 2",
    is_cloud9: false,
  },
  {
    series_id: "vlr-prx-th-london2026",
    teams: "Paper Rex vs Team Heretics",
    team1_name: "Paper Rex",
    team2_name: "Team Heretics",
    event: "VCT Masters 2026 London",
    date: "2026-06-20",
    map_name: "Bind",
    score: "2 - 1",
    is_cloud9: false,
  },
  {
    series_id: "vlr-lev-fnc-london2026",
    teams: "Leviatán vs Fnatic",
    team1_name: "Leviatán",
    team2_name: "Fnatic",
    event: "VCT Masters 2026 London",
    date: "2026-06-16",
    map_name: "Pearl",
    score: "2 - 0",
    is_cloud9: false,
  },

  // 5. VCT Americas 2026 Stage 2
  {
    series_id: "vlr-sen-c9-stage2-2026",
    teams: "Sentinels vs Cloud9",
    team1_name: "Sentinels",
    team2_name: "Cloud9",
    event: "VCT Americas 2026 Stage 2",
    date: "2026-07-16",
    map_name: "Summit",
    score: "2 - 1",
    is_cloud9: true,
  },
  {
    series_id: "vlr-c9-loud-stage2-2026",
    teams: "Cloud9 vs LOUD",
    team1_name: "Cloud9",
    team2_name: "LOUD",
    event: "VCT Americas 2026 Stage 2",
    date: "2026-07-31",
    map_name: "Haven",
    score: "1 - 2",
    is_cloud9: true,
  },
  {
    series_id: "vlr-c9-kru-stage2-2026",
    teams: "Cloud9 vs KRÜ Esports",
    team1_name: "Cloud9",
    team2_name: "KRÜ Esports",
    event: "VCT Americas 2026 Stage 2",
    date: "2026-08-02",
    map_name: "Ascent",
    score: "2 - 0",
    is_cloud9: true,
  },
  {
    series_id: "vlr-100t-c9-stage2-2026",
    teams: "100 Thieves vs Cloud9",
    team1_name: "100 Thieves",
    team2_name: "Cloud9",
    event: "VCT Americas 2026 Stage 2",
    date: "2026-08-07",
    map_name: "Split",
    score: "2 - 1",
    is_cloud9: true,
  },
  {
    series_id: "vlr-eg-c9-stage2-2026",
    teams: "Evil Geniuses vs Cloud9",
    team1_name: "Evil Geniuses",
    team2_name: "Cloud9",
    event: "VCT Americas 2026 Stage 2",
    date: "2026-08-16",
    map_name: "Sunset",
    score: "2 - 0",
    is_cloud9: true,
  },
  {
    series_id: "vlr-sen-nrg-stage2-2026",
    teams: "Sentinels vs NRG",
    team1_name: "Sentinels",
    team2_name: "NRG",
    event: "VCT Americas 2026 Stage 2",
    date: "2026-08-23",
    map_name: "Sunset",
    score: "2 - 0",
    is_cloud9: false,
  },

  // 6. VALORANT Champions 2026 Shanghai (NO Cloud9)
  {
    series_id: "vlr-loud-vit-shanghai2026",
    teams: "LOUD vs Team Vitality",
    team1_name: "LOUD",
    team2_name: "Team Vitality",
    event: "VALORANT Champions 2026 Shanghai",
    date: "2026-10-18",
    map_name: "Summit",
    score: "3 - 1",
    is_cloud9: false,
  },
  {
    series_id: "vlr-prx-loud-shanghai2026",
    teams: "Paper Rex vs LOUD",
    team1_name: "Paper Rex",
    team2_name: "LOUD",
    event: "VALORANT Champions 2026 Shanghai",
    date: "2026-10-07",
    map_name: "Bind",
    score: "1 - 2",
    is_cloud9: false,
  },
  {
    series_id: "vlr-vit-nrg-shanghai2026",
    teams: "Team Vitality vs NRG",
    team1_name: "Team Vitality",
    team2_name: "NRG",
    event: "VALORANT Champions 2026 Shanghai",
    date: "2026-10-10",
    map_name: "Pearl",
    score: "2 - 0",
    is_cloud9: false,
  },
  {
    series_id: "vlr-tl-prx-shanghai2026",
    teams: "Team Liquid vs Paper Rex",
    team1_name: "Team Liquid",
    team2_name: "Paper Rex",
    event: "VALORANT Champions 2026 Shanghai",
    date: "2026-09-24",
    map_name: "Lotus",
    score: "2 - 1",
    is_cloud9: false,
  },
];

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
  const [isGameSelectorOpen, setIsGameSelectorOpen] = useState<boolean>(false);
  const [data, setData] = useState<CoachingReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronize store selectedRoundInsight with active round insight
  useEffect(() => {
    if (!data?.round_insights) return;
    const matched =
      data.round_insights.find((ri) => ri.round_number === currentRound) || null;
    setSelectedRoundInsight(matched);
  }, [currentRound, data?.round_insights, setSelectedRoundInsight]);

  // Fetch featured series catalog on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      try {
        const list = await fetchFeaturedSeries();
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setFeaturedSeries(list);
        }
      } catch {
        // Retain default 2026 season catalog
      }
    }
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch coaching report for selected series and game index
  const loadReport = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      try {
        const report = await fetchCoachingReport(
          selectedSeriesId,
          currentGameIndex + 1,
          signal
        );
        setData(report);
        const activeMap = report.games?.[currentGameIndex] || report.games?.[0];
        if (activeMap?.rounds?.length) {
          setTotalRounds(activeMap.rounds.length);
        }
        setIsLoading(false);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load VLR telemetry";
        setError(message);
        setIsLoading(false);
      }
    },
    [selectedSeriesId, currentGameIndex, setTotalRounds]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadReport(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadReport]);

  const activeRoundInsight =
    data?.round_insights?.find((ri) => ri.round_number === currentRound) ||
    selectedRoundInsight ||
    null;

  const activeGame = data?.games?.[currentGameIndex] || data?.games?.[0];
  const activeRounds = activeGame?.rounds || [];
  const activeRoundKills =
    activeRounds.find((r) => r.round_number === currentRound)?.kills || [];

  // Match score calculation
  const team1Score = activeRounds.filter(
    (r) =>
      r.winning_team_id === data?.team1_name ||
      r.round_winner_name === data?.team1_name
  ).length;
  const team2Score = activeRounds.filter(
    (r) =>
      r.winning_team_id === data?.team2_name ||
      r.round_winner_name === data?.team2_name
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
          {/* Game Selection Tool Trigger Button */}
          <button
            type="button"
            onClick={() => setIsGameSelectorOpen(true)}
            aria-label="Change Match"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-sky-300 bg-white/90 hover:bg-sky-50 text-slate-900 shadow-sm transition-all group"
          >
            <div className="flex flex-col text-left">
              <span className="text-[9px] uppercase font-black text-[#008cd4] tracking-wider flex items-center gap-1">
                2026 Match
                <span className="w-1.5 h-1.5 rounded-full bg-[#008cd4] animate-pulse"></span>
              </span>
              <span className="text-xs font-bold text-slate-900 group-hover:text-[#008cd4] transition-colors truncate max-w-[170px]">
                {featuredSeries.find((s) => s.series_id === selectedSeriesId)?.teams || "Select Match"}
              </span>
            </div>
            <svg
              className="w-4 h-4 text-slate-400 group-hover:text-[#008cd4] transition-colors shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Series Switcher Dropdown */}
          <div className="flex items-center gap-2 glass-card rounded-lg px-2.5 py-1.5 text-xs border-sky-200 shadow-sm">
            <span className="text-[10px] text-[#0077b6] uppercase font-bold tracking-wider">
              Series:
            </span>
            <select
              aria-label="Select Series"
              value={selectedSeriesId}
              onChange={(e) => {
                const val = e.target.value;
                setMatchId(val);
                setGameIndex(0);
              }}
              className="bg-transparent text-slate-900 text-xs font-semibold focus:outline-none cursor-pointer max-w-[160px] truncate"
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
            {data?.games && data.games.length > 0 ? (
              data.games.map((g, idx) => {
                const isSelectedMap = idx === currentGameIndex;
                const formattedMap = getMapDisplayName(g.map_name);
                return (
                  <button
                    key={g.game_id || idx}
                    type="button"
                    onClick={() => {
                      setGameIndex(idx);
                      setCurrentRound(1);
                    }}
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
            <span className="text-slate-700">{data?.team1_name || "Cloud9"}</span>
            <span className="text-slate-900 bg-sky-100 px-1.5 py-0.2 rounded border border-sky-200">
              {team1Score}
            </span>
            <span className="text-[#008cd4] font-bold">:</span>
            <span className="text-white bg-[#008cd4] px-1.5 py-0.2 rounded font-bold shadow-[0_0_8px_rgba(0,140,212,0.3)]">
              {team2Score}
            </span>
            <span className="text-[#0077b6] font-black">{data?.team2_name || "Sentinels"}</span>
          </div>

          <div className="px-3 py-1 rounded-lg border font-mono text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm">
            LIVE TELEMETRY
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {isLoading && !data ? (
        <main className="flex-1 min-h-0 flex items-center justify-center p-6">
          <div
            data-testid="dashboard-loading"
            className="glass-panel p-8 rounded-2xl border border-sky-300/40 text-center space-y-3 shadow-xl"
          >
            <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-800 font-mono text-xs tracking-wider uppercase font-bold">
              Loading 2026 VCT Telemetry...
            </p>
          </div>
        </main>
      ) : error && !data ? (
        <main className="flex-1 min-h-0 flex items-center justify-center p-6">
          <div
            data-testid="dashboard-error"
            className="glass-panel p-8 rounded-2xl border border-red-300 text-center space-y-4 shadow-xl max-w-md"
          >
            <p className="text-red-700 font-bold text-sm">{error}</p>
            <p className="text-slate-500 text-xs">
              Ensure the C9 Oracle backend is running on port 8000.
            </p>
            <button
              type="button"
              onClick={() => loadReport()}
              className="px-4 py-2 bg-[#008cd4] hover:bg-[#0077b6] text-white rounded-lg font-mono text-xs font-bold transition-all shadow"
            >
              Retry Telemetry Connection
            </button>
          </div>
        </main>
      ) : data ? (
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
      ) : null}

      {/* Game Selection Tool Modal with Team, Date, and Event Filters */}
      <GameSelectionTool
        isOpen={isGameSelectorOpen}
        onClose={() => setIsGameSelectorOpen(false)}
        matches={featuredSeries}
        selectedSeriesId={selectedSeriesId}
        onSelectMatch={(seriesId) => {
          setMatchId(seriesId);
          setGameIndex(0);
        }}
      />
    </div>
  );
}

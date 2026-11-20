"use client";

import React from "react";
import { AttributedMistake, ParsedRound } from "@/types/api";

interface RoundSelectionProps {
  currentRound: number;
  totalRounds: number;
  onRoundChange: (round: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  rounds?: ParsedRound[];
  mistakes?: AttributedMistake[];
  mapName?: string;
}

export function RoundSelection({
  currentRound,
  totalRounds,
  onRoundChange,
  isPlaying = false,
  onTogglePlay,
  rounds = [],
  mistakes = [],
  mapName,
}: RoundSelectionProps) {
  const activeRoundData = rounds.find((r) => r.round_number === currentRound);

  return (
    <div
      data-testid="round-selection-card"
      className="c9-watercolor-card rounded-xl p-3 sm:p-3.5 shadow-sm border border-sky-200/60 flex flex-col gap-2 shrink-0 transition-all"
    >
      {/* Top Header & Navigation Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-sky-100 pb-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-xs font-black tracking-tight text-slate-900 uppercase">
            Round Selection
          </h2>
          <span
            data-testid="current-round-display"
            className="text-xs font-mono font-bold text-[#008cd4] bg-sky-50 px-2 py-0.5 rounded border border-sky-200/60"
          >
            Round {currentRound} / {totalRounds}
          </span>
          {activeRoundData?.round_winner_name && (
            <span className="text-xs text-slate-500 font-medium">
              <span>Winner: {activeRoundData.round_winner_name}</span>
              {activeRoundData.win_condition && (
                <span className="text-slate-400 font-normal ml-1">
                  ({activeRoundData.win_condition})
                </span>
              )}
            </span>
          )}
        </div>

        {/* Scrub & Playback Action Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            data-testid="play-pause-btn"
            onClick={onTogglePlay}
            className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 shadow-xs ${
              isPlaying
                ? "bg-[#008cd4] text-white border-[#0077b6] shadow-[0_0_12px_rgba(0,140,212,0.35)]"
                : "bg-white text-slate-700 border-sky-200 hover:bg-sky-50 hover:border-sky-300"
            }`}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>

          <button
            type="button"
            data-testid="prev-round-btn"
            onClick={() => onRoundChange(Math.max(1, currentRound - 1))}
            disabled={currentRound <= 1}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white text-slate-700 border border-sky-200 hover:bg-sky-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
          >
            Prev
          </button>

          <button
            type="button"
            data-testid="next-round-btn"
            onClick={() => onRoundChange(Math.min(totalRounds, currentRound + 1))}
            disabled={currentRound >= totalRounds}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white text-slate-700 border border-sky-200 hover:bg-sky-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Scrub Slider Track */}
      <div className="flex items-center gap-3 bg-white/50 px-2.5 py-1.5 rounded-lg border border-sky-100/60">
        <input
          type="range"
          role="slider"
          aria-label="Round scrubber"
          data-testid="round-scrubber"
          min={1}
          max={totalRounds}
          value={currentRound}
          onChange={(e) => onRoundChange(Number(e.target.value))}
          className="w-full accent-[#008cd4] h-1.5 bg-sky-100 rounded-lg cursor-pointer"
        />
      </div>

      {/* Interactive Round Pills R1 to R{totalRounds} */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pt-0.5 scrollbar-thin">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => {
          const isActive = r === currentRound;
          const rData = rounds.find((rd) => rd.round_number === r);
          const isC9Win =
            rData?.winning_team_id &&
            (rData.winning_team_id.toLowerCase().includes("cloud9") ||
              rData.round_winner_name?.toLowerCase().includes("cloud9"));

          return (
            <button
              key={`round-pill-${r}`}
              type="button"
              onClick={() => onRoundChange(r)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all border shrink-0 ${
                isActive
                  ? "c9-pill-active"
                  : isC9Win
                  ? "bg-sky-50 text-[#0077b6] border-sky-200 hover:bg-sky-100"
                  : "bg-white/80 text-slate-600 border-sky-100 hover:border-sky-300"
              }`}
            >
              <span>R{r}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

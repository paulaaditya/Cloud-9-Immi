import React from "react";
import { RoundCoachingInsight } from "@/types/api";

interface SLMCoachPanelProps {
  insight: RoundCoachingInsight | null;
  roundNumber: number;
}

export function SLMCoachPanel({ insight, roundNumber }: SLMCoachPanelProps) {
  if (!insight) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-sky-400 uppercase tracking-wider mb-2">
          AI Assistant Coach (Qwen2.5-3B Local Engine)
        </h3>
        <p className="text-slate-400 text-sm">
          No automated insight available for Round {roundNumber}.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-sky-500/30 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-xs font-mono uppercase bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded">
            Local SLM Real-Time Debrief
          </span>
          <h3 className="text-lg font-bold text-white mt-1">
            AI Assistant Coach: Round {roundNumber}
          </h3>
        </div>
        {insight.blunder_culprit && (
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Attributed Culprit</span>
            <span className="text-red-400 font-bold font-mono">
              {insight.blunder_culprit} ({insight.win_prob_tax > 0 ? "+" : ""}{insight.win_prob_tax} xRW)
            </span>
          </div>
        )}
      </div>

      <div>
        <p className="text-slate-300 text-sm leading-relaxed">{insight.narrative}</p>
      </div>

      <div className="bg-slate-950/70 border border-slate-800 rounded p-3">
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide block mb-1">
          Tactical Directive
        </span>
        <p className="text-white text-sm font-medium">{insight.tactical_directive}</p>
      </div>

      {insight.player_stat_verdict && (
        <div className="text-xs text-slate-400 font-mono">
          Stat Profile: {insight.player_stat_verdict}
        </div>
      )}
    </div>
  );
}

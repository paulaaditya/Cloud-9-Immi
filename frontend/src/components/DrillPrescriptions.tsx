"use client";

import React, { useState } from "react";
import { PrescribedDrill } from "@/types/api";

interface DrillPrescriptionsProps {
  drills: PrescribedDrill[];
  selectedPlayerId?: string | null;
}

export function DrillPrescriptions({
  drills,
  selectedPlayerId,
}: DrillPrescriptionsProps) {
  const [filterQuery, setFilterQuery] = useState<string>("");

  const filteredDrills = drills.filter((drill) => {
    if (selectedPlayerId) {
      const matchId = drill.target_players.includes(selectedPlayerId);
      const matchName = drill.target_player_names?.includes(selectedPlayerId);
      if (!matchId && !matchName) return false;
    }
    if (!filterQuery) return true;
    const query = filterQuery.toLowerCase();
    return (
      drill.drill_name.toLowerCase().includes(query) ||
      drill.drill_objective.toLowerCase().includes(query) ||
      drill.target_players.some((p) => p.toLowerCase().includes(query)) ||
      (drill.target_player_names &&
        drill.target_player_names.some((p) => p.toLowerCase().includes(query)))
    );
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-cyan-500/10">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2 uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
            Prescribed Tactical Training Drills
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Deterministic remediation protocols targeting identified systemic weaknesses
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <input
            type="text"
            placeholder="Search drills or players..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="bg-slate-900/90 text-slate-200 border border-slate-700/80 rounded px-2.5 py-1 text-[11px] placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00aeef]"
          />
        </div>
      </div>

      {filteredDrills.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-xs">
          No prescribed drills match the current criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {filteredDrills.map((drill, idx) => {
            const playerLabels =
              drill.target_player_names && drill.target_player_names.length > 0
                ? drill.target_player_names
                : drill.target_players;

            return (
              <div
                key={`${drill.drill_name}-${idx}`}
                data-testid={`drill-card-${idx}`}
                className="glass-card rounded-lg p-3.5 flex flex-col justify-between border-slate-800/80 hover:border-cyan-500/40 transition-colors text-xs"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded">
                      Protocol #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">Target Roster:</span>
                      {playerLabels.map((player, pIdx) => {
                        const rawId = drill.target_players[pIdx] || player;
                        const isTargetSelected =
                          selectedPlayerId === player || selectedPlayerId === rawId;

                        return (
                          <span
                            key={`${player}-${pIdx}`}
                            className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded ${
                              isTargetSelected
                                ? "bg-cyan-500/30 text-[#00aeef] border border-[#00aeef]"
                                : "bg-slate-900 text-slate-300 border border-slate-700"
                            }`}
                          >
                            {player}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1.5">
                    {drill.drill_name}
                  </h3>

                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5 bg-slate-950/60 border-l-2 border-[#00aeef] p-2 rounded-r">
                    <span className="font-semibold text-[#00aeef] block mb-0.5">
                      Tactical Objective:
                    </span>
                    {drill.drill_objective}
                  </p>

                  <div className="mb-2.5">
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Setup & Execution Steps
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                      {drill.setup_steps.map((step, sIdx) => (
                        <li key={sIdx} className="leading-snug pl-0.5">
                          <span className="text-slate-200">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-900/60 rounded p-2 text-[11px]">
                  <span className="font-bold text-emerald-400 uppercase tracking-wider text-[9px] block mb-0.5">
                    Success Metric
                  </span>
                  <p className="text-emerald-200/90 leading-relaxed">
                    {drill.success_criterion}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

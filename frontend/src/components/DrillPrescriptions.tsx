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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-sky-200/60">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2 uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
            Prescribed Tactical Training Drills
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Deterministic remediation protocols targeting identified systemic weaknesses
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <input
            type="text"
            placeholder="Search drills or players..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="bg-white/95 text-slate-800 border border-sky-300 rounded px-3 py-1 text-[11px] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#008cd4] shadow-sm"
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
                className="bg-white/85 border border-sky-200/80 rounded-lg p-3.5 flex flex-col justify-between hover:border-[#008cd4]/50 shadow-sm transition-all text-xs"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded shadow-xs">
                      Protocol #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-semibold">Target Roster:</span>
                      {playerLabels.map((player, pIdx) => {
                        const rawId = drill.target_players[pIdx] || player;
                        const isTargetSelected =
                          selectedPlayerId === player || selectedPlayerId === rawId;

                        return (
                          <span
                            key={`${player}-${pIdx}`}
                            className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded transition-all ${
                              isTargetSelected
                                ? "bg-[#008cd4] text-white font-bold border border-[#008cd4] shadow-[0_0_10px_rgba(0,140,212,0.35)]"
                                : "bg-sky-50 text-sky-800 border border-sky-200 hover:border-sky-400 font-semibold"
                            }`}
                          >
                            {player}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1.5 tracking-tight">
                    {drill.drill_name}
                  </h3>

                  <p className="text-[11px] text-slate-700 leading-relaxed mb-2.5 bg-sky-50/80 border-l-2 border-[#008cd4] border-r border-t border-b border-sky-200/70 p-2.5 rounded-r shadow-xs">
                    <span className="font-bold text-[#0066a1] block mb-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#008cd4]"></span>
                      Tactical Objective:
                    </span>
                    {drill.drill_objective}
                  </p>

                  <div className="mb-2.5">
                    <h4 className="text-[10px] font-bold text-sky-900 uppercase tracking-wider mb-1">
                      Setup & Execution Steps
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                      {drill.setup_steps.map((step, sIdx) => (
                        <li key={sIdx} className="leading-snug pl-0.5">
                          <span className="text-slate-800">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="bg-emerald-50/90 border border-emerald-200 rounded-lg p-2.5 text-[11px] shadow-xs">
                  <span className="font-bold text-emerald-800 uppercase tracking-wider text-[9px] block mb-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Success Metric
                  </span>
                  <p className="text-emerald-950 font-medium leading-relaxed">
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

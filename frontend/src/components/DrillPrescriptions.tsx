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
      if (!drill.target_players.includes(selectedPlayerId)) return false;
    }
    if (!filterQuery) return true;
    const query = filterQuery.toLowerCase();
    return (
      drill.drill_name.toLowerCase().includes(query) ||
      drill.drill_objective.toLowerCase().includes(query) ||
      drill.target_players.some((p) => p.toLowerCase().includes(query))
    );
  });

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            Prescribed Tactical Training Drills
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic remediation protocols targeting identified systemic weaknesses
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <input
            type="text"
            placeholder="Search drills or players..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-3 py-1.5 text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {filteredDrills.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          No prescribed drills match the current criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredDrills.map((drill, idx) => (
            <div
              key={`${drill.drill_name}-${idx}`}
              data-testid={`drill-card-${idx}`}
              className="bg-slate-950/70 border border-slate-800 rounded-lg p-5 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                    Protocol #{idx + 1}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400">Target Players:</span>
                    {drill.target_players.map((player) => (
                      <span
                        key={player}
                        className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded ${
                          selectedPlayerId === player
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/60"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {player}
                      </span>
                    ))}
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mb-2">
                  {drill.drill_name}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed mb-4 bg-slate-900/60 border-l-2 border-emerald-500 p-2.5 rounded-r">
                  <span className="font-semibold text-emerald-400 block mb-0.5">
                    Objective:
                  </span>
                  {drill.drill_objective}
                </p>

                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Execution Steps
                  </h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
                    {drill.setup_steps.map((step, sIdx) => (
                      <li key={sIdx} className="leading-normal pl-1">
                        <span className="text-slate-200">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-900/60 rounded-md p-3 text-xs">
                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px] block mb-1">
                  Success Criterion
                </span>
                <p className="text-emerald-200/90 leading-relaxed">
                  {drill.success_criterion}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

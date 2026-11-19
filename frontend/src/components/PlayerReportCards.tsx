"use client";

import React, { useState } from "react";
import { PlayerReportCard } from "@/types/api";

interface PlayerReportCardsProps {
  reports: PlayerReportCard[];
  selectedPlayerId?: string | null;
  onSelectPlayer?: (playerId: string | null) => void;
}

export function PlayerReportCards({
  reports,
  selectedPlayerId,
  onSelectPlayer,
}: PlayerReportCardsProps) {
  const [filterVulnerability, setFilterVulnerability] = useState<string>("ALL");

  const vulnerabilities = Array.from(
    new Set(reports.map((r) => r.primary_vulnerability))
  );

  const filteredReports = reports.filter((r) => {
    if (filterVulnerability === "ALL") return true;
    return r.primary_vulnerability === filterVulnerability;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-cyan-500/10">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2 uppercase">
            <span className="w-2 h-2 rounded-full bg-[#00aeef] shadow-[0_0_8px_#00aeef]"></span>
            Player Error Tax Report Cards
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Micro-mistake degradation and tactical vulnerability attribution
          </p>
        </div>

        {vulnerabilities.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Filter:</span>
            <select
              aria-label="Filter Vulnerability"
              value={filterVulnerability}
              onChange={(e) => setFilterVulnerability(e.target.value)}
              className="bg-slate-900/90 text-slate-200 border border-slate-700/80 rounded px-2 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-[#00aeef]"
            >
              <option value="ALL">All Vulnerabilities</option>
              {vulnerabilities.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filteredReports.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-xs">
          No player report cards available for this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredReports.map((card) => {
            const isSelected = selectedPlayerId === card.player_id;
            const xrwPercentage = (card.cumulative_xrw_tax * 100).toFixed(1);
            const isHighTax = card.cumulative_xrw_tax <= -0.3;
            const displayName = card.player_name || card.player_id;

            return (
              <div
                key={card.player_id}
                data-testid={`player-card-${card.player_id}`}
                onClick={() =>
                  onSelectPlayer?.(isSelected ? null : card.player_id)
                }
                className={`cursor-pointer rounded-lg p-3 transition-all duration-200 border text-xs flex flex-col justify-between ${
                  isSelected
                    ? "bg-slate-800/90 border-[#00aeef] ring-2 ring-[#00aeef] shadow-[0_0_16px_rgba(0,174,239,0.35)]"
                    : "glass-card border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-800/30"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-black text-white tracking-wide">
                          {displayName}
                        </h3>
                        {card.player_name && card.player_name !== card.player_id && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({card.player_id})
                          </span>
                        )}
                        {card.character_name && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/70 text-[#00aeef] border border-cyan-800/50 font-semibold">
                            {card.character_name}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {isSelected ? "Filtered Minimap Focus" : "Click to isolate player"}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          isHighTax
                            ? "bg-rose-950/80 text-rose-300 border border-rose-800/60"
                            : "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                        }`}
                      >
                        {xrwPercentage}% xRW
                      </span>
                      <span className="text-[9px] text-slate-400 mt-0.5">
                        Error Tax
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-2">
                    <div className="flex items-center justify-between text-[11px] py-0.5 border-t border-slate-800/60">
                      <span className="text-slate-400">Mistakes:</span>
                      <span className="font-semibold text-slate-200">
                        {card.mistake_count} Flaws
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] py-0.5 border-t border-slate-800/60">
                      <span className="text-slate-400">Primary Vulnerability:</span>
                      <span className="font-semibold text-amber-400 font-mono text-[10px]">
                        {card.primary_vulnerability}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded p-2 text-[11px] text-slate-300 mt-1">
                  <p className="font-semibold text-slate-400 uppercase tracking-wider text-[9px] mb-0.5">
                    Coaching Remediation
                  </p>
                  <p className="leading-relaxed line-clamp-2 text-slate-300">
                    {card.actionable_summary}
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

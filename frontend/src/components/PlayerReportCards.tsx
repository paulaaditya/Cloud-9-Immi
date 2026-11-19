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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-sky-200/60">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2 uppercase">
            <span className="w-2 h-2 rounded-full bg-[#008cd4] shadow-[0_0_8px_#008cd4]"></span>
            Player Error Tax Report Cards
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Micro-mistake degradation and tactical vulnerability attribution
          </p>
        </div>

        {vulnerabilities.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-[#0077b6] font-semibold">Filter:</span>
            <select
              aria-label="Filter Vulnerability"
              value={filterVulnerability}
              onChange={(e) => setFilterVulnerability(e.target.value)}
              className="bg-white/95 text-slate-800 border border-sky-300 rounded px-2.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-[#008cd4] cursor-pointer shadow-sm"
            >
              <option value="ALL" className="bg-white text-slate-900">All Vulnerabilities</option>
              {vulnerabilities.map((v) => (
                <option key={v} value={v} className="bg-white text-slate-900">
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
                    ? "bg-sky-50/95 border-[#00aeef] ring-2 ring-[#00aeef] shadow-[0_0_18px_rgba(0,174,239,0.35)]"
                    : "bg-white/85 border-sky-200/80 shadow-sm hover:border-[#008cd4]/60 hover:shadow-md hover:bg-white/95"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-black text-slate-900 tracking-wide">
                          {displayName}
                        </h3>
                        {card.player_name && card.player_name !== card.player_id && (
                          <span className="text-[10px] text-sky-700 font-mono">
                            ({card.player_id})
                          </span>
                        )}
                        {card.character_name && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-[#0066a1] border border-sky-300 font-semibold shadow-xs">
                            {card.character_name}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {isSelected ? "Filtered Minimap Focus" : "Click to isolate player"}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold shadow-xs ${
                          isHighTax
                            ? "bg-rose-50 text-rose-700 border border-rose-300"
                            : "bg-amber-50 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {xrwPercentage}% xRW
                      </span>
                      <span className="text-[9px] text-slate-500 mt-0.5 font-medium">
                        Error Tax
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-2">
                    <div className="flex items-center justify-between text-[11px] py-0.5 border-t border-sky-100">
                      <span className="text-slate-500">Mistakes:</span>
                      <span className="font-semibold text-slate-800">
                        {card.mistake_count} Flaws
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] py-0.5 border-t border-sky-100">
                      <span className="text-slate-500">Primary Vulnerability:</span>
                      <span className="font-semibold text-amber-800 font-mono text-[10px]">
                        {card.primary_vulnerability}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-sky-50/80 border-l-2 border-[#008cd4] border-r border-t border-b border-sky-200/70 rounded-r p-2.5 text-[11px] text-slate-700 mt-1 shadow-xs">
                  <p className="font-bold text-[#0066a1] uppercase tracking-wider text-[9px] mb-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#008cd4]"></span>
                    Coaching Remediation
                  </p>
                  <p className="leading-relaxed line-clamp-2 text-slate-700 text-[10.5px]">
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

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
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            Player Error Tax Report Cards
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Quantified xRW win-probability degradation and tactical vulnerability attribution
          </p>
        </div>

        {vulnerabilities.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Filter Vulnerability:</span>
            <select
              value={filterVulnerability}
              onChange={(e) => setFilterVulnerability(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
        <div className="text-center py-8 text-slate-500 text-sm">
          No player report cards available for this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((card) => {
            const isSelected = selectedPlayerId === card.player_id;
            const xrwPercentage = (card.cumulative_xrw_tax * 100).toFixed(1);
            const isHighTax = card.cumulative_xrw_tax <= -0.3;

            return (
              <div
                key={card.player_id}
                data-testid={`player-card-${card.player_id}`}
                onClick={() =>
                  onSelectPlayer?.(isSelected ? null : card.player_id)
                }
                className={`cursor-pointer rounded-lg border p-4 transition-all duration-200 ${
                  isSelected
                    ? "bg-slate-800/90 border-cyan-500 ring-1 ring-cyan-500 shadow-md shadow-cyan-950"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-semibold tracking-wider uppercase text-cyan-400">
                      Roster Member
                    </span>
                    <h3 className="text-base font-bold text-white tracking-wide">
                      {card.player_id}
                    </h3>
                  </div>

                  <div className="flex flex-col items-end">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isHighTax
                          ? "bg-rose-950/80 text-rose-300 border border-rose-800/60"
                          : "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                      }`}
                    >
                      {xrwPercentage}% xRW
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Cumulative Tax
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Mistakes Detected:</span>
                    <span className="font-semibold text-slate-200">
                      {card.mistake_count}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Primary Vulnerability:</span>
                    <span className="font-semibold text-amber-400 font-mono text-[11px]">
                      {card.primary_vulnerability}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 text-xs text-slate-300">
                  <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                    Actionable Advice
                  </p>
                  <p className="leading-relaxed line-clamp-3">
                    {card.actionable_summary}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

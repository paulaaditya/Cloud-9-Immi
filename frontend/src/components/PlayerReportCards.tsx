"use client";

import React, { useState } from "react";
import { PlayerReportCard, VLRPlayerStat } from "@/types/api";

interface PlayerReportCardsProps {
  reports: PlayerReportCard[];
  selectedPlayerId?: string | null;
  onSelectPlayer?: (playerId: string | null) => void;
  playerStats?: Record<string, VLRPlayerStat>;
}

export function PlayerReportCards({
  reports,
  selectedPlayerId,
  onSelectPlayer,
  playerStats,
}: PlayerReportCardsProps) {
  const [filterVulnerability, setFilterVulnerability] = useState<string>("ALL");
  const [filterTeam, setFilterTeam] = useState<string>("ALL");
  const [groupByTeam, setGroupByTeam] = useState<boolean>(true);
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  const vulnerabilities = Array.from(
    new Set(reports.map((r) => r.primary_vulnerability))
  );

  const availableTeams = Array.from(
    new Set(reports.map((r) => r.team_name || "Cloud9"))
  );

  const filteredReports = reports.filter((r) => {
    if (filterVulnerability !== "ALL" && r.primary_vulnerability !== filterVulnerability) {
      return false;
    }
    const team = r.team_name || "Cloud9";
    if (filterTeam !== "ALL" && team !== filterTeam) {
      return false;
    }
    return true;
  });

  interface TeamGroup {
    teamName: string;
    cards: PlayerReportCard[];
    totalTax: number;
    totalMistakes: number;
  }

  const teamGroups = React.useMemo(() => {
    const map = new Map<string, TeamGroup>();
    for (const card of filteredReports) {
      const team = card.team_name || "Cloud9";
      if (!map.has(team)) {
        map.set(team, {
          teamName: team,
          cards: [],
          totalTax: 0,
          totalMistakes: 0,
        });
      }
      const group = map.get(team)!;
      group.cards.push(card);
      group.totalTax += card.cumulative_xrw_tax;
      group.totalMistakes += card.mistake_count;
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.teamName.toLowerCase().includes("cloud9")) return -1;
      if (b.teamName.toLowerCase().includes("cloud9")) return 1;
      return a.teamName.localeCompare(b.teamName);
    });
  }, [filteredReports]);

  const toggleExpand = (playerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCardIds((prev) => ({
      ...prev,
      [playerId]: prev[playerId] === undefined ? false : !prev[playerId],
    }));
  };

  const renderPlayerCard = (card: PlayerReportCard, isTopCard: boolean = false) => {
    const isSelected = selectedPlayerId === card.player_id;
    const xrwPercentage = (card.cumulative_xrw_tax * 100).toFixed(1);
    const isHighTax = card.cumulative_xrw_tax <= -0.3;
    const displayName = card.player_name || card.player_id;
    const mistakesList = card.mistakes || [];
    const hasMultipleFlaws = mistakesList.length > 1;
    const isExpanded = expandedCardIds[card.player_id] ?? true;
    const stat = playerStats?.[card.player_id] || (card.player_name ? playerStats?.[card.player_name] : undefined);

    return (
      <div
        key={card.player_id}
        data-testid={`player-card-${card.player_id}`}
        onClick={() =>
          onSelectPlayer?.(isSelected ? null : card.player_id)
        }
        className={`cursor-pointer rounded-lg p-3 transition-all duration-200 border text-xs flex flex-col justify-start gap-2.5 ${
          isSelected
            ? "c9-watercolor-card-selected border-[#00aeef] ring-2 ring-[#00aeef] shadow-md"
            : isTopCard || card.cumulative_xrw_tax <= -0.5
            ? "c9-watercolor-card border-sky-300/80 hover:border-[#008cd4]/60 shadow-xs"
            : "bg-white/90 border-sky-200/70 shadow-xs hover:border-[#008cd4]/60 hover:bg-white"
        }`}
      >
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-black text-slate-900 tracking-wide">
                {displayName}
              </h3>
              {card.player_name && card.player_name !== card.player_id && (
                <span className="text-[10px] text-sky-700 font-mono">
                  ({card.player_id})
                </span>
              )}
              {card.character_name && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-[11px] text-[#0066a1] font-semibold">
                    {card.character_name}
                  </span>
                </>
              )}
              {card.team_name && (
                <>
                  <span className="text-slate-300">·</span>
                  <span
                    className={`text-[10px] font-medium ${
                      card.team_name.toLowerCase().includes("cloud9")
                        ? "text-[#008cd4] font-semibold"
                        : "text-slate-500"
                    }`}
                  >
                    {card.team_name}
                  </span>
                </>
              )}
            </div>

            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold shrink-0 ${
                isHighTax
                  ? "bg-rose-50 text-rose-700"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {xrwPercentage}% xRW
            </span>
          </div>

          <div className="flex items-center justify-between text-[10.5px] py-1 text-slate-600 bg-sky-50/50 px-2 rounded mb-2">
            <span className="flex items-center gap-1">
              <span className="text-slate-400 font-medium">Flaws:</span>
              <span className="font-semibold text-slate-800">{card.mistake_count}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-slate-400 font-medium">Primary:</span>
              <span className="font-mono font-semibold text-amber-800">{card.primary_vulnerability}</span>
            </span>
          </div>

          {/* VLR Player Stats Badges */}
          {stat && (
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono py-1 px-2 bg-slate-50 rounded border border-slate-200/60 mb-2">
              {stat.acs != null && (
                <span className="font-semibold text-sky-700">
                  {stat.acs} ACS
                </span>
              )}
              {stat.adr != null && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-600">
                    {stat.adr} ADR
                  </span>
                </>
              )}
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-amber-800">
                {stat.fk} FK / {stat.fd} FD
              </span>
              {stat.k != null && stat.d != null && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500">
                    {stat.k}/{stat.d}/{stat.a || 0}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Coach Note Accent Box */}
          <div className="c9-watercolor-accent rounded-r-md p-2.5 text-[11px] text-slate-700 mt-1.5">
            <div className="font-bold text-[#0077b6] text-[10px] mb-0.5">
              Coach Note
            </div>
            <p className="leading-relaxed line-clamp-2 text-slate-700 text-[10.5px]">
              {card.actionable_summary}
            </p>
          </div>
        </div>

        {/* Flaws Breakdown Section */}
        {mistakesList.length > 0 && (
          <div className="mt-2 pt-2 border-t border-sky-100/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                Flaws Breakdown ({mistakesList.length})
              </span>
              {hasMultipleFlaws && (
                <button
                  type="button"
                  data-testid={`toggle-flaws-${card.player_id}`}
                  onClick={(e) => toggleExpand(card.player_id, e)}
                  className="text-[10px] font-semibold text-[#0077b6] hover:text-[#008cd4] underline cursor-pointer"
                >
                  {isExpanded ? "Collapse" : `Show All (${mistakesList.length})`}
                </button>
              )}
            </div>

            {isExpanded && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                {mistakesList.map((m, mIdx) => {
                  const mTax = (m.win_prob_delta * 100).toFixed(1);
                  return (
                    <div
                      key={`${card.player_id}-flaw-${m.round_number}-${mIdx}`}
                      data-testid={`player-mistake-item-${card.player_id}-${m.round_number}-${mIdx}`}
                      className="bg-slate-50/50 hover:bg-sky-50/60 rounded-md p-2 text-[10.5px] space-y-1 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className="font-bold text-slate-700">
                            R{m.round_number}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="font-semibold text-[#0077b6]">
                            {m.mistake_type}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-rose-600 text-[10px]">
                          {mTax}% xRW
                        </span>
                      </div>
                      <p className="text-slate-600 text-[10.5px] leading-relaxed">
                        {m.description}
                      </p>
                      {m.coaching_fix && (
                        <div className="c9-watercolor-accent rounded-r p-1.5 text-slate-700 text-[10px]">
                          {m.coaching_fix}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-2 mb-3 pb-2.5 border-b border-sky-200/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase">
              Player Error Tax Report Cards
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Micro-mistake degradation and tactical vulnerability attribution
            </p>
          </div>

          {/* Grouping Toggle: By Team vs All Players */}
          <div className="flex items-center gap-1 bg-sky-100/80 p-0.5 rounded border border-sky-200">
            <button
              type="button"
              data-testid="group-by-team-btn"
              onClick={() => setGroupByTeam(true)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                groupByTeam
                  ? "bg-[#008cd4] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              By Team
            </button>
            <button
              type="button"
              data-testid="group-all-players-btn"
              onClick={() => setGroupByTeam(false)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                !groupByTeam
                  ? "bg-[#008cd4] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Players
            </button>
          </div>
        </div>

        {/* Filter Bar: Team Filter Pills & Vulnerability Dropdown */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
          {/* Team Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Team:
            </span>
            <button
              type="button"
              data-testid="team-filter-pill-all"
              onClick={() => setFilterTeam("ALL")}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold transition-all whitespace-nowrap ${
                filterTeam === "ALL"
                  ? "bg-[#008cd4] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-sky-50"
              }`}
            >
              All Teams
            </button>
            {availableTeams.map((team) => (
              <button
                key={team}
                type="button"
                data-testid={`team-filter-pill-${team}`}
                onClick={() => setFilterTeam(filterTeam === team ? "ALL" : team)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold transition-all whitespace-nowrap ${
                  filterTeam === team
                    ? "bg-[#008cd4] text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-sky-50"
                }`}
              >
                {team}
              </button>
            ))}
          </div>

          {/* Vulnerability Dropdown */}
          {vulnerabilities.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 font-medium">Vulnerability:</span>
              <select
                aria-label="Filter Vulnerability"
                value={filterVulnerability}
                onChange={(e) => setFilterVulnerability(e.target.value)}
                className="bg-white text-slate-800 border border-sky-200 rounded px-2.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-[#008cd4] cursor-pointer shadow-2xs"
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
      </div>

      {filteredReports.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-xs">
          No player report cards available for this filter.
        </div>
      ) : groupByTeam ? (
        <div className="space-y-3.5">
          {teamGroups.map((group) => {
            const isC9 = group.teamName.toLowerCase().includes("cloud9");
            const groupTaxPercent = (group.totalTax * 100).toFixed(1);
            return (
              <div
                key={group.teamName}
                data-testid={`team-section-${group.teamName}`}
                className={`rounded-xl border p-3 space-y-2.5 transition-all ${
                  isC9
                    ? "bg-sky-50/40 border-sky-200/80 shadow-xs"
                    : "bg-slate-50/50 border-slate-200/80 shadow-xs"
                }`}
              >
                {/* Team Section Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-sky-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">
                      {group.teamName}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      · {group.cards.length} Players
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      data-testid={`team-flaws-${group.teamName}`}
                      className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-sky-100/70 text-[#0077b6]"
                    >
                      {group.totalMistakes} Flaws
                    </span>
                    <span
                      data-testid={`team-tax-${group.teamName}`}
                      className="font-mono font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10.5px]"
                    >
                      {groupTaxPercent}% xRW Sum
                    </span>
                  </div>
                </div>

                {/* Team Player Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {group.cards.map((card, cIdx) => renderPlayerCard(card, cIdx === 0))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredReports.map((card, cIdx) => renderPlayerCard(card, cIdx === 0))}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FeaturedSeries } from "../types/api";

export interface GameSelectionToolProps {
  isOpen: boolean;
  onClose: () => void;
  matches: FeaturedSeries[];
  selectedSeriesId: string;
  onSelectMatch: (seriesId: string) => void;
}

export function GameSelectionTool({
  isOpen,
  onClose,
  matches,
  selectedSeriesId,
  onSelectMatch,
}: GameSelectionToolProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Extract unique events and teams
  const availableEvents = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      const evName =
        typeof m.event === "object" ? m.event.name : m.event_name || m.event;
      if (evName) set.add(evName);
    });
    return Array.from(set).sort();
  }, [matches]);

  const availableTeams = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (m.team1_name) set.add(m.team1_name);
      if (m.team2_name) set.add(m.team2_name);
      if (m.team1) set.add(m.team1);
      if (m.team2) set.add(m.team2);
    });
    return Array.from(set).sort();
  }, [matches]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const t1 = m.team1_name || m.team1 || "";
      const t2 = m.team2_name || m.team2 || "";
      const ev =
        typeof m.event === "object" ? m.event.name : m.event_name || m.event || "";
      const d = m.date || "";
      const map = m.map_name || "";

      // Team filter
      if (selectedTeam === "cloud9") {
        if (!m.is_cloud9 && !m.is_c9_match) return false;
      } else if (selectedTeam !== "all") {
        if (
          !t1.toLowerCase().includes(selectedTeam.toLowerCase()) &&
          !t2.toLowerCase().includes(selectedTeam.toLowerCase())
        ) {
          return false;
        }
      }

      // Event filter
      if (selectedEvent !== "all") {
        if (!ev.toLowerCase().includes(selectedEvent.toLowerCase())) {
          return false;
        }
      }

      // Month / Stage filter
      if (selectedMonth !== "all") {
        if (selectedMonth === "04-05") {
          if (!d.includes("-04-") && !d.includes("-05-")) return false;
        } else if (selectedMonth === "07-08") {
          if (!d.includes("-07-") && !d.includes("-08-")) return false;
        } else if (selectedMonth === "08-09") {
          if (!d.includes("-08-") && !d.includes("-09-")) return false;
        } else {
          if (!d.includes(`-${selectedMonth}-`)) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const corpus = `${t1} ${t2} ${ev} ${map} ${m.teams} ${d}`.toLowerCase();
        if (!corpus.includes(query)) return false;
      }

      return true;
    });
  }, [matches, selectedTeam, selectedEvent, selectedMonth, searchQuery]);

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedTeam !== "all" ||
    selectedEvent !== "all" ||
    selectedMonth !== "all";

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedTeam("all");
    setSelectedEvent("all");
    setSelectedMonth("all");
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-selection-tool-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-white/95 rounded-2xl border border-sky-300/60 shadow-[0_20px_50px_rgba(0,140,212,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tool Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-200 bg-sky-50/50">
          <div>
            <h2
              id="game-selection-tool-title"
              className="text-lg font-black tracking-tight text-slate-900"
            >
              2026 VCT Season - Match Selection
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Filter and select matches from the official 2026 competitive circuit
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-sky-800 bg-sky-100/80 px-2.5 py-1 rounded-full border border-sky-200">
              Showing {filteredMatches.length} of {matches.length} matches
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close match selection tool"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-sky-100 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-sky-200/80 bg-white space-y-3">
          {/* Row 1: Search Bar & Clear Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by team, event, or map..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2 pl-9 text-xs rounded-xl border border-sky-200 bg-sky-50/40 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008cd4] focus:border-transparent transition-all"
              />
              <svg
                className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 1114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-2 text-xs font-semibold text-[#008cd4] hover:text-white hover:bg-[#008cd4] border border-[#008cd4]/30 rounded-xl transition-all"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Row 2: Team and Event Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Team Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
                Team:
              </span>
              <button
                type="button"
                onClick={() => setSelectedTeam("all")}
                className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all ${
                  selectedTeam === "all"
                    ? "bg-[#008cd4] text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All Teams
              </button>
              <button
                type="button"
                onClick={() => setSelectedTeam("cloud9")}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
                  selectedTeam === "cloud9"
                    ? "bg-[#008cd4] text-white shadow-sm ring-2 ring-sky-300"
                    : "bg-sky-100 text-[#0077b6] hover:bg-sky-200"
                }`}
              >
                Cloud9 Only
              </button>
              {availableTeams
                .filter((t) => t !== "Cloud9")
                .slice(0, 6)
                .map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTeam(t)}
                    className={`px-2 py-1 rounded-lg font-medium shrink-0 transition-all ${
                      selectedTeam === t
                        ? "bg-[#008cd4] text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
            </div>

            {/* Event Filter Dropdown */}
            <div className="flex items-center gap-2 text-xs justify-end">
              <label
                htmlFor="event-filter-select"
                className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0"
              >
                Filter by Event:
              </label>
              <select
                id="event-filter-select"
                aria-label="Filter by Event"
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-sky-200 bg-sky-50/50 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#008cd4] cursor-pointer max-w-[240px]"
              >
                <option value="all">All Events</option>
                {availableEvents.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Stage / Month Timeline Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pt-1 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
              Stage / Date:
            </span>
            <button
              type="button"
              onClick={() => setSelectedMonth("all")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 transition-all ${
                selectedMonth === "all"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All Season
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonth("02")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 transition-all ${
                selectedMonth === "02"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Feb (Kickoff)
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonth("03")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 transition-all ${
                selectedMonth === "03"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Mar (Bangkok)
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonth("04-05")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 transition-all ${
                selectedMonth === "04-05"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Apr-May (Stage 1)
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonth("06")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 transition-all ${
                selectedMonth === "06"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Jun (Toronto)
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonth("07-08")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 transition-all ${
                selectedMonth === "07-08"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Jul-Aug (Stage 2)
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonth("08-09")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 transition-all ${
                selectedMonth === "08-09"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Aug-Sep (Paris)
            </button>
          </div>
        </div>

        {/* Matches List Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {filteredMatches.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="font-semibold text-sm">No matches found matching criteria</p>
              <p className="text-xs text-slate-400 mt-1">
                Try loosening your search or clearing active filters
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-3 px-3 py-1.5 text-xs font-semibold text-[#008cd4] bg-white border border-sky-200 rounded-lg shadow-sm hover:bg-sky-50"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredMatches.map((m) => {
                const isSelected = m.series_id === selectedSeriesId;
                const evName =
                  typeof m.event === "object"
                    ? m.event.name
                    : m.event_name || m.event;
                const isC9 = m.is_cloud9 || m.is_c9_match;

                return (
                  <button
                    key={m.series_id}
                    type="button"
                    onClick={() => {
                      onSelectMatch(m.series_id);
                      onClose();
                    }}
                    className={`text-left p-3.5 rounded-xl border transition-all relative ${
                      isSelected
                        ? "bg-white border-[#008cd4] shadow-[0_4px_16px_rgba(0,140,212,0.18)] ring-2 ring-[#008cd4]"
                        : "bg-white/80 border-sky-100 hover:border-sky-300 hover:shadow-sm"
                    }`}
                  >
                    {/* Header info: Event and Date */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold text-sky-800 bg-sky-100/70 px-2 py-0.5 rounded border border-sky-200/60 truncate max-w-[220px]">
                        {evName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {m.date}
                      </span>
                    </div>

                    {/* Match Teams and Score */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 tracking-tight">
                          {m.teams}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          {m.map_name && (
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {m.map_name}
                            </span>
                          )}
                          {isC9 && (
                            <span className="text-[9px] font-black uppercase text-[#0077b6] bg-sky-100 px-1.5 py-0.5 rounded">
                              C9 Match
                            </span>
                          )}
                        </div>
                      </div>

                      {m.score && (
                        <span className="text-xs font-black tracking-tight text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {m.score}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <span className="absolute top-2 right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#008cd4] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#008cd4]"></span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

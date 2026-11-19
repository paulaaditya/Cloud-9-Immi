"use client";

import React, { useEffect, useRef, useState } from "react";
import { AttributedMistake, KillEvent, ParsedRound } from "@/types/api";
import {
  normalizeMapName,
  getMapDisplayName,
  mapWorldToCanvas,
  MAP_LANDMARKS,
  KnownMap,
} from "../lib/mapCoords";
import { Cloud9Logo } from "./Cloud9Logo";

interface MinimapReplayProps {
  currentRound: number;
  totalRounds: number;
  mistakes: AttributedMistake[];
  kills?: KillEvent[];
  rounds?: ParsedRound[];
  onRoundChange: (round: number) => void;
  selectedMistake?: AttributedMistake | null;
  onSelectMistake?: (mistake: AttributedMistake | null) => void;
  mapName?: string;
  selectedPlayerId?: string | null;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
}

export function MinimapReplay({
  currentRound,
  totalRounds,
  mistakes,
  kills = [],
  rounds = [],
  onRoundChange,
  selectedMistake,
  onSelectMistake,
  mapName = "Ascent",
  selectedPlayerId,
  isPlaying = false,
  onTogglePlay,
}: MinimapReplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mapImageLoaded, setMapImageLoaded] = useState<boolean>(false);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const [localPlaying, setLocalPlaying] = useState<boolean>(isPlaying);

  const cleanMap: KnownMap = normalizeMapName(mapName);
  const displayMapName = getMapDisplayName(mapName);
  const effectivePlaying = onTogglePlay ? isPlaying : localPlaying;

  const handleToggle = () => {
    if (onTogglePlay) {
      onTogglePlay();
    } else {
      setLocalPlaying((prev) => !prev);
    }
  };

  // Auto-scrubbing playback effect
  useEffect(() => {
    if (!effectivePlaying) return;
    const interval = setInterval(() => {
      onRoundChange(currentRound >= totalRounds ? 1 : currentRound + 1);
    }, 1800);
    return () => clearInterval(interval);
  }, [effectivePlaying, currentRound, totalRounds, onRoundChange]);

  // Load official map radar image
  useEffect(() => {
    if (typeof window === "undefined") return;
    const clean = normalizeMapName(mapName);
    // Synchronously reset map image state to prevent cross-map flash
    setMapImageLoaded(false);
    mapImageRef.current = null;

    const img = new window.Image();
    img.src = `/maps/${clean}.png`;
    img.onload = () => {
      mapImageRef.current = img;
      setMapImageLoaded(true);
    };
    img.onerror = () => {
      mapImageRef.current = null;
      setMapImageLoaded(false);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [mapName]);

  // Mistake review mode: active round vs all match mistakes
  const [mistakeViewMode, setMistakeViewMode] = useState<"round" | "all">("round");

  // Filter mistakes for active round
  const roundMistakes = mistakes.filter((m) => m.round_number === currentRound);

  // Sorted list of all mistakes across the entire match
  const sortedAllMistakes = React.useMemo(() => {
    return [...mistakes].sort((a, b) => {
      if (a.round_number !== b.round_number) return a.round_number - b.round_number;
      return (a.occurred_at || "").localeCompare(b.occurred_at || "");
    });
  }, [mistakes]);

  const displayedMistakes = mistakeViewMode === "all" ? sortedAllMistakes : roundMistakes;

  // Active round data
  const activeRoundData = rounds.find((r) => r.round_number === currentRound);
  const effectiveKills = activeRoundData?.kills && activeRoundData.kills.length > 0
    ? activeRoundData.kills
    : kills;

  const getMistakeCanvasPos = (mistake: AttributedMistake, index: number, width: number, height: number) => {
    const matchedKill = effectiveKills.find(
      (k) =>
        k.victim_id === mistake.player_id ||
        (k.victim_name && k.victim_name === mistake.player_name)
    );
    if (matchedKill && matchedKill.victim_position) {
      return mapWorldToCanvas(
        cleanMap,
        matchedKill.victim_position.x,
        matchedKill.victim_position.y,
        width,
        height
      );
    }

    const fallbackPositions = [
      { x: width * 0.50, y: height * 0.48 }, // Mid
      { x: width * 0.72, y: height * 0.30 }, // A Site
      { x: width * 0.25, y: height * 0.30 }, // B Site
      { x: width * 0.68, y: height * 0.54 }, // A Main
      { x: width * 0.28, y: height * 0.54 }, // B Main
      { x: width * 0.40, y: height * 0.38 }, // Catwalk
    ];
    return fallbackPositions[index % fallbackPositions.length];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Radar Image or Tactical Fallback
    if (mapImageLoaded && mapImageRef.current) {
      ctx.drawImage(mapImageRef.current, 0, 0, width, height);
      // Subtle tactical contrast overlay
      ctx.fillStyle = "rgba(7, 20, 39, 0.25)";
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = "#091a32";
      ctx.fillRect(0, 0, width, height);

      // Tactical lanes
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1.5;
      if (typeof ctx.setLineDash === "function") {
        ctx.setLineDash([4, 4]);
      }
      ctx.beginPath();
      ctx.moveTo(300, 85);
      ctx.lineTo(455, 150);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(300, 85);
      ctx.lineTo(145, 150);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(300, 85);
      ctx.lineTo(300, 505);
      ctx.stroke();

      if (typeof ctx.setLineDash === "function") {
        ctx.setLineDash([]);
      }
    }

    // Dynamic Landmarks for current map (consistently rendered for orientation)
    const landmarks = MAP_LANDMARKS[cleanMap] || MAP_LANDMARKS.ascent;
    landmarks.forEach((landmark) => {
      const lx = landmark.x * width - landmark.w / 2;
      const ly = landmark.y * height - landmark.h / 2;
      ctx.fillStyle = mapImageLoaded ? "rgba(7, 20, 39, 0.72)" : "rgba(10, 22, 42, 0.85)";
      ctx.fillRect(lx, ly, landmark.w, landmark.h);

      ctx.strokeStyle = landmark.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(lx, ly, landmark.w, landmark.h);

      ctx.fillStyle = landmark.color;
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        landmark.label,
        lx + landmark.w / 2,
        ly + landmark.h / 2
      );
    });

    // 2. High-Tech Grid & Concentric Radar Range Rings
    ctx.strokeStyle = "rgba(0, 174, 239, 0.08)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(0, 174, 239, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 120, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 220, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Render Kill Events
    effectiveKills.forEach((kill) => {
      const killerPos = kill.killer_position
        ? mapWorldToCanvas(cleanMap, kill.killer_position.x, kill.killer_position.y, width, height)
        : null;
      const victimPos = kill.victim_position
        ? mapWorldToCanvas(cleanMap, kill.victim_position.x, kill.victim_position.y, width, height)
        : null;

      const isPlayerAction =
        selectedPlayerId &&
        (kill.killer_id === selectedPlayerId ||
          kill.victim_id === selectedPlayerId ||
          kill.killer_name === selectedPlayerId ||
          kill.victim_name === selectedPlayerId);

      const alpha = selectedPlayerId ? (isPlayerAction ? 1.0 : 0.2) : 0.85;

      if (killerPos && victimPos) {
        // Line of fire
        ctx.strokeStyle = `rgba(244, 63, 94, ${alpha * 0.7})`;
        ctx.lineWidth = isPlayerAction ? 2.5 : 1.2;
        ctx.beginPath();
        ctx.moveTo(killerPos.x, killerPos.y);
        ctx.lineTo(victimPos.x, victimPos.y);
        ctx.stroke();

        // Killer point
        ctx.fillStyle = `rgba(0, 174, 239, ${alpha})`;
        ctx.beginPath();
        ctx.arc(killerPos.x, killerPos.y, isPlayerAction ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Victim point
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.beginPath();
        ctx.arc(victimPos.x, victimPos.y, isPlayerAction ? 5.5 : 4, 0, Math.PI * 2);
        ctx.fill();

        if (kill.is_first_blood) {
          ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(victimPos.x - 6, victimPos.y - 6, 12, 12);
        }
      } else if (victimPos) {
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.beginPath();
        ctx.arc(victimPos.x, victimPos.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 4. Render Mistake Callout Pins
    roundMistakes.forEach((mistake, idx) => {
      const pos = getMistakeCanvasPos(mistake, idx, width, height);
      const isSelected =
        selectedMistake?.player_id === mistake.player_id &&
        selectedMistake?.occurred_at === mistake.occurred_at;

      const isPlayerMatch =
        !selectedPlayerId ||
        mistake.player_id === selectedPlayerId ||
        mistake.player_name === selectedPlayerId;

      const pinAlpha = isPlayerMatch ? 1.0 : 0.25;

      // Outer glow circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? 18 : 12, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? `rgba(244, 63, 94, ${0.5 * pinAlpha})`
        : `rgba(225, 29, 72, ${0.3 * pinAlpha})`;
      ctx.fill();

      // Outer ring
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? 12 : 8, 0, Math.PI * 2);
      ctx.strokeStyle = isSelected
        ? `rgba(253, 164, 175, ${pinAlpha})`
        : `rgba(244, 63, 94, ${pinAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Core point
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${pinAlpha})`;
      ctx.fill();

      // Negative xRW Percentage Badge
      const xrwPercent = (mistake.win_prob_delta * 100).toFixed(1);
      const badgeText = `${xrwPercent}% xRW`;
      ctx.font = "bold 10px monospace";
      const textWidth = ctx.measureText(badgeText).width;

      const badgeX = pos.x + 14;
      const badgeY = pos.y - 10;
      const paddingX = 4;
      const paddingY = 2;

      ctx.fillStyle = `rgba(15, 23, 42, ${0.9 * pinAlpha})`;
      ctx.fillRect(
        badgeX - paddingX,
        badgeY - 8,
        textWidth + paddingX * 2,
        14 + paddingY
      );

      ctx.strokeStyle = `rgba(225, 29, 72, ${pinAlpha})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        badgeX - paddingX,
        badgeY - 8,
        textWidth + paddingX * 2,
        14 + paddingY
      );

      ctx.fillStyle = `rgba(253, 164, 175, ${pinAlpha})`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, badgeX, badgeY);

      // Player identifier label
      const playerLabel = mistake.player_name || mistake.player_id;
      ctx.font = "9px sans-serif";
      ctx.fillStyle = `rgba(203, 213, 225, ${pinAlpha})`;
      ctx.fillText(playerLabel, badgeX, badgeY + 11);
    });
  }, [
    currentRound,
    roundMistakes,
    effectiveKills,
    selectedMistake,
    selectedPlayerId,
    mapImageLoaded,
    mapName,
  ]);

  return (
    <div className="glass-panel rounded-xl p-4 flex flex-col h-full min-h-0 justify-between gap-3 shadow-lg border-sky-300/40">
      {/* Top Header & Round Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-sky-200/80 pb-2.5">
        <div className="flex items-center gap-2.5">
          <Cloud9Logo size={28} glow={true} showWatermark={false} />
          <h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase">
            Tactical Minimap Replay
          </h2>
          <span className="bg-sky-100 text-[#0077b6] text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-sky-300 uppercase">
            {displayMapName}
          </span>
          {selectedPlayerId && (
            <span className="bg-sky-50 text-[#0077b6] text-[10px] font-mono px-2 py-0.5 rounded border border-sky-300">
              Focus: {selectedPlayerId}
            </span>
          )}
        </div>

        {/* Round scrub controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            data-testid="play-pause-btn"
            onClick={handleToggle}
            className={`px-2.5 py-1 text-xs font-bold rounded border transition-colors flex items-center gap-1 ${
              effectivePlaying
                ? "bg-[#008cd4] text-white border-[#0077b6] shadow-sm"
                : "bg-white text-slate-700 border-sky-200 hover:bg-sky-50"
            }`}
          >
            {effectivePlaying ? "Pause" : "Play"}
          </button>

          <button
            type="button"
            data-testid="prev-round-btn"
            onClick={() => onRoundChange(Math.max(1, currentRound - 1))}
            disabled={currentRound <= 1}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-white text-slate-700 border border-sky-200 hover:bg-sky-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            Prev
          </button>

          <span
            data-testid="current-round-display"
            className="text-xs font-mono font-bold text-[#008cd4] whitespace-nowrap min-w-[85px] text-center"
          >
            Round {currentRound} / {totalRounds}
          </span>

          <button
            type="button"
            data-testid="next-round-btn"
            onClick={() => onRoundChange(Math.min(totalRounds, currentRound + 1))}
            disabled={currentRound >= totalRounds}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-white text-slate-700 border border-sky-200 hover:bg-sky-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            Next
          </button>
        </div>
      </div>

      {/* Main Center Area: Radar Canvas & High-Detail Analysis Stream */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch flex-1 min-h-0">
        {/* Radar Canvas Container */}
        <div className="md:col-span-7 flex flex-col items-center justify-between bg-[#09182d] border border-sky-300/60 rounded-xl p-3 shadow-lg relative overflow-hidden h-full min-h-[380px]">
          <div className="relative w-full flex-1 flex items-center justify-center min-h-0">
            <canvas
              ref={canvasRef}
              data-testid="minimap-canvas"
              width={600}
              height={600}
              className="w-full max-w-[540px] aspect-square rounded-lg cursor-crosshair object-contain shadow-inner bg-[#050d1a]"
            />
          </div>
          <div className="flex items-center justify-between w-full text-[10px] text-sky-200/80 pt-2 px-1 border-t border-sky-500/20 mt-1">
            <span className="font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#008cd4] animate-pulse"></span>
              Spatial Radar: {displayMapName}
            </span>
            <span className="text-rose-400 font-mono font-semibold">Red: Attributed Mistake</span>
          </div>
        </div>

        {/* Round Mistakes & Tactical Analysis Details */}
        <div className="md:col-span-5 flex flex-col h-full min-h-[380px] bg-white/70 border border-sky-200/80 rounded-xl p-3 shadow-sm justify-between gap-2 overflow-hidden">
          {/* Tabs: Active Round vs All Match Mistakes */}
          <div className="flex items-center justify-between border-b border-sky-200/70 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMistakeViewMode("round")}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                  mistakeViewMode === "round"
                    ? "bg-[#008cd4] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-sky-100/60"
                }`}
              >
                Round Mistakes ({roundMistakes.length})
              </button>
              <button
                type="button"
                onClick={() => setMistakeViewMode("all")}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                  mistakeViewMode === "all"
                    ? "bg-[#008cd4] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-sky-100/60"
                }`}
              >
                All Match Mistakes ({mistakes.length})
              </button>
            </div>

            <span className="text-[10px] bg-sky-100 text-[#0077b6] font-mono font-bold px-2 py-0.5 rounded border border-sky-200">
              {displayedMistakes.length} Detected
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[460px]">
            {displayedMistakes.length === 0 ? (
              <div className="bg-sky-50/70 border border-dashed border-sky-200 rounded-lg p-5 text-center text-xs text-slate-500">
                No tactical mistakes attributed in Round {currentRound}. Clean round execution.
              </div>
            ) : (
              displayedMistakes.map((m, idx) => {
                const isSelected =
                  selectedMistake?.player_id === m.player_id &&
                  selectedMistake?.occurred_at === m.occurred_at;
                const xrwPercent = (m.win_prob_delta * 100).toFixed(1);
                const playerLabel = m.player_name || m.player_id;
                const isCritical = m.win_prob_delta <= -0.3;
                const isHigh = m.win_prob_delta <= -0.2;
                const severityLabel = isCritical ? "CRITICAL TAX" : isHigh ? "HIGH SEVERITY" : "TACTICAL LEAK";

                return (
                  <div
                    key={`${m.player_id}-${m.occurred_at}-${idx}`}
                    data-testid="mistake-marker"
                    onClick={() => {
                      if (m.round_number !== currentRound) {
                        onRoundChange(m.round_number);
                      }
                      onSelectMistake?.(isSelected ? null : m);
                    }}
                    className={`cursor-pointer rounded-lg border p-3 transition-all text-xs ${
                      isSelected
                        ? "bg-rose-50/90 border-rose-400 shadow-md ring-1 ring-rose-400"
                        : "bg-white/90 border-sky-200 hover:border-sky-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        <span className="font-bold text-slate-900 tracking-wide text-xs">
                          {playerLabel}
                        </span>
                        {m.character_name && (
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-sky-100 text-[#0077b6] border border-sky-200 font-mono font-semibold">
                            {m.character_name}
                          </span>
                        )}
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono font-bold">
                          R{m.round_number}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                            isCritical
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}
                        >
                          {severityLabel}
                        </span>
                        <span
                          data-testid="mistake-xrw-badge"
                          className="font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-300 text-[10.5px]"
                        >
                          {xrwPercent}% xRW
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#0077b6] font-bold mb-1">
                      <span>{m.mistake_type}</span>
                      <span className="text-slate-500 font-normal">
                        Deficit: &gt; 3.0s untraded
                      </span>
                    </div>

                    {/* Win Probability degradation visual bar */}
                    <div className="w-full bg-slate-200/80 rounded-full h-1.5 my-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isCritical ? "bg-rose-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(100, Math.abs(m.win_prob_delta) * 200)}%` }}
                      ></div>
                    </div>

                    <p className="text-slate-700 text-[11px] mb-2 leading-relaxed">
                      {m.description}
                    </p>

                    <div className="bg-sky-50/90 border-l-2 border-[#008cd4] border-r border-t border-b border-sky-200/60 p-2 rounded-r text-[10.5px] text-slate-800 shadow-xs">
                      <span className="font-bold text-[#0077b6] block mb-0.5 uppercase text-[9px] tracking-wider">
                        Coaching Fix:
                      </span>
                      {m.coaching_fix}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Killfeed & Round Summary Panel */}
      <div className="bg-white/80 border border-sky-200 rounded-lg p-2.5 flex flex-col gap-1.5 shadow-sm">
        <div className="flex items-center justify-between text-xs border-b border-sky-100 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-500">
              Round {currentRound} Telemetry:
            </span>
            <span className="font-bold text-slate-900 text-[11px]">
              {activeRoundData?.winning_team_id
                ? `Winner: ${activeRoundData.round_winner_name || activeRoundData.winning_team_id}`
                : "Match Engagement"}
            </span>
            {activeRoundData?.win_condition && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-50 text-slate-700 border border-sky-200 font-medium">
                {activeRoundData.win_condition}
              </span>
            )}
            {activeRoundData?.spike_planted && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                Spike Planted
              </span>
            )}
          </div>

          <span className="text-[10px] font-mono text-slate-500">
            {effectiveKills.length} Kills Recorded
          </span>
        </div>

        {/* Kill Feed Items */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5 text-[11px]">
          {effectiveKills.length === 0 ? (
            <span className="text-[10px] text-slate-400 italic">
              No kill events logged in this round timeframe.
            </span>
          ) : (
            effectiveKills.map((kill, kIdx) => {
              const killer = kill.killer_name || kill.killer_id;
              const victim = kill.victim_name || kill.victim_id;
              const isHighlighted =
                selectedPlayerId &&
                (killer === selectedPlayerId ||
                  victim === selectedPlayerId ||
                  kill.killer_id === selectedPlayerId ||
                  kill.victim_id === selectedPlayerId);

              return (
                <div
                  key={`${kill.event_id || kIdx}`}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded border whitespace-nowrap shadow-xs ${
                    isHighlighted
                      ? "bg-sky-100 border-[#008cd4] text-slate-900 font-semibold"
                      : "bg-white border-sky-200 text-slate-700"
                  }`}
                >
                  <span className="font-bold text-[#008cd4]">{killer}</span>
                  <span className="text-[9px] text-slate-400 uppercase font-mono">
                    [{kill.weapon || "GUN"}]
                  </span>
                  <span className="text-rose-600 font-semibold">{victim}</span>
                  {kill.is_first_blood && (
                    <span className="text-[9px] font-bold px-1 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      FB
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Scrubber slider */}
      <div className="flex flex-col gap-1 bg-white/70 px-2 py-1.5 rounded-lg border border-sky-200 shadow-xs">
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

      {/* Interactive Round Pills R1 to R24 */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-0.5">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => {
          const isActive = r === currentRound;
          const rData = rounds.find((rd) => rd.round_number === r);
          const hasMistake = mistakes.some((m) => m.round_number === r);
          const isC9Win =
            rData?.winning_team_id &&
            (rData.winning_team_id.toLowerCase().includes("cloud9") ||
              rData.round_winner_name?.toLowerCase().includes("cloud9"));

          return (
            <button
              key={`round-pill-${r}`}
              type="button"
              onClick={() => onRoundChange(r)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all flex items-center gap-1 border shrink-0 ${
                isActive
                  ? "c9-pill-active"
                  : isC9Win
                  ? "bg-sky-100 text-[#0077b6] border-sky-300 hover:bg-sky-200/60"
                  : "bg-white text-slate-700 border-sky-200 hover:border-sky-300"
              }`}
            >
              <span>R{r}</span>
              {hasMistake && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

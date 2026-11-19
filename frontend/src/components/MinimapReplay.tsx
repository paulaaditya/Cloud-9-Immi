"use client";

import React, { useEffect, useRef, useState } from "react";
import { AttributedMistake, KillEvent, ParsedRound } from "@/types/api";

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

interface Landmark {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  type: "site" | "mid" | "spawn";
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
    const cleanMap = (mapName || "ascent").toLowerCase().trim();
    const img = new window.Image();
    img.src = `/maps/${cleanMap}.png`;
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

  // Filter mistakes for active round
  const roundMistakes = mistakes.filter((m) => m.round_number === currentRound);

  // Active round data
  const activeRoundData = rounds.find((r) => r.round_number === currentRound);
  const effectiveKills = activeRoundData?.kills && activeRoundData.kills.length > 0
    ? activeRoundData.kills
    : kills;

  // Landmarks for radar fallback
  const landmarks: Landmark[] = [
    { label: "A Site", x: 410, y: 150, w: 90, h: 70, color: "#00aeef", type: "site" },
    { label: "B Site", x: 100, y: 150, w: 90, h: 70, color: "#00aeef", type: "site" },
    { label: "Mid Yard", x: 255, y: 260, w: 90, h: 60, color: "#38bdf8", type: "mid" },
    { label: "Def. Spawn", x: 245, y: 40, w: 110, h: 45, color: "#f43f5e", type: "spawn" },
    { label: "Atk. Spawn", x: 245, y: 505, w: 110, h: 45, color: "#10b981", type: "spawn" },
  ];

  const mapCoordsToCanvas = (x: number, y: number, canvasWidth: number, canvasHeight: number) => {
    if (x >= 0 && x <= 600 && y >= 0 && y <= 600) {
      return {
        x: Math.max(30, Math.min(canvasWidth - 30, (x / 600) * canvasWidth)),
        y: Math.max(30, Math.min(canvasHeight - 30, (y / 600) * canvasHeight)),
      };
    }
    const nx = ((x + 10000) / 20000) * (canvasWidth - 80) + 40;
    const ny = ((y + 10000) / 20000) * (canvasHeight - 80) + 40;
    return {
      x: Math.max(30, Math.min(canvasWidth - 30, nx)),
      y: Math.max(30, Math.min(canvasHeight - 30, ny)),
    };
  };

  const getMistakeCanvasPos = (mistake: AttributedMistake, index: number, width: number, height: number) => {
    const matchedKill = effectiveKills.find(
      (k) =>
        k.victim_id === mistake.player_id ||
        (k.victim_name && k.victim_name === mistake.player_name)
    );
    if (matchedKill && matchedKill.victim_position) {
      return mapCoordsToCanvas(
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
      ctx.fillStyle = "rgba(5, 11, 20, 0.45)";
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = "#070e1b";
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

      // Landmarks
      landmarks.forEach((landmark) => {
        ctx.fillStyle = "rgba(10, 22, 42, 0.85)";
        ctx.fillRect(landmark.x, landmark.y, landmark.w, landmark.h);

        ctx.strokeStyle = landmark.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(landmark.x, landmark.y, landmark.w, landmark.h);

        ctx.fillStyle = landmark.color;
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          landmark.label,
          landmark.x + landmark.w / 2,
          landmark.y + landmark.h / 2
        );
      });
    }

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
        ? mapCoordsToCanvas(kill.killer_position.x, kill.killer_position.y, width, height)
        : null;
      const victimPos = kill.victim_position
        ? mapCoordsToCanvas(kill.victim_position.x, kill.victim_position.y, width, height)
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
    <div className="glass-panel rounded-xl p-4 flex flex-col h-full min-h-0 justify-between gap-3 shadow-xl">
      {/* Top Header & Round Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-cyan-500/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00aeef] shadow-[0_0_8px_#00aeef]"></span>
          <h2 className="text-sm font-bold tracking-tight text-white uppercase">
            Tactical Minimap Replay
          </h2>
          <span className="bg-cyan-950/80 text-[#00aeef] text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-cyan-800/60 uppercase">
            {mapName}
          </span>
          {selectedPlayerId && (
            <span className="bg-blue-900/50 text-cyan-200 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/50">
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
                ? "bg-[#00aeef] text-black border-[#00aeef]"
                : "bg-slate-800/90 text-cyan-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            {effectivePlaying ? "Pause" : "Play"}
          </button>

          <button
            type="button"
            data-testid="prev-round-btn"
            onClick={() => onRoundChange(Math.max(1, currentRound - 1))}
            disabled={currentRound <= 1}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800/90 text-slate-200 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev
          </button>

          <span
            data-testid="current-round-display"
            className="text-xs font-mono font-bold text-[#00aeef] whitespace-nowrap min-w-[85px] text-center"
          >
            Round {currentRound} / {totalRounds}
          </span>

          <button
            type="button"
            data-testid="next-round-btn"
            onClick={() => onRoundChange(Math.min(totalRounds, currentRound + 1))}
            disabled={currentRound >= totalRounds}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800/90 text-slate-200 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/* Main Center Area: Radar Canvas & Round Mistakes Panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start flex-1 min-h-0">
        {/* Radar Canvas Container */}
        <div className="md:col-span-7 flex flex-col items-center justify-center bg-[#030710] border border-cyan-500/20 rounded-lg p-2 shadow-inner relative overflow-hidden h-full min-h-[300px]">
          <canvas
            ref={canvasRef}
            data-testid="minimap-canvas"
            width={600}
            height={600}
            className="w-full max-h-[350px] aspect-square rounded cursor-crosshair object-contain"
          />
          <div className="flex items-center justify-between w-full text-[10px] text-slate-400 pt-1 px-1">
            <span className="font-mono">Spatial Radar: {mapName}</span>
            <span className="text-rose-400 font-mono">Red: Attributed Mistake</span>
          </div>
        </div>

        {/* Round Mistakes Details */}
        <div className="md:col-span-5 flex flex-col h-full min-h-[300px] justify-between gap-2 overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 tracking-wide uppercase">
              Round Mistakes
            </h3>
            <span className="text-[10px] bg-slate-800/90 text-cyan-300 font-mono px-2 py-0.5 rounded border border-slate-700">
              {roundMistakes.length} Detected
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[330px]">
            {roundMistakes.length === 0 ? (
              <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-lg p-4 text-center text-xs text-slate-500">
                No tactical mistakes attributed in Round {currentRound}. Clean round execution.
              </div>
            ) : (
              roundMistakes.map((m, idx) => {
                const isSelected =
                  selectedMistake?.player_id === m.player_id &&
                  selectedMistake?.occurred_at === m.occurred_at;
                const xrwPercent = (m.win_prob_delta * 100).toFixed(1);
                const playerLabel = m.player_name || m.player_id;

                return (
                  <div
                    key={`${m.player_id}-${m.occurred_at}-${idx}`}
                    data-testid="mistake-marker"
                    onClick={() => onSelectMistake?.(isSelected ? null : m)}
                    className={`cursor-pointer rounded-lg border p-2.5 transition-all text-xs ${
                      isSelected
                        ? "bg-rose-950/40 border-rose-500 shadow-sm shadow-rose-950 ring-1 ring-rose-400"
                        : "glass-card border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        <span className="font-bold text-white tracking-wide">
                          {playerLabel}
                        </span>
                        {m.character_name && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
                            {m.character_name}
                          </span>
                        )}
                      </div>

                      <span
                        data-testid="mistake-xrw-badge"
                        className="font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-800/80 text-[10px]"
                      >
                        {xrwPercent}% xRW
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-amber-400 mb-1">
                      {m.mistake_type}
                    </div>

                    <p className="text-slate-300 text-[11px] mb-1.5 leading-relaxed">
                      {m.description}
                    </p>

                    <div className="bg-slate-900/80 border-l-2 border-[#00aeef] p-1.5 rounded-r text-[10px] text-slate-300">
                      <span className="font-semibold text-[#00aeef] block mb-0.5">
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
      <div className="bg-slate-950/70 border border-cyan-500/10 rounded-lg p-2.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Round {currentRound} Telemetry:
            </span>
            <span className="font-bold text-white text-[11px]">
              {activeRoundData?.winning_team_id
                ? `Winner: ${activeRoundData.round_winner_name || activeRoundData.winning_team_id}`
                : "Match Engagement"}
            </span>
            {activeRoundData?.win_condition && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {activeRoundData.win_condition}
              </span>
            )}
            {activeRoundData?.spike_planted && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950/70 text-rose-300 border border-rose-800/60">
                Spike Planted
              </span>
            )}
          </div>

          <span className="text-[10px] font-mono text-slate-400">
            {effectiveKills.length} Kills Recorded
          </span>
        </div>

        {/* Kill Feed Items */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5 text-[11px]">
          {effectiveKills.length === 0 ? (
            <span className="text-[10px] text-slate-500 italic">
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
                  className={`flex items-center gap-1.5 px-2 py-1 rounded border whitespace-nowrap ${
                    isHighlighted
                      ? "bg-cyan-950/80 border-[#00aeef] text-white"
                      : "bg-slate-900/80 border-slate-800 text-slate-300"
                  }`}
                >
                  <span className="font-bold text-[#00aeef]">{killer}</span>
                  <span className="text-[9px] text-slate-400 uppercase font-mono">
                    [{kill.weapon || "GUN"}]
                  </span>
                  <span className="text-rose-400 font-semibold">{victim}</span>
                  {kill.is_first_blood && (
                    <span className="text-[9px] font-bold px-1 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
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
      <div className="flex flex-col gap-1 bg-slate-950/50 px-2 py-1.5 rounded-lg border border-slate-800/60">
        <input
          type="range"
          role="slider"
          aria-label="Round scrubber"
          data-testid="round-scrubber"
          min={1}
          max={totalRounds}
          value={currentRound}
          onChange={(e) => onRoundChange(Number(e.target.value))}
          className="w-full accent-[#00aeef] h-1.5 bg-slate-800 rounded-lg cursor-pointer"
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
                  ? "bg-[#00aeef] text-black border-[#00aeef] shadow-[0_0_10px_#00aeef]"
                  : isC9Win
                  ? "bg-cyan-950/50 text-[#00aeef] border-cyan-800/60 hover:bg-cyan-900/40"
                  : "bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700"
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

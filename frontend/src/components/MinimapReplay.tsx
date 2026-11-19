"use client";

import React, { useEffect, useRef } from "react";
import { AttributedMistake, KillEvent } from "@/types/api";

interface MinimapReplayProps {
  currentRound: number;
  totalRounds: number;
  mistakes: AttributedMistake[];
  kills?: KillEvent[];
  onRoundChange: (round: number) => void;
  selectedMistake?: AttributedMistake | null;
  onSelectMistake?: (mistake: AttributedMistake | null) => void;
  mapName?: string;
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
  onRoundChange,
  selectedMistake,
  onSelectMistake,
  mapName = "Ascent",
}: MinimapReplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filter mistakes for the active round
  const roundMistakes = mistakes.filter((m) => m.round_number === currentRound);

  // Map landmarks
  const landmarks: Landmark[] = [
    { label: "A Site", x: 410, y: 150, w: 90, h: 70, color: "#38bdf8", type: "site" },
    { label: "B Site", x: 100, y: 150, w: 90, h: 70, color: "#38bdf8", type: "site" },
    { label: "Mid Yard", x: 255, y: 260, w: 90, h: 60, color: "#a855f7", type: "mid" },
    { label: "Def. Spawn", x: 245, y: 40, w: 110, h: 45, color: "#f43f5e", type: "spawn" },
    { label: "Atk. Spawn", x: 245, y: 505, w: 110, h: 45, color: "#10b981", type: "spawn" },
  ];

  // Helper to map coordinates into canvas coordinates (600x600)
  const getMistakeCanvasPos = (mistake: AttributedMistake, index: number) => {
    // If correlated kill has victim_position
    const matchedKill = kills.find((k) => k.victim_id === mistake.player_id);
    if (matchedKill && matchedKill.victim_position) {
      const vx = matchedKill.victim_position.x;
      const vy = matchedKill.victim_position.y;
      // In-game units often span ~[-10000, 10000] or [0, 10000]
      if (Math.abs(vx) > 600 || Math.abs(vy) > 600) {
        const nx = ((vx + 10000) / 20000) * 500 + 50;
        const ny = ((vy + 10000) / 20000) * 500 + 50;
        return { x: Math.max(40, Math.min(560, nx)), y: Math.max(40, Math.min(560, ny)) };
      }
      return { x: Math.max(40, Math.min(560, vx)), y: Math.max(40, Math.min(560, vy)) };
    }

    // Default positioning for tactical demo based on index & mistake type
    const fallbackPositions = [
      { x: 300, y: 290 }, // Mid
      { x: 440, y: 185 }, // A Site
      { x: 145, y: 185 }, // B Site
      { x: 410, y: 320 }, // A Main
      { x: 160, y: 320 }, // B Main
      { x: 230, y: 220 }, // Catwalk
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

    // 1. Clear & Background Grid
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    // Grid lines (Tactical Radar overlay)
    ctx.strokeStyle = "#1e293b";
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

    // Radar concentric circles
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 120, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 220, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Connective Tactical Lanes / Corridors
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    if (typeof ctx.setLineDash === "function") {
      ctx.setLineDash([4, 4]);
    }

    // Defender spawn to A & B
    ctx.beginPath();
    ctx.moveTo(300, 85);
    ctx.lineTo(455, 150);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(300, 85);
    ctx.lineTo(145, 150);
    ctx.stroke();

    // Mid connections
    ctx.beginPath();
    ctx.moveTo(300, 85);
    ctx.lineTo(300, 260);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(300, 320);
    ctx.lineTo(300, 505);
    ctx.stroke();

    // Attacker spawn to A Main & B Main
    ctx.beginPath();
    ctx.moveTo(300, 505);
    ctx.lineTo(440, 360);
    ctx.lineTo(440, 220);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(300, 505);
    ctx.lineTo(160, 360);
    ctx.lineTo(160, 220);
    ctx.stroke();

    if (typeof ctx.setLineDash === "function") {
      ctx.setLineDash([]);
    }

    // 3. Render Site Landmarks
    landmarks.forEach((landmark) => {
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.fillRect(landmark.x, landmark.y, landmark.w, landmark.h);

      ctx.strokeStyle = landmark.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(landmark.x, landmark.y, landmark.w, landmark.h);

      ctx.fillStyle = landmark.color;
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        landmark.label,
        landmark.x + landmark.w / 2,
        landmark.y + landmark.h / 2
      );
    });

    // 4. Render Kill Events if available
    kills.forEach((kill) => {
      if (kill.killer_position && kill.victim_position) {
        const kx = Math.max(30, Math.min(570, ((kill.killer_position.x + 10000) / 20000) * 500 + 50));
        const ky = Math.max(30, Math.min(570, ((kill.killer_position.y + 10000) / 20000) * 500 + 50));
        const vx = Math.max(30, Math.min(570, ((kill.victim_position.x + 10000) / 20000) * 500 + 50));
        const vy = Math.max(30, Math.min(570, ((kill.victim_position.y + 10000) / 20000) * 500 + 50));

        // Line of fire
        ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(kx, ky);
        ctx.lineTo(vx, vy);
        ctx.stroke();

        // Victim marker
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(vx, vy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 5. Render Mistake Markers on Canvas
    roundMistakes.forEach((mistake, idx) => {
      const pos = getMistakeCanvasPos(mistake, idx);
      const isSelected =
        selectedMistake?.player_id === mistake.player_id &&
        selectedMistake?.occurred_at === mistake.occurred_at;

      // Glow circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? 18 : 12, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? "rgba(244, 63, 94, 0.45)"
        : "rgba(225, 29, 72, 0.25)";
      ctx.fill();

      // Outer ring
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? 12 : 8, 0, Math.PI * 2);
      ctx.strokeStyle = isSelected ? "#fda4af" : "#f43f5e";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner core
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
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

      // Badge background
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.fillRect(
        badgeX - paddingX,
        badgeY - 8,
        textWidth + paddingX * 2,
        14 + paddingY
      );

      // Badge border
      ctx.strokeStyle = "#e11d48";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        badgeX - paddingX,
        badgeY - 8,
        textWidth + paddingX * 2,
        14 + paddingY
      );

      // Badge text
      ctx.fillStyle = "#fda4af";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, badgeX, badgeY);

      // Player ID label
      ctx.font = "9px sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(mistake.player_id, badgeX, badgeY + 11);
    });
  }, [currentRound, roundMistakes, kills, selectedMistake]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4">
      {/* Header & Round Scrub Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Tactical Minimap Replay
            </h2>
            <span className="bg-slate-800 text-cyan-300 text-xs font-semibold px-2 py-0.5 rounded border border-slate-700">
              {mapName}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Spatial breakdown of untraded opening deaths and isolation mistakes
          </p>
        </div>

        {/* Round controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            data-testid="prev-round-btn"
            onClick={() => onRoundChange(Math.max(1, currentRound - 1))}
            disabled={currentRound <= 1}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev
          </button>

          <span
            data-testid="current-round-display"
            className="text-xs font-mono font-bold text-cyan-400 whitespace-nowrap min-w-[90px] text-center"
          >
            Round {currentRound} / {totalRounds}
          </span>

          <button
            type="button"
            data-testid="next-round-btn"
            onClick={() => onRoundChange(Math.min(totalRounds, currentRound + 1))}
            disabled={currentRound >= totalRounds}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/* Scrubber slider */}
      <div className="flex flex-col gap-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
        <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
          <span>Round 1</span>
          <span className="text-cyan-400 font-bold">Scrubber Navigation</span>
          <span>Round {totalRounds}</span>
        </div>
        <input
          type="range"
          role="slider"
          aria-label="Round scrubber"
          data-testid="round-scrubber"
          min={1}
          max={totalRounds}
          value={currentRound}
          onChange={(e) => onRoundChange(Number(e.target.value))}
          className="w-full accent-cyan-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
        />
      </div>

      {/* Main Canvas & Mistakes Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Canvas */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-lg p-2 overflow-hidden shadow-inner">
          <canvas
            ref={canvasRef}
            data-testid="minimap-canvas"
            width={600}
            height={600}
            className="w-full max-w-[540px] aspect-square rounded cursor-crosshair"
          />
          <div className="flex items-center justify-between w-full text-[11px] text-slate-500 pt-2 px-1">
            <span>Coordinates: Tactical 2D Overlay</span>
            <span className="text-rose-400 font-mono">Red Target: Attributed Mistake</span>
          </div>
        </div>

        {/* Round Mistakes Details */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase">
              Attributed Round Mistakes
            </h3>
            <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700">
              {roundMistakes.length} Detected
            </span>
          </div>

          {roundMistakes.length === 0 ? (
            <div className="bg-slate-950/50 border border-dashed border-slate-800 rounded-lg p-6 text-center text-xs text-slate-500">
              No tactical mistakes attributed in Round {currentRound}. Clean round execution.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
              {roundMistakes.map((m, idx) => {
                const isSelected =
                  selectedMistake?.player_id === m.player_id &&
                  selectedMistake?.occurred_at === m.occurred_at;
                const xrwPercent = (m.win_prob_delta * 100).toFixed(1);

                return (
                  <div
                    key={`${m.player_id}-${m.occurred_at}-${idx}`}
                    data-testid="mistake-marker"
                    onClick={() =>
                      onSelectMistake?.(isSelected ? null : m)
                    }
                    className={`cursor-pointer rounded-lg border p-3.5 transition-all text-xs ${
                      isSelected
                        ? "bg-rose-950/30 border-rose-500/80 shadow-sm shadow-rose-950"
                        : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        <span className="font-bold text-white tracking-wide">
                          {m.player_id}
                        </span>
                      </div>

                      <span
                        data-testid="mistake-xrw-badge"
                        className="font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-800/80 text-[11px]"
                      >
                        {xrwPercent}% xRW
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-amber-400 mb-1.5">
                      {m.mistake_type}
                    </div>

                    <p className="text-slate-300 text-xs mb-2 leading-relaxed">
                      {m.description}
                    </p>

                    <div className="bg-slate-900/80 border-l-2 border-cyan-500 p-2 rounded-r text-[11px] text-slate-300">
                      <span className="font-semibold text-cyan-400 block mb-0.5">
                        Coaching Fix:
                      </span>
                      {m.coaching_fix}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

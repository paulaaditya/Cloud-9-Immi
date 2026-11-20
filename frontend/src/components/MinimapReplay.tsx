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
import { RoundSelection } from "./RoundSelection";

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
  onSelectPlayer?: (playerId: string | null) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  standalone?: boolean;
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
  onSelectPlayer,
  isPlaying = false,
  onTogglePlay,
  standalone = true,
}: MinimapReplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mapImageLoaded, setMapImageLoaded] = useState<boolean>(false);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const [localPlaying, setLocalPlaying] = useState<boolean>(isPlaying);

  const [localPlayerFilter, setLocalPlayerFilter] = useState<string | null>(null);
  const [breakdownMode, setBreakdownMode] = useState<"breakdown" | "list">("breakdown");

  // Zoom and Pan Controls
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);

  // Automatically reset pan when zoom is at or below 1.0x
  useEffect(() => {
    if (zoom <= 1.0) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  // Reset zoom and pan when switching maps
  useEffect(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, [mapName]);

  // Prevent default page scroll on canvas wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preventScroll = (e: WheelEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    canvas.addEventListener("wheel", preventScroll, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", preventScroll);
    };
  }, []);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(4.0, Math.round((prev + 0.5) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(1.0, Math.round((prev - 0.5) * 100) / 100);
      if (next <= 1.0) {
        setPan({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.deltaY === 0) return;
    const zoomDelta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoom((prev) => {
      const next = Math.min(4.0, Math.max(1.0, Math.round((prev + zoomDelta) * 100) / 100));
      if (next <= 1.0) {
        setPan({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const clampPan = (newX: number, newY: number, currentZoom: number, canvas: HTMLCanvasElement) => {
    const width = canvas.width;
    const height = canvas.height;
    const maxPanX = width * 0.5;
    const minPanX = width * (0.5 - currentZoom);
    const maxPanY = height * 0.5;
    const minPanY = height * (0.5 - currentZoom);

    return {
      x: Math.max(minPanX, Math.min(maxPanX, newX)),
      y: Math.max(minPanY, Math.min(maxPanY, newY)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    if (zoom > 1.0) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      dragOriginRef.current = { x: e.clientX, y: e.clientY };
      hasDraggedRef.current = false;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && dragStartRef.current && zoom > 1.0) {
      const rawDx = e.clientX - dragStartRef.current.x;
      const rawDy = e.clientY - dragStartRef.current.y;

      const canvas = canvasRef.current;
      let scaleX = 1;
      let scaleY = 1;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          scaleX = canvas.width / rect.width;
          scaleY = canvas.height / rect.height;
        }
      }

      const dx = rawDx * scaleX;
      const dy = rawDy * scaleY;

      if (dragOriginRef.current) {
        const totalDist = Math.hypot(
          e.clientX - dragOriginRef.current.x,
          e.clientY - dragOriginRef.current.y
        );
        if (totalDist > 5) {
          hasDraggedRef.current = true;
          lastDragPosRef.current = { x: e.clientX, y: e.clientY };
        }
      }

      dragStartRef.current = { x: e.clientX, y: e.clientY };
      setPan((prev) => {
        if (!canvas) return { x: prev.x + dx, y: prev.y + dy };
        return clampPan(prev.x + dx, prev.y + dy, zoom, canvas);
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
    dragOriginRef.current = null;
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    dragStartRef.current = null;
    dragOriginRef.current = null;
    hasDraggedRef.current = false;
    lastDragPosRef.current = null;
  };

  const effectiveFocusedPlayer = localPlayerFilter || selectedPlayerId || null;

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

  // Group displayed mistakes by player for player breakdown
  interface PlayerMistakeGroup {
    playerId: string;
    playerName: string;
    characterName?: string | null;
    teamName?: string | null;
    mistakes: AttributedMistake[];
    totalTax: number;
  }

  const playersWithMistakes = React.useMemo(() => {
    const map = new Map<string, PlayerMistakeGroup>();
    for (const m of displayedMistakes) {
      const pId = m.player_id;
      if (!map.has(pId)) {
        map.set(pId, {
          playerId: pId,
          playerName: m.player_name || pId,
          characterName: m.character_name,
          teamName: m.team_name,
          mistakes: [],
          totalTax: 0,
        });
      }
      const group = map.get(pId)!;
      group.mistakes.push(m);
      group.totalTax += m.win_prob_delta;
      if (!group.characterName && m.character_name) {
        group.characterName = m.character_name;
      }
      if (!group.teamName && m.team_name) {
        group.teamName = m.team_name;
      }
    }
    return Array.from(map.values());
  }, [displayedMistakes]);

  // Visible groups when filtered by player
  const visibleGroups = React.useMemo(() => {
    if (!effectiveFocusedPlayer) return playersWithMistakes;
    return playersWithMistakes.filter(
      (g) => g.playerId === effectiveFocusedPlayer || g.playerName === effectiveFocusedPlayer
    );
  }, [playersWithMistakes, effectiveFocusedPlayer]);

  // Visible flat mistakes when filtered by player
  const visibleMistakes = React.useMemo(() => {
    if (!effectiveFocusedPlayer) return displayedMistakes;
    return displayedMistakes.filter(
      (m) => m.player_id === effectiveFocusedPlayer || m.player_name === effectiveFocusedPlayer
    );
  }, [displayedMistakes, effectiveFocusedPlayer]);

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

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      if (lastDragPosRef.current) {
        const distFromDragEnd = Math.hypot(
          e.clientX - lastDragPosRef.current.x,
          e.clientY - lastDragPosRef.current.y
        );
        lastDragPosRef.current = null;
        if (distFromDragEnd < 10) {
          return;
        }
      } else {
        return;
      }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clickX = e.clientX;
    let clickY = e.clientY;

    if (rect.width > 0 && rect.height > 0) {
      clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
      clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
    } else if ((e.nativeEvent as MouseEvent)?.offsetX !== undefined) {
      clickX = (e.nativeEvent as MouseEvent).offsetX;
      clickY = (e.nativeEvent as MouseEvent).offsetY;
    }

    const worldX = (clickX - pan.x) / zoom;
    const worldY = (clickY - pan.y) / zoom;

    let closestMistake: AttributedMistake | null = null;
    let minDistance = 25;

    for (let idx = 0; idx < roundMistakes.length; idx++) {
      const mistake = roundMistakes[idx];
      const pos = getMistakeCanvasPos(mistake, idx, canvas.width, canvas.height);
      const dist = Math.hypot(worldX - pos.x, worldY - pos.y);
      const isInBadge =
        worldX >= pos.x + 10 &&
        worldX <= pos.x + 85 &&
        worldY >= pos.y - 18 &&
        worldY <= pos.y + 15;

      if (dist <= 25 || isInBadge) {
        const effectiveDist = dist <= 25 ? dist : 25;
        if (effectiveDist <= minDistance) {
          minDistance = effectiveDist;
          closestMistake = mistake;
        }
      }
    }

    if (closestMistake) {
      if (closestMistake.round_number !== currentRound) {
        onRoundChange(closestMistake.round_number);
      }
      const isSelected =
        selectedMistake?.player_id === closestMistake.player_id &&
        selectedMistake?.round_number === closestMistake.round_number &&
        selectedMistake?.mistake_type === closestMistake.mistake_type &&
        selectedMistake?.occurred_at === closestMistake.occurred_at;
      onSelectMistake?.(isSelected ? null : closestMistake);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

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
        effectiveFocusedPlayer &&
        (kill.killer_id === effectiveFocusedPlayer ||
          kill.victim_id === effectiveFocusedPlayer ||
          kill.killer_name === effectiveFocusedPlayer ||
          kill.victim_name === effectiveFocusedPlayer);

      const alpha = effectiveFocusedPlayer ? (isPlayerAction ? 1.0 : 0.2) : 0.85;

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
        !effectiveFocusedPlayer ||
        mistake.player_id === effectiveFocusedPlayer ||
        mistake.player_name === effectiveFocusedPlayer;

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

    ctx.restore();
  }, [
    currentRound,
    roundMistakes,
    effectiveKills,
    selectedMistake,
    effectiveFocusedPlayer,
    mapImageLoaded,
    mapName,
    zoom,
    pan,
  ]);

  const mapContent = (
    <div
      data-testid="map-card"
      className="flex-1 min-h-0 glass-panel rounded-xl p-3.5 shadow-lg border border-sky-300/40 flex flex-col justify-start gap-2.5 overflow-hidden"
    >
      {/* Map Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-sky-200/80 pb-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase">
            Tactical Minimap Replay
          </h2>
          <span className="bg-sky-100 text-[#0077b6] text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-sky-300 uppercase">
            {displayMapName}
          </span>
          {effectiveFocusedPlayer && (
            <span className="bg-sky-50 text-[#0077b6] text-[10px] font-mono px-2 py-0.5 rounded border border-sky-300">
              Focus: {effectiveFocusedPlayer}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <span>Round {currentRound} Telemetry</span>
          <span className="text-slate-300">|</span>
          <span className="font-bold text-[#008cd4]">{effectiveKills.length} Kills</span>
        </div>
      </div>

      {/* Main Center Area: Radar Canvas & High-Detail Analysis Stream */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch flex-1 min-h-0">
        {/* Radar Column: Centers square radar container without dead letterbox margins */}
        <div className="md:col-span-7 flex items-center justify-center min-h-0 min-w-0 h-full overflow-hidden [container-type:size]">
          {/* Square Radar Container: 1:1 Aspect Ratio edge-to-edge container */}
          <div
            data-testid="radar-container"
            className="relative aspect-square max-h-full max-w-full w-full h-auto rounded-xl overflow-hidden border border-sky-300/60 shadow-lg bg-[#050d1a] flex items-center justify-center"
            style={{ width: "min(100cqw, 100cqh)", height: "min(100cqw, 100cqh)" }}
          >
            {/* Floating Zoom & Pan Controls */}
            <div
              data-testid="radar-zoom-controls"
              className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10 bg-slate-900/85 backdrop-blur-xs border border-sky-400/30 rounded-lg p-1 shadow-md"
            >
              <button
                type="button"
                data-testid="zoom-in-btn"
                aria-label="Zoom in"
                onClick={handleZoomIn}
                className="w-7 h-7 flex items-center justify-center text-xs font-mono font-bold text-sky-200 hover:text-white hover:bg-sky-500/20 active:bg-sky-500/30 rounded transition-colors"
              >
                +
              </button>
              <button
                type="button"
                data-testid="zoom-out-btn"
                aria-label="Zoom out"
                onClick={handleZoomOut}
                className="w-7 h-7 flex items-center justify-center text-xs font-mono font-bold text-sky-200 hover:text-white hover:bg-sky-500/20 active:bg-sky-500/30 rounded transition-colors"
              >
                -
              </button>
              <button
                type="button"
                data-testid="zoom-reset-btn"
                aria-label="Reset zoom"
                onClick={handleResetZoom}
                className="px-2 h-7 flex items-center justify-center text-[11px] font-mono font-bold text-sky-200 hover:text-white hover:bg-sky-500/20 active:bg-sky-500/30 rounded transition-colors"
              >
                1x
              </button>
            </div>

            <canvas
              ref={canvasRef}
              data-testid="minimap-canvas"
              width={600}
              height={600}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onClick={handleCanvasClick}
              className={`w-full h-full block object-contain shadow-inner ${
                zoom > 1.0 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-crosshair"
              }`}
            />
          </div>
        </div>

        {/* Round Mistakes & Tactical Analysis Details */}
        <div className="md:col-span-5 flex flex-col flex-1 h-full min-h-0 bg-white/85 border border-sky-200/60 rounded-xl p-3 shadow-sm justify-start gap-2.5 overflow-hidden">
          {/* Tabs: Active Round vs All Match Mistakes & Mode Toggle */}
          <div className="flex flex-col gap-2 border-b border-sky-100 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMistakeViewMode("round")}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    mistakeViewMode === "round"
                      ? "bg-[#008cd4] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-sky-50"
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
                      : "text-slate-600 hover:text-slate-900 hover:bg-sky-50"
                  }`}
                >
                  All Match Mistakes ({mistakes.length})
                </button>
              </div>

              {/* View Mode Switcher: Breakdown vs List */}
              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded">
                <button
                  type="button"
                  data-testid="breakdown-mode-toggle"
                  onClick={() => setBreakdownMode("breakdown")}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    breakdownMode === "breakdown"
                      ? "bg-white text-[#0077b6] shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Breakdown
                </button>
                <button
                  type="button"
                  data-testid="list-mode-toggle"
                  onClick={() => setBreakdownMode("list")}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    breakdownMode === "list"
                      ? "bg-white text-[#0077b6] shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  List
                </button>
              </div>
            </div>

            {/* Quick Player Filter Pills */}
            {playersWithMistakes.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                <span className="text-[10px] text-slate-400 font-medium shrink-0">Filter:</span>
                <button
                  type="button"
                  data-testid="player-filter-pill-all"
                  onClick={() => {
                    setLocalPlayerFilter(null);
                    onSelectPlayer?.(null);
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium transition-all shrink-0 ${
                    !effectiveFocusedPlayer
                      ? "bg-[#008cd4] text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-sky-50"
                  }`}
                >
                  All ({displayedMistakes.length})
                </button>
                {playersWithMistakes.map((p) => {
                  const isPActive =
                    effectiveFocusedPlayer === p.playerId || effectiveFocusedPlayer === p.playerName;
                  return (
                    <button
                      key={`filter-pill-${p.playerId}`}
                      type="button"
                      data-testid={`player-filter-pill-${p.playerId}`}
                      onClick={() => {
                        const nextId = isPActive ? null : p.playerId;
                        setLocalPlayerFilter(nextId);
                        onSelectPlayer?.(nextId);
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium transition-all shrink-0 flex items-center gap-1 ${
                        isPActive
                          ? "bg-[#008cd4] text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-sky-50"
                      }`}
                    >
                      <span>{p.playerName}</span>
                      <span
                        className={`text-[9px] px-1 rounded-full ${
                          isPActive ? "bg-white/25 text-white" : "bg-white text-[#0077b6]"
                        }`}
                      >
                        {p.mistakes.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
            {displayedMistakes.length === 0 ? (
              <div className="bg-sky-50/50 border border-dashed border-sky-200/60 rounded-lg p-5 text-center text-xs text-slate-500">
                No tactical mistakes attributed in Round {currentRound}. Clean round execution.
              </div>
            ) : breakdownMode === "breakdown" ? (
              visibleGroups.length === 0 ? (
                <div className="bg-sky-50/50 border border-dashed border-sky-200/60 rounded-lg p-4 text-center text-xs text-slate-500">
                  No mistakes found for selected player in this view.
                </div>
              ) : (
                visibleGroups.map((group, gIdx) => {
                  const xrwGroupTotal = (group.totalTax * 100).toFixed(1);
                  const isPlayerFocused =
                    effectiveFocusedPlayer === group.playerId ||
                    effectiveFocusedPlayer === group.playerName;

                  return (
                    <div
                      key={`breakdown-group-${group.playerId}`}
                      data-testid={`player-breakdown-card-${group.playerId}`}
                      className={`rounded-lg p-3 transition-all text-xs shadow-xs border ${
                        isPlayerFocused
                          ? "c9-watercolor-card-selected border-[#00aeef] ring-1 ring-[#00aeef]"
                          : gIdx === 0
                          ? "c9-watercolor-card hover:border-sky-300"
                          : "bg-white/95 border-sky-200/70 hover:border-sky-300"
                      }`}
                    >
                      {/* Player Breakdown Header */}
                      <div className="flex items-center justify-between border-b border-sky-100 pb-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">
                            {group.playerName}
                          </span>
                          {group.characterName && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-[10.5px] text-sky-700 font-medium">
                                {group.characterName}
                              </span>
                            </>
                          )}
                          {group.teamName && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-[10.5px] text-slate-500 font-medium">
                                {group.teamName}
                              </span>
                            </>
                          )}
                          <span className="text-slate-300">·</span>
                          <span className="text-[10.5px] text-rose-600 font-medium">
                            {group.mistakes.length} {group.mistakes.length === 1 ? "Flaw" : "Flaws"}
                          </span>
                        </div>

                        <span
                          data-testid={`player-breakdown-tax-${group.playerId}`}
                          className="font-mono font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10.5px]"
                        >
                          {xrwGroupTotal}% xRW
                        </span>
                      </div>

                      {/* Player's individual mistakes */}
                      <div className="space-y-2">
                        {group.mistakes.map((m, mIdx) => {
                          const isSelected =
                            selectedMistake?.player_id === m.player_id &&
                            selectedMistake?.occurred_at === m.occurred_at;
                          const xrwPercent = (m.win_prob_delta * 100).toFixed(1);

                          return (
                            <div
                              key={`${m.player_id}-${m.occurred_at}-${mIdx}`}
                              data-testid="mistake-marker"
                              onClick={() => {
                                if (m.round_number !== currentRound) {
                                  onRoundChange(m.round_number);
                                }
                                onSelectMistake?.(isSelected ? null : m);
                              }}
                              className={`cursor-pointer rounded-lg p-2.5 transition-all text-xs ${
                                isSelected
                                  ? "bg-rose-50/90 border border-rose-400 shadow-xs ring-1 ring-rose-400"
                                  : "bg-slate-50/50 hover:bg-sky-50/70"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-200/80 text-slate-800">
                                    R{m.round_number}
                                  </span>
                                  <span className="font-mono text-[10.5px] text-[#0077b6] font-semibold">
                                    {m.mistake_type}
                                  </span>
                                </div>
                                <span
                                  data-testid="mistake-xrw-badge"
                                  className="font-mono font-semibold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 text-[10px]"
                                >
                                  {xrwPercent}% xRW
                                </span>
                              </div>

                              <p className="text-slate-700 text-[11px] mb-2 leading-relaxed">
                                {m.description}
                              </p>

                              <div className="c9-watercolor-accent rounded-r p-2 text-[10.5px] text-slate-800">
                                <div className="font-semibold text-[#0077b6] text-[9.5px] mb-0.5">
                                  Coach Note
                                </div>
                                <p className="leading-relaxed text-slate-700">{m.coaching_fix}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              visibleMistakes.map((m, idx) => {
                const isSelected =
                  selectedMistake?.player_id === m.player_id &&
                  selectedMistake?.occurred_at === m.occurred_at;
                const xrwPercent = (m.win_prob_delta * 100).toFixed(1);
                const playerLabel = m.player_name || m.player_id;

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
                    className={`cursor-pointer rounded-lg p-3 transition-all text-xs border ${
                      isSelected
                        ? "bg-rose-50/90 border-rose-400 shadow-md ring-1 ring-rose-400"
                        : idx === 0
                        ? "c9-watercolor-card hover:border-sky-300"
                        : "bg-white/90 border-sky-200/70 hover:border-sky-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 tracking-wide text-xs">
                          {playerLabel}
                        </span>
                        {m.character_name && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-[10.5px] text-sky-700 font-medium">
                              {m.character_name}
                            </span>
                          </>
                        )}
                        {m.team_name && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-[10.5px] text-slate-500 font-medium">
                              {m.team_name}
                            </span>
                          </>
                        )}
                        <span className="text-slate-300">·</span>
                        <span className="text-[10.5px] text-slate-500 font-mono font-medium">
                          R{m.round_number}
                        </span>
                      </div>

                      <span
                        data-testid="mistake-xrw-badge"
                        className="font-mono font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10.5px]"
                      >
                        {xrwPercent}% xRW
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-[#0077b6] font-semibold mb-1">
                      {m.mistake_type}
                    </div>

                    <p className="text-slate-700 text-[11px] mb-2 leading-relaxed">
                      {m.description}
                    </p>

                    <div className="c9-watercolor-accent rounded-r p-2 text-[10.5px] text-slate-800">
                      <div className="font-semibold text-[#0077b6] text-[9.5px] mb-0.5">
                        Coach Note
                      </div>
                      <p className="leading-relaxed text-slate-700">{m.coaching_fix}</p>
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
                effectiveFocusedPlayer &&
                (killer === effectiveFocusedPlayer ||
                  victim === effectiveFocusedPlayer ||
                  kill.killer_id === effectiveFocusedPlayer ||
                  kill.victim_id === effectiveFocusedPlayer);

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
                  {kill.weapon && (
                    <span className="text-[9px] text-slate-400 uppercase font-mono">
                      {kill.weapon}
                    </span>
                  )}
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
    </div>
  );

  if (!standalone) {
    return mapContent;
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-3.5">
      {/* 1. Round Selection Card (Top of Left Column) */}
      <RoundSelection
        currentRound={currentRound}
        totalRounds={totalRounds}
        onRoundChange={onRoundChange}
        isPlaying={effectivePlaying}
        onTogglePlay={handleToggle}
        rounds={rounds}
        mistakes={mistakes}
        mapName={mapName}
      />
      {mapContent}
    </div>
  );
}

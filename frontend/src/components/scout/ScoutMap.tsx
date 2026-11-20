"use client";

import React, { useEffect, useRef, useState } from "react";
import calibrations from "@/lib/scoutMaps.json";
import type { Hotspot, ScoutPoint } from "@/lib/scoutApi";

interface Calibration {
  swap: boolean;
  flipX: boolean;
  flipY: boolean;
  box: [number, number, number, number];
  score: number;
  image: string;
}

const CAL = calibrations as unknown as Record<string, Calibration>;
const MIN_TRUSTED_SCORE = 0.7;
const SIZE = 760;

// Heat palette: transparent -> blue -> cyan -> yellow -> red.
const STOPS: [number, [number, number, number]][] = [
  [0.0, [0, 70, 255]],
  [0.35, [0, 200, 255]],
  [0.65, [255, 230, 0]],
  [1.0, [255, 40, 0]],
];

function buildLut(): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = STOPS[0];
    let b = STOPS[STOPS.length - 1];
    for (let s = 0; s < STOPS.length - 1; s++) {
      if (t >= STOPS[s][0] && t <= STOPS[s + 1][0]) {
        a = STOPS[s];
        b = STOPS[s + 1];
        break;
      }
    }
    const k = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = a[1][c] + (b[1][c] - a[1][c]) * k;
  }
  return lut;
}

/** Normalized bounds coordinates -> pixel position on the radar image for this map. */
export function toPixel(map: string, nx: number, ny: number): [number, number] {
  const cal = CAL[map];
  let u = nx;
  let v = ny;
  if (cal) {
    if (cal.swap) [u, v] = [ny, nx];
    if (cal.flipX) u = 1 - u;
    if (cal.flipY) v = 1 - v;
    const [x0, y0, x1, y1] = cal.box;
    return [(x0 + u * (x1 - x0)) * SIZE, (y0 + v * (y1 - y0)) * SIZE];
  }
  return [u * SIZE, v * SIZE];
}

interface ScoutMapProps {
  map: string | null;
  points: ScoutPoint[];
  hotspots: Hotspot[];
  mode?: "heat" | "dots";
  caption?: string;
}

export function ScoutMap({ map, points, hotspots, mode = "heat", caption }: ScoutMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const cal = map ? CAL[map] : undefined;
  const trusted = !!cal && cal.score >= MIN_TRUSTED_SCORE;

  useEffect(() => {
    setImg(null);
    if (!map || !trusted) return;
    const im = new Image();
    im.onload = () => setImg(im);
    im.src = `/maps/${map}.png`;
  }, [map, trusted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#eaf4fc";
    ctx.fillRect(0, 0, SIZE, SIZE);

    if (!map) {
      ctx.fillStyle = "#4b647a";
      ctx.font = "700 34px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Pick one map to see the heatmap", SIZE / 2, SIZE / 2);
      return;
    }

    if (img) {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = "rgba(0,140,212,0.15)";
      ctx.lineWidth = 1;
      for (let g = 0; g <= SIZE; g += SIZE / 10) {
        ctx.beginPath();
        ctx.moveTo(g, 0);
        ctx.lineTo(g, SIZE);
        ctx.moveTo(0, g);
        ctx.lineTo(SIZE, g);
        ctx.stroke();
      }
    }

    const pts = points.filter((p) => p.nx != null && p.ny != null);
    if (mode === "heat" && pts.length) {
      const heat = document.createElement("canvas");
      heat.width = SIZE;
      heat.height = SIZE;
      const hctx = heat.getContext("2d");
      if (hctx) {
        const radius = Math.max(16, Math.min(34, 900 / Math.sqrt(pts.length + 20)));
        const alpha = Math.max(0.05, Math.min(0.35, 12 / Math.sqrt(pts.length + 1)));
        for (const p of pts) {
          const [px, py] = toPixel(map, p.nx as number, p.ny as number);
          const g = hctx.createRadialGradient(px, py, 0, px, py, radius);
          g.addColorStop(0, `rgba(0,0,0,${alpha})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          hctx.fillStyle = g;
          hctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
        }
        const data = hctx.getImageData(0, 0, SIZE, SIZE);
        const lut = buildLut();
        const d = data.data;
        let max = 1;
        for (let i = 3; i < d.length; i += 4) if (d[i] > max) max = d[i];
        for (let i = 0; i < d.length; i += 4) {
          const a = d[i + 3];
          if (!a) continue;
          const idx = Math.min(255, Math.round((a / max) * 255));
          d[i] = lut[idx * 3];
          d[i + 1] = lut[idx * 3 + 1];
          d[i + 2] = lut[idx * 3 + 2];
          d[i + 3] = Math.min(235, 40 + (a / max) * 215);
        }
        hctx.putImageData(data, 0, 0);
        ctx.drawImage(heat, 0, 0);
      }
    } else if (mode === "dots") {
      ctx.fillStyle = "rgba(0,119,182,0.55)";
      for (const p of pts) {
        const [px, py] = toPixel(map, p.nx as number, p.ny as number);
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const h of hotspots) {
      if (h.nx == null || h.ny == null) continue;
      const [px, py] = toPixel(map, h.nx, h.ny);
      ctx.beginPath();
      ctx.arc(px, py, 15, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#0077b6";
      ctx.stroke();
      ctx.fillStyle = "#0c4a6e";
      ctx.font = "800 15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(h.rank), px, py + 1);
    }
  }, [map, img, points, hotspots, mode]);

  return (
    <figure className="m-0">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="w-full h-auto rounded-xl border border-sky-200 bg-sky-50"
        aria-label={map ? `Heatmap on ${map}` : "Heatmap"}
      />
      <figcaption className="mt-1 text-xs text-slate-500">
        {caption}
        {map && !trusted ? " Radar image is not calibrated for this map yet; positions are shown on a plain grid." : ""}
      </figcaption>
    </figure>
  );
}

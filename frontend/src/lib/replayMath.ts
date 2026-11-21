import type { ReplayData, ReplayRound } from "@/lib/scoutApi";

export type XY = [number, number];

/** World position (cm) -> normalised 0..1 over the game's bounds, matching the backend. */
export function normalise(bounds: ReplayData["bounds"], x: number, y: number): XY | null {
  if (!bounds) return null;
  const w = bounds.max.x - bounds.min.x;
  const h = bounds.max.y - bounds.min.y;
  if (!w || !h) return null;
  return [(x - bounds.min.x) / w, (y - bounds.min.y) / h];
}

/** When each player dies in this round (seconds), from the kill list. */
export function deathTimes(round: ReplayRound): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of round.kills) out[k.vid] = Math.min(k.t, out[k.vid] ?? Infinity);
  return out;
}

/** A player's position at time t: linear between the frames either side, held before the first and after the last. */
export function positionAt(round: ReplayRound, pid: string, t: number): XY | null {
  let prev: { t: number; xy: XY } | null = null;
  for (const f of round.frames) {
    const xy = f.p[pid];
    if (!xy) continue;
    if (f.t >= t) {
      if (!prev) return xy;
      const span = f.t - prev.t;
      const k = span > 0 ? (t - prev.t) / span : 1;
      return [prev.xy[0] + (xy[0] - prev.xy[0]) * k, prev.xy[1] + (xy[1] - prev.xy[1]) * k];
    }
    prev = { t: f.t, xy };
  }
  return prev ? prev.xy : null;
}

export interface DotState {
  id: string;
  xy: XY;
  alive: boolean;
}

/** Everyone's drawn position at time t. The dead stay where they fell. */
export function dotsAt(round: ReplayRound, t: number): DotState[] {
  const died = deathTimes(round);
  const dots: DotState[] = [];
  for (const p of round.players) {
    const dt = died[p.id];
    const alive = dt === undefined || t < dt;
    let xy: XY | null;
    if (alive) {
      xy = positionAt(round, p.id, t);
    } else {
      const k = round.kills.find((x) => x.vid === p.id && x.t === dt);
      xy = k && k.vx != null && k.vy != null ? [k.vx, k.vy] : positionAt(round, p.id, dt);
    }
    if (xy) dots.push({ id: p.id, xy, alive });
  }
  return dots;
}

export const clock = (t: number) => `${Math.floor(Math.max(0, t) / 60)}:${String(Math.floor(Math.max(0, t) % 60)).padStart(2, "0")}`;

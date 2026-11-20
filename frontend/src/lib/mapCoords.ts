import calibrationData from "./scoutMaps.json";

/**
 * Map identity and world-to-radar coordinate transforms.
 *
 * World bounds and axis orientation per map come from `scoutMaps.json`, which
 * `backend/tools/calibrate_maps.py` generates by testing which orientation puts real GRID
 * positions (cast and kill locations) on drawn pixels of each radar image. Re-run that tool if
 * the radar images change. `score` is the share of real positions that land on the drawn map.
 */

export const KNOWN_MAPS = [
  "ascent",
  "bind",
  "breeze",
  "fracture",
  "haven",
  "icebox",
  "lotus",
  "pearl",
  "split",
  "sunset",
  "abyss",
  "corrode",
  "summit",
] as const;

export type KnownMap = (typeof KNOWN_MAPS)[number];

interface Calibration {
  swap: boolean;
  flipX: boolean;
  flipY: boolean;
  box: [number, number, number, number];
  score: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

const CALIBRATION = calibrationData as unknown as Record<string, Calibration>;

export const MAP_BOUNDS: Record<KnownMap, { minX: number; maxX: number; minY: number; maxY: number }> =
  Object.fromEntries(
    KNOWN_MAPS.map((m) => [m, CALIBRATION[m]?.bounds ?? { minX: -6000, maxX: 6000, minY: -6000, maxY: 6000 }])
  ) as Record<KnownMap, { minX: number; maxX: number; minY: number; maxY: number }>;

export interface MapLandmark {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

/**
 * Overlay landmarks. The radar images already print their site letters, so no extra badges are
 * drawn; maps can add entries here if a radar image lacks labels.
 */
export const MAP_LANDMARKS: Record<KnownMap, MapLandmark[]> = Object.fromEntries(
  KNOWN_MAPS.map((m) => [m, [] as MapLandmark[]])
) as Record<KnownMap, MapLandmark[]>;

// In-game internal map codenames that appear in some GRID feeds.
const CODENAMES: Record<string, KnownMap> = {
  triad: "haven",
  duality: "bind",
  bonsai: "split",
  ascent: "ascent",
  port: "icebox",
  foxtrot: "breeze",
  canyon: "fracture",
  pitt: "pearl",
  jam: "lotus",
  juliett: "sunset",
  infinity: "abyss",
  rook: "corrode",
};

export function normalizeMapName(name: string | null | undefined): KnownMap {
  if (!name) return "ascent";
  const raw = name.toLowerCase().trim();
  const direct = KNOWN_MAPS.find((m) => raw === m);
  if (direct) return direct;
  const last = raw.split("/").filter(Boolean).pop() ?? raw;
  if (CODENAMES[last]) return CODENAMES[last];
  const contained = KNOWN_MAPS.find((m) => raw.includes(m));
  if (contained) return contained;
  for (const [code, map] of Object.entries(CODENAMES)) {
    if (raw.includes(`/${code}/`)) return map;
  }
  return "ascent";
}

export function getMapDisplayName(name: string | null | undefined): string {
  const m = normalizeMapName(name);
  return m.charAt(0).toUpperCase() + m.slice(1);
}

/** Whether the calibration for this map is trustworthy (>= 70% of real positions land on drawn pixels). */
export function isMapCalibrated(map: KnownMap): boolean {
  return (CALIBRATION[map]?.score ?? 0) >= 0.7;
}

/**
 * World (x, y) in GRID units to a pixel on a width x height radar canvas. Results are clamped to
 * a 20px margin so markers never sit on the canvas edge.
 */
export function mapWorldToCanvas(
  map: KnownMap,
  worldX: number,
  worldY: number,
  width: number,
  height: number
): { x: number; y: number } {
  const b = MAP_BOUNDS[map];
  const cal = CALIBRATION[map];
  const nx = (worldX - b.minX) / (b.maxX - b.minX);
  const ny = (worldY - b.minY) / (b.maxY - b.minY);
  let u = nx;
  let v = ny;
  let box: [number, number, number, number] = [0, 0, 1, 1];
  if (cal) {
    if (cal.swap) [u, v] = [ny, nx];
    if (cal.flipX) u = 1 - u;
    if (cal.flipY) v = 1 - v;
    box = cal.box;
  }
  const px = (box[0] + u * (box[2] - box[0])) * width;
  const py = (box[1] + v * (box[3] - box[1])) * height;
  const margin = 20;
  return {
    x: Math.min(width - margin, Math.max(margin, px)),
    y: Math.min(height - margin, Math.max(margin, py)),
  };
}

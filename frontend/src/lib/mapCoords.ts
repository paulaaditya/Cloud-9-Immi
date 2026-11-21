export interface MapBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface MapLandmark {
  label: string;
  x: number; // percentage 0-1
  y: number; // percentage 0-1
  w: number;
  h: number;
  color: string;
  type: "site" | "mid" | "spawn";
}

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

const MAP_ALIASES: Record<string, KnownMap> = {
  ascent: "ascent",
  bind: "bind",
  breeze: "breeze",
  fracture: "fracture",
  haven: "haven",
  icebox: "icebox",
  lotus: "lotus",
  pearl: "pearl",
  split: "split",
  sunset: "sunset",
  abyss: "abyss",
  corrode: "corrode",
  summit: "summit",
  jam: "lotus",
  jujitsu: "sunset",
  infinity: "abyss",
  canyon: "fracture",
  duality: "bind",
  foxtrot: "breeze",
  triad: "haven",
  port: "icebox",
  pitt: "pearl",
  bonsai: "split",
};

export const MAP_BOUNDS: Record<KnownMap, MapBounds> = {
  split: { minX: -4200, maxX: 9000, minY: -9800, maxY: -400 },
  bind: { minX: 4500, maxX: 13500, minY: -7500, maxY: 5200 },
  haven: { minX: -4500, maxX: 8200, minY: -12800, maxY: -3200 },
  lotus: { minX: 800, maxX: 11000, minY: -6200, maxY: 7200 },
  abyss: { minX: -6800, maxX: 6800, minY: -5800, maxY: 6200 },
  fracture: { minX: 3000, maxX: 14200, minY: -7200, maxY: 5200 },
  pearl: { minX: 0, maxX: 11000, minY: -6500, maxY: 7000 },
  sunset: { minX: -5000, maxX: 6000, minY: -6000, maxY: 6000 },
  ascent: { minX: -5500, maxX: 8000, minY: -10500, maxY: -1500 },
  icebox: { minX: -4000, maxX: 6500, minY: -6500, maxY: 5200 },
  breeze: { minX: -3500, maxX: 9500, minY: -8500, maxY: 6500 },
  corrode: { minX: -4000, maxX: 8000, minY: -8000, maxY: 5000 },
  summit: { minX: -4000, maxX: 8000, minY: -8000, maxY: 5000 },
};

export const MAP_LANDMARKS: Record<KnownMap, MapLandmark[]> = {
  ascent: [
    { label: "A Site", x: 0.68, y: 0.28, w: 75, h: 45, color: "#00aeef", type: "site" },
    { label: "B Site", x: 0.22, y: 0.28, w: 75, h: 45, color: "#00aeef", type: "site" },
    { label: "Mid Yard", x: 0.48, y: 0.45, w: 75, h: 40, color: "#38bdf8", type: "mid" },
    { label: "Def Spawn", x: 0.48, y: 0.12, w: 85, h: 32, color: "#f43f5e", type: "spawn" },
    { label: "Atk Spawn", x: 0.48, y: 0.88, w: 85, h: 32, color: "#10b981", type: "spawn" },
  ],
  lotus: [
    { label: "A Site", x: 0.72, y: 0.32, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "B Site", x: 0.50, y: 0.30, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "C Site", x: 0.25, y: 0.35, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "Def Spawn", x: 0.48, y: 0.14, w: 80, h: 30, color: "#f43f5e", type: "spawn" },
    { label: "Atk Spawn", x: 0.48, y: 0.86, w: 80, h: 30, color: "#10b981", type: "spawn" },
  ],
  abyss: [
    { label: "A Site", x: 0.70, y: 0.32, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "B Site", x: 0.28, y: 0.32, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "Mid Chasm", x: 0.49, y: 0.48, w: 75, h: 40, color: "#38bdf8", type: "mid" },
    { label: "Def Spawn", x: 0.49, y: 0.12, w: 80, h: 30, color: "#f43f5e", type: "spawn" },
    { label: "Atk Spawn", x: 0.49, y: 0.88, w: 80, h: 30, color: "#10b981", type: "spawn" },
  ],
  sunset: [
    { label: "A Site", x: 0.72, y: 0.34, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "B Site", x: 0.26, y: 0.34, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "Mid Market", x: 0.49, y: 0.46, w: 75, h: 40, color: "#38bdf8", type: "mid" },
    { label: "Def Spawn", x: 0.49, y: 0.12, w: 80, h: 30, color: "#f43f5e", type: "spawn" },
    { label: "Atk Spawn", x: 0.49, y: 0.86, w: 80, h: 30, color: "#10b981", type: "spawn" },
  ],
  fracture: [
    { label: "A Site", x: 0.68, y: 0.35, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "B Site", x: 0.30, y: 0.35, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "Def Spawn", x: 0.49, y: 0.48, w: 80, h: 32, color: "#f43f5e", type: "spawn" },
    { label: "Atk North", x: 0.49, y: 0.12, w: 80, h: 30, color: "#10b981", type: "spawn" },
    { label: "Atk South", x: 0.49, y: 0.88, w: 80, h: 30, color: "#10b981", type: "spawn" },
  ],
  haven: [
    { label: "A Site", x: 0.74, y: 0.30, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "B Site", x: 0.49, y: 0.30, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "C Site", x: 0.24, y: 0.32, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "Def Spawn", x: 0.49, y: 0.12, w: 80, h: 30, color: "#f43f5e", type: "spawn" },
    { label: "Atk Spawn", x: 0.49, y: 0.88, w: 80, h: 30, color: "#10b981", type: "spawn" },
  ],
  bind: [
    { label: "A Site", x: 0.70, y: 0.30, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "B Site", x: 0.28, y: 0.30, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "Teleporter", x: 0.49, y: 0.44, w: 75, h: 35, color: "#38bdf8", type: "mid" },
    { label: "Def Spawn", x: 0.49, y: 0.12, w: 80, h: 30, color: "#f43f5e", type: "spawn" },
    { label: "Atk Spawn", x: 0.49, y: 0.88, w: 80, h: 30, color: "#10b981", type: "spawn" },
  ],
  split: [
    { label: "A Site", x: 0.52, y: 0.45, w: 70, h: 40, color: "#008cd4", type: "site" },
    { label: "B Site", x: 0.22, y: 0.52, w: 70, h: 40, color: "#008cd4", type: "site" },
    { label: "Mid Vents", x: 0.38, y: 0.48, w: 75, h: 40, color: "#38bdf8", type: "mid" },
    { label: "Def Spawn", x: 0.48, y: 0.12, w: 80, h: 30, color: "#f43f5e", type: "spawn" },
    { label: "Atk Spawn", x: 0.40, y: 0.90, w: 80, h: 30, color: "#10b981", type: "spawn" },
  ],
  icebox: [
    { label: "A Site", x: 0.72, y: 0.32, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "B Site", x: 0.28, y: 0.32, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "Mid Boiler", x: 0.49, y: 0.45, w: 75, h: 40, color: "#38bdf8", type: "mid" },
    { label: "Def Spawn", x: 0.49, y: 0.12, w: 80, h: 30, color: "#f43f5e", type: "spawn" },
    { label: "Atk Spawn", x: 0.49, y: 0.88, w: 80, h: 30, color: "#10b981", type: "spawn" },
  ],
  breeze: [
    { label: "A Site", x: 0.70, y: 0.32, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "B Site", x: 0.30, y: 0.32, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "Mid Nest", x: 0.49, y: 0.46, w: 75, h: 40, color: "#38bdf8", type: "mid" },
    { label: "Def Spawn", x: 0.49, y: 0.12, w: 80, h: 30, color: "#f43f5e", type: "spawn" },
    { label: "Atk Spawn", x: 0.49, y: 0.88, w: 80, h: 30, color: "#10b981", type: "spawn" },
  ],
  pearl: [
    { label: "A Site", x: 0.70, y: 0.32, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "B Site", x: 0.28, y: 0.32, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "Mid Plaza", x: 0.49, y: 0.45, w: 75, h: 40, color: "#38bdf8", type: "mid" },
    { label: "Def Spawn", x: 0.49, y: 0.12, w: 80, h: 30, color: "#f43f5e", type: "spawn" },
    { label: "Atk Spawn", x: 0.49, y: 0.88, w: 80, h: 30, color: "#10b981", type: "spawn" },
  ],
  corrode: [
    { label: "A Site", x: 0.70, y: 0.32, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "B Site", x: 0.28, y: 0.32, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "Mid Salts", x: 0.49, y: 0.45, w: 75, h: 40, color: "#38bdf8", type: "mid" },
    { label: "Def Spawn", x: 0.49, y: 0.12, w: 80, h: 30, color: "#f43f5e", type: "spawn" },
    { label: "Atk Spawn", x: 0.49, y: 0.88, w: 80, h: 30, color: "#10b981", type: "spawn" },
  ],
  summit: [
    { label: "A Site", x: 0.70, y: 0.32, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "B Site", x: 0.28, y: 0.32, w: 70, h: 40, color: "#00aeef", type: "site" },
    { label: "Mid Academy", x: 0.49, y: 0.45, w: 75, h: 40, color: "#38bdf8", type: "mid" },
    { label: "Def Spawn", x: 0.49, y: 0.12, w: 80, h: 30, color: "#f43f5e", type: "spawn" },
    { label: "Atk Spawn", x: 0.49, y: 0.88, w: 80, h: 30, color: "#10b981", type: "spawn" },
  ],
};

/**
 * Normalizes map name to known canonical map identifier.
 */
export function normalizeMapName(mapName?: string | null): KnownMap {
  if (!mapName) return "ascent";
  const lower = mapName.toLowerCase().trim();
  const lastSegment = lower.split("/").pop()?.trim() || lower;

  for (const m of KNOWN_MAPS) {
    if (lastSegment === m || lastSegment.includes(m)) {
      return m;
    }
  }

  for (const [alias, real] of Object.entries(MAP_ALIASES)) {
    if (lastSegment === alias || lastSegment.includes(alias)) {
      return real;
    }
  }

  return "ascent";
}

/**
 * Returns clean capitalized map title.
 */
export function getMapDisplayName(mapName?: string | null): string {
  const norm = normalizeMapName(mapName);
  return norm.charAt(0).toUpperCase() + norm.slice(1);
}

/**
 * Translates world or normalized telemetry coordinates to canvas pixel space.
 */
export function mapWorldToCanvas(
  mapName: string,
  worldX: number,
  worldY: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  // If coordinates are already in 0-600 mock/normalized space
  if (worldX >= 0 && worldX <= 600 && worldY >= 0 && worldY <= 600) {
    return {
      x: Math.max(30, Math.min(canvasWidth - 30, (worldX / 600) * canvasWidth)),
      y: Math.max(30, Math.min(canvasHeight - 30, (worldY / 600) * canvasHeight)),
    };
  }

  const normMap = normalizeMapName(mapName);
  const bounds = MAP_BOUNDS[normMap] || {
    minX: -10000,
    maxX: 15000,
    minY: -10000,
    maxY: 10000,
  };

  // Valorant UE4 coordinate system:
  // lateral (canvas X) corresponds to world Y
  // vertical (canvas Y) corresponds to inverted world X
  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeY = bounds.maxY - bounds.minY || 1;

  const fractionX = (worldY - bounds.minY) / rangeY;
  const fractionY = 1 - (worldX - bounds.minX) / rangeX;

  const clampedX = Math.max(0.06, Math.min(0.94, fractionX));
  const clampedY = Math.max(0.06, Math.min(0.94, fractionY));

  return {
    x: Math.round(clampedX * canvasWidth),
    y: Math.round(clampedY * canvasHeight),
  };
}

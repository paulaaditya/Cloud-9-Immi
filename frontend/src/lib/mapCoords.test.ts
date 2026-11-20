import {
  KNOWN_MAPS,
  MAP_BOUNDS,
  getMapDisplayName,
  isMapCalibrated,
  mapWorldToCanvas,
  normalizeMapName,
} from "./mapCoords";

describe("mapCoords", () => {
  it("knows all 13 maps and recognizes corrode and summit", () => {
    expect(KNOWN_MAPS).toHaveLength(13);
    expect(normalizeMapName("corrode")).toBe("corrode");
    expect(normalizeMapName("summit")).toBe("summit");
    expect(getMapDisplayName("corrode")).toBe("Corrode");
  });

  it("maps internal codenames and falls back to ascent", () => {
    expect(normalizeMapName("/Game/Maps/Triad/Triad")).toBe("haven");
    expect(normalizeMapName("/Game/Maps/Jam/Jam")).toBe("lotus");
    expect(normalizeMapName("Fracture")).toBe("fracture");
    expect(normalizeMapName("nonsense")).toBe("ascent");
    expect(normalizeMapName(undefined)).toBe("ascent");
  });

  it("keeps real telemetry inside the canvas margin", () => {
    const pos = mapWorldToCanvas("ascent", -4838.0, -9554.2, 600, 600);
    expect(pos.x).toBeGreaterThanOrEqual(20);
    expect(pos.x).toBeLessThanOrEqual(580);
    expect(pos.y).toBeGreaterThanOrEqual(20);
    expect(pos.y).toBeLessThanOrEqual(580);
  });

  it("places the middle of the bounds near the middle of the radar for calibrated maps", () => {
    for (const m of KNOWN_MAPS.filter(isMapCalibrated)) {
      const b = MAP_BOUNDS[m];
      const pos = mapWorldToCanvas(m, (b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, 1000, 1000);
      expect(pos.x).toBeGreaterThan(300);
      expect(pos.x).toBeLessThan(700);
      expect(pos.y).toBeGreaterThan(300);
      expect(pos.y).toBeLessThan(700);
    }
  });

  it("flags maps whose radar could not be validated", () => {
    expect(isMapCalibrated("haven")).toBe(true);
    expect(isMapCalibrated("summit")).toBe(false);
  });
});

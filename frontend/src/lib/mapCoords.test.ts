import {
  normalizeMapName,
  getMapDisplayName,
  mapWorldToCanvas,
  MAP_BOUNDS,
} from "./mapCoords";

describe("mapCoords Utility & Coordinate Engine", () => {
  it("normalizes map names and handles aliases", () => {
    expect(normalizeMapName("split")).toBe("split");
    expect(normalizeMapName("jam")).toBe("lotus");
    expect(normalizeMapName("infinity")).toBe("abyss");
    expect(normalizeMapName("canyon")).toBe("fracture");
    expect(normalizeMapName("duality")).toBe("bind");
    expect(normalizeMapName("bonsai")).toBe("split");
    expect(normalizeMapName("corrode")).toBe("corrode");
    expect(normalizeMapName("summit")).toBe("summit");
  });

  it("returns clean capitalized display names", () => {
    expect(getMapDisplayName("split")).toBe("Split");
    expect(getMapDisplayName("jam")).toBe("Lotus");
    expect(getMapDisplayName("infinity")).toBe("Abyss");
    expect(getMapDisplayName("corrode")).toBe("Corrode");
    expect(getMapDisplayName("summit")).toBe("Summit");
  });

  describe("Split Map Coordinate Mapping", () => {
    const width = 600;
    const height = 600;

    it("maps yay's A-site first death cleanly inside canvas bounds without clipping", () => {
      // yay position from round 1 on Split
      const pos = mapWorldToCanvas("split", 2818.1, -5683.3, width, height);
      expect(pos.x).toBeGreaterThan(150);
      expect(pos.x).toBeLessThan(450);
      expect(pos.y).toBeGreaterThan(150);
      expect(pos.y).toBeLessThan(450);
    });

    it("maps B-site defensive and attacking positions in-bounds", () => {
      // NaturE and Derrek positions from round 1
      const naturePos = mapWorldToCanvas("split", -3270.4, -5899.5, width, height);
      expect(naturePos.x).toBeGreaterThanOrEqual(30);
      expect(naturePos.x).toBeLessThanOrEqual(width - 30);
      expect(naturePos.y).toBeGreaterThanOrEqual(30);
      expect(naturePos.y).toBeLessThanOrEqual(height - 30);

      const derrekPos = mapWorldToCanvas("split", -2554.9, -6046.3, width, height);
      expect(derrekPos.x).toBeGreaterThanOrEqual(30);
      expect(derrekPos.x).toBeLessThanOrEqual(width - 30);
      expect(derrekPos.y).toBeGreaterThanOrEqual(30);
      expect(derrekPos.y).toBeLessThanOrEqual(height - 30);
    });

    it("maps extreme north Defender Spawn near top of canvas", () => {
      const defSpawn = mapWorldToCanvas("split", 8182.8, -4000, width, height);
      expect(defSpawn.y).toBeLessThan(120);
      expect(defSpawn.x).toBeGreaterThanOrEqual(30);
      expect(defSpawn.x).toBeLessThanOrEqual(width - 30);
    });
  });

  describe("Multi-Map Real Telemetry Bound Verification", () => {
    const width = 600;
    const height = 600;

    it("maps Bind real telemetry positions in-bounds", () => {
      const pos1 = mapWorldToCanvas("bind", 6319, -5766, width, height);
      const pos2 = mapWorldToCanvas("bind", 12338, 3685, width, height);
      expect(pos1.x).toBeGreaterThanOrEqual(30);
      expect(pos1.x).toBeLessThanOrEqual(width - 30);
      expect(pos2.x).toBeGreaterThanOrEqual(30);
      expect(pos2.x).toBeLessThanOrEqual(width - 30);
    });

    it("maps Haven real telemetry positions in-bounds", () => {
      const pos1 = mapWorldToCanvas("haven", 7355, -3859, width, height);
      const pos2 = mapWorldToCanvas("haven", -3632, -11324, width, height);
      expect(pos1.x).toBeGreaterThanOrEqual(30);
      expect(pos1.x).toBeLessThanOrEqual(width - 30);
      expect(pos2.x).toBeGreaterThanOrEqual(30);
      expect(pos2.x).toBeLessThanOrEqual(width - 30);
    });

    it("maps Lotus real telemetry positions in-bounds", () => {
      const pos1 = mapWorldToCanvas("lotus", 1543, -5403, width, height);
      const pos2 = mapWorldToCanvas("lotus", 9732, 6513, width, height);
      expect(pos1.x).toBeGreaterThanOrEqual(30);
      expect(pos1.x).toBeLessThanOrEqual(width - 30);
      expect(pos2.x).toBeGreaterThanOrEqual(30);
      expect(pos2.x).toBeLessThanOrEqual(width - 30);
    });

    it("maps Abyss real telemetry positions in-bounds", () => {
      const pos1 = mapWorldToCanvas("abyss", -5995, -4589, width, height);
      const pos2 = mapWorldToCanvas("abyss", 5714, 3970, width, height);
      expect(pos1.x).toBeGreaterThanOrEqual(30);
      expect(pos1.x).toBeLessThanOrEqual(width - 30);
      expect(pos2.x).toBeGreaterThanOrEqual(30);
      expect(pos2.x).toBeLessThanOrEqual(width - 30);
    });

    it("maps Ascent real telemetry positions accurately in-bounds", () => {
      // Real Ascent kill coords: X=[-4838.0, 7058.0], Y=[-9554.2, -1986.0]
      const pos1 = mapWorldToCanvas("ascent", -4838.0, -9554.2, width, height);
      const pos2 = mapWorldToCanvas("ascent", 7058.0, -1986.0, width, height);
      expect(pos1.x).toBeGreaterThanOrEqual(30);
      expect(pos1.x).toBeLessThanOrEqual(width - 30);
      expect(pos1.y).toBeGreaterThanOrEqual(30);
      expect(pos1.y).toBeLessThanOrEqual(height - 30);
      expect(pos2.x).toBeGreaterThanOrEqual(30);
      expect(pos2.x).toBeLessThanOrEqual(width - 30);
      expect(pos2.y).toBeGreaterThanOrEqual(30);
      expect(pos2.y).toBeLessThanOrEqual(height - 30);
    });

    it("maps Pearl real telemetry positions accurately in-bounds", () => {
      // Real Pearl kill coords: X=[207.2, 10077.6], Y=[-6055.4, 6435.9]
      const pos1 = mapWorldToCanvas("pearl", 207.2, -6055.4, width, height);
      const pos2 = mapWorldToCanvas("pearl", 10077.6, 6435.9, width, height);
      expect(pos1.x).toBeGreaterThanOrEqual(30);
      expect(pos1.x).toBeLessThanOrEqual(width - 30);
      expect(pos2.x).toBeGreaterThanOrEqual(30);
      expect(pos2.x).toBeLessThanOrEqual(width - 30);
    });
  });
});

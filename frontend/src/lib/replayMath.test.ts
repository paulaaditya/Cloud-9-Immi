import { clock, dotsAt, normalise, positionAt } from "./replayMath";
import type { ReplayRound } from "./scoutApi";

const round = {
  n: 1,
  players: [
    { id: "a", tid: "T1" },
    { id: "b", tid: "T2" },
  ],
  kills: [{ t: 20, kid: "a", vid: "b", ktid: "T1", vtid: "T2", weapon: "vandal", kx: 0, ky: 0, vx: 500, vy: 600, first: true }],
  frames: [
    { t: 0, p: { a: [0, 0], b: [1000, 1000] } },
    { t: 10, p: { a: [100, 200], b: [1000, 1000] } },
    { t: 30, p: { a: [300, 200] } },
  ],
} as unknown as ReplayRound;

describe("replay math", () => {
  it("interpolates between frames and holds at the ends", () => {
    expect(positionAt(round, "a", 5)).toEqual([50, 100]);
    expect(positionAt(round, "a", 20)).toEqual([200, 200]);
    expect(positionAt(round, "a", -3)).toEqual([0, 0]);
    expect(positionAt(round, "a", 99)).toEqual([300, 200]);
    expect(positionAt(round, "zzz", 5)).toBeNull();
  });

  it("keeps the dead where they fell", () => {
    const before = dotsAt(round, 10).find((d) => d.id === "b");
    const after = dotsAt(round, 25).find((d) => d.id === "b");
    expect(before).toMatchObject({ alive: true, xy: [1000, 1000] });
    expect(after).toMatchObject({ alive: false, xy: [500, 600] });
  });

  it("normalises over the bounds and formats the clock", () => {
    const b = { min: { x: 0, y: -100 }, max: { x: 200, y: 100 } };
    expect(normalise(b, 100, 0)).toEqual([0.5, 0.5]);
    expect(normalise(null, 1, 1)).toBeNull();
    expect(clock(75)).toBe("1:15");
    expect(clock(-4)).toBe("0:00");
  });
});

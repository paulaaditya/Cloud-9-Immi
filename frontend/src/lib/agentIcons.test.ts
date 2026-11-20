import { normalizeAgent, parseAgents } from "./agentIcons";

describe("agent icons", () => {
  it("normalises agent names so the feed and the API match", () => {
    expect(normalizeAgent("kay/o")).toBe("kayo");
    expect(normalizeAgent("KAY/O")).toBe("kayo");
    expect(normalizeAgent("Raze")).toBe("raze");
    expect(normalizeAgent(null)).toBe("");
  });

  it("reads the small icon, falls back to the large one, and ignores bad payloads", () => {
    const icons = parseAgents({
      data: [
        { displayName: "Jett", displayIconSmall: "https://x/jett-small.png", displayIcon: "https://x/jett.png" },
        { displayName: "KAY/O", displayIcon: "https://x/kayo.png" },
        { displayName: "NoIcon" },
      ],
    });
    expect(icons).toEqual({ jett: "https://x/jett-small.png", kayo: "https://x/kayo.png" });
    expect(parseAgents(null)).toEqual({});
    expect(parseAgents({ data: "nope" })).toEqual({});
  });
});

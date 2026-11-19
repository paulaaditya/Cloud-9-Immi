import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MinimapReplay } from "./MinimapReplay";
import { AttributedMistake, KillEvent } from "@/types/api";
import {
  normalizeMapName,
  getMapDisplayName,
  mapWorldToCanvas,
} from "../lib/mapCoords";

const mockMistakes: AttributedMistake[] = [
  {
    mistake_type: "UNTRADED_FIRST_DEATH",
    player_id: "OXY",
    player_name: "OXY",
    character_name: "Jett",
    round_number: 1,
    occurred_at: "2026-11-19T10:00:15Z",
    win_prob_delta: -0.312,
    description: "Untraded opening death with no return trade within 3.0 seconds.",
    coaching_fix: "Establish buddy-system spacing (< 6 meters) and hold crossfire angles.",
  },
  {
    mistake_type: "ISOLATED_DUEL",
    player_id: "vanity",
    player_name: "vanity",
    character_name: "Omen",
    round_number: 2,
    occurred_at: "2026-11-19T10:01:22Z",
    win_prob_delta: -0.245,
    description: "Isolated duel in A Main without trade support.",
    coaching_fix: "Anchor crossfire with site partner.",
  },
];

const mockKills: KillEvent[] = [
  {
    event_id: "kill-1",
    killer_id: "zekken",
    victim_id: "OXY",
    killer_name: "zekken",
    victim_name: "OXY",
    weapon: "Vandal",
    occurred_at: "2026-11-19T10:00:15Z",
    killer_position: { x: 320, y: 220, z: 0 },
    victim_position: { x: 290, y: 280, z: 0 },
    is_first_blood: true,
  },
];

describe("MinimapReplay Component", () => {
  it("renders the 2D tactical canvas and map title", () => {
    const handleRoundChange = jest.fn();
    render(
      <MinimapReplay
        currentRound={1}
        totalRounds={24}
        mistakes={mockMistakes}
        kills={mockKills}
        onRoundChange={handleRoundChange}
        mapName="Ascent"
      />
    );

    const canvas = screen.getByTestId("minimap-canvas");
    expect(canvas).toBeInTheDocument();
    expect(screen.getByText("Tactical Minimap Replay")).toBeInTheDocument();
    expect(screen.getByText("Ascent")).toBeInTheDocument();
  });

  it("renders round scrub controls: slider, next/prev buttons, and play/pause button", () => {
    const handleRoundChange = jest.fn();
    render(
      <MinimapReplay
        currentRound={1}
        totalRounds={24}
        mistakes={mockMistakes}
        kills={mockKills}
        onRoundChange={handleRoundChange}
      />
    );

    const scrubber = screen.getByTestId("round-scrubber");
    expect(scrubber).toBeInTheDocument();
    expect(scrubber).toHaveValue("1");

    const prevBtn = screen.getByTestId("prev-round-btn");
    const nextBtn = screen.getByTestId("next-round-btn");
    const playBtn = screen.getByTestId("play-pause-btn");
    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
    expect(playBtn).toBeInTheDocument();

    const roundDisplay = screen.getByTestId("current-round-display");
    expect(roundDisplay).toHaveTextContent("Round 1 / 24");
  });

  it("handles round changes via scrubber slider, navigation buttons, and round pills", () => {
    const handleRoundChange = jest.fn();
    render(
      <MinimapReplay
        currentRound={5}
        totalRounds={24}
        mistakes={mockMistakes}
        kills={mockKills}
        onRoundChange={handleRoundChange}
      />
    );

    const scrubber = screen.getByTestId("round-scrubber");
    fireEvent.change(scrubber, { target: { value: "10" } });
    expect(handleRoundChange).toHaveBeenCalledWith(10);

    const prevBtn = screen.getByTestId("prev-round-btn");
    fireEvent.click(prevBtn);
    expect(handleRoundChange).toHaveBeenCalledWith(4);

    const nextBtn = screen.getByTestId("next-round-btn");
    fireEvent.click(nextBtn);
    expect(handleRoundChange).toHaveBeenCalledWith(6);

    const round2Pill = screen.getByText("R2");
    fireEvent.click(round2Pill);
    expect(handleRoundChange).toHaveBeenCalledWith(2);
  });

  it("renders mistake markers, negative xRW badges, and killfeed for active round", () => {
    const handleRoundChange = jest.fn();
    render(
      <MinimapReplay
        currentRound={1}
        totalRounds={24}
        mistakes={mockMistakes}
        kills={mockKills}
        onRoundChange={handleRoundChange}
      />
    );

    // Round 1 has 1 mistake for OXY
    const mistakeMarkers = screen.getAllByTestId("mistake-marker");
    expect(mistakeMarkers.length).toBe(1);

    expect(screen.getAllByText("OXY").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("UNTRADED_FIRST_DEATH")).toBeInTheDocument();
    expect(screen.getByTestId("mistake-xrw-badge")).toHaveTextContent("-31.2% xRW");

    // Killfeed items
    expect(screen.getByText("zekken")).toBeInTheDocument();
    expect(screen.getByText(/vandal/i)).toBeInTheDocument();
    expect(screen.getByText("FB")).toBeInTheDocument();
  });

  it("triggers onSelectMistake when a mistake marker is clicked", () => {
    const handleRoundChange = jest.fn();
    const handleSelectMistake = jest.fn();

    render(
      <MinimapReplay
        currentRound={1}
        totalRounds={24}
        mistakes={mockMistakes}
        kills={mockKills}
        onRoundChange={handleRoundChange}
        onSelectMistake={handleSelectMistake}
      />
    );

    const mistakeMarker = screen.getByTestId("mistake-marker");
    fireEvent.click(mistakeMarker);

    expect(handleSelectMistake).toHaveBeenCalledTimes(1);
    expect(handleSelectMistake).toHaveBeenCalledWith(mockMistakes[0]);
  });

  it("renders clean execution state when no mistakes occurred in the active round", () => {
    const handleRoundChange = jest.fn();
    render(
      <MinimapReplay
        currentRound={15}
        totalRounds={24}
        mistakes={mockMistakes}
        kills={[]}
        onRoundChange={handleRoundChange}
      />
    );

    expect(
      screen.getByText(/No tactical mistakes attributed in Round 15/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("mistake-marker")).not.toBeInTheDocument();
  });

  it("highlights player actions when selectedPlayerId is provided", () => {
    const handleRoundChange = jest.fn();
    render(
      <MinimapReplay
        currentRound={1}
        totalRounds={24}
        mistakes={mockMistakes}
        kills={mockKills}
        onRoundChange={handleRoundChange}
        selectedPlayerId="OXY"
      />
    );

    expect(screen.getByText("Focus: OXY")).toBeInTheDocument();
  });

  it("handles play/pause toggle callback", () => {
    const handleTogglePlay = jest.fn();
    render(
      <MinimapReplay
        currentRound={1}
        totalRounds={24}
        mistakes={mockMistakes}
        kills={mockKills}
        onRoundChange={jest.fn()}
        isPlaying={false}
        onTogglePlay={handleTogglePlay}
      />
    );

    const playBtn = screen.getByTestId("play-pause-btn");
    expect(playBtn).toHaveTextContent("Play");
    fireEvent.click(playBtn);
    expect(handleTogglePlay).toHaveBeenCalledTimes(1);
  });

  describe("Map normalization and coordinate calibration", () => {
    it("correctly normalizes all competitive Valorant maps", () => {
      expect(normalizeMapName("lotus")).toBe("lotus");
      expect(normalizeMapName("Lotus")).toBe("lotus");
      expect(normalizeMapName("abyss")).toBe("abyss");
      expect(normalizeMapName("Sunset")).toBe("sunset");
      expect(normalizeMapName("/Game/Maps/Jam/Jam")).toBe("lotus");
      expect(normalizeMapName("/Game/Maps/Canyon/Canyon")).toBe("fracture");
      expect(normalizeMapName(null)).toBe("ascent");
    });

    it("formats map display names cleanly", () => {
      expect(getMapDisplayName("lotus")).toBe("Lotus");
      expect(getMapDisplayName("abyss")).toBe("Abyss");
      expect(getMapDisplayName("sunset")).toBe("Sunset");
      expect(getMapDisplayName("fracture")).toBe("Fracture");
    });

    it("translates world coordinates to within canvas boundary bounds", () => {
      const pos = mapWorldToCanvas("fracture", 7522, -6404, 600, 600);
      expect(pos.x).toBeGreaterThanOrEqual(20);
      expect(pos.x).toBeLessThanOrEqual(580);
      expect(pos.y).toBeGreaterThanOrEqual(20);
      expect(pos.y).toBeLessThanOrEqual(580);
    });

    it("renders radar when mapName is Lotus", () => {
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={[]}
          kills={[]}
          onRoundChange={jest.fn()}
          mapName="Lotus"
        />
      );
      expect(screen.getByText("Lotus")).toBeInTheDocument();
      expect(screen.getByText("Spatial Radar: Lotus")).toBeInTheDocument();
    });

    it("toggles between active round mistakes and all match mistakes stream", () => {
      const handleRoundChange = jest.fn();
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={handleRoundChange}
        />
      );

      // Initially on active round (Round 1: 1 mistake for OXY)
      expect(screen.getByText("Round Mistakes (1)")).toBeInTheDocument();
      expect(screen.getByText("All Match Mistakes (2)")).toBeInTheDocument();
      expect(screen.getAllByTestId("mistake-marker").length).toBe(1);

      // Click All Match Mistakes tab
      fireEvent.click(screen.getByText("All Match Mistakes (2)"));

      // Now both Round 1 (OXY) and Round 2 (vanity) are rendered
      expect(screen.getAllByTestId("mistake-marker").length).toBe(2);
      expect(screen.getByText("vanity")).toBeInTheDocument();

      // Clicking Round 2 mistake switches round to 2
      const vanityCard = screen.getAllByTestId("mistake-marker")[1];
      fireEvent.click(vanityCard);
      expect(handleRoundChange).toHaveBeenCalledWith(2);
    });
  });
});

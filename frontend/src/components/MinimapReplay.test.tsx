import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MinimapReplay } from "./MinimapReplay";
import { AttributedMistake, KillEvent } from "@/types/api";

const mockMistakes: AttributedMistake[] = [
  {
    mistake_type: "UNTRADED_FIRST_DEATH",
    player_id: "OXY",
    round_number: 1,
    occurred_at: "2026-11-19T10:00:15Z",
    win_prob_delta: -0.312,
    description: "Untraded opening death with no return trade within 3.0 seconds.",
    coaching_fix: "Establish buddy-system spacing (< 6 meters) and hold crossfire angles.",
  },
  {
    mistake_type: "ISOLATED_DUEL",
    player_id: "vanity",
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

  it("renders round scrub controls: slider and next/prev buttons", () => {
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
    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();

    const roundDisplay = screen.getByTestId("current-round-display");
    expect(roundDisplay).toHaveTextContent("Round 1 / 24");
  });

  it("handles round changes via scrubber slider and navigation buttons", () => {
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
  });

  it("renders mistake markers and negative xRW badges for active round", () => {
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

    expect(screen.getByText("OXY")).toBeInTheDocument();
    expect(screen.getByText("UNTRADED_FIRST_DEATH")).toBeInTheDocument();
    expect(screen.getByTestId("mistake-xrw-badge")).toHaveTextContent("-31.2% xRW");
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
        kills={mockKills}
        onRoundChange={handleRoundChange}
      />
    );

    expect(
      screen.getByText(/No tactical mistakes attributed in Round 15/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("mistake-marker")).not.toBeInTheDocument();
  });
});

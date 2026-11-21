import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RoundSelection } from "./RoundSelection";
import { AttributedMistake, ParsedRound } from "@/types/api";

const mockMistakes: AttributedMistake[] = [
  {
    mistake_type: "UNTRADED_FIRST_DEATH",
    player_id: "OXY",
    player_name: "OXY",
    character_name: "Jett",
    round_number: 1,
    occurred_at: "2026-11-19T10:00:15Z",
    win_prob_delta: -0.312,
    description: "Untraded opening death.",
    coaching_fix: "Hold crossfire.",
  },
];

const mockRounds: ParsedRound[] = [
  {
    round_number: 1,
    winning_team_id: "Cloud9",
    round_winner_name: "Cloud9",
    win_condition: "Elimination",
    kills: [],
    ability_casts: [],
    spike_planted: false,
  },
  {
    round_number: 2,
    winning_team_id: "NRG",
    round_winner_name: "NRG",
    win_condition: "SpikeDefused",
    kills: [],
    ability_casts: [],
    spike_planted: true,
  },
];

describe("RoundSelection Component", () => {
  it("renders round selection card, title, and current round display", () => {
    const handleRoundChange = jest.fn();
    render(
      <RoundSelection
        currentRound={1}
        totalRounds={24}
        onRoundChange={handleRoundChange}
        rounds={mockRounds}
        mistakes={mockMistakes}
      />
    );

    const card = screen.getByTestId("round-selection-card");
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass("c9-watercolor-card");
    expect(screen.getByText("Round Selection")).toBeInTheDocument();
    expect(screen.getByTestId("current-round-display")).toHaveTextContent("Round 1 / 24");
    expect(screen.getByText("Winner: Cloud9")).toBeInTheDocument();
  });

  it("handles scrubber range slider input", () => {
    const handleRoundChange = jest.fn();
    render(
      <RoundSelection
        currentRound={1}
        totalRounds={24}
        onRoundChange={handleRoundChange}
      />
    );

    const scrubber = screen.getByTestId("round-scrubber");
    fireEvent.change(scrubber, { target: { value: "8" } });
    expect(handleRoundChange).toHaveBeenCalledWith(8);
  });

  it("handles prev and next navigation buttons", () => {
    const handleRoundChange = jest.fn();
    const { rerender } = render(
      <RoundSelection
        currentRound={1}
        totalRounds={24}
        onRoundChange={handleRoundChange}
      />
    );

    const prevBtn = screen.getByTestId("prev-round-btn");
    expect(prevBtn).toBeDisabled();

    const nextBtn = screen.getByTestId("next-round-btn");
    expect(nextBtn).not.toBeDisabled();
    fireEvent.click(nextBtn);
    expect(handleRoundChange).toHaveBeenCalledWith(2);

    rerender(
      <RoundSelection
        currentRound={24}
        totalRounds={24}
        onRoundChange={handleRoundChange}
      />
    );
    expect(screen.getByTestId("next-round-btn")).toBeDisabled();
  });

  it("handles play/pause toggle", () => {
    const handleToggle = jest.fn();
    const { rerender } = render(
      <RoundSelection
        currentRound={1}
        totalRounds={24}
        onRoundChange={jest.fn()}
        isPlaying={false}
        onTogglePlay={handleToggle}
      />
    );

    const playBtn = screen.getByTestId("play-pause-btn");
    expect(playBtn).toHaveTextContent("Play");
    fireEvent.click(playBtn);
    expect(handleToggle).toHaveBeenCalledTimes(1);

    rerender(
      <RoundSelection
        currentRound={1}
        totalRounds={24}
        onRoundChange={jest.fn()}
        isPlaying={true}
        onTogglePlay={handleToggle}
      />
    );
    expect(screen.getByTestId("play-pause-btn")).toHaveTextContent("Pause");
  });

  it("handles clicking round pills", () => {
    const handleRoundChange = jest.fn();
    render(
      <RoundSelection
        currentRound={1}
        totalRounds={24}
        onRoundChange={handleRoundChange}
        rounds={mockRounds}
        mistakes={mockMistakes}
      />
    );

    const round2Pill = screen.getByText("R2");
    fireEvent.click(round2Pill);
    expect(handleRoundChange).toHaveBeenCalledWith(2);
  });
});

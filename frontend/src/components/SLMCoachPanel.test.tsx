import React from "react";
import { render, screen } from "@testing-library/react";
import { SLMCoachPanel } from "./SLMCoachPanel";
import { RoundCoachingInsight } from "@/types/api";

describe("SLMCoachPanel", () => {
  const mockInsight: RoundCoachingInsight = {
    round_number: 3,
    narrative: "Cloud9 lost man-advantage on A site execute.",
    blunder_culprit: "OXY",
    win_prob_tax: -0.24,
    tactical_directive: "Coordinate flash utility with duelist entry.",
    player_stat_verdict: "OXY has 2 FK and 3 FD (240 ACS).",
    recommended_drill: {
      drill_name: "Flash Entry Timing 2v2",
      target_players: ["OXY"],
      drill_objective: "Coordinate pop flash before contact.",
      setup_steps: ["Pop flash before entry."],
      success_criterion: "0 untraded deaths.",
    },
  };

  it("renders round coaching insight correctly", () => {
    render(<SLMCoachPanel insight={mockInsight} roundNumber={3} />);
    expect(screen.getByText(/AI Assistant Coach: Round 3/i)).toBeInTheDocument();
    expect(screen.getAllByText(/OXY/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Coordinate flash utility with duelist entry/i)).toBeInTheDocument();
    expect(screen.getByText(/OXY has 2 FK and 3 FD \(240 ACS\)\./i)).toBeInTheDocument();
    expect(screen.getByText(/Cloud9 lost man-advantage on A site execute\./i)).toBeInTheDocument();
  });

  it("renders empty or null insight gracefully", () => {
    render(<SLMCoachPanel insight={null} roundNumber={5} />);
    expect(screen.getByText(/No automated insight available for Round 5/i)).toBeInTheDocument();
  });
});

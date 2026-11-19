import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DrillPrescriptions } from "./DrillPrescriptions";
import { PrescribedDrill } from "@/types/api";

const mockDrills: PrescribedDrill[] = [
  {
    drill_name: "Buddy-System Contact & Trade Timing 2v2",
    target_players: ["OXY", "runi"],
    drill_objective: "Reinforce sub-6m proximity spacing and synchronized peeking.",
    setup_steps: [
      "Pair target players as entry fragger and secondary trader at choke entrance.",
      "Opponent defender holds an aggressive off-angle.",
    ],
    success_criterion: "Trade kill completed within 2.0 seconds in at least 80% of repetitions.",
  },
  {
    drill_name: "Crossfire & Spacing 2v2",
    target_players: ["vanity", "moose"],
    drill_objective: "Eliminate isolated solo engagements by anchoring paired crossfire angles.",
    setup_steps: [
      "Position two defenders on site in complementary crossfire lines.",
    ],
    success_criterion: "Zero untraded deaths across 10 rounds.",
  },
];

describe("DrillPrescriptions Component", () => {
  it("renders drill prescriptions with target players, setup steps, and success criteria", () => {
    render(<DrillPrescriptions drills={mockDrills} />);

    expect(screen.getByText("Prescribed Tactical Training Drills")).toBeInTheDocument();
    expect(screen.getByText("Buddy-System Contact & Trade Timing 2v2")).toBeInTheDocument();
    expect(screen.getByText("Crossfire & Spacing 2v2")).toBeInTheDocument();
    expect(screen.getByText(/Zero untraded deaths across 10 rounds/i)).toBeInTheDocument();
  });

  it("filters drills by selected player", () => {
    render(<DrillPrescriptions drills={mockDrills} selectedPlayerId="OXY" />);

    expect(screen.getByText("Buddy-System Contact & Trade Timing 2v2")).toBeInTheDocument();
    expect(screen.queryByText("Crossfire & Spacing 2v2")).not.toBeInTheDocument();
  });

  it("searches drills by text query", () => {
    render(<DrillPrescriptions drills={mockDrills} />);

    const searchInput = screen.getByPlaceholderText("Search drills or players...");
    fireEvent.change(searchInput, { target: { value: "Crossfire" } });

    expect(screen.queryByText("Buddy-System Contact & Trade Timing 2v2")).not.toBeInTheDocument();
    expect(screen.getByText("Crossfire & Spacing 2v2")).toBeInTheDocument();
  });
});

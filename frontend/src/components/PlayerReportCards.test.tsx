import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerReportCards } from "./PlayerReportCards";
import { PlayerReportCard } from "@/types/api";

const mockReports: PlayerReportCard[] = [
  {
    player_id: "OXY",
    player_name: "OXY",
    character_name: "Jett",
    mistake_count: 3,
    cumulative_xrw_tax: -0.947,
    primary_vulnerability: "UNTRADED_FIRST_DEATH",
    actionable_summary: "Player OXY incurred -0.947 cumulative xRW tax across 3 mistakes.",
  },
  {
    player_id: "vanity",
    player_name: "vanity",
    character_name: "Omen",
    mistake_count: 1,
    cumulative_xrw_tax: -0.245,
    primary_vulnerability: "ISOLATED_DUEL",
    actionable_summary: "Player vanity incurred -0.245 cumulative xRW tax across 1 mistakes.",
  },
  {
    player_id: "12345",
    player_name: "Derrek",
    character_name: "Sova",
    mistake_count: 2,
    cumulative_xrw_tax: -0.320,
    primary_vulnerability: "UTILITY_DELAY",
    actionable_summary: "Player Derrek incurred -0.320 cumulative xRW tax across 2 mistakes.",
  },
];

describe("PlayerReportCards Component", () => {
  it("renders player report cards with xRW loss and vulnerabilities", () => {
    render(<PlayerReportCards reports={mockReports} />);

    expect(screen.getByText("Player Error Tax Report Cards")).toBeInTheDocument();
    expect(screen.getByText("OXY")).toBeInTheDocument();
    expect(screen.getByText("vanity")).toBeInTheDocument();
    expect(screen.getByText("Derrek")).toBeInTheDocument();
    expect(screen.getByText("-94.7% xRW")).toBeInTheDocument();
    expect(screen.getByText("-24.5% xRW")).toBeInTheDocument();
    expect(screen.getByText("-32.0% xRW")).toBeInTheDocument();
    expect(screen.getAllByText("UNTRADED_FIRST_DEATH").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("ISOLATED_DUEL").length).toBeGreaterThanOrEqual(1);
  });

  it("renders agent character badges", () => {
    render(<PlayerReportCards reports={mockReports} />);

    expect(screen.getByText("Jett")).toBeInTheDocument();
    expect(screen.getByText("Omen")).toBeInTheDocument();
    expect(screen.getByText("Sova")).toBeInTheDocument();
  });

  it("handles player selection toggle and active styling", () => {
    const handleSelect = jest.fn();
    const { rerender } = render(
      <PlayerReportCards
        reports={mockReports}
        selectedPlayerId={null}
        onSelectPlayer={handleSelect}
      />
    );

    const oxyCard = screen.getByTestId("player-card-OXY");
    fireEvent.click(oxyCard);
    expect(handleSelect).toHaveBeenCalledWith("OXY");

    rerender(
      <PlayerReportCards
        reports={mockReports}
        selectedPlayerId="OXY"
        onSelectPlayer={handleSelect}
      />
    );
    expect(oxyCard).toHaveClass("border-[#00aeef]");
  });

  it("filters player cards by vulnerability type", () => {
    render(<PlayerReportCards reports={mockReports} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "ISOLATED_DUEL" } });

    expect(screen.queryByText("OXY")).not.toBeInTheDocument();
    expect(screen.getByText("vanity")).toBeInTheDocument();
  });
});

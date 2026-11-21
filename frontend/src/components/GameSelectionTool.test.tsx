import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameSelectionTool } from "./GameSelectionTool";
import { FeaturedSeries } from "../types/api";

const MOCK_2026_MATCHES: FeaturedSeries[] = [
  {
    series_id: "vlr-c9-sen-2026",
    teams: "Cloud9 vs Sentinels",
    team1_name: "Cloud9",
    team2_name: "Sentinels",
    event: "VCT Americas 2026 Stage 1",
    event_name: "VCT Americas 2026 Stage 1",
    date: "2026-04-12",
    score: "13 - 11",
    map_name: "Ascent",
    is_cloud9: true,
  },
  {
    series_id: "vlr-c9-nrg-2026",
    teams: "Cloud9 vs NRG",
    team1_name: "Cloud9",
    team2_name: "NRG",
    event: "VCT Americas 2026 Stage 1",
    event_name: "VCT Americas 2026 Stage 1",
    date: "2026-05-03",
    score: "13 - 9",
    map_name: "Haven",
    is_cloud9: true,
  },
  {
    series_id: "vlr-c9-geng-bangkok2026",
    teams: "Cloud9 vs Gen.G",
    team1_name: "Cloud9",
    team2_name: "Gen.G",
    event: "VCT Masters 2026 Bangkok",
    event_name: "VCT Masters 2026 Bangkok",
    date: "2026-03-08",
    score: "13 - 10",
    map_name: "Lotus",
    is_cloud9: true,
  },
  {
    series_id: "vlr-sen-th-champions2026",
    teams: "Sentinels vs Team Heretics",
    team1_name: "Sentinels",
    team2_name: "Team Heretics",
    event: "VCT Champions 2026 Paris",
    event_name: "VCT Champions 2026 Paris",
    date: "2026-09-06",
    score: "13 - 11",
    map_name: "Sunset",
    is_cloud9: false,
  },
];

describe("GameSelectionTool", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <GameSelectionTool
        isOpen={false}
        onClose={jest.fn()}
        matches={MOCK_2026_MATCHES}
        selectedSeriesId="vlr-c9-sen-2026"
        onSelectMatch={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders match catalog and filter controls when isOpen is true", () => {
    render(
      <GameSelectionTool
        isOpen={true}
        onClose={jest.fn()}
        matches={MOCK_2026_MATCHES}
        selectedSeriesId="vlr-c9-sen-2026"
        onSelectMatch={jest.fn()}
      />
    );
    expect(screen.getByText("2026 VCT Season - Match Selection")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by team, event, or map/i)).toBeInTheDocument();
    expect(screen.getByText("Cloud9 Only")).toBeInTheDocument();
    expect(screen.getByText("Showing 4 of 4 matches")).toBeInTheDocument();
  });

  it("filters matches by team", () => {
    render(
      <GameSelectionTool
        isOpen={true}
        onClose={jest.fn()}
        matches={MOCK_2026_MATCHES}
        selectedSeriesId="vlr-c9-sen-2026"
        onSelectMatch={jest.fn()}
      />
    );
    fireEvent.click(screen.getByText("Cloud9 Only"));
    expect(screen.getByText("Showing 3 of 4 matches")).toBeInTheDocument();
    expect(screen.getByText("Cloud9 vs Sentinels")).toBeInTheDocument();
    expect(screen.getByText("Cloud9 vs NRG")).toBeInTheDocument();
    expect(screen.queryByText("Sentinels vs Team Heretics")).not.toBeInTheDocument();
  });

  it("filters matches by event", () => {
    render(
      <GameSelectionTool
        isOpen={true}
        onClose={jest.fn()}
        matches={MOCK_2026_MATCHES}
        selectedSeriesId="vlr-c9-sen-2026"
        onSelectMatch={jest.fn()}
      />
    );
    const eventSelect = screen.getByLabelText(/filter by event/i);
    fireEvent.change(eventSelect, { target: { value: "VCT Masters 2026 Bangkok" } });
    expect(screen.getByText("Showing 1 of 4 matches")).toBeInTheDocument();
    expect(screen.getByText("Cloud9 vs Gen.G")).toBeInTheDocument();
    expect(screen.queryByText("Cloud9 vs Sentinels")).not.toBeInTheDocument();
  });

  it("filters matches by date search or stage button", () => {
    render(
      <GameSelectionTool
        isOpen={true}
        onClose={jest.fn()}
        matches={MOCK_2026_MATCHES}
        selectedSeriesId="vlr-c9-sen-2026"
        onSelectMatch={jest.fn()}
      />
    );
    // Click March stage button
    const marButton = screen.getByRole("button", { name: /mar/i });
    fireEvent.click(marButton);
    expect(screen.getByText("Cloud9 vs Gen.G")).toBeInTheDocument();
    expect(screen.queryByText("Cloud9 vs NRG")).not.toBeInTheDocument();
  });

  it("calls onSelectMatch and onClose when match card is clicked", () => {
    const handleSelect = jest.fn();
    const handleClose = jest.fn();
    render(
      <GameSelectionTool
        isOpen={true}
        onClose={handleClose}
        matches={MOCK_2026_MATCHES}
        selectedSeriesId="vlr-c9-sen-2026"
        onSelectMatch={handleSelect}
      />
    );
    fireEvent.click(screen.getByText("Cloud9 vs NRG"));
    expect(handleSelect).toHaveBeenCalledWith("vlr-c9-nrg-2026");
    expect(handleClose).toHaveBeenCalled();
  });

  it("clears all active filters when Clear Filters is clicked", () => {
    render(
      <GameSelectionTool
        isOpen={true}
        onClose={jest.fn()}
        matches={MOCK_2026_MATCHES}
        selectedSeriesId="vlr-c9-sen-2026"
        onSelectMatch={jest.fn()}
      />
    );
    // Filter by Cloud9 Only
    fireEvent.click(screen.getByText("Cloud9 Only"));
    expect(screen.getByText("Showing 3 of 4 matches")).toBeInTheDocument();

    // Click Clear Filters
    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(screen.getByText("Showing 4 of 4 matches")).toBeInTheDocument();
    expect(screen.getByText("Sentinels vs Team Heretics")).toBeInTheDocument();
  });
});

import React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import CoachDashboardPage from "../app/page";
import { useCoachStore } from "../store/coachStore";

// Mock fetch for API calls in page component
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: false,
    json: () => Promise.resolve({}),
  })
) as jest.Mock;

describe("CoachDashboard Layout (Wireframe Specification)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCoachStore.setState({
      selectedSeriesId: "2748746",
      currentGameIndex: 0,
      selectedPlayerId: null,
      selectedMistakeId: null,
      isPlaying: false,
      currentRound: 1,
      totalRounds: 24,
      selectedMistake: null,
      selectedRoundInsight: null,
    });
  });

  it("renders the top header bar with branding, series selector, map switcher, and live telemetry", async () => {
    await act(async () => {
      render(<CoachDashboardPage />);
    });

    // Brand title
    expect(screen.getByText("CLOUD9")).toBeInTheDocument();
    expect(screen.getByText("ORACLE")).toBeInTheDocument();

    // Series selector
    const seriesSelect = screen.getByRole("combobox", { name: /select series/i });
    expect(seriesSelect).toBeInTheDocument();

    // Map switcher buttons
    expect(screen.getByRole("button", { name: /map 1: ascent/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /map 2: bind/i })).toBeInTheDocument();

    // Telemetry status badge
    expect(screen.getByText(/benchmark|live telemetry/i)).toBeInTheDocument();
  });

  it("renders the 4 distinct layout cards matching the wireframe", async () => {
    await act(async () => {
      render(<CoachDashboardPage />);
    });

    // Left Column Card 1: Round Selection
    const roundSelectionCard = screen.getByTestId("round-selection-card");
    expect(roundSelectionCard).toBeInTheDocument();
    expect(roundSelectionCard).toHaveClass("c9-watercolor-card");
    expect(screen.getByText("Round Selection")).toBeInTheDocument();
    expect(screen.getByTestId("round-scrubber")).toBeInTheDocument();

    // Left Column Card 2: Tactical Map Replay
    const mapCard = screen.getByTestId("map-card");
    expect(mapCard).toBeInTheDocument();
    expect(screen.getByText("Tactical Minimap Replay")).toBeInTheDocument();
    expect(screen.getByTestId("minimap-canvas")).toBeInTheDocument();

    // Right Column Card 1: Player Error Report
    const playerErrorCard = screen.getByTestId("player-error-report-card");
    expect(playerErrorCard).toBeInTheDocument();
    expect(screen.getByText("Player Error Tax Report Cards")).toBeInTheDocument();
    expect(
      screen.getByText(/OXY: Establish buddy-system spacing/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/incurred/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Actionable fix:/i)).not.toBeInTheDocument();

    // Right Column Card 2: Training Drills
    const trainingDrillsCard = screen.getByTestId("training-drills-card");
    expect(trainingDrillsCard).toBeInTheDocument();
    expect(screen.getByText("Prescribed Tactical Training Drills")).toBeInTheDocument();
  });

  it("coordinates round selection between RoundSelection card and MinimapReplay card", async () => {
    await act(async () => {
      render(<CoachDashboardPage />);
    });

    // Initially Round 1
    expect(screen.getByTestId("current-round-display")).toHaveTextContent("Round 1 / 24");

    // Click R3 pill in RoundSelection
    const r3Pills = screen.getAllByRole("button", { name: /r3/i });
    await act(async () => {
      fireEvent.click(r3Pills[0]);
    });

    // Both round display and map telemetry update
    expect(screen.getByTestId("current-round-display")).toHaveTextContent("Round 3 / 24");
    expect(screen.getByText("Round 3 Telemetry")).toBeInTheDocument();
  });

  it("coordinates player selection filter between PlayerReportCards and MinimapReplay", async () => {
    await act(async () => {
      render(<CoachDashboardPage />);
    });

    // Click OXY card in Player Report Cards
    const oxyCard = screen.getByTestId("player-card-OXY");
    await act(async () => {
      fireEvent.click(oxyCard);
    });

    // Minimap focus badge should appear for OXY
    expect(screen.getByText("Focus: OXY")).toBeInTheDocument();
  });

  it("renders SLMCoachPanel and updates with round changes", async () => {
    await act(async () => {
      render(<CoachDashboardPage />);
    });

    expect(screen.getByTestId("slm-coach-panel-container")).toBeInTheDocument();
    expect(screen.getByText(/AI Assistant Coach: Round 1/i)).toBeInTheDocument();

    // Change to Round 3
    const r3Pills = screen.getAllByRole("button", { name: /r3/i });
    await act(async () => {
      fireEvent.click(r3Pills[0]);
    });

    expect(screen.getByText(/AI Assistant Coach: Round 3/i)).toBeInTheDocument();
  });

  it("renders individual player stats badges in PlayerReportCards", async () => {
    await act(async () => {
      render(<CoachDashboardPage />);
    });

    const reportCard = screen.getByTestId("player-error-report-card");
    expect(within(reportCard).getByText(/280 ACS/i)).toBeInTheDocument();
    expect(within(reportCard).getByText(/5 FK \/ 2 FD/i)).toBeInTheDocument();
  });

  it("fetches from VLR endpoint when a VLR match ID is selected", async () => {
    await act(async () => {
      render(<CoachDashboardPage />);
    });

    const seriesSelect = screen.getByRole("combobox", { name: /select series/i });
    await act(async () => {
      fireEvent.change(seriesSelect, { target: { value: "vlr-773435" } });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/vlr/match/773435/coaching-report"),
      expect.any(Object)
    );
  });
});

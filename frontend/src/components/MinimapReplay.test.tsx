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

  it("renders the radar container as an aspect-square wrapper with edge-to-edge canvas", () => {
    render(
      <MinimapReplay
        currentRound={1}
        totalRounds={24}
        mistakes={mockMistakes}
        kills={mockKills}
        onRoundChange={jest.fn()}
        mapName="Ascent"
      />
    );

    const radarContainer = screen.getByTestId("radar-container");
    expect(radarContainer).toBeInTheDocument();
    expect(radarContainer).toHaveClass("aspect-square");
    expect(radarContainer).not.toHaveClass("p-3");

    const canvas = screen.getByTestId("minimap-canvas");
    expect(canvas).toHaveClass("w-full");
    expect(canvas).toHaveClass("h-full");
  });

  it("constrains radar container dimensions with container queries to preserve 1:1 aspect ratio in wide viewports", () => {
    render(
      <MinimapReplay
        currentRound={1}
        totalRounds={24}
        mistakes={mockMistakes}
        kills={mockKills}
        onRoundChange={jest.fn()}
        mapName="Ascent"
      />
    );

    const radarContainer = screen.getByTestId("radar-container");
    expect(radarContainer).toHaveStyle({
      width: "min(100cqw, 100cqh)",
      height: "min(100cqw, 100cqh)",
    });
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
      expect(screen.getAllByText("vanity").length).toBeGreaterThanOrEqual(1);

      // Clicking Round 2 mistake switches round to 2
      const vanityCard = screen.getAllByTestId("mistake-marker")[1];
      fireEvent.click(vanityCard);
      expect(handleRoundChange).toHaveBeenCalledWith(2);
    });

    it("renders player filter pills and filters mistakes when a pill is clicked", () => {
      const handleRoundChange = jest.fn();
      const handleSelectPlayer = jest.fn();
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={handleRoundChange}
          onSelectPlayer={handleSelectPlayer}
        />
      );

      // Switch to all match mistakes so both OXY and vanity are present
      fireEvent.click(screen.getByText("All Match Mistakes (2)"));

      expect(screen.getByTestId("player-filter-pill-all")).toHaveTextContent("All (2)");
      expect(screen.getByTestId("player-filter-pill-OXY")).toHaveTextContent("OXY");
      expect(screen.getByTestId("player-filter-pill-vanity")).toHaveTextContent("vanity");

      // Click vanity filter pill
      fireEvent.click(screen.getByTestId("player-filter-pill-vanity"));
      expect(handleSelectPlayer).toHaveBeenCalledWith("vanity");

      // Only vanity's mistake is now shown
      expect(screen.getAllByTestId("mistake-marker").length).toBe(1);
      expect(screen.getByTestId("player-breakdown-card-vanity")).toBeInTheDocument();
      expect(screen.queryByTestId("player-breakdown-card-OXY")).not.toBeInTheDocument();

      // Click All pill to reset filter
      fireEvent.click(screen.getByTestId("player-filter-pill-all"));
      expect(handleSelectPlayer).toHaveBeenCalledWith(null);
      expect(screen.getAllByTestId("mistake-marker").length).toBe(2);
    });

    it("renders player breakdown card with player header, agent, error tax, and flaw count", () => {
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
        />
      );

      const oxyCard = screen.getByTestId("player-breakdown-card-OXY");
      expect(oxyCard).toBeInTheDocument();
      expect(screen.getAllByText("Jett").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("1 Flaw")).toBeInTheDocument();
      expect(screen.getByTestId("player-breakdown-tax-OXY")).toHaveTextContent("-31.2% xRW");
      expect(
        screen.getByText("Untraded opening death with no return trade within 3.0 seconds.")
      ).toBeInTheDocument();
    });

    it("toggles between Player Breakdown mode and List mode", () => {
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
        />
      );

      // Default is breakdown mode
      expect(screen.getByTestId("player-breakdown-card-OXY")).toBeInTheDocument();

      // Switch to List mode
      fireEvent.click(screen.getByTestId("list-mode-toggle"));
      expect(screen.queryByTestId("player-breakdown-card-OXY")).not.toBeInTheDocument();
      expect(screen.getAllByTestId("mistake-marker").length).toBe(1);
      expect(screen.getByText("UNTRADED_FIRST_DEATH")).toBeInTheDocument();
      expect(screen.queryByText(/Deficit:/i)).not.toBeInTheDocument();

      // Switch back to Breakdown mode
      fireEvent.click(screen.getByTestId("breakdown-mode-toggle"));
      expect(screen.getByTestId("player-breakdown-card-OXY")).toBeInTheDocument();
    });

    it("highlights killfeed items when a player is focused via local player filter", () => {
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
        />
      );

      // In Round 1, mockKills has killer "zekken" and victim "OXY"
      // Filter by OXY
      fireEvent.click(screen.getByTestId("player-filter-pill-OXY"));

      // The kill feed item for OXY should have highlighted styles (bg-sky-100)
      const killItem = screen.getByText("zekken").closest("div");
      expect(killItem).toHaveClass("bg-sky-100");
    });
  });

  describe("Zoom and Pan Features", () => {
    it("renders zoom controls with correct test ids and aria labels", () => {
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
        />
      );

      const zoomInBtn = screen.getByTestId("zoom-in-btn");
      const zoomOutBtn = screen.getByTestId("zoom-out-btn");
      const resetBtn = screen.getByTestId("zoom-reset-btn");

      expect(zoomInBtn).toBeInTheDocument();
      expect(zoomInBtn).toHaveAttribute("aria-label", "Zoom in");
      expect(zoomInBtn).toHaveTextContent("+");

      expect(zoomOutBtn).toBeInTheDocument();
      expect(zoomOutBtn).toHaveAttribute("aria-label", "Zoom out");
      expect(zoomOutBtn).toHaveTextContent("-");

      expect(resetBtn).toBeInTheDocument();
      expect(resetBtn).toHaveAttribute("aria-label", "Reset zoom");
      expect(resetBtn).toHaveTextContent("1x");
    });

    it("handles zoom in, zoom out, and reset button interactions and updates cursor", () => {
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
        />
      );

      const canvas = screen.getByTestId("minimap-canvas");
      const zoomInBtn = screen.getByTestId("zoom-in-btn");
      const zoomOutBtn = screen.getByTestId("zoom-out-btn");
      const resetBtn = screen.getByTestId("zoom-reset-btn");

      // Default state: 1.0x zoom, cursor-crosshair
      expect(canvas).toHaveClass("cursor-crosshair");

      // Zoom in -> 1.5x, cursor changes to cursor-grab
      fireEvent.click(zoomInBtn);
      expect(canvas).toHaveClass("cursor-grab");

      // Zoom in multiple times up to max 4.0x
      for (let i = 0; i < 8; i++) {
        fireEvent.click(zoomInBtn);
      }
      expect(canvas).toHaveClass("cursor-grab");

      // Zoom out
      fireEvent.click(zoomOutBtn);
      expect(canvas).toHaveClass("cursor-grab");

      // Reset zoom back to 1.0x
      fireEvent.click(resetBtn);
      expect(canvas).toHaveClass("cursor-crosshair");

      // Zoom out at 1.0x does not go below 1.0x
      fireEvent.click(zoomOutBtn);
      expect(canvas).toHaveClass("cursor-crosshair");
    });

    it("supports mouse wheel zooming on the canvas", () => {
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
        />
      );

      const canvas = screen.getByTestId("minimap-canvas");
      expect(canvas).toHaveClass("cursor-crosshair");

      // Wheel up zooms in
      fireEvent.wheel(canvas, { deltaY: -100 });
      expect(canvas).toHaveClass("cursor-grab");

      // Wheel down zooms out back to 1.0x
      fireEvent.wheel(canvas, { deltaY: 100 });
      expect(canvas).toHaveClass("cursor-crosshair");
    });

    it("enables click-and-drag panning when zoomed in and toggles grabbing cursor", () => {
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
        />
      );

      const canvas = screen.getByTestId("minimap-canvas");
      const zoomInBtn = screen.getByTestId("zoom-in-btn");
      const resetBtn = screen.getByTestId("zoom-reset-btn");

      // Zoom in to enable panning
      fireEvent.click(zoomInBtn);
      expect(canvas).toHaveClass("cursor-grab");

      // Mouse down starts dragging
      fireEvent.mouseDown(canvas, { clientX: 200, clientY: 200 });
      expect(canvas).toHaveClass("cursor-grabbing");

      // Mouse move pans
      fireEvent.mouseMove(canvas, { clientX: 230, clientY: 250 });
      expect(canvas).toHaveClass("cursor-grabbing");

      // Mouse up ends dragging
      fireEvent.mouseUp(canvas);
      expect(canvas).toHaveClass("cursor-grab");

      // Mouse down and mouse leave ends dragging
      fireEvent.mouseDown(canvas, { clientX: 200, clientY: 200 });
      expect(canvas).toHaveClass("cursor-grabbing");
      fireEvent.mouseLeave(canvas);
      expect(canvas).toHaveClass("cursor-grab");

      // Reset resets zoom and pan
      fireEvent.click(resetBtn);
      expect(canvas).toHaveClass("cursor-crosshair");
    });

    it("does not enable panning when zoom is at default 1.0x", () => {
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
        />
      );

      const canvas = screen.getByTestId("minimap-canvas");
      expect(canvas).toHaveClass("cursor-crosshair");

      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      expect(canvas).toHaveClass("cursor-crosshair");
    });

    it("supports mistake hit-detection on canvas clicks across zoom and pan transformations", () => {
      const handleSelectMistake = jest.fn();
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
          onSelectMistake={handleSelectMistake}
          mapName="Ascent"
        />
      );

      const canvas = screen.getByTestId("minimap-canvas");
      const zoomInBtn = screen.getByTestId("zoom-in-btn");
      const resetBtn = screen.getByTestId("zoom-reset-btn");

      // Round 1 has 1 mistake for OXY.
      // Pos is calculated via mapWorldToCanvas with victim position (290, 280)
      const expectedPos = mapWorldToCanvas(
        "ascent",
        mockKills[0].victim_position!.x,
        mockKills[0].victim_position!.y,
        600,
        600
      );

      // At zoom 1.0x and pan (0, 0): clicking directly at expectedPos triggers selection
      fireEvent.click(canvas, { clientX: expectedPos.x, clientY: expectedPos.y });
      expect(handleSelectMistake).toHaveBeenCalledWith(mockMistakes[0]);
      handleSelectMistake.mockClear();

      // Zoom in to 1.5x (click zoom-in once)
      fireEvent.click(zoomInBtn);

      // Pan by +40 in X and +20 in Y
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 140, clientY: 120 });
      fireEvent.mouseUp(canvas);

      // Under zoom=1.5 and pan=(40, 20), screen position of the mistake is:
      // screenX = expectedPos.x * 1.5 + 40
      // screenY = expectedPos.y * 1.5 + 20
      const transformedScreenX = expectedPos.x * 1.5 + 40;
      const transformedScreenY = expectedPos.y * 1.5 + 20;

      fireEvent.click(canvas, { clientX: transformedScreenX, clientY: transformedScreenY });
      expect(handleSelectMistake).toHaveBeenCalledWith(mockMistakes[0]);
      handleSelectMistake.mockClear();

      // Reset zoom
      fireEvent.click(resetBtn);

      // Clicking far away from mistake should not trigger selection
      fireEvent.click(canvas, { clientX: 10, clientY: 10 });
      expect(handleSelectMistake).not.toHaveBeenCalled();
    });

    it("does not trigger mistake selection during drag panning", () => {
      const handleSelectMistake = jest.fn();
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
          onSelectMistake={handleSelectMistake}
          mapName="Ascent"
        />
      );

      const canvas = screen.getByTestId("minimap-canvas");
      const zoomInBtn = screen.getByTestId("zoom-in-btn");
      fireEvent.click(zoomInBtn);

      const expectedPos = mapWorldToCanvas(
        "ascent",
        mockKills[0].victim_position!.x,
        mockKills[0].victim_position!.y,
        600,
        600
      );

      // Drag across the mistake position: mouseDown, mouseMove by 50px, mouseUp, click
      fireEvent.mouseDown(canvas, { clientX: expectedPos.x * 1.5, clientY: expectedPos.y * 1.5 });
      fireEvent.mouseMove(canvas, { clientX: expectedPos.x * 1.5 + 50, clientY: expectedPos.y * 1.5 + 50 });
      fireEvent.mouseUp(canvas);
      fireEvent.click(canvas, { clientX: expectedPos.x * 1.5 + 50, clientY: expectedPos.y * 1.5 + 50 });

      // Because user was panning, selection should not have triggered
      expect(handleSelectMistake).not.toHaveBeenCalled();
    });

    it("toggles mistake selection when clicking an already selected mistake on the canvas", () => {
      const handleSelectMistake = jest.fn();
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
          selectedMistake={mockMistakes[0]}
          onSelectMistake={handleSelectMistake}
          mapName="Ascent"
        />
      );

      const canvas = screen.getByTestId("minimap-canvas");
      const expectedPos = mapWorldToCanvas(
        "ascent",
        mockKills[0].victim_position!.x,
        mockKills[0].victim_position!.y,
        600,
        600
      );

      // Clicking the already selected mistake should deselect it (pass null)
      fireEvent.click(canvas, { clientX: expectedPos.x, clientY: expectedPos.y });
      expect(handleSelectMistake).toHaveBeenCalledWith(null);
    });

    it("applies canvas 2D transformations (save, translate, scale, restore) during render", () => {
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
        />
      );

      const zoomInBtn = screen.getByTestId("zoom-in-btn");
      fireEvent.click(zoomInBtn);

      const getContextMock = HTMLCanvasElement.prototype.getContext as jest.Mock;
      const mockCtx = getContextMock.mock.results[getContextMock.mock.results.length - 1]?.value;
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.translate).toHaveBeenCalledWith(0, 0);
      expect(mockCtx.scale).toHaveBeenCalledWith(1.5, 1.5);
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it("ignores wheel event with deltaY: 0 without changing zoom", () => {
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
        />
      );

      const canvas = screen.getByTestId("minimap-canvas");
      expect(canvas).toHaveClass("cursor-crosshair");

      // Horizontal trackpad swipe produces deltaY: 0
      fireEvent.wheel(canvas, { deltaY: 0 });
      expect(canvas).toHaveClass("cursor-crosshair");
    });

    it("preserves two-decimal precision when combining fractional wheel zoom and button zoom", () => {
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
        />
      );

      const canvas = screen.getByTestId("minimap-canvas");
      const zoomInBtn = screen.getByTestId("zoom-in-btn");
      const getContextMock = HTMLCanvasElement.prototype.getContext as jest.Mock;

      // Wheel up once: zoom goes from 1.0 to 1.25
      fireEvent.wheel(canvas, { deltaY: -100 });
      let mockCtx = getContextMock.mock.results[getContextMock.mock.results.length - 1]?.value;
      expect(mockCtx.scale).toHaveBeenCalledWith(1.25, 1.25);

      // Click Zoom In (+0.5): zoom should become 1.75 (not rounded to 1.8)
      fireEvent.click(zoomInBtn);
      mockCtx = getContextMock.mock.results[getContextMock.mock.results.length - 1]?.value;
      expect(mockCtx.scale).toHaveBeenCalledWith(1.75, 1.75);
    });

    it("does not initiate dragging on non-primary mouse button clicks", () => {
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
        />
      );

      const canvas = screen.getByTestId("minimap-canvas");
      const zoomInBtn = screen.getByTestId("zoom-in-btn");
      fireEvent.click(zoomInBtn);
      expect(canvas).toHaveClass("cursor-grab");

      // Right click (button: 2) should not start dragging
      fireEvent.mouseDown(canvas, { button: 2, clientX: 100, clientY: 100 });
      expect(canvas).toHaveClass("cursor-grab");
    });

    it("clamps pan offset to keep radar content visible under extreme dragging", () => {
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
        />
      );

      const canvas = screen.getByTestId("minimap-canvas");
      const zoomInBtn = screen.getByTestId("zoom-in-btn");
      fireEvent.click(zoomInBtn); // zoom = 1.5

      // Aggressive drag far beyond canvas boundaries (+5000px)
      fireEvent.mouseDown(canvas, { button: 0, clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 5100, clientY: 5100 });
      fireEvent.mouseUp(canvas);

      const getContextMock = HTMLCanvasElement.prototype.getContext as jest.Mock;
      const mockCtx = getContextMock.mock.results[getContextMock.mock.results.length - 1]?.value;
      // Max clamped pan is width * 0.5 = 300
      expect(mockCtx.translate).toHaveBeenCalledWith(300, 300);
    });

    it("resets zoom and pan when mapName prop changes", () => {
      const { rerender } = render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
          mapName="Ascent"
        />
      );

      const canvas = screen.getByTestId("minimap-canvas");
      const zoomInBtn = screen.getByTestId("zoom-in-btn");

      // Zoom in on Ascent
      fireEvent.click(zoomInBtn);
      expect(canvas).toHaveClass("cursor-grab");

      // Re-render with new map
      rerender(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
          mapName="Lotus"
        />
      );

      // Zoom should reset back to 1.0x with cursor-crosshair
      expect(canvas).toHaveClass("cursor-crosshair");
    });

    it("scales mouse drag delta proportionally when canvas client dimensions differ from internal dimensions", () => {
      render(
        <MinimapReplay
          currentRound={1}
          totalRounds={24}
          mistakes={mockMistakes}
          kills={mockKills}
          onRoundChange={jest.fn()}
        />
      );

      const canvas = screen.getByTestId("minimap-canvas") as HTMLCanvasElement;
      const zoomInBtn = screen.getByTestId("zoom-in-btn");
      fireEvent.click(zoomInBtn); // zoom = 1.5

      // Mock getBoundingClientRect so canvas is 300x300 on screen, but 600x600 internally
      jest.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
        width: 300,
        height: 300,
        top: 0,
        left: 0,
        right: 300,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Drag 30 screen pixels -> with 600/300 scale factor, pan should translate by 60 canvas units
      fireEvent.mouseDown(canvas, { button: 0, clientX: 50, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 80, clientY: 80 });
      fireEvent.mouseUp(canvas);

      const getContextMock = HTMLCanvasElement.prototype.getContext as jest.Mock;
      const mockCtx = getContextMock.mock.results[getContextMock.mock.results.length - 1]?.value;
      expect(mockCtx.translate).toHaveBeenCalledWith(60, 60);
    });
  });
});

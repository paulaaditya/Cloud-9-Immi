import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerReportCards } from "./PlayerReportCards";
import { PlayerReportCard, VLRPlayerStat } from "@/types/api";

const mockReports: PlayerReportCard[] = [
  {
    player_id: "OXY",
    player_name: "OXY",
    character_name: "Jett",
    mistake_count: 3,
    cumulative_xrw_tax: -0.947,
    primary_vulnerability: "UNTRADED_FIRST_DEATH",
    actionable_summary: "OXY: Establish buddy spacing and don't dry-peek before support utility.",
  },
  {
    player_id: "vanity",
    player_name: "vanity",
    character_name: "Omen",
    mistake_count: 1,
    cumulative_xrw_tax: -0.245,
    primary_vulnerability: "ISOLATED_DUEL",
    actionable_summary: "vanity: Anchor crossfire with site partner before initiating duel.",
  },
  {
    player_id: "12345",
    player_name: "Derrek",
    character_name: "Sova",
    mistake_count: 2,
    cumulative_xrw_tax: -0.320,
    primary_vulnerability: "UTILITY_DELAY",
    actionable_summary: "Derrek: Deploy vision denial utility before contesting lines of sight.",
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

  describe("Team Grouping, Sorting & Flaws Breakdown", () => {
    const multiTeamReports: PlayerReportCard[] = [
      {
        player_id: "OXY",
        player_name: "OXY",
        character_name: "Jett",
        team_name: "Cloud9",
        mistake_count: 2,
        cumulative_xrw_tax: -0.632,
        primary_vulnerability: "UNTRADED_FIRST_DEATH",
        actionable_summary: "Hold crossfire.",
        mistakes: [
          {
            mistake_type: "UNTRADED_FIRST_DEATH",
            player_id: "OXY",
            player_name: "OXY",
            character_name: "Jett",
            team_name: "Cloud9",
            round_number: 1,
            occurred_at: "2026-11-19T10:00:15Z",
            win_prob_delta: -0.312,
            description: "Died untraded in opening duel.",
            coaching_fix: "Stay within 6m buddy spacing.",
          },
          {
            mistake_type: "ISOLATED_DUEL",
            player_id: "OXY",
            player_name: "OXY",
            character_name: "Jett",
            team_name: "Cloud9",
            round_number: 7,
            occurred_at: "2026-11-19T10:06:12Z",
            win_prob_delta: -0.320,
            description: "Dry peeked sniper lane.",
            coaching_fix: "Request drone before contesting.",
          },
        ],
      },
      {
        player_id: "crashies",
        player_name: "crashies",
        character_name: "Sova",
        team_name: "NRG",
        mistake_count: 1,
        cumulative_xrw_tax: -0.235,
        primary_vulnerability: "ISOLATED_DUEL",
        actionable_summary: "Conceal reload timing.",
        mistakes: [
          {
            mistake_type: "ISOLATED_DUEL",
            player_id: "crashies",
            player_name: "crashies",
            character_name: "Sova",
            team_name: "NRG",
            round_number: 6,
            occurred_at: "2026-11-19T10:05:22Z",
            win_prob_delta: -0.235,
            description: "Caught reloading in B Main without cover.",
            coaching_fix: "Conceal reload behind utility.",
          },
        ],
      },
    ];

    it("groups player cards by team and displays team metrics header", () => {
      render(<PlayerReportCards reports={multiTeamReports} />);

      // Team sections
      expect(screen.getByTestId("team-section-Cloud9")).toBeInTheDocument();
      expect(screen.getByTestId("team-section-NRG")).toBeInTheDocument();

      // Team headers metrics
      expect(screen.getByTestId("team-flaws-Cloud9")).toHaveTextContent("2 Flaws");
      expect(screen.getByTestId("team-tax-Cloud9")).toHaveTextContent("-63.2% xRW Sum");

      expect(screen.getByTestId("team-flaws-NRG")).toHaveTextContent("1 Flaws");
      expect(screen.getByTestId("team-tax-NRG")).toHaveTextContent("-23.5% xRW Sum");
    });

    it("toggles between By Team grouping and All Players flat view", () => {
      render(<PlayerReportCards reports={multiTeamReports} />);

      // Default is By Team
      expect(screen.getByTestId("team-section-Cloud9")).toBeInTheDocument();

      // Toggle to All Players
      fireEvent.click(screen.getByTestId("group-all-players-btn"));
      expect(screen.queryByTestId("team-section-Cloud9")).not.toBeInTheDocument();
      expect(screen.getByTestId("player-card-OXY")).toBeInTheDocument();
      expect(screen.getByTestId("player-card-crashies")).toBeInTheDocument();

      // Toggle back to By Team
      fireEvent.click(screen.getByTestId("group-by-team-btn"));
      expect(screen.getByTestId("team-section-Cloud9")).toBeInTheDocument();
    });

    it("filters player cards using team filter pills", () => {
      render(<PlayerReportCards reports={multiTeamReports} />);

      // Click NRG team filter pill
      fireEvent.click(screen.getByTestId("team-filter-pill-NRG"));

      expect(screen.queryByTestId("player-card-OXY")).not.toBeInTheDocument();
      expect(screen.getByTestId("player-card-crashies")).toBeInTheDocument();

      // Click All Teams filter pill
      fireEvent.click(screen.getByTestId("team-filter-pill-all"));
      expect(screen.getByTestId("player-card-OXY")).toBeInTheDocument();
      expect(screen.getByTestId("player-card-crashies")).toBeInTheDocument();
    });

    it("lists all mistakes for each player with round, type, tax, description, and coaching fix", () => {
      render(<PlayerReportCards reports={multiTeamReports} />);

      // OXY has 2 mistakes
      expect(screen.getByText("Flaws Breakdown (2)")).toBeInTheDocument();
      expect(screen.getByText("Died untraded in opening duel.")).toBeInTheDocument();
      expect(screen.getByText("Stay within 6m buddy spacing.")).toBeInTheDocument();
      expect(screen.getByText("Dry peeked sniper lane.")).toBeInTheDocument();
      expect(screen.getByText("Request drone before contesting.")).toBeInTheDocument();

      // Expand/collapse toggle
      const toggleBtn = screen.getByTestId("toggle-flaws-OXY");
      expect(toggleBtn).toHaveTextContent("Collapse");

      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveTextContent("Show All (2)");
      expect(screen.queryByText("Died untraded in opening duel.")).not.toBeInTheDocument();

      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveTextContent("Collapse");
      expect(screen.getByText("Died untraded in opening duel.")).toBeInTheDocument();
    });
  });

  it("renders individual player stats (ACS, ADR, FK/FD) when available", () => {
    const cards: PlayerReportCard[] = [
      {
        player_id: "OXY",
        player_name: "OXY",
        character_name: "Jett",
        team_name: "Cloud9",
        mistake_count: 2,
        cumulative_xrw_tax: -0.42,
        primary_vulnerability: "UNTRADED_FIRST_DEATH",
        actionable_summary: "OXY: Improve spacing",
        mistakes: [],
      },
    ];
    const playerStats: Record<string, VLRPlayerStat> = {
      OXY: {
        player: "OXY",
        agent: "Jett",
        k: 22,
        d: 14,
        a: 5,
        acs: 280,
        adr: 182,
        fk: 5,
        fd: 2,
      },
    };
    render(<PlayerReportCards reports={cards} playerStats={playerStats} />);
    expect(screen.getByText(/280 ACS/i)).toBeInTheDocument();
    expect(screen.getByText(/5 FK \/ 2 FD/i)).toBeInTheDocument();
  });
});

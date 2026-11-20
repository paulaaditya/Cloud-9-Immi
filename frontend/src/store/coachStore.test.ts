import { useCoachStore } from "./coachStore";
import { RoundCoachingInsight } from "@/types/api";

describe("coachStore VLR extensions", () => {
  beforeEach(() => {
    useCoachStore.setState({
      selectedSeriesId: "2748743",
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

  it("manages matchId and selectedRoundInsight correctly", () => {
    const store = useCoachStore.getState();
    store.setMatchId("vlr-773435");
    expect(useCoachStore.getState().selectedSeriesId).toBe("vlr-773435");

    const sampleInsight: RoundCoachingInsight = {
      round_number: 1,
      narrative: "Round 1 won by Cloud9",
      win_prob_tax: -0.15,
      tactical_directive: "Hold crossfire",
      recommended_drill: {
        drill_name: "Trade drill",
        target_players: ["OXY"],
        drill_objective: "Trade fast",
        setup_steps: [],
        success_criterion: "100%",
      },
    };
    store.setSelectedRoundInsight(sampleInsight);
    expect(useCoachStore.getState().selectedRoundInsight?.round_number).toBe(1);
    expect(useCoachStore.getState().selectedRoundInsight?.tactical_directive).toBe("Hold crossfire");
  });

  it("resets selectedRoundInsight when matchId changes", () => {
    const store = useCoachStore.getState();
    const sampleInsight: RoundCoachingInsight = {
      round_number: 2,
      narrative: "Round 2 lost by Cloud9",
      win_prob_tax: -0.22,
      tactical_directive: "Utility support",
      recommended_drill: {
        drill_name: "Flash timing",
        target_players: ["Xeppaa"],
        drill_objective: "Pop flash on contact",
        setup_steps: [],
        success_criterion: "80%",
      },
    };
    store.setSelectedRoundInsight(sampleInsight);
    expect(useCoachStore.getState().selectedRoundInsight).not.toBeNull();

    store.setMatchId("vlr-99999");
    expect(useCoachStore.getState().selectedSeriesId).toBe("vlr-99999");
    expect(useCoachStore.getState().selectedRoundInsight).toBeNull();
  });
});

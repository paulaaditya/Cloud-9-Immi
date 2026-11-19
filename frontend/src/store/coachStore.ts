import { create } from "zustand";
import { AttributedMistake } from "@/types/api";

interface CoachStoreState {
  selectedSeriesId: string;
  currentRound: number;
  totalRounds: number;
  selectedMistake: AttributedMistake | null;
  setSelectedSeriesId: (seriesId: string) => void;
  setCurrentRound: (round: number) => void;
  setTotalRounds: (total: number) => void;
  setSelectedMistake: (mistake: AttributedMistake | null) => void;
  nextRound: () => void;
  prevRound: () => void;
}

export const useCoachStore = create<CoachStoreState>((set) => ({
  selectedSeriesId: "2748743",
  currentRound: 1,
  totalRounds: 24,
  selectedMistake: null,
  setSelectedSeriesId: (seriesId: string) => set({ selectedSeriesId: seriesId }),
  setCurrentRound: (round: number) => set({ currentRound: round }),
  setTotalRounds: (total: number) => set({ totalRounds: total }),
  setSelectedMistake: (mistake: AttributedMistake | null) =>
    set({ selectedMistake: mistake }),
  nextRound: () =>
    set((state) => ({
      currentRound: Math.min(state.currentRound + 1, state.totalRounds),
    })),
  prevRound: () =>
    set((state) => ({
      currentRound: Math.max(state.currentRound - 1, 1),
    })),
}));

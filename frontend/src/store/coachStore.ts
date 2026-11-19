import { create } from "zustand";
import { AttributedMistake } from "@/types/api";

interface CoachStoreState {
  selectedSeriesId: string;
  currentGameIndex: number;
  selectedPlayerId: string | null;
  selectedMistakeId: string | null;
  isPlaying: boolean;
  currentRound: number;
  totalRounds: number;
  selectedMistake: AttributedMistake | null;

  setSeriesId: (seriesId: string) => void;
  setSelectedSeriesId: (seriesId: string) => void;
  setGameIndex: (index: number) => void;
  setSelectedPlayerId: (playerId: string | null) => void;
  setSelectedMistakeId: (mistakeId: string | null) => void;
  togglePlay: () => void;
  stepRound: (delta?: number) => void;
  setCurrentRound: (round: number) => void;
  setTotalRounds: (total: number) => void;
  setSelectedMistake: (mistake: AttributedMistake | null) => void;
  nextRound: () => void;
  prevRound: () => void;
}

export const useCoachStore = create<CoachStoreState>((set) => ({
  selectedSeriesId: "2748743",
  currentGameIndex: 0,
  selectedPlayerId: null,
  selectedMistakeId: null,
  isPlaying: false,
  currentRound: 1,
  totalRounds: 24,
  selectedMistake: null,

  setSeriesId: (seriesId: string) =>
    set({
      selectedSeriesId: seriesId,
      currentGameIndex: 0,
      currentRound: 1,
      selectedPlayerId: null,
      selectedMistakeId: null,
      selectedMistake: null,
    }),
  setSelectedSeriesId: (seriesId: string) => set({ selectedSeriesId: seriesId }),
  setGameIndex: (index: number) =>
    set({
      currentGameIndex: index,
      currentRound: 1,
      selectedMistake: null,
      selectedMistakeId: null,
    }),
  setSelectedPlayerId: (playerId: string | null) =>
    set({ selectedPlayerId: playerId }),
  setSelectedMistakeId: (mistakeId: string | null) =>
    set({ selectedMistakeId: mistakeId }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  stepRound: (delta: number = 1) =>
    set((state) => {
      const next = state.currentRound + delta;
      const bounded = next > state.totalRounds ? 1 : next < 1 ? state.totalRounds : next;
      return { currentRound: bounded };
    }),
  setCurrentRound: (round: number) => set({ currentRound: round }),
  setTotalRounds: (total: number) => set({ totalRounds: total }),
  setSelectedMistake: (mistake: AttributedMistake | null) =>
    set({
      selectedMistake: mistake,
      selectedMistakeId: mistake ? `${mistake.player_id}-${mistake.occurred_at}` : null,
    }),
  nextRound: () =>
    set((state) => ({
      currentRound: Math.min(state.currentRound + 1, state.totalRounds),
    })),
  prevRound: () =>
    set((state) => ({
      currentRound: Math.max(state.currentRound - 1, 1),
    })),
}));

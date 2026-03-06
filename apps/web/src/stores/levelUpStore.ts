import { create } from "zustand";

interface LevelUpState {
  show: boolean;
  level: number;
  levelName: string;
  showToast: (level: number, levelName: string) => void;
  hideToast: () => void;
}

export const useLevelUpStore = create<LevelUpState>((set) => ({
  show: false,
  level: 1,
  levelName: "",
  showToast: (level, levelName) => set({ show: true, level, levelName }),
  hideToast: () => set({ show: false }),
}));

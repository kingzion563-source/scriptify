import { create } from "zustand";

const DEFAULT_DURATION_MS = 4000;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

interface ToastState {
  message: string | null;
  show: (message: string, duration?: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,

  show: (message: string, duration: number = DEFAULT_DURATION_MS) => {
    if (dismissTimer) clearTimeout(dismissTimer);
    set({ message });
    dismissTimer = setTimeout(() => {
      set({ message: null });
      dismissTimer = null;
    }, duration);
  },
}));

/** Single source of truth for toasts. Returns show(message, duration?). */
export function useToast(): (message: string, duration?: number) => void {
  return useToastStore((s) => s.show);
}

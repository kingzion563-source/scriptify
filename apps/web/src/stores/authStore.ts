import { create } from "zustand";
import { apiFetch } from "@/lib/api";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  isPro: boolean;
  level: number;
  avatarUrl: string | null;
  followingCount?: number;
}

interface AuthState {
  user: AuthUser | null;
  isHydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (params: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    turnstileToken?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isHydrated: false,

  setUser: (user) => set({ user }),

  login: async (email, password, rememberMe) => {
    const data = await apiFetch<{ user: AuthUser }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, rememberMe: rememberMe ?? false }),
    });
    set({ user: data.user });
  },

  register: async (params) => {
    const data = await apiFetch<{ user: AuthUser }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(params),
    });
    set({ user: data.user });
  },

  logout: async () => {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      set({ user: null });
    }
  },

  refresh: async () => {
    try {
      const data = await apiFetch<{ user: AuthUser }>("/api/v1/auth/refresh", {
        method: "POST",
      });
      set({ user: data.user });
    } catch {
      set({ user: null });
    } finally {
      set({ isHydrated: true });
    }
  },
}));

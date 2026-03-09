import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
  clearAuth: () => void;
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isHydrated: false,

      setUser: (user) => set({ user }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null, isHydrated: true }),

      login: async (email, password, rememberMe) => {
        const data = await apiFetch<{
          user: AuthUser;
          accessToken?: string;
          refreshToken?: string;
        }>("/api/v1/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password, rememberMe: rememberMe ?? false }),
        });
        set({
          user: data.user,
          accessToken: data.accessToken ?? null,
          refreshToken: data.refreshToken ?? null,
        });
      },

      register: async (params) => {
        const data = await apiFetch<{
          user: AuthUser;
          accessToken?: string;
          refreshToken?: string;
        }>("/api/v1/auth/register", {
          method: "POST",
          body: JSON.stringify(params),
        });
        set({
          user: data.user,
          accessToken: data.accessToken ?? null,
          refreshToken: data.refreshToken ?? null,
        });
      },

      logout: async () => {
        try {
          await apiFetch("/api/v1/auth/logout", { method: "POST" });
        } finally {
          set({ user: null, accessToken: null, refreshToken: null });
        }
      },

      refresh: async () => {
        const refreshToken = get().refreshToken;
        if (!refreshToken) {
          set({ user: null, isHydrated: true });
          return;
        }
        try {
          const data = await apiFetch<{
            user: AuthUser;
            accessToken?: string;
            refreshToken?: string;
          }>("/api/v1/auth/refresh", {
            method: "POST",
            body: JSON.stringify({ refreshToken }),
          });
          set({
            user: data.user,
            accessToken: data.accessToken ?? null,
            refreshToken: data.refreshToken ?? null,
          });
        } catch {
          set({ user: null, accessToken: null, refreshToken: null });
        } finally {
          set({ isHydrated: true });
        }
      },
    }),
    { name: "scriptify-auth" }
  )
);

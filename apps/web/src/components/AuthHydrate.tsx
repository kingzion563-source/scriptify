"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import type { AuthUser } from "@/stores/authStore";
import { getApiUrl } from "@/lib/api";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("scriptify-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string | null } };
    const token = parsed?.state?.accessToken;
    return token ?? null;
  } catch {
    return null;
  }
}

/**
 * On mount, if a token exists in localStorage, call GET /me with Bearer to rehydrate user.
 * On 401, clear auth and stop (no refresh loop).
 */
export function AuthHydrate() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const token = getStoredToken();
    if (!token) {
      useAuthStore.setState({ isHydrated: true });
      return;
    }

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(getApiUrl("/api/v1/users/me"), {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          signal: controller.signal,
        });
        if (res.status === 401) {
          clearAuth();
          useAuthStore.setState({ isHydrated: true });
          return;
        }
        if (!res.ok) {
          clearAuth();
          useAuthStore.setState({ isHydrated: true });
          return;
        }
        const data = (await res.json()) as { user: AuthUser };
        if (data?.user) {
          setUser(data.user);
          setTokens(token, useAuthStore.getState().refreshToken);
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      } finally {
        useAuthStore.setState({ isHydrated: true });
      }
    })();
    return () => controller.abort();
  }, [clearAuth, setUser, setTokens]);
  return null;
}

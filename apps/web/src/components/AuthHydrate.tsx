"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

/**
 * On mount, attempt to restore session from refresh cookie.
 */
export function AuthHydrate() {
  const refresh = useAuthStore((s) => s.refresh);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return null;
}

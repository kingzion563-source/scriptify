"use client";

import { useAuthStore } from "@/stores/authStore";

export function HydrationGate({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((s) => s.isHydrated);

  if (!isHydrated) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-solid border-transparent"
          style={{ borderTopColor: "black" }}
        />
      </div>
    );
  }

  return <>{children}</>;
}

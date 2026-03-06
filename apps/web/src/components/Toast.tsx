"use client";

import { useToastStore } from "@/lib/useToast";

export function Toast() {
  const message = useToastStore((s) => s.message);

  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "var(--status-bg-verified)",
        color: "var(--status-verified)",
        border: "1px solid var(--status-verified)",
        borderRadius: 6,
        padding: "10px 16px",
        fontSize: 13,
        maxWidth: "calc(100vw - 32px)",
        boxSizing: "border-box",
      }}
    >
      {message}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Action =
  | { label: string; href: string }
  | { label: string; onClick: () => void };

/** countdownTo: Unix timestamp in seconds (e.g. from X-RateLimit-Reset). */
export function ErrorScreen({
  heading,
  action,
  countdownTo,
}: {
  heading: string;
  action: Action;
  countdownTo?: number;
}) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    countdownTo ? Math.max(0, countdownTo - Math.floor(Date.now() / 1000)) : null
  );

  useEffect(() => {
    if (!countdownTo) return;
    const id = setInterval(() => {
      setSecondsLeft(Math.max(0, countdownTo - Math.floor(Date.now() / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [countdownTo]);

  return (
    <div
      style={{
        minHeight: "calc(100vh - 56px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <h1
          style={{
            margin: "0 0 16px",
            fontSize: 26,
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.2,
          }}
        >
          {heading}
        </h1>
        {secondsLeft != null && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>
            Try again in {secondsLeft}s
          </p>
        )}
        {"href" in action ? (
          <Link
            href={action.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 160,
              height: 44,
              borderRadius: "var(--radius-md)",
              background: "var(--accent)",
              color: "var(--accent-text)",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            style={{
              minWidth: 160,
              height: 44,
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--accent)",
              color: "var(--accent-text)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}


"use client";

import { getLevelBadgeColor } from "@/lib/levels";

export function LevelBadge({ level }: { level: number }) {
  const color = getLevelBadgeColor(level);
  return (
    <span
      style={{
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 10,
        fontWeight: 500,
        color: "var(--text-inverse)",
        backgroundColor: color,
        borderRadius: 3,
        padding: "1px 5px",
      }}
    >
      Lv.{level}
    </span>
  );
}

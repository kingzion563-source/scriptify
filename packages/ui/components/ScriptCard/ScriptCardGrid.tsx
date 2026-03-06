"use client";

import { type ReactNode } from "react";

export interface ScriptCardGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Card grid layout: CSS grid, repeat(auto-fill, minmax(280px, 1fr)), gap 16px, padding 20px.
 * Use with ScriptCard and ScriptCardSkeleton children.
 */
export function ScriptCardGrid({ children, className = "" }: ScriptCardGridProps) {
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 16,
        padding: 20,
      }}
    >
      {children}
    </div>
  );
}

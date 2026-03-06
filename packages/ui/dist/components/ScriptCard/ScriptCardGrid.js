"use client";
import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Card grid layout: CSS grid, repeat(auto-fill, minmax(280px, 1fr)), gap 16px, padding 20px.
 * Use with ScriptCard and ScriptCardSkeleton children.
 */
export function ScriptCardGrid({ children, className = "" }) {
    return (_jsx("div", { className: className, style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
            padding: 20,
        }, children: children }));
}

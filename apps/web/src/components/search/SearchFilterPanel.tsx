"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

const EXECUTORS = [
  "Synapse Z", "Wave", "Solara", "Fluxus", "Delta",
  "Krnl", "Xeno", "Arceus X", "Hydrogen", "Codex",
];

const STATUSES = ["VERIFIED", "PATCHED", "TESTING"] as const;
const PLATFORMS = ["PC", "MOBILE", "BOTH"] as const;
const SORTS = [
  { value: "recent", label: "Recent" },
  { value: "most-copied", label: "Most Copied" },
  { value: "top-rated", label: "Top Rated" },
  { value: "ai-score", label: "AI Score" },
] as const;

interface Props {
  status: string[];
  onToggleStatus: (v: string) => void;
  executor: string[];
  onToggleExecutor: (v: string) => void;
  platform: string;
  onPlatformChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
  hasAiSummary: boolean;
  onHasAiSummaryChange: (v: boolean) => void;
  noKeyRequired: boolean;
  onNoKeyRequiredChange: (v: boolean) => void;
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-border pb-3 mb-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-primary font-semibold mb-2 hover:text-primary transition-colors"
        style={{ fontSize: "12px", letterSpacing: "0.04em", textTransform: "uppercase" }}
      >
        {title}
        <ChevronDown
          className="h-3.5 w-3.5 text-muted transition-transform"
          style={{ transform: open ? "rotate(0)" : "rotate(-90deg)" }}
          strokeWidth={2}
        />
      </button>
      {open && <div className="flex flex-col gap-1.5">{children}</div>}
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className="flex items-center gap-2 cursor-pointer text-secondary hover:text-primary transition-colors"
      style={{ fontSize: "13px" }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 rounded-sm border border-border accent-primary"
      />
      {label}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className="flex items-center justify-between cursor-pointer text-secondary hover:text-primary transition-colors"
      style={{ fontSize: "13px" }}
    >
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-5 w-9 rounded-full transition-colors"
        style={{
          backgroundColor: checked ? "var(--accent)" : "var(--border-strong)",
        }}
      >
        <span
          className="block h-3.5 w-3.5 rounded-full bg-white transition-transform"
          style={{
            transform: checked ? "translateX(17px)" : "translateX(3px)",
            marginTop: "3px",
          }}
        />
      </button>
    </label>
  );
}

export function SearchFilterPanel({
  status,
  onToggleStatus,
  executor,
  onToggleExecutor,
  platform,
  onPlatformChange,
  sort,
  onSortChange,
  hasAiSummary,
  onHasAiSummaryChange,
  noKeyRequired,
  onNoKeyRequiredChange,
}: Props) {
  return (
    <aside className="w-[240px] shrink-0">
      <FilterGroup title="Status">
        {STATUSES.map((s) => (
          <Checkbox
            key={s}
            label={s.charAt(0) + s.slice(1).toLowerCase()}
            checked={status.includes(s)}
            onChange={() => onToggleStatus(s)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Executor">
        {EXECUTORS.map((e) => (
          <Checkbox
            key={e}
            label={e}
            checked={executor.includes(e)}
            onChange={() => onToggleExecutor(e)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Platform">
        {PLATFORMS.map((p) => (
          <Checkbox
            key={p}
            label={p === "BOTH" ? "PC & Mobile" : p}
            checked={platform === p}
            onChange={() => onPlatformChange(platform === p ? "" : p)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Sort">
        {SORTS.map((s) => (
          <label
            key={s.value}
            className="flex items-center gap-2 cursor-pointer text-secondary hover:text-primary transition-colors"
            style={{ fontSize: "13px" }}
          >
            <input
              type="radio"
              name="sort"
              value={s.value}
              checked={sort === s.value}
              onChange={() => onSortChange(s.value)}
              className="h-3.5 w-3.5 accent-primary"
            />
            {s.label}
          </label>
        ))}
      </FilterGroup>

      <div className="flex flex-col gap-3 pb-3">
        <Toggle
          label="Has AI Summary"
          checked={hasAiSummary}
          onChange={onHasAiSummaryChange}
        />
        <Toggle
          label="No Key Required"
          checked={noKeyRequired}
          onChange={onNoKeyRequiredChange}
        />
      </div>
    </aside>
  );
}

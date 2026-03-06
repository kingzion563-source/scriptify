"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/lib/useDebounce";
import { apiFetch } from "@/lib/api";

interface ScriptSuggestion {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  status: string;
  gameName: string | null;
}

interface GameSuggestion {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string | null;
  scriptCount: number;
}

interface SuggestionsResponse {
  scripts: ScriptSuggestion[];
  games: GameSuggestion[];
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  verified: { bg: "var(--status-bg-verified)", color: "var(--status-verified)" },
  patched: { bg: "var(--status-bg-patched)", color: "var(--status-patched)" },
  testing: { bg: "var(--status-bg-testing)", color: "var(--status-testing)" },
};

export function NavbarSearchDropdown() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [data, setData] = useState<SuggestionsResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 150);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setData(null);
      setActiveIndex(-1);
      return;
    }
    let cancelled = false;
    apiFetch<SuggestionsResponse>(
      `/api/v1/search/suggestions?q=${encodeURIComponent(debouncedQuery)}`
    )
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setActiveIndex(-1);
        }
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const totalItems = (data?.scripts.length ?? 0) + (data?.games.length ?? 0);
  const showDropdown = focused && query.trim().length > 0 && data !== null;

  const navigate = useCallback(
    (index: number) => {
      if (!data) return;
      const scriptLen = data.scripts.length;
      if (index < scriptLen) {
        const s = data.scripts[index];
        router.push(`/script/${s.slug}`);
      } else {
        const g = data.games[index - scriptLen];
        router.push(`/search?game=${g.slug}`);
      }
      setQuery("");
      setData(null);
      inputRef.current?.blur();
    },
    [data, router]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || totalItems === 0) {
      if (e.key === "Enter" && query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        inputRef.current?.blur();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % totalItems);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? totalItems - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) {
        navigate(activeIndex);
      } else if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        inputRef.current?.blur();
      }
    } else if (e.key === "Escape") {
      setData(null);
      inputRef.current?.blur();
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  let runningIndex = 0;

  return (
    <div ref={containerRef} className="relative flex items-center w-full">
      <svg
        className="absolute left-3 h-4 w-4 shrink-0 pointer-events-none"
        style={{ color: "var(--text-muted)" }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        placeholder="Search scripts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={handleKeyDown}
        className="w-full h-9 pl-10 pr-4 rounded-md border border-border bg-surface-2 text-base placeholder:text-muted focus:outline-none focus:border-primary focus:bg-surface transition-colors duration-100"
        style={{ fontSize: "13px" }}
        aria-label="Search scripts"
        autoComplete="off"
      />
      {showDropdown && (
        <div
          className="absolute left-0 right-0"
          style={{
            top: "100%",
            marginTop: 4,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            zIndex: 200,
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {data.scripts.length > 0 && (
            <div>
              <p
                className="px-3 pt-2 pb-1 text-muted uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                }}
              >
                Scripts
              </p>
              {data.scripts.map((s) => {
                const idx = runningIndex++;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors"
                    style={{
                      fontSize: 13,
                      background:
                        idx === activeIndex ? "var(--bg-surface-2)" : "transparent",
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => navigate(idx)}
                  >
                    {s.coverUrl ? (
                      <img
                        src={s.coverUrl}
                        alt=""
                        className="shrink-0 rounded object-cover"
                        style={{ width: 40, height: 27 }}
                      />
                    ) : (
                      <div
                        className="shrink-0 rounded"
                        style={{
                          width: 40,
                          height: 27,
                          background: "var(--bg-surface-2)",
                        }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-primary truncate font-medium">
                        {s.title}
                      </p>
                      {s.gameName && (
                        <p className="text-muted truncate" style={{ fontSize: 11 }}>
                          {s.gameName}
                        </p>
                      )}
                    </div>
                    <StatusMini status={s.status} />
                  </button>
                );
              })}
            </div>
          )}
          {data.scripts.length > 0 && data.games.length > 0 && (
            <div className="mx-3 h-px bg-border" />
          )}
          {data.games.length > 0 && (
            <div>
              <p
                className="px-3 pt-2 pb-1 text-muted uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                }}
              >
                Games
              </p>
              {data.games.map((g) => {
                const idx = runningIndex++;
                return (
                  <button
                    key={g.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors"
                    style={{
                      fontSize: 13,
                      background:
                        idx === activeIndex ? "var(--bg-surface-2)" : "transparent",
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => navigate(idx)}
                  >
                    {g.thumbnailUrl ? (
                      <img
                        src={g.thumbnailUrl}
                        alt=""
                        className="shrink-0 rounded object-cover"
                        style={{ width: 40, height: 27 }}
                      />
                    ) : (
                      <div
                        className="shrink-0 rounded"
                        style={{
                          width: 40,
                          height: 27,
                          background: "var(--bg-surface-2)",
                        }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-primary truncate font-medium">{g.name}</p>
                      <p className="text-muted truncate" style={{ fontSize: 11 }}>
                        {g.scriptCount} scripts
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {data.scripts.length === 0 && data.games.length === 0 && (
            <p className="px-3 py-4 text-center text-muted" style={{ fontSize: 13 }}>
              No results
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatusMini({ status }: { status: string }) {
  const s = status.toLowerCase();
  const st = STATUS_COLORS[s] ?? STATUS_COLORS.testing;
  return (
    <span
      className="shrink-0"
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "2px 6px",
        borderRadius: 4,
        background: st.bg,
        color: st.color,
      }}
    >
      {status}
    </span>
  );
}

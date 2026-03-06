"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "@/lib/useDebounce";
import { apiFetch } from "@/lib/api";
import { SearchResultGrid } from "@/components/search/SearchResultGrid";

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}

interface SearchHit {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  status: string;
  gameName: string | null;
  gameSlug: string | null;
  authorUsername: string;
  authorAvatar: string | null;
  isAuthorPro: boolean;
  likeCount: number;
  viewCount: number;
  copyCount: number;
  tags: string[];
  aiScore: number | null;
  isTrending: boolean;
  createdAt: string;
}

const EXECUTORS = [
  "Synapse Z", "Wave", "Solara", "Fluxus", "Delta",
  "Krnl", "Xeno", "Arceus X", "Hydrogen", "Codex",
];

const STATUSES = ["VERIFIED", "PATCHED", "TESTING"] as const;
const SORT_OPTIONS = [
  { value: "recent", label: "Recent" },
  { value: "most-copied", label: "Most Copied" },
  { value: "top-rated", label: "Top Rated" },
] as const;

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [game, setGame] = useState(searchParams.get("game") ?? "");
  const [tag, setTag] = useState(searchParams.get("tag") ?? "");
  const [status, setStatus] = useState<string[]>(
    searchParams.get("status")?.split(",").filter(Boolean) ?? []
  );
  const [executor, setExecutor] = useState<string[]>(
    searchParams.get("executor")?.split(",").filter(Boolean) ?? []
  );
  const [platform, setPlatform] = useState(searchParams.get("platform") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "recent");
  const [hasAiSummary, setHasAiSummary] = useState(searchParams.get("hasAiSummary") === "true");
  const [noKeyRequired, setNoKeyRequired] = useState(searchParams.get("noKeyRequired") === "true");

  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelGame, setPanelGame] = useState(game);
  const [panelSort, setPanelSort] = useState(sort);
  const [panelStatus, setPanelStatus] = useState<string[]>(status);
  const [panelExecutor, setPanelExecutor] = useState<string[]>(executor);

  const debouncedQuery = useDebounce(query, 150);

  useEffect(() => {
    setTag(searchParams.get("tag") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (panelOpen) {
      setPanelGame(game);
      setPanelSort(sort);
      setPanelStatus([...status]);
      setPanelExecutor([...executor]);
    }
  }, [panelOpen, game, sort, status, executor]);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    if (debouncedQuery) p.set("q", debouncedQuery);
    if (game) p.set("game", game);
    if (tag) p.set("tag", tag);
    if (status.length) p.set("status", status.join(","));
    if (executor.length) p.set("executor", executor.join(","));
    if (platform) p.set("platform", platform);
    if (sort !== "recent") p.set("sort", sort);
    if (hasAiSummary) p.set("hasAiSummary", "true");
    if (noKeyRequired) p.set("noKeyRequired", "true");
    return p;
  }, [debouncedQuery, game, tag, status, executor, platform, sort, hasAiSummary, noKeyRequired]);

  useEffect(() => {
    const params = buildParams();
    router.replace(`/search${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });

    let cancelled = false;
    setLoading(true);
    setSearchError(false);
    apiFetch<{ hits: SearchHit[]; total: number }>(
      `/api/v1/search?${params.toString()}`
    )
      .then((data) => {
        if (cancelled) return;
        setHits(data.hits);
        setTotal(data.total);
      })
      .catch(() => {
        if (cancelled) return;
        setHits([]);
        setTotal(0);
        setSearchError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [buildParams, router, retryKey]);

  function toggleArrayFilter(
    arr: string[],
    setter: (v: string[]) => void,
    value: string
  ) {
    setter(
      arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
    );
  }

  function handleApplyFilters() {
    setGame(panelGame);
    setSort(panelSort);
    setStatus([...panelStatus]);
    setExecutor([...panelExecutor]);
    setPanelOpen(false);
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
    else router.push("/search");
  };

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: 20,
      }}
    >
      {/* Search bar row: bar + filter button */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 8,
          maxWidth: 860 + 8 + 40,
          margin: "0 auto 20px",
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          className="focus-within:border-[#111111]"
          style={{
            flex: 1,
            minWidth: 0,
            position: "relative",
            display: "flex",
            alignItems: "stretch",
            border: "1px solid #E4E4E4",
            borderRadius: 8,
            background: "white",
            overflow: "hidden",
          }}
        >
          <SearchIcon
            size={16}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#999999",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            placeholder="Search scripts, games, tags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 pl-10 pr-4 border-0 bg-transparent text-[#111111] placeholder:text-[#999999] focus:outline-none focus:ring-0"
            style={{
              height: 48,
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0 16px",
              fontSize: 14,
              fontWeight: 500,
              color: "#111111",
              background: "transparent",
              border: "none",
              borderLeft: "1px solid #E4E4E4",
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-label="Open filters"
          style={{
            width: 40,
            height: 48,
            border: "1px solid #E4E4E4",
            borderRadius: 8,
            background: "white",
            color: "#666666",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="hover:bg-[#F5F5F5]"
        >
          <SlidersHorizontal size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Results count + sort */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <p style={{ fontSize: 13, color: "#666666", margin: 0 }}>
          {total} {total === 1 ? "script" : "scripts"} found
        </p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{
            fontSize: 13,
            color: "#111111",
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #E4E4E4",
            background: "white",
            cursor: "pointer",
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Results grid / error / empty */}
      {searchError ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: "24px 0",
          }}
        >
          <p style={{ fontSize: 13, color: "var(--status-patched)", margin: 0 }}>
            Search failed. Please try again.
          </p>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            style={{
              background: "var(--accent)",
              color: "var(--accent-text)",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      ) : (
        <SearchResultGrid hits={hits} loading={loading} total={total} />
      )}

      {/* Overlay */}
      <AnimatePresence>
        {panelOpen && (
          <>
            <motion.div
              key="filter-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.3)",
                zIndex: 199,
              }}
              onClick={() => setPanelOpen(false)}
              aria-hidden
            />
            <motion.aside
              key="filter-panel"
              initial={{ x: 280 }}
              animate={{ x: 0 }}
              exit={{ x: 280 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                width: 280,
                height: "100vh",
                background: "white",
                borderLeft: "1px solid #E4E4E4",
                zIndex: 200,
                padding: 20,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, color: "#111111" }}>
                  Filters
                </span>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  aria-label="Close filters"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: "#666666",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>

              <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Game search */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666666", marginBottom: 6 }}>
                    Game
                  </label>
                  <input
                    type="text"
                    placeholder="Search games..."
                    value={panelGame}
                    onChange={(e) => setPanelGame(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: 13,
                      border: "1px solid #E4E4E4",
                      borderRadius: 6,
                      background: "white",
                      color: "#111111",
                    }}
                  />
                </div>

                {/* Sort */}
                <div>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666666", marginBottom: 8 }}>
                    Sort
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {SORT_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          color: "#333333",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="panelSort"
                          value={opt.value}
                          checked={panelSort === opt.value}
                          onChange={() => setPanelSort(opt.value)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666666", marginBottom: 8 }}>
                    Status
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {STATUSES.map((s) => (
                      <label
                        key={s}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          color: "#333333",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={panelStatus.includes(s)}
                          onChange={() => toggleArrayFilter(panelStatus, setPanelStatus, s)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Executor */}
                <div>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666666", marginBottom: 8 }}>
                    Executor
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {EXECUTORS.map((e) => (
                      <label
                        key={e}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          color: "#333333",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={panelExecutor.includes(e)}
                          onChange={() => toggleArrayFilter(panelExecutor, setPanelExecutor, e)}
                          style={{ accentColor: "var(--accent)" }}
                        />
                        {e}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyFilters}
                style={{
                  width: "100%",
                  height: 44,
                  background: "var(--accent)",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginTop: 20,
                }}
              >
                Apply Filters
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

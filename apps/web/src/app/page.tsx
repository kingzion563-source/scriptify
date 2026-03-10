"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { apiFetch } from "@/lib/api";

const PAGE_SIZE = 16;

interface ScriptHit {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  status: string;
  gameName: string | null;
  authorUsername: string;
  likeCount: number;
  viewCount: number;
  copyCount: number;
  tags: string[];
}

type TabId = "all" | "trending" | "new" | "verified";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "verified", label: "Verified" },
];

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const styles: Record<string, { bg: string; color: string }> = {
    verified: { bg: "var(--status-bg-verified)", color: "var(--status-verified)" },
    patched: { bg: "var(--status-bg-patched)", color: "var(--status-patched)" },
    testing: { bg: "var(--status-bg-testing)", color: "var(--status-testing)" },
  };
  const st = styles[s] ?? styles.testing;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "3px 7px",
        borderRadius: 4,
        background: st.bg,
        color: st.color,
      }}
    >
      {status}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-lg border border-border overflow-hidden"
      style={{ background: "var(--bg-surface-2)", borderRadius: 8 }}
    >
      <div style={{ aspectRatio: "16/9", background: "var(--bg-surface-3)" }} />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3.5 rounded" style={{ width: "80%", background: "var(--bg-surface-3)" }} />
        <div className="h-3 rounded" style={{ width: "50%", background: "var(--bg-surface-3)" }} />
      </div>
    </div>
  );
}

function ScriptCard({ hit }: { hit: ScriptHit }) {
  return (
    <a
      href={`/script/${hit.slug}`}
      className="group flex flex-col rounded-lg border border-border bg-surface overflow-hidden transition-transform hover:-translate-y-0.5"
      style={{ borderRadius: 8 }}
    >
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: "16/9", background: "var(--bg-surface-2)" }}
      >
        {hit.coverUrl && (
          <img
            src={hit.coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
            style={{ transitionDuration: "300ms" }}
          />
        )}
        <div className="absolute top-2 left-2">
          <StatusBadge status={hit.status} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <h3
          className="text-primary font-semibold line-clamp-2"
          style={{ fontSize: 14, lineHeight: 1.35 }}
        >
          {hit.title}
        </h3>
        {hit.gameName && (
          <p className="text-secondary" style={{ fontSize: 12 }}>
            {hit.gameName}
          </p>
        )}
        {hit.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hit.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  padding: "2px 7px",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div
          className="flex items-center justify-between pt-2 mt-auto border-t border-border"
          style={{ fontSize: 11, color: "var(--text-muted)" }}
        >
          <span>{hit.authorUsername}</span>
          <div className="flex gap-2.5">
            <span>{hit.likeCount}</span>
            <span>{hit.viewCount}</span>
            <span>{hit.copyCount}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [scripts, setScripts] = useState<ScriptHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const buildSearchParams = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("page", String(pageNum));
      if (activeTab === "trending") params.set("sort", "most-copied");
      if (activeTab === "new") params.set("sort", "recent");
      if (activeTab === "verified") params.set("status", "VERIFIED");
      return params.toString();
    },
    [activeTab]
  );

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      setError(false);
      try {
        const query = buildSearchParams(pageNum);
        const data = await apiFetch<{ hits: ScriptHit[]; total: number }>(
          `/api/v1/search?${query}`
        );
        if (append) {
          setScripts((prev) => [...prev, ...data.hits]);
        } else {
          setScripts(data.hits);
        }
        setHasMore(data.hits.length === PAGE_SIZE);
      } catch {
        if (!append) {
          setScripts([]);
          setError(true);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildSearchParams]
  );

  useEffect(() => {
    setPage(1);
    fetchPage(1, false);
  }, [activeTab]);

  const pageRef = useRef(1);
  pageRef.current = page;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        const nextPage = pageRef.current + 1;
        setPage(nextPage);
        fetchPage(nextPage, true);
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
    else router.push("/search");
  };

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 24,
      }}
    >
      {/* Search bar */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          maxWidth: 860,
          margin: "0 auto",
          width: "100%",
          position: "relative",
          display: "flex",
          alignItems: "stretch",
          border: "1px solid #E4E4E4",
          borderRadius: 8,
          background: "white",
          overflow: "hidden",
        }}
      >
        <Search
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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginTop: 16,
          marginBottom: 16,
        }}
      >
        {TABS.map(({ id, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className="rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-[#F5F5F5] hover:text-[#111111]"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? "var(--accent-text)" : "#666666",
                padding: "6px 14px",
                borderRadius: 6,
                cursor: "pointer",
                background: isActive ? "var(--accent)" : "transparent",
                border: "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Script grid */}
      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
            placeItems: "center",
            minHeight: 200,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--status-patched)", margin: 0, textAlign: "center" }}>
            Failed to load scripts. Refresh the page to try again.
          </p>
        </div>
      ) : scripts.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 280,
            gap: 16,
          }}
        >
          <p style={{ fontSize: 14, color: "#666666", margin: 0, textAlign: "center" }}>
            No scripts yet. Be the first to publish one.
          </p>
          <a
            href="/publish"
            className="inline-block rounded-md px-5 py-2.5 text-sm font-semibold no-underline transition-opacity hover:opacity-90"
            style={{
              background: "var(--accent)",
              color: "var(--accent-text)",
              padding: "8px 20px",
              borderRadius: 6,
            }}
          >
            Upload Script
          </a>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {scripts.map((hit) => (
              <ScriptCard key={hit.id} hit={hit} />
            ))}
          </div>
          {loadingMore && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 16,
                marginTop: 16,
              }}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={`more-${i}`} />
              ))}
            </div>
          )}
          <div ref={sentinelRef} style={{ height: 1, marginTop: 16 }} aria-hidden />
        </>
      )}
    </div>
  );
}

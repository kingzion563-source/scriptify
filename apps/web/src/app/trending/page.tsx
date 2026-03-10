"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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

export default function TrendingPage() {
  const [scripts, setScripts] = useState<ScriptHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  pageRef.current = page;

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      params.set("sort", "most-copied");
      params.set("limit", String(PAGE_SIZE));
      params.set("page", String(pageNum));
      const data = await apiFetch<{ hits: ScriptHit[]; total: number }>(
        `/api/v1/search?${params.toString()}`
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
  }, []);

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

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

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: 20, paddingRight: 20, paddingTop: 24 }}>
      <h1
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
          margin: "0 0 4px",
        }}
      >
        Trending
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 20px" }}>
        Most copied scripts right now.
      </p>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
          <p style={{ fontSize: 13, color: "var(--status-patched)", textAlign: "center" }}>
            Failed to load trending scripts. Refresh to try again.
          </p>
        </div>
      ) : scripts.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280 }}>
          <p style={{ fontSize: 14, color: "#666", textAlign: "center" }}>
            No trending scripts yet.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {scripts.map((hit) => (
              <ScriptCard key={hit.id} hit={hit} />
            ))}
          </div>
          {loadingMore && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginTop: 16 }}>
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

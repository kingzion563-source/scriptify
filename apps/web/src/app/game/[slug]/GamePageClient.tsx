"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ScriptCard, ScriptCardGrid, ScriptCardSkeleton } from "@scriptify/ui";
import { apiFetch } from "@/lib/api";
import type { GameData } from "./page";

interface ScriptHit {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  gameName: string | null;
  gameSlug: string | null;
  authorUsername: string;
  authorAvatar: string | null;
  status: string;
  likeCount: number;
  viewCount: number;
  copyCount: number;
  tags: string[];
  aiScore: number | null;
  isAuthorPro: boolean;
}

const PAGE_SIZE = 12;

export function GamePageClient({ game }: { game: GameData }) {
  const [scripts, setScripts] = useState<ScriptHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingPageRef = useRef(0);

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const data = await apiFetch<{
          hits: ScriptHit[];
          total: number;
          page: number;
          limit: number;
        }>(
          `/api/v1/scripts?gameSlug=${encodeURIComponent(game.slug)}&page=${pageNum}&limit=${PAGE_SIZE}`
        );
        if (append) {
          setScripts((prev) => [...prev, ...data.hits]);
        } else {
          setScripts(data.hits);
        }
        setTotal(data.total);
        setHasMore(pageNum * PAGE_SIZE < data.total && data.hits.length === PAGE_SIZE);
      } catch {
        if (!append) setScripts([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [game.slug]
  );

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setPage((p) => {
          const next = p + 1;
          if (next <= loadingPageRef.current) return p;
          loadingPageRef.current = next;
          loadPage(next, true);
          return next;
        });
      },
      { rootMargin: "200px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadPage]);

  const status = (s: string) =>
    (s === "verified" || s === "patched" || s === "testing" ? s : "testing") as "verified" | "patched" | "testing";

  return (
    <div className="flex flex-col">
      {/* Thumbnail full width with dark overlay and game name */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: "16/9",
          maxHeight: 320,
          background: "var(--bg-surface-2)",
        }}
      >
        {game.thumbnailUrl && (
          <>
            <img
              src={game.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.45)" }}
            />
          </>
        )}
        <h1
          className="absolute bottom-0 left-0 right-0 p-5 text-white"
          style={{
            fontSize: 26,
            fontWeight: 700,
            margin: 0,
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          }}
        >
          {game.name}
        </h1>
      </div>

      {/* Player count and script count below image */}
      <div
        className="px-5 pt-3"
        style={{ fontSize: 13, color: "var(--text-secondary)" }}
      >
        {game.playerCountCached > 0 && (
          <span>{game.playerCountCached.toLocaleString()} players</span>
        )}
        {game.playerCountCached > 0 && game.scriptCount >= 0 && " · "}
        <span>{game.scriptCount} scripts</span>
      </div>

      {/* Script grid */}
      <div className="p-5">
        {loading ? (
          <ScriptCardGrid>
            {Array.from({ length: 8 }).map((_, i) => (
              <ScriptCardSkeleton key={i} />
            ))}
          </ScriptCardGrid>
        ) : scripts.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            style={{ color: "var(--text-secondary)", fontSize: 13 }}
          >
            <p className="font-medium" style={{ color: "var(--text-primary)", fontSize: 15 }}>
              No scripts yet for this game.
            </p>
            <p className="mt-2">Be the first to publish one.</p>
            <Link
              href="/publish"
              className="mt-4 inline-block rounded-md bg-accent px-5 py-2.5 font-semibold text-accent-text transition-colors hover:bg-accent-hover"
              style={{ fontSize: 13 }}
            >
              Publish Script
            </Link>
          </div>
        ) : (
          <>
            <ScriptCardGrid>
              {scripts.map((s, i) => (
                <Link
                  key={s.id}
                  href={`/script/${s.slug}`}
                  style={{ textDecoration: "none", color: "inherit", display: "block" }}
                >
                  <ScriptCard
                    id={s.id}
                    title={s.title}
                    coverUrl={s.coverUrl}
                    gameName={s.gameName ?? "—"}
                    gameSlug={s.gameSlug ?? ""}
                    authorUsername={s.authorUsername}
                    authorAvatar={s.authorAvatar}
                    status={status(s.status)}
                    likeCount={s.likeCount}
                    viewCount={s.viewCount}
                    copyCount={s.copyCount}
                    tags={s.tags}
                    rawCode=""
                    aiScore={s.aiScore ?? undefined}
                    isAuthorPro={s.isAuthorPro}
                    index={i}
                  />
                </Link>
              ))}
            </ScriptCardGrid>
            {loadingMore && (
              <ScriptCardGrid>
                {Array.from({ length: 4 }).map((_, i) => (
                  <ScriptCardSkeleton key={`skeleton-${i}`} />
                ))}
              </ScriptCardGrid>
            )}
            <div ref={sentinelRef} style={{ height: 1, marginTop: 16 }} aria-hidden />
          </>
        )}
      </div>
    </div>
  );
}

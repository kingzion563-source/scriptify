"use client";

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

const SUGGESTED_TERMS = ["aimbot", "esp", "speed", "fly", "infinite jump", "auto farm"];

function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-lg border border-border overflow-hidden"
      style={{ background: "var(--bg-surface-2)" }}
    >
      <div style={{ aspectRatio: "16/9", background: "var(--bg-surface-3)" }} />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3.5 rounded" style={{ width: "80%", background: "var(--bg-surface-3)" }} />
        <div className="h-3 rounded" style={{ width: "50%", background: "var(--bg-surface-3)" }} />
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-12 rounded" style={{ background: "var(--bg-surface-3)" }} />
          ))}
        </div>
      </div>
    </div>
  );
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

export function SearchResultGrid({
  hits,
  loading,
  total,
}: {
  hits: SearchHit[];
  loading: boolean;
  total: number;
}) {
  if (loading) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-primary font-semibold" style={{ fontSize: 16 }}>
          No scripts found
        </p>
        <p className="mt-2 text-secondary" style={{ fontSize: 13 }}>
          Try a different search or one of these:
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {SUGGESTED_TERMS.map((term) => (
            <span
              key={term}
              className="cursor-pointer hover:bg-surface-3 transition-colors"
              style={{
                fontSize: 12,
                padding: "4px 10px",
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 4,
              }}
            >
              {term}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 16,
      }}
    >
      {hits.map((hit) => (
        <a
          key={hit.id}
          href={`/script/${hit.slug}`}
          className="group flex flex-col rounded-lg border border-border bg-surface overflow-hidden transition-transform hover:-translate-y-0.5"
          style={{ borderRadius: "var(--radius-lg)" }}
        >
          <div
            className="relative overflow-hidden"
            style={{ aspectRatio: "16/9", background: "var(--bg-surface-2)" }}
          >
            {hit.coverUrl && (
              <img
                src={hit.coverUrl}
                alt=""
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
      ))}
    </div>
  );
}

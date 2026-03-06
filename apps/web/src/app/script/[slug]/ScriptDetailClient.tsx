"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow } from "date-fns";
import {
  Bookmark,
  Share2,
  Flag,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Eye,
  Copy,
  Heart,
  Users,
  ExternalLink,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/lib/useToast";
import { CommentsSection } from "./CommentsSection";
import { LevelBadge } from "@/components/LevelBadge";
import { ProBadge } from "@/components/ProBadge";
import { ReportModal } from "@/components/ReportModal";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ExecutorCompat {
  name: string;
  compatible: boolean | null;
}

export interface AiRisk {
  severity: "low" | "medium" | "high";
  description: string;
  line?: number;
}

export interface ScriptVersion {
  id: string;
  version: string;
  changelog: string | null;
  rawCode: string;
  createdAt: string;
}

export interface RelatedScript {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  status: "verified" | "patched" | "testing";
  likeCount: number;
  viewCount: number;
  copyCount: number;
  aiScore: number | null;
  rawCode: string;
  authorUsername: string;
  authorAvatar: string | null;
  isAuthorPro: boolean;
  gameName: string;
  gameSlug: string;
  tags: string[];
}

export interface ScriptDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  rawCode: string;
  status: "verified" | "patched" | "testing";
  version: string;
  platform: string;
  executorCompat: ExecutorCompat[];
  viewCount: number;
  copyCount: number;
  likeCount: number;
  dislikeCount: number;
  aiSafetyScore: number | null;
  aiSummary: string | null;
  aiFeatures: string[];
  requiresKey: boolean;
  isTrending: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt: string | null;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
    followerCount: number;
    isPro: boolean;
    level: number;
  };
  game: {
    id: string;
    name: string;
    slug: string;
    thumbnailUrl: string | null;
    playerCountCached: number;
  } | null;
  tags: { name: string; slug: string }[];
  versions: ScriptVersion[];
  commentCount: number;
  userVote: number | null;
  aiRisks: AiRisk[];
  relatedScripts: RelatedScript[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  "verified" | "patched" | "testing",
  { bg: string; color: string }
> = {
  verified: {
    bg: "var(--status-bg-verified)",
    color: "var(--status-verified)",
  },
  patched: {
    bg: "var(--status-bg-patched)",
    color: "var(--status-patched)",
  },
  testing: {
    bg: "var(--status-bg-testing)",
    color: "var(--status-testing)",
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined") return () => {};
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    () => false
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "verified" | "patched" | "testing" }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "3px 7px",
        borderRadius: "var(--radius-sm)",
        background: style.bg,
        color: style.color,
        flexShrink: 0,
      }}
    >
      {status.toUpperCase()}
    </span>
  );
}

function CodeBlock({
  id,
  label,
  rawCode,
  isVersion,
}: {
  id: string;
  label: string;
  rawCode: string;
  isVersion?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const handleCopy = useCallback(() => {
    if (copied) return;
    navigator.clipboard.writeText(rawCode)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast("Failed to copy code. Please try again.");
      });
  }, [rawCode, copied, toast]);

  return (
    <div
      style={{
        border: "1px solid var(--border-code)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        marginBottom: 24,
      }}
    >
      {/* Code block header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: "#1a1a1a",
          borderBottom: "1px solid var(--border-code)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 12,
            color: "#888888",
            letterSpacing: "0.02em",
          }}
        >
          {label}
          {isVersion && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 10,
                padding: "1px 5px",
                background: "#2a2a2a",
                borderRadius: 3,
                color: "#666666",
              }}
            >
              VERSION
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            cursor: "pointer",
            background: copied ? "var(--status-verified)" : "#2a2a2a",
            color: copied ? "#ffffff" : "#aaaaaa",
            transition: "background 100ms, color 100ms",
          }}
        >
          <Copy size={11} />
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <pre className="w-full bg-gray-950 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm font-mono whitespace-pre-wrap break-all">
        <code>{rawCode}</code>
      </pre>

      {/* View Raw link */}
      <div
        style={{
          padding: "6px 14px",
          background: "#1a1a1a",
          borderTop: "1px solid var(--border-code)",
        }}
      >
        <a
          href={`/raw/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: "#666666",
            textDecoration: "none",
            transition: "color 100ms",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "#aaaaaa")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "#666666")
          }
        >
          <ExternalLink size={10} />
          View Raw
        </a>
      </div>
    </div>
  );
}

function CondensedScriptCard({ script }: { script: RelatedScript }) {
  const statusStyle =
    STATUS_STYLES[script.status] ?? STATUS_STYLES.testing;

  return (
    <Link
      href={`/script/${script.slug}`}
      style={{
        display: "flex",
        gap: 10,
        padding: "10px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        textDecoration: "none",
        transition: "background 100ms",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--bg-surface-2)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "var(--bg-surface)")
      }
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 60,
          height: 34,
          background: "var(--bg-surface-2)",
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
          flexShrink: 0,
          position: "relative",
        }}
      >
        {script.coverUrl && (
          <Image
            src={script.coverUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 260px"
            style={{ objectFit: "cover" }}
          />
        )}
        <span
          style={{
            position: "absolute",
            top: 3,
            left: 3,
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: "1px 4px",
            borderRadius: 2,
            background: statusStyle.bg,
            color: statusStyle.color,
          }}
        >
          {script.status.toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 2,
          }}
        >
          {script.title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            display: "flex",
            gap: 8,
          }}
        >
          <span>{script.gameName}</span>
          <span>{fmt(script.copyCount)} copies</span>
        </div>
      </div>
    </Link>
  );
}

// ─── Section label helper ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

const BOOKMARK_QUERY_KEY = (scriptId: string) =>
  ["script-bookmark", scriptId] as const;

export function ScriptDetailClient({ script }: { script: ScriptDetail }) {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const prefersReducedMotion = usePrefersReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const { data: bookmarkData } = useQuery({
    queryKey: BOOKMARK_QUERY_KEY(script.id),
    queryFn: () =>
      apiFetch<{ bookmarked: boolean }>(
        `/api/v1/scripts/${script.id}/bookmark`
      ),
    enabled: !!user,
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () =>
      apiFetch<{ bookmarked: boolean }>(
        `/api/v1/scripts/${script.id}/bookmark`,
        { method: "POST" }
      ),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: BOOKMARK_QUERY_KEY(script.id) });
      const prev = queryClient.getQueryData<{ bookmarked: boolean }>(
        BOOKMARK_QUERY_KEY(script.id)
      );
      const next = { bookmarked: !(prev?.bookmarked ?? false) };
      queryClient.setQueryData(BOOKMARK_QUERY_KEY(script.id), next);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev != null) {
        queryClient.setQueryData(
          BOOKMARK_QUERY_KEY(script.id),
          ctx.prev
        );
      }
      toast("Failed to bookmark script. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: BOOKMARK_QUERY_KEY(script.id) });
    },
  });

  const bookmarked = bookmarkData?.bookmarked ?? false;

  // Mutable counts managed locally for optimistic UI
  const [likeCount, setLikeCount] = useState(script.likeCount);
  const [dislikeCount, setDislikeCount] = useState(script.dislikeCount);
  const [copyCount, setCopyCount] = useState(script.copyCount);
  const [userVote, setUserVote] = useState<number | null>(script.userVote);
  const [mainCopied, setMainCopied] = useState(false);
  const [following, setFollowing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const statusStyle = STATUS_STYLES[script.status] ?? STATUS_STYLES.testing;
  const updatedAgo = formatDistanceToNow(new Date(script.updatedAt), {
    addSuffix: true,
  });

  // ── Vote handler ────────────────────────────────────────────────────────────
  const handleVote = useCallback(
    async (value: 1 | -1) => {
      if (!user) return;

      const prevVote = userVote;
      const newVote = userVote === value ? 0 : value;

      // Optimistic update
      setUserVote(newVote === 0 ? null : newVote);
      if (value === 1) {
        if (prevVote === 1) {
          setLikeCount((n) => Math.max(0, n - 1));
        } else {
          setLikeCount((n) => n + 1);
          if (prevVote === -1) setDislikeCount((n) => Math.max(0, n - 1));
        }
      } else {
        if (prevVote === -1) {
          setDislikeCount((n) => Math.max(0, n - 1));
        } else {
          setDislikeCount((n) => n + 1);
          if (prevVote === 1) setLikeCount((n) => Math.max(0, n - 1));
        }
      }

      try {
        const result = await apiFetch<{
          likeCount: number;
          dislikeCount: number;
          userVote: number | null;
        }>(`/api/v1/scripts/${script.id}/vote`, {
          method: "POST",
          body: JSON.stringify({ value: newVote }),
        });
        setLikeCount(result.likeCount);
        setDislikeCount(result.dislikeCount);
        setUserVote(result.userVote);
      } catch {
        setUserVote(prevVote);
        setLikeCount(script.likeCount);
        setDislikeCount(script.dislikeCount);
        toast("Failed to like script. Please try again.");
      }
    },
    [user, userVote, script.id, script.likeCount, script.dislikeCount, toast]
  );

  // ── Main copy handler ───────────────────────────────────────────────────────
  const handleMainCopy = useCallback(async () => {
    if (mainCopied) return;
    try {
      await navigator.clipboard.writeText(script.rawCode);
      setMainCopied(true);
      setCopyCount((n) => n + 1);
      setTimeout(() => setMainCopied(false), 2000);
      // Fire and forget the copy count increment
      apiFetch(`/api/v1/scripts/${script.id}/copy`, {
        method: "POST",
      }).catch((err) => {
        toast(err instanceof Error ? err.message : "Copy count could not be updated");
      });
    } catch {
      // Clipboard API may fail silently on insecure origins
    }
  }, [script.rawCode, script.id, mainCopied]);

  // ── Share handler ───────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: script.title,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      toast("Failed to share. Please try again.");
    }
  }, [script.title, toast]);

  // ── Follow handler ──────────────────────────────────────────────────────────
  const handleFollow = useCallback(async () => {
    if (!user) return;
    setFollowing((v) => !v);
    try {
      await apiFetch(`/api/v1/users/${script.author.id}/follow`, {
        method: "POST",
      });
    } catch {
      setFollowing((v) => !v);
      toast("Failed to follow user. Please try again.");
    }
  }, [user, script.author.id, toast]);

  const executorCompatArray = Array.isArray(script.executorCompat)
    ? (script.executorCompat as ExecutorCompat[])
    : [];

  return (
    <>
      {/* Blink cursor for AI streaming */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      <div
        style={{
          padding: "24px 20px",
          minHeight: "calc(100vh - 56px)",
        }}
      >
        <div
          className="script-detail-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: 32,
            alignItems: "start",
          }}
        >
          {/* ─── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div style={{ minWidth: 0 }}>
            {/* Breadcrumb */}
            <nav
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/"
                style={{
                  color: "var(--text-muted)",
                  textDecoration: "none",
                  transition: "color 100ms",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-muted)")
                }
              >
                Home
              </Link>
              <span style={{ opacity: 0.5 }}>/</span>
              {script.game ? (
                <Link
                  href={`/game/${script.game.slug}`}
                  style={{
                    color: "var(--text-muted)",
                    textDecoration: "none",
                    transition: "color 100ms",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--text-primary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-muted)")
                  }
                >
                  {script.game.name}
                </Link>
              ) : (
                <span>Scripts</span>
              )}
              <span style={{ opacity: 0.5 }}>/</span>
              <span
                style={{
                  color: "var(--text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 240,
                }}
              >
                {script.title}
              </span>
            </nav>

            {/* H1 title */}
            <motion.h1
              initial={
                prefersReducedMotion ? false : { opacity: 0, y: 6 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                margin: "0 0 12px",
                lineHeight: 1.2,
              }}
            >
              {script.title}
            </motion.h1>

            {/* Status badge row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 24,
                flexWrap: "wrap",
              }}
            >
              <StatusBadge status={script.status} />
              <span
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-secondary)",
                  fontFamily:
                    "var(--font-jetbrains-mono), monospace",
                }}
              >
                v{script.version}
              </span>
              <span
                style={{ fontSize: 12, color: "var(--text-muted)" }}
              >
                Updated {updatedAgo}
              </span>
              {script.isTrending && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "3px 7px",
                    borderRadius: "var(--radius-sm)",
                    background: "#DC2626",
                    color: "#ffffff",
                  }}
                >
                  HOT
                </span>
              )}
              {script.requiresKey && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 7px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Requires Key
                </span>
              )}
            </div>

            {/* Description (Markdown) */}
            {script.description && (
              <div
                style={{
                  marginBottom: 28,
                  paddingBottom: 28,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div
                  className="md-body"
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h2
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            margin: "16px 0 8px",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {children}
                        </h2>
                      ),
                      h2: ({ children }) => (
                        <h3
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            margin: "14px 0 6px",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {children}
                        </h3>
                      ),
                      h3: ({ children }) => (
                        <h4
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            margin: "12px 0 4px",
                          }}
                        >
                          {children}
                        </h4>
                      ),
                      p: ({ children }) => (
                        <p style={{ margin: "0 0 10px" }}>{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul
                          style={{
                            margin: "0 0 10px",
                            paddingLeft: 20,
                          }}
                        >
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol
                          style={{
                            margin: "0 0 10px",
                            paddingLeft: 20,
                          }}
                        >
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li style={{ marginBottom: 3 }}>{children}</li>
                      ),
                      code: ({ className, children, ...props }) => {
                        const isBlock = Boolean(className);
                        if (isBlock) {
                          return (
                            <pre
                              style={{
                                fontFamily:
                                  "var(--font-jetbrains-mono), monospace",
                                fontSize: 12,
                                background: "#111111",
                                border: "1px solid var(--border-code)",
                                borderRadius: "var(--radius-md)",
                                padding: "12px 14px",
                                overflow: "auto",
                                color: "#E4E4E4",
                                margin: "0 0 10px",
                              }}
                            >
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          );
                        }
                        return (
                          <code
                            className={className}
                            style={{
                              fontFamily:
                                "var(--font-jetbrains-mono), monospace",
                              fontSize: 12,
                              background: "var(--bg-surface-2)",
                              border: "1px solid var(--border)",
                              borderRadius: 3,
                              padding: "1px 5px",
                              color: "var(--text-primary)",
                            }}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      strong: ({ children }) => (
                        <strong
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {children}
                        </strong>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote
                          style={{
                            borderLeft:
                              "3px solid var(--border-strong)",
                            paddingLeft: 12,
                            margin: "0 0 10px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {children}
                        </blockquote>
                      ),
                      a: ({ children }) => (
                        <span
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {children}
                        </span>
                      ),
                    }}
                  >
                    {script.description}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Primary code block (current version) */}
            <CodeBlock
              id={script.id}
              label={script.title}
              rawCode={script.rawCode}
            />

            {/* Older version blocks */}
            {script.versions.length > 0 &&
              script.versions.map((v) => (
                <CodeBlock
                  key={v.id}
                  id={v.id}
                  label={`v${v.version}`}
                  rawCode={v.rawCode}
                  isVersion
                />
              ))}

            <CommentsSection
              scriptId={script.id}
              scriptAuthorId={script.author.id}
              initialCommentCount={script.commentCount}
            />
          </div>

          {/* ─── RIGHT STICKY PANEL ──────────────────────────────────────── */}
          <aside
            className="script-detail-panel"
            style={{
              position: "sticky",
              top: 72,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Cover image */}
            <div
              style={{
                position: "relative",
                aspectRatio: "16/9",
                background: "var(--bg-surface-2)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                border: "1px solid var(--border)",
              }}
            >
              {script.coverUrl ? (
                <Image
                  src={script.coverUrl}
                  alt={script.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                    fontSize: 12,
                  }}
                >
                  No cover
                </div>
              )}
            </div>

            {/* COPY SCRIPT button */}
            <button
              type="button"
              onClick={handleMainCopy}
              style={{
                width: "100%",
                height: 44,
                background: mainCopied
                  ? "var(--status-verified)"
                  : "var(--accent)",
                color: "var(--accent-text)",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 180ms",
                letterSpacing: "0.01em",
              }}
              onMouseEnter={(e) => {
                if (!mainCopied)
                  e.currentTarget.style.background =
                    "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                if (!mainCopied)
                  e.currentTarget.style.background = "var(--accent)";
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "scale(0.98)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {mainCopied ? "Copied!" : "COPY SCRIPT"}
            </button>

            {/* Icon button row */}
            <div style={{ display: "flex", gap: 8 }}>
              {[
                {
                  icon: (
                    <Bookmark
                      size={15}
                      fill={bookmarked ? "currentColor" : "none"}
                    />
                  ),
                  label: "Bookmark",
                  action: () => {
                    if (!user) {
                      router.push(
                        `/login?return=${encodeURIComponent(pathname ?? "/")}`
                      );
                      return;
                    }
                    bookmarkMutation.mutate();
                  },
                  active: bookmarked,
                },
                {
                  icon: <Share2 size={15} />,
                  label: "Share",
                  action: handleShare,
                  active: false,
                },
                {
                  icon: <Flag size={15} />,
                  label: "Report",
                  action: () => setReportOpen(true),
                  active: false,
                },
              ].map(({ icon, label, action, active }) => (
                <button
                  key={label}
                  type="button"
                  onClick={action}
                  title={label}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    padding: "8px 6px",
                    background: active
                      ? "var(--bg-surface-3)"
                      : "var(--bg-surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: active
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                    fontSize: 10,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 100ms, color 100ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "var(--bg-surface-3)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = active
                      ? "var(--bg-surface-3)"
                      : "var(--bg-surface-2)";
                    e.currentTarget.style.color = active
                      ? "var(--text-primary)"
                      : "var(--text-secondary)";
                  }}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "var(--text-muted)",
                padding: "10px 14px",
                background: "var(--bg-surface-2)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Eye size={13} /> {fmt(script.viewCount)}
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Copy size={13} /> {fmt(copyCount)}
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Heart size={13} /> {fmt(likeCount)}
              </span>
            </div>

            {/* Like / Dislike buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => handleVote(1)}
                title="Like"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  height: 36,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  background:
                    userVote === 1
                      ? "var(--status-bg-verified)"
                      : "var(--bg-surface)",
                  color:
                    userVote === 1
                      ? "var(--status-verified)"
                      : "var(--text-secondary)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: user ? "pointer" : "default",
                  transition: "all 100ms",
                  opacity: user ? 1 : 0.6,
                }}
                onMouseEnter={(e) => {
                  if (!user) return;
                  e.currentTarget.style.background =
                    "var(--status-bg-verified)";
                  e.currentTarget.style.color = "var(--status-verified)";
                  e.currentTarget.style.borderColor =
                    "var(--status-verified)";
                }}
                onMouseLeave={(e) => {
                  if (!user) return;
                  e.currentTarget.style.background =
                    userVote === 1
                      ? "var(--status-bg-verified)"
                      : "var(--bg-surface)";
                  e.currentTarget.style.color =
                    userVote === 1
                      ? "var(--status-verified)"
                      : "var(--text-secondary)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <ThumbsUp size={14} />
                <motion.span
                  key={likeCount}
                  initial={
                    prefersReducedMotion
                      ? false
                      : { opacity: 0, y: -6 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  {fmt(likeCount)}
                </motion.span>
              </button>

              <button
                type="button"
                onClick={() => handleVote(-1)}
                title="Dislike"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  height: 36,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  background:
                    userVote === -1
                      ? "var(--status-bg-patched)"
                      : "var(--bg-surface)",
                  color:
                    userVote === -1
                      ? "var(--status-patched)"
                      : "var(--text-secondary)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: user ? "pointer" : "default",
                  transition: "all 100ms",
                  opacity: user ? 1 : 0.6,
                }}
                onMouseEnter={(e) => {
                  if (!user) return;
                  e.currentTarget.style.background =
                    "var(--status-bg-patched)";
                  e.currentTarget.style.color = "var(--status-patched)";
                  e.currentTarget.style.borderColor =
                    "var(--status-patched)";
                }}
                onMouseLeave={(e) => {
                  if (!user) return;
                  e.currentTarget.style.background =
                    userVote === -1
                      ? "var(--status-bg-patched)"
                      : "var(--bg-surface)";
                  e.currentTarget.style.color =
                    userVote === -1
                      ? "var(--status-patched)"
                      : "var(--text-secondary)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <ThumbsDown size={14} />
                <motion.span
                  key={dislikeCount}
                  initial={
                    prefersReducedMotion
                      ? false
                      : { opacity: 0, y: -6 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  {fmt(dislikeCount)}
                </motion.span>
              </button>
            </div>

            {/* Author card */}
            <div
              style={{
                padding: "14px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                background: "var(--bg-surface)",
              }}
            >
              <SectionLabel>Author</SectionLabel>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    position: "relative",
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "var(--bg-surface-2)",
                    overflow: "hidden",
                    flexShrink: 0,
                    border: "1px solid var(--border)",
                  }}
                >
                  {script.author.avatarUrl ? (
                    <Image
                      src={script.author.avatarUrl}
                      alt=""
                      fill
                      sizes="40px"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {script.author.username?.length > 0 ? script.author.username[0].toUpperCase() : "?"}
                    </div>
                  )}
                </div>

                {/* Name + badges */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      flexWrap: "wrap",
                    }}
                  >
                    <Link
                      href={`/u/${script.author.username}`}
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        textDecoration: "none",
                        transition: "opacity 100ms",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.opacity = "0.7")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = "1")
                      }
                    >
                      {script.author.username}
                    </Link>
                    {script.author.isPro && <ProBadge />}
                    <LevelBadge level={script.author.level} />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Users size={10} />
                    {fmt(script.author.followerCount)} followers
                  </div>
                </div>

                {/* Follow button */}
                {user && user.id !== script.author.id && (
                  <button
                    type="button"
                    onClick={handleFollow}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "5px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-strong)",
                      background: following
                        ? "var(--bg-surface-3)"
                        : "var(--bg-surface)",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "background 100ms",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--bg-surface-2)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = following
                        ? "var(--bg-surface-3)"
                        : "var(--bg-surface)")
                    }
                  >
                    {following ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            </div>

            {/* Game card */}
            {script.game && (
              <div
                style={{
                  padding: "14px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--bg-surface)",
                }}
              >
                <SectionLabel>Game</SectionLabel>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: 44,
                      height: 44,
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-surface-2)",
                      overflow: "hidden",
                      flexShrink: 0,
                      border: "1px solid var(--border)",
                    }}
                  >
                    {script.game.thumbnailUrl && (
                      <Image
                        src={script.game.thumbnailUrl}
                        alt=""
                        fill
                        sizes="44px"
                        style={{ objectFit: "cover" }}
                      />
                    )}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginBottom: 2,
                      }}
                    >
                      {script.game.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Users size={10} />
                      {fmt(script.game.playerCountCached)} players
                    </div>
                  </div>
                </div>
                <Link
                  href={`/game/${script.game.slug}`}
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                    borderTop: "1px solid var(--border)",
                    paddingTop: 10,
                    transition: "color 100ms",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--text-primary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-secondary)")
                  }
                >
                  View all scripts for this game →
                </Link>
              </div>
            )}

            {/* Executor compatibility grid */}
            {executorCompatArray.length > 0 && (
              <div
                style={{
                  padding: "14px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--bg-surface)",
                }}
              >
                <SectionLabel>Executor Compatibility</SectionLabel>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {executorCompatArray.map(({ name, compatible }) => (
                    <span
                      key={name}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: "var(--radius-sm)",
                        background:
                          compatible === true
                            ? "var(--status-bg-verified)"
                            : compatible === false
                              ? "var(--status-bg-patched)"
                              : "var(--bg-surface-2)",
                        color:
                          compatible === true
                            ? "var(--status-verified)"
                            : compatible === false
                              ? "var(--status-patched)"
                              : "var(--text-muted)",
                        border: `1px solid ${
                          compatible === true
                            ? "#bbf7d0"
                            : compatible === false
                              ? "#fecaca"
                              : "var(--border)"
                        }`,
                      }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {script.tags.length > 0 && (
              <div
                style={{
                  padding: "14px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--bg-surface)",
                }}
              >
                <SectionLabel>Tags</SectionLabel>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 5,
                  }}
                >
                  {script.tags.map((tag) => (
                    <Link
                      key={tag.slug}
                      href={`/search?tag=${encodeURIComponent(tag.slug)}`}
                      style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        background: "var(--bg-surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-secondary)",
                        textDecoration: "none",
                        transition: "background 100ms, color 100ms",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "var(--bg-surface-3)";
                        e.currentTarget.style.color =
                          "var(--text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "var(--bg-surface-2)";
                        e.currentTarget.style.color =
                          "var(--text-secondary)";
                      }}
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related scripts */}
            {script.relatedScripts.length > 0 && (
              <div>
                <SectionLabel>Related Scripts</SectionLabel>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {script.relatedScripts.map((s) => (
                    <CondensedScriptCard key={s.id} script={s} />
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Responsive: single column on mobile */}
      <ReportModal
        open={reportOpen}
        targetType="SCRIPT"
        targetId={script.id}
        onClose={() => setReportOpen(false)}
        onError={() => toast("Failed to submit report. Please try again.")}
      />

      <style>{`
        @media (max-width: 768px) {
          .script-detail-grid {
            grid-template-columns: 1fr !important;
          }
          .script-detail-panel {
            position: static !important;
          }
        }
      `}</style>
    </>
  );
}

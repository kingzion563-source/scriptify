"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { motion } from "framer-motion";

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

export type ScriptStatus = "verified" | "patched" | "testing";

export interface ScriptCardProps {
  id: string;
  title: string;
  coverUrl: string | null;
  gameName: string;
  gameSlug: string;
  authorUsername: string;
  authorAvatar: string | null;
  status: ScriptStatus;
  likeCount: number;
  viewCount: number;
  copyCount: number;
  tags: string[];
  rawCode: string;
  aiScore?: number;
  isAuthorPro?: boolean;
  index?: number;
}

const STATUS_STYLES: Record<
  ScriptStatus,
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

function getCardVariants(reducedMotion: boolean) {
  const duration = reducedMotion ? 0 : 0.26;
  const delay = reducedMotion ? 0 : undefined;
  return {
    hidden: { opacity: 0, y: 8 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration,
        ease: [0.16, 1, 0.3, 1] as const,
        delay: delay !== undefined ? (i ?? 0) * 0.025 : 0,
      },
    }),
  };
}

export function ScriptCard({
  id,
  title,
  coverUrl,
  gameName,
  gameSlug,
  authorUsername,
  authorAvatar,
  status,
  likeCount,
  viewCount,
  copyCount,
  tags,
  rawCode,
  aiScore,
  isAuthorPro,
  index = 0,
}: ScriptCardProps) {
  const [copied, setCopied] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const cardVariants = getCardVariants(prefersReducedMotion);

  const handleCopy = useCallback(() => {
    if (copied) return;
    navigator.clipboard.writeText(rawCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [rawCode, copied]);

  const statusStyle = STATUS_STYLES[status];
  const statusLabel = status.toUpperCase();

  return (
    <motion.article
      layout
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      custom={index}
      className="script-card"
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
      whileHover={
        prefersReducedMotion
          ? undefined
          : {
              y: -2,
              transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
            }
      }
      onHoverStart={() => setCardHovered(true)}
      onHoverEnd={() => setCardHovered(false)}
    >
      {/* Cover image: 16:9, status badge absolute top-left 8px; on card hover scale 1.03, 300ms */}
      <div
        className="script-card-cover"
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          overflow: "hidden",
          background: "var(--bg-surface-2)",
        }}
      >
        {coverUrl ? (
          <motion.img
            src={coverUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            animate={{
              scale: prefersReducedMotion ? 1 : cardHovered ? 1.03 : 1,
            }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.3,
              ease: "easeInOut",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "var(--bg-surface-2)",
            }}
          />
        )}
        <span
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "3px 7px",
            borderRadius: 4,
            background: statusStyle.bg,
            color: statusStyle.color,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Card body: padding 12px 14px 14px, flex col, gap 6px */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "12px 14px 14px",
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#111111",
            lineHeight: 1.35,
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: 12,
            color: "#666666",
            fontWeight: 400,
            margin: 0,
          }}
        >
          {gameName}
        </p>
        {tags.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
            }}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  padding: "2px 7px",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  color: "var(--text-primary)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer: space-between, padding-top 8px, border-top — Author | Stats | Copy */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
            paddingTop: 8,
            borderTop: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "#666666",
            }}
          >
            {authorUsername}
          </span>
          <div
            style={{
              display: "flex",
              gap: 10,
              fontSize: 12,
              color: "#999999",
            }}
          >
            <span>{likeCount}</span>
            <span>{viewCount}</span>
            <span>{copyCount}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              background: copied ? "var(--status-verified)" : "var(--accent)",
              color: "var(--accent-text)",
              border: "none",
              padding: "5px 10px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 100ms",
            }}
            onMouseEnter={(e) => {
              if (!copied) e.currentTarget.style.background = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              if (!copied) e.currentTarget.style.background = "var(--accent)";
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.96)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

"use client";

export function ScriptCardSkeleton() {
  return (
    <>
      <style>{`
        @keyframes scriptify-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .script-card-skeleton-shimmer {
          background: #f0f0f0;
        }
        .scriptify-shimmer-wave {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.5) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: scriptify-shimmer 1.5s ease-in-out infinite;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .script-card-skeleton-shimmer {
            animation: none;
          }
        }
      `}</style>
      <article
        className="script-card-skeleton-shimmer"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          overflow: "hidden",
          background: "#F0F0F0",
        }}
        aria-hidden
      >
        <div className="scriptify-shimmer-wave" />
        {/* Same dimensions as card: 16:9 cover area */}
        <div
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            background: "#E8E8E8",
          }}
        />
        {/* Body area: padding 12px 14px 14px, gap 6px */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "12px 14px 14px",
          }}
        >
          <div
            style={{
              height: 14,
              width: "80%",
              borderRadius: 4,
              background: "#E8E8E8",
            }}
          />
          <div
            style={{
              height: 12,
              width: "50%",
              borderRadius: 4,
              background: "#E8E8E8",
            }}
          />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 18,
                  width: 48,
                  borderRadius: 4,
                  background: "#E8E8E8",
                }}
              />
            ))}
          </div>
          <div
            style={{
              marginTop: "auto",
              paddingTop: 8,
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                height: 11,
                width: 72,
                borderRadius: 4,
                background: "#E8E8E8",
              }}
            />
            <div
              style={{
                height: 11,
                width: 60,
                borderRadius: 4,
                background: "#E8E8E8",
              }}
            />
          </div>
        </div>
      </article>
    </>
  );
}

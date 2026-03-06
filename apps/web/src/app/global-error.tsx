"use client";

/**
 * Catches errors in the root layout. Must define its own <html> and <body>.
 * Only runs in production; dev shows the Next.js error overlay.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fff", color: "#111" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: "#111" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: "#111", marginBottom: 24 }}>
              An unexpected error occurred. Refresh the page to try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                borderRadius: 6,
                background: "#111",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

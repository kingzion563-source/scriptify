"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScriptCard } from "@scriptify/ui";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

type ModReport = {
  id: string;
  targetType: "SCRIPT" | "COMMENT";
  targetId: string;
  reason: "MALWARE" | "STOLEN" | "BROKEN" | "SPAM" | "NSFW" | "OTHER";
  body: string | null;
  createdAt: string;
  reporter: { id: string; username: string; trustScore: number };
  aiScan: { safetyScore: number | null; flagged: boolean; label: string } | null;
  script: {
    id: string;
    slug: string;
    title: string;
    coverUrl: string | null;
    gameName: string;
    gameSlug: string;
    status: "verified" | "patched" | "testing";
    likeCount: number;
    viewCount: number;
    copyCount: number;
    tags: string[];
    rawCode: string;
    authorId: string;
    authorUsername: string;
    reportCount: number;
    isPublished: boolean;
  } | null;
};

type AuditLog = {
  id: string;
  moderatorId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string | null;
  createdAt: string;
  moderator: { id: string; username: string };
};

const REASONS = ["", "MALWARE", "STOLEN", "BROKEN", "SPAM", "NSFW", "OTHER"] as const;
const TARGETS = ["", "SCRIPT", "COMMENT"] as const;

export function ModPanelClient() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [targetType, setTargetType] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [aiScore, setAiScore] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ModReport[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actingReportId, setActingReportId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const canAccess = user?.role === "MOD" || user?.role === "ADMIN";

  useEffect(() => {
    if (!isHydrated || user === undefined) return;
    if (!user) {
      router.replace("/login?return=/mod");
      return;
    }
    if (!canAccess) router.replace("/403");
  }, [isHydrated, user, canAccess, router]);

  if (!isHydrated) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-page, #fff)",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid var(--border)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      </>
    );
  }
  if (!user || !canAccess) {
    return (
      <div style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Redirecting...</p>
      </div>
    );
  }

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (targetType) params.set("targetType", targetType);
    if (reason) params.set("reason", reason);
    if (aiScore) params.set("aiScore", aiScore);
    return params.toString();
  }, [targetType, reason, aiScore]);

  const fetchAll = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    setFetchError(false);
    try {
      const [reportsRes, logsRes] = await Promise.all([
        apiFetch<{ reports: ModReport[] }>(
          `/api/v1/mod/reports${queryString ? `?${queryString}` : ""}`
        ),
        apiFetch<{ logs: AuditLog[] }>("/api/v1/mod/audit-log"),
      ]);
      setReports(reportsRes.reports);
      setLogs(logsRes.logs);
      setFetchError(false);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [canAccess, queryString]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const resolveReport = async (
    report: ModReport,
    action:
      | "APPROVE_SCRIPT"
      | "REMOVE_SCRIPT"
      | "WARN_AUTHOR"
      | "BAN_AUTHOR"
      | "SHADOWBAN_AUTHOR"
      | "RESOLVE_ONLY"
  ) => {
    setActingReportId(report.id);
    try {
      await apiFetch(`/api/v1/mod/reports/${report.id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await fetchAll();
    } finally {
      setActingReportId(null);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Sign in to access moderation tools.
        </p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Redirecting...
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>Moderation Panel</h1>
      <p style={{ margin: "6px 0 18px", fontSize: 13, color: "var(--text-muted)" }}>
        Pending reports queue and moderation audit log.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <select
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          style={{ height: 36, border: "1px solid var(--border)", borderRadius: 8, padding: "0 10px" }}
        >
          {TARGETS.map((v) => (
            <option key={v} value={v}>
              {v || "All target types"}
            </option>
          ))}
        </select>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ height: 36, border: "1px solid var(--border)", borderRadius: 8, padding: "0 10px" }}
        >
          {REASONS.map((v) => (
            <option key={v} value={v}>
              {v || "All reasons"}
            </option>
          ))}
        </select>
        <input
          value={aiScore}
          onChange={(e) => setAiScore(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
          placeholder="Minimum AI score"
          style={{ height: 36, border: "1px solid var(--border)", borderRadius: 8, padding: "0 10px" }}
        />
      </div>

      {fetchError ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <p style={{ fontSize: 13, color: "var(--status-patched)", marginBottom: 12 }}>
            Failed to load mod data. Refresh the page to try again.
          </p>
          <button
            type="button"
            onClick={() => fetchAll()}
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              cursor: "pointer",
              color: "var(--text-primary)",
            }}
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading moderation queue...</p>
      ) : reports.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No pending reports.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
          {reports.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: 12,
                background: "var(--bg-surface)",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 14 }}>
                <div>
                  {r.script ? (
                    <Link href={`/script/${r.script.slug}`} style={{ textDecoration: "none" }}>
                      <ScriptCard
                        id={r.script.id}
                        title={r.script.title}
                        coverUrl={r.script.coverUrl}
                        gameName={r.script.gameName || "—"}
                        gameSlug={r.script.gameSlug || ""}
                        authorUsername={r.script.authorUsername}
                        authorAvatar={null}
                        isAuthorPro={false}
                        status={r.script.status}
                        likeCount={r.script.likeCount}
                        viewCount={r.script.viewCount}
                        copyCount={r.script.copyCount}
                        tags={r.script.tags}
                        rawCode={r.script.rawCode}
                      />
                    </Link>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      Comment report (target id: {r.targetId})
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                    Reporter: <strong style={{ color: "var(--text-primary)" }}>{r.reporter.username}</strong> (trust score {r.reporter.trustScore})
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                    Reason: <strong style={{ color: "var(--text-primary)" }}>{r.reason}</strong>
                  </div>
                  {r.aiScan && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                      AI scan: <strong style={{ color: "var(--text-primary)" }}>{r.aiScan.safetyScore ?? "N/A"}</strong>{" "}
                      {r.aiScan.flagged ? (
                        <span style={{ color: "var(--status-patched)" }}>({r.aiScan.label})</span>
                      ) : (
                        <span style={{ color: "var(--status-verified)" }}>({r.aiScan.label})</span>
                      )}
                    </div>
                  )}
                  {r.body && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>{r.body}</div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => resolveReport(r, "APPROVE_SCRIPT")}
                      disabled={actingReportId === r.id}
                      style={actionBtn("var(--accent)", "var(--accent-text)")}
                    >
                      Approve Script
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveReport(r, "REMOVE_SCRIPT")}
                      disabled={actingReportId === r.id}
                      style={actionBtn("var(--status-bg-patched)", "var(--status-patched)")}
                    >
                      Remove Script
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveReport(r, "WARN_AUTHOR")}
                      disabled={actingReportId === r.id}
                      style={actionBtn("var(--status-bg-testing)", "var(--status-testing)")}
                    >
                      Warn Author
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveReport(r, "BAN_AUTHOR")}
                      disabled={actingReportId === r.id}
                      style={actionBtn("var(--status-patched)", "var(--accent-text)")}
                    >
                      Ban Author
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveReport(r, "SHADOWBAN_AUTHOR")}
                      disabled={actingReportId === r.id}
                      style={actionBtn("var(--text-secondary)", "var(--accent-text)")}
                    >
                      Shadowban
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveReport(r, "RESOLVE_ONLY")}
                      disabled={actingReportId === r.id}
                      style={actionBtn("var(--bg-surface-2)", "var(--text-primary)")}
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 18, margin: "0 0 10px", color: "var(--text-primary)" }}>Audit Log</h2>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}>
              <th style={th}>Moderator</th>
              <th style={th}>Action</th>
              <th style={th}>Target</th>
              <th style={th}>When</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={td}>{l.moderator.username}</td>
                <td style={td}>{l.action}</td>
                <td style={td}>
                  {l.targetType}:{l.targetId}
                </td>
                <td style={td}>{new Date(l.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td style={td} colSpan={4}>
                  No moderation actions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 600,
};

const td: CSSProperties = {
  padding: "10px 12px",
  color: "var(--text-secondary)",
};

function actionBtn(bg: string, color: string): CSSProperties {
  return {
    height: 32,
    border: "none",
    borderRadius: 8,
    background: bg,
    color,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };
}


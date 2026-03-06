"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { apiFetch } from "@/lib/api";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const REQUIRE_TURNSTILE = Boolean(TURNSTILE_SITE_KEY && TURNSTILE_SITE_KEY.trim() !== "");

type ReportReason = "MALWARE" | "STOLEN" | "BROKEN" | "SPAM" | "NSFW" | "OTHER";

const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: "MALWARE", label: "Malware" },
  { value: "STOLEN", label: "Stolen Code" },
  { value: "BROKEN", label: "Broken" },
  { value: "SPAM", label: "Spam" },
  { value: "NSFW", label: "NSFW" },
  { value: "OTHER", label: "Other" },
];

export function ReportModal({
  open,
  targetType,
  targetId,
  onClose,
  onSubmitted,
  onError,
}: {
  open: boolean;
  targetType: "SCRIPT" | "COMMENT" | null;
  targetId: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
  onError?: () => void;
}) {
  const [reason, setReason] = useState<ReportReason>("MALWARE");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setReason("MALWARE");
      setBody("");
      setError(null);
    }
  }, [open]);

  if (!open || !targetType || !targetId) return null;

  const handleSubmit = async () => {
    let turnstileToken: string | undefined;
    if (REQUIRE_TURNSTILE) {
      const tokenEl = rootRef.current?.querySelector<HTMLInputElement>(
        '[name="cf-turnstile-response"]'
      );
      turnstileToken = tokenEl?.value?.trim();
      if (!turnstileToken) {
        setError("Please complete Turnstile verification.");
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        targetType,
        targetId,
        reason,
        body: body.trim() || null,
      };
      if (REQUIRE_TURNSTILE && turnstileToken) {
        payload.turnstileToken = turnstileToken;
      }
      await apiFetch("/api/v1/reports", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report.");
      onError?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        ref={rootRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          Submit Report
        </h3>
        <p style={{ margin: "6px 0 14px", fontSize: 12, color: "var(--text-muted)" }}>
          Help us keep Scriptify safe.
        </p>

        <label style={{ display: "block", fontSize: 12, marginBottom: 6, color: "var(--text-secondary)" }}>
          Reason
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as ReportReason)}
          style={{
            width: "100%",
            height: 38,
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0 10px",
            marginBottom: 12,
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
          }}
        >
          {REPORT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <label style={{ display: "block", fontSize: 12, marginBottom: 6, color: "var(--text-secondary)" }}>
          Details (optional)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 500))}
          rows={4}
          maxLength={500}
          style={{
            width: "100%",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 10,
            fontSize: 13,
            resize: "vertical",
            marginBottom: 6,
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
          }}
        />
        <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right", marginBottom: 12 }}>
          {body.length}/500
        </div>

        {REQUIRE_TURNSTILE && (
          <>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js"
              strategy="lazyOnload"
            />
            <div
              className="cf-turnstile"
              data-sitekey={TURNSTILE_SITE_KEY ?? ""}
              style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}
            />
          </>
        )}

        {error && <div style={{ fontSize: 12, color: "var(--status-patched)", marginBottom: 10 }}>{error}</div>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: "100%",
            height: 44,
            border: "none",
            borderRadius: 8,
            background: "var(--accent)",
            color: "var(--accent-text)",
            fontSize: 14,
            fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Submitting..." : "Submit Report"}
        </button>
      </div>
    </div>
  );
}


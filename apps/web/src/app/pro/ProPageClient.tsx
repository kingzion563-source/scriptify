"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { ProBadge } from "@/components/ProBadge";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/useToast";

const PRO_FEATURES = [
  "Trending Boost button",
  "Pro badge",
  "Advanced analytics",
  "Private collections",
];

export function ProPageClient({ success, canceled }: { success: boolean; canceled: boolean }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const show = useToast();
  const handleGetPro = async () => {
    if (!user) {
      router.push("/login?return=/pro");
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ url: string }>("/api/v1/payments/create-checkout", {
        method: "POST",
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        show("Checkout URL not available.");
      }
    } catch (err) {
      show(err instanceof Error ? err.message : "Checkout failed. Try again.");
      const fallbackUrl = process.env.NEXT_PUBLIC_PRO_CHECKOUT_URL?.trim();
      if (fallbackUrl) window.location.href = fallbackUrl;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "48px 24px",
      }}
    >
      {success && (
        <div
          style={{
            marginBottom: 24,
            padding: "12px 16px",
            borderRadius: 8,
            background: "var(--status-bg-verified)",
            border: "1px solid var(--status-verified)",
            color: "var(--status-verified)",
            fontSize: 14,
          }}
        >
          You're now Pro! Welcome to Scriptify Pro.
        </div>
      )}
      {canceled && (
        <div
          style={{
            marginBottom: 24,
            padding: "12px 16px",
            borderRadius: 8,
            background: "var(--status-bg-testing)",
            border: "1px solid var(--status-testing)",
            color: "var(--status-testing)",
            fontSize: 14,
          }}
        >
          Checkout was canceled. You can try again whenever you're ready.
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Scriptify
        </h1>
        <ProBadge />
      </div>

      <p
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          marginBottom: 36,
          lineHeight: 1.6,
        }}
      >
        Unlock the full Scriptify experience.
      </p>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {PRO_FEATURES.map((feature) => (
          <li
            key={feature}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 15,
              color: "var(--text-primary)",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "var(--pro-gold-bg)",
                border: "1px solid var(--pro-gold)",
                flexShrink: 0,
              }}
            >
              <Check size={12} style={{ color: "var(--pro-gold)" }} strokeWidth={3} />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      {user?.isPro ? (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: "var(--pro-gold-bg)",
            border: "1px solid var(--pro-gold)",
            color: "var(--pro-gold)",
            fontSize: 14,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          You already have Scriptify Pro. Enjoy!
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGetPro}
          disabled={loading}
          style={{
            width: "100%",
            height: 44,
            background: "var(--accent)",
            color: "var(--accent-text)",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "opacity 150ms",
          }}
        >
          {loading ? (
            <span
              style={{
                width: 16,
                height: 16,
                border: "2px solid var(--bg-surface-3)",
                borderTopColor: "var(--accent-text)",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.7s linear infinite",
              }}
            />
          ) : null}
          {loading ? "Redirecting…" : "Get Pro"}
        </button>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

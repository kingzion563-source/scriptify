"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getApiUrl } from "@/lib/api";
import { getPasswordStrength, STRENGTH_COLORS } from "@/lib/passwordStrength";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Reset link is invalid or has expired.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/v1/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Reset link is invalid or has expired.");
        return;
      }
      router.push("/login?reset=success");
      router.refresh();
    } catch {
      setError("Reset link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center p-6">
      <div
        className="w-full max-w-[400px] rounded-lg border bg-white p-8"
        style={{
          borderWidth: "1px",
          borderColor: "var(--border)",
          borderRadius: 8,
          padding: 32,
        }}
      >
        <div className="mb-6 flex flex-col items-center">
          <img
            src="/logo.png"
            alt="Scriptify"
            className="mb-3 h-8 w-8 object-contain"
            width={32}
            height={32}
          />
          <h1
            className="font-bold"
            style={{ fontSize: 20 }}
          >
            Set a new password
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p
              className="text-sm"
              style={{ color: "var(--status-patched)" }}
              role="alert"
            >
              {error}
            </p>
          )}
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border bg-white py-2.5 px-3 text-base text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              style={{
                fontSize: 13,
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "10px 12px",
              }}
            />
            <div
              className="mt-2 flex gap-1"
              style={{ height: 4 }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-colors"
                  style={{
                    backgroundColor: i < strength ? STRENGTH_COLORS[Math.max(0, strength - 1)] : "var(--border-strong)",
                    borderRadius: 2,
                  }}
                />
              ))}
            </div>
          </div>
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-md border bg-white py-2.5 px-3 text-base text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            style={{
              fontSize: 13,
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "10px 12px",
            }}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md font-semibold transition-colors disabled:opacity-60"
            style={{
              height: 40,
              fontWeight: 600,
              background: "var(--accent)",
              color: "var(--accent-text)",
            }}
          >
            {loading ? "Setting…" : "Set Password"}
          </button>
        </form>

        <p className="mt-6 text-center" style={{ fontSize: 13 }}>
          <Link href="/login" className="text-link hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

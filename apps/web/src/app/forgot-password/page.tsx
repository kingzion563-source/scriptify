"use client";

import { useState } from "react";
import Link from "next/link";
import { getApiUrl } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/v1/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Something went wrong.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
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
            Reset your password
          </h1>
          <p
            className="mt-2 text-center"
            style={{ fontSize: 13, color: "var(--text-secondary)" }}
          >
            Enter your email and we will send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="text-sm text-status-patched" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p
              className="text-sm"
              style={{ fontSize: 13, color: "var(--status-verified)" }}
            >
              Check your email for a reset link
            </p>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
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
            {loading ? "Sending…" : "Send Reset Link"}
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

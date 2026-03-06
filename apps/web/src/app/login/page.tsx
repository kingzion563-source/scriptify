"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/lib/useToast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return") ?? "/";
  const resetSuccess = searchParams.get("reset") === "success";
  const login = useAuthStore((s) => s.login);
  const show = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      setError(msg);
      show(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center p-6">
      <div
        className="w-full max-w-[400px] rounded-lg border border-border bg-surface p-8"
        style={{
          borderWidth: "1px",
          borderRadius: "var(--radius-lg)",
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
            className="font-medium"
            style={{ fontSize: 20, letterSpacing: "-0.02em", color: "var(--nav-text)" }}
          >
            SCRIPTIFY
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {resetSuccess && (
            <p
              className="text-sm"
              style={{ color: "var(--status-verified)" }}
              role="status"
            >
              Successfully reset your password. Sign in to continue.
            </p>
          )}
          {error && (
            <p className="text-sm text-status-patched" role="alert">
              {error}
            </p>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-md border border-border bg-surface py-2.5 px-3 text-base text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ fontSize: 13 }}
          />
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-border bg-surface py-2.5 px-3 text-base text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ fontSize: 13 }}
            />
            <Link
              href="/forgot-password"
              className="mt-2 block text-sm text-link hover:underline"
              style={{ fontSize: 13 }}
            >
              Forgot password
            </Link>
          </div>
          <label className="flex cursor-pointer items-center gap-2" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ accentColor: "var(--accent)" }}
            />
            Remember me
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent py-2.5 font-semibold text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-60"
            style={{ fontSize: 13, height: 40 }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p
          className="mt-6 text-center text-muted"
          style={{ fontSize: 12 }}
        >
          or
        </p>
        <p className="mt-2 text-center" style={{ fontSize: 13 }}>
          <Link href="/register" className="text-link hover:underline">
            Do not have an account? Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

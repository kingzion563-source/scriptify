"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/lib/useToast";
import { getPasswordStrength, STRENGTH_COLORS } from "@/lib/passwordStrength";
import { isPasswordPwned } from "@/lib/hibp";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const show = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwned, setPwned] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);

  const handlePasswordBlur = useCallback(async () => {
    if (!password) {
      setPwned(null);
      return;
    }
    setPwned(null);
    try {
      const found = await isPasswordPwned(password);
      setPwned(found);
    } catch {
      setPwned(null);
    }
  }, [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pwned === true) {
      setError("This password has been seen in a data breach. Choose a different password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    let turnstileToken: string | undefined;
    if (siteKey) {
      const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        '[name="cf-turnstile-response"]'
      );
      turnstileToken = el?.value?.trim();
      // Only require token when the widget has actually loaded (element exists). If script failed to load, allow submit so registration can succeed.
      if (el && !turnstileToken) {
        setError("Please complete the security check.");
        return;
      }
    }
    setLoading(true);
    try {
      const body: {
        username: string;
        email: string;
        password: string;
        confirmPassword: string;
        turnstileToken?: string;
      } = { username, email, password, confirmPassword };
      if (siteKey && turnstileToken) {
        body.turnstileToken = turnstileToken;
      }
      await register(body);
      router.push("/");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setError(msg);
      show(msg);
    } finally {
      setLoading(false);
    }
  }

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center p-6">
      {siteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
        />
      )}
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
          {error && (
            <p className="text-sm text-status-patched" role="alert">
              {error}
            </p>
          )}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            pattern="^[a-zA-Z0-9_]+$"
            title="Letters, numbers, underscore only"
            className="w-full rounded-md border border-border bg-surface py-2.5 px-3 text-base text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ fontSize: 13 }}
          />
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
              onBlur={handlePasswordBlur}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-border bg-surface py-2.5 px-3 text-base text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ fontSize: 13 }}
            />
            {/* Password strength: 4 horizontal segments */}
            <div
              className="mt-2 flex gap-1"
              style={{ height: 4 }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-colors"
                  style={{
                    backgroundColor: i < strength ? STRENGTH_COLORS[strength - 1] : "var(--border-strong)",
                    borderRadius: 2,
                  }}
                />
              ))}
            </div>
            {pwned === true && (
              <p className="mt-2 text-sm text-status-patched">
                This password has been seen in a data breach. Choose a different password.
              </p>
            )}
          </div>
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full rounded-md border border-border bg-surface py-2.5 px-3 text-base text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ fontSize: 13 }}
          />
          {siteKey && (
            <div
              className="cf-turnstile flex justify-center"
              data-sitekey={siteKey}
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent py-2.5 font-semibold text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-60"
            style={{ fontSize: 13, height: 40 }}
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center" style={{ fontSize: 13 }}>
          <Link href="/login" className="text-link hover:underline">
            Already have an account? Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

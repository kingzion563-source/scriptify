"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      setStatus("error");
      return;
    }
    apiFetch<{ message: string }>("/api/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [mounted, token]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center p-6">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-solid border-transparent"
          style={{ borderTopColor: "black" }}
        />
      </div>
    );
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
        {status === "success" ? (
          <>
            <h1
              className="mb-2 text-center font-bold"
              style={{ fontSize: 20, color: "var(--nav-text)" }}
            >
              Email verified
            </h1>
            <p
              className="mb-6 text-center"
              style={{ fontSize: 13, color: "var(--text-secondary)" }}
            >
              Your account is verified. You can now publish scripts.
            </p>
            <Link
              href="/login"
              className="block w-full rounded-md bg-accent py-2.5 text-center font-semibold text-accent-text transition-colors hover:bg-accent-hover"
              style={{ fontSize: 13, height: 40 }}
            >
              Sign In
            </Link>
          </>
        ) : (
          <>
            <h1
              className="mb-2 text-center font-bold"
              style={{ fontSize: 20, color: "var(--nav-text)" }}
            >
              Verification failed
            </h1>
            <p
              className="mb-6 text-center"
              style={{ fontSize: 13, color: "var(--text-secondary)" }}
            >
              This link is invalid or has expired. Request a new one by
              registering again.
            </p>
            <Link
              href="/register"
              className="block w-full rounded-md border border-border bg-surface py-2.5 text-center font-semibold transition-colors hover:bg-surface-hover"
              style={{
                fontSize: 13,
                height: 40,
                color: "var(--text-primary)",
              }}
            >
              Register
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center p-6">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-solid border-transparent"
            style={{ borderTopColor: "black" }}
          />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

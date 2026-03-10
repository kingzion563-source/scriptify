export function getApiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!base) {
    if (process.env.NODE_ENV === "production") {
      console.error("NEXT_PUBLIC_API_URL is not set. API requests will fail.");
      throw new Error("NEXT_PUBLIC_API_URL is required in production.");
    }
    return `http://localhost:4000${path.startsWith("/") ? path : `/${path}`}`;
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("scriptify-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string | null } };
    const token = parsed?.state?.accessToken;
    return token ?? null;
  } catch {
    return null;
  }
}


export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  _retry = false
): Promise<T> {
  const url = getApiUrl(path);
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> =
    options.body != null && !isFormData
      ? { "Content-Type": "application/json", Accept: "application/json" }
      : { Accept: "application/json" };
  const token = getStoredAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  let data: unknown;
  const contentType = res.headers.get("content-type");
  const isJson = contentType?.includes("application/json");
  try {
    data = isJson ? await res.json() : null;
  } catch {
    if (!res.ok) {
      throw new Error(res.statusText || "Request failed");
    }
    throw new Error("Invalid response");
  }

  if (res.status === 429 && typeof window !== "undefined") {
    const resetHeader = res.headers.get("X-RateLimit-Reset");
    const reset = resetHeader ? Number(resetHeader) : NaN;
    if (Number.isFinite(reset) && reset > 0) {
      window.location.href = `/rate-limited?reset=${encodeURIComponent(String(reset))}`;
    } else {
      window.location.href = "/rate-limited";
    }
    throw new Error("Rate limited");
  }

  // On 401, attempt token refresh once via httpOnly cookie then retry
  if (res.status === 401 && !_retry && !path.startsWith("/api/v1/auth/")) {
    try {
      const refreshRes = await fetch(getApiUrl("/api/v1/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (refreshRes.ok) {
        const refreshData = (await refreshRes.json()) as {
          accessToken?: string;
          refreshToken?: string;
          user?: unknown;
        };
        if (typeof window !== "undefined") {
          try {
            const { useAuthStore } = await import("@/stores/authStore");
            useAuthStore.setState({
              accessToken: refreshData.accessToken ?? null,
              user: (refreshData.user ?? useAuthStore.getState().user) as Parameters<typeof useAuthStore.setState>[0] extends { user?: infer U } ? U : never,
            });
          } catch {
            // ignore store update failure
          }
        }
        return apiFetch<T>(path, options, true);
      }
    } catch {
      // refresh network error — fall through to clear auth
    }
    // Refresh failed — clear auth
    if (typeof window !== "undefined") {
      try {
        const { useAuthStore } = await import("@/stores/authStore");
        useAuthStore.getState().clearAuth();
      } catch {
        // ignore
      }
    }
  }

  if (!res.ok) {
    const message =
      (data != null && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string")
        ? (data as { error: string }).error
        : res.statusText || "Request failed";
    throw new Error(message);
  }

  return data as T;
}

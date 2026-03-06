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

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(path);
  const headers: Record<string, string> =
    options.body != null
      ? { "Content-Type": "application/json", Accept: "application/json" }
      : { Accept: "application/json" };
  const res = await fetch(url, {
    ...options,
    credentials: "include",
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

  if (!res.ok) {
    const message =
      (data != null && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string")
        ? (data as { error: string }).error
        : res.statusText || "Request failed";
    throw new Error(message);
  }

  return data as T;
}

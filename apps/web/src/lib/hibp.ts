/**
 * Check if password has been seen in a breach using HaveIBeenPwned k-anonymity API.
 * Password is hashed with SHA-1 locally; only first 5 chars of hash are sent.
 * TODO(MVP): Fail open is intentional — on error/timeout (3000ms) we return false so
 * registration is not blocked. Consider failing closed or surfacing a warning in production.
 */
export async function isPasswordPwned(password: string): Promise<boolean> {
  const timeoutMs = 3000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { Accept: "text/plain" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return false;
    const text = await res.text();
    const lines = text.split("\r\n");
    return lines.some((line) => {
      const [s] = line.split(":");
      return s?.trim() === suffix;
    });
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Returns a strength score 0-4 for the password (for 4 segments: grey, red, orange, green).
 */
export function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

export const STRENGTH_COLORS = [
  "var(--border-strong)", // grey
  "var(--status-patched)", // red
  "var(--status-testing)", // orange
  "var(--status-verified)", // green
] as const;

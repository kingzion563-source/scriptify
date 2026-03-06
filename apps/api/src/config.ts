export const AUTH = {
  ACCESS_TOKEN_EXPIRY: "15m",
  ACCESS_TOKEN_EXPIRY_MS: 15 * 60 * 1000,
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  REFRESH_TOKEN_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,
  BCRYPT_ROUNDS: 12,
  ACCESS_COOKIE_NAME: "scriptify_access",
  REFRESH_COOKIE_NAME: "scriptify_refresh",
} as const;

export function getEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === "") {
    throw new Error(`Missing env: ${name}`);
  }
  return v;
}

export function getEnvOptional(name: string): string | undefined {
  return process.env[name];
}

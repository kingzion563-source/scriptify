export const AUTH = {
  ACCESS_TOKEN_EXPIRY: "15m",
  ACCESS_TOKEN_EXPIRY_MS: 15 * 60 * 1000,         // 15 minutes
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  REFRESH_TOKEN_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  REMEMBER_ME_EXPIRY_MS: 30 * 24 * 60 * 60 * 1000,  // 30 days
  BCRYPT_ROUNDS: 12,
  ACCESS_COOKIE_NAME: "scriptify_access",
  REFRESH_COOKIE_NAME: "scriptify_refresh",
} as const;

export const LIMITS = {
  RAW_CODE_MAX_BYTES: 512 * 1024,  // 512 KB
  COVER_MAX_BYTES: 2 * 1024 * 1024, // 2 MB
  TITLE_MAX_LENGTH: 80,
  DESCRIPTION_MAX_LENGTH: 2000,
  TAG_MAX_LENGTH: 30,
  TAGS_MAX_COUNT: 10,
  SCRIPTS_PAGE_SIZE: 20,
  COMMENTS_PAGE_SIZE: 20,
  PASSWORD_RESET_EXPIRY_MS: 60 * 60 * 1000, // 1 hour
  EMAIL_VERIFY_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
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

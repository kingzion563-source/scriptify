import { Response } from "express";
import { AUTH } from "../config.js";

const isProduction = process.env.NODE_ENV === "production";
const COOKIE_BASE = {
  httpOnly: true,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  secure: isProduction,
  path: "/",
};

export function setAccessCookie(res: Response, token: string, maxAgeMs?: number): void {
  res.cookie(AUTH.ACCESS_COOKIE_NAME, token, {
    ...COOKIE_BASE,
    maxAge: maxAgeMs ?? AUTH.ACCESS_TOKEN_EXPIRY_MS,
  });
}

export function setRefreshCookie(res: Response, token: string, maxAgeMs?: number): void {
  res.cookie(AUTH.REFRESH_COOKIE_NAME, token, {
    ...COOKIE_BASE,
    maxAge: maxAgeMs ?? AUTH.REFRESH_TOKEN_EXPIRY_MS,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(AUTH.ACCESS_COOKIE_NAME, { ...COOKIE_BASE, path: "/" });
  res.clearCookie(AUTH.REFRESH_COOKIE_NAME, { ...COOKIE_BASE, path: "/" });
}

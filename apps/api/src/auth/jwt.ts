import jwt from "jsonwebtoken";
import { getEnv } from "../config.js";
import { AUTH } from "../config.js";

let _secret: string | null = null;
function getSecret(): string {
  if (!_secret) _secret = getEnv("JWT_SECRET");
  return _secret;
}

export interface AccessPayload {
  sub: string;
  username: string;
  type: "access";
}

export function signAccessToken(payload: Omit<AccessPayload, "type">): string {
  return jwt.sign(
    { ...payload, type: "access" } as AccessPayload,
    getSecret(),
    { expiresIn: AUTH.ACCESS_TOKEN_EXPIRY }
  );
}

export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as AccessPayload;
    if (decoded.type !== "access") return null;
    return decoded;
  } catch {
    return null;
  }
}

import { Request, Response, NextFunction } from "express";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getEnvOptional } from "../config.js";

let loginLimiter: Ratelimit | null = null;
let registerLimiter: Ratelimit | null = null;

function getRedis(): Redis | null {
  const url = getEnvOptional("UPSTASH_REDIS_REST_URL");
  const token = getEnvOptional("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getLoginLimiter(): Ratelimit | null {
  if (loginLimiter) return loginLimiter;
  const redis = getRedis();
  if (!redis) return null;
  loginLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "scriptify:ratelimit:login",
  });
  return loginLimiter;
}

function getRegisterLimiter(): Ratelimit | null {
  if (registerLimiter) return registerLimiter;
  const redis = getRedis();
  if (!redis) return null;
  registerLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "scriptify:ratelimit:register",
  });
  return registerLimiter;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
  }
  return req.socket.remoteAddress ?? "unknown";
}

export async function rateLimitLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const limiter = getLoginLimiter();
  if (!limiter) {
    next();
    return;
  }
  const ip = getClientIp(req);
  const { success, remaining, reset } = await limiter.limit(ip);
  res.setHeader("X-RateLimit-Limit", "5");
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(reset));
  if (!success) {
    res.status(429).json({
      error: "Too many login attempts. Try again later.",
    });
    return;
  }
  next();
}

export async function rateLimitRegister(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const limiter = getRegisterLimiter();
  if (!limiter) {
    next();
    return;
  }
  const ip = getClientIp(req);
  const { success, remaining, reset } = await limiter.limit(ip);
  res.setHeader("X-RateLimit-Limit", "3");
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(reset));
  if (!success) {
    res.status(429).json({
      error: "Too many registration attempts. Try again later.",
    });
    return;
  }
  next();
}

let commentsLimiter: Ratelimit | null = null;

function getCommentsLimiter(): Ratelimit | null {
  if (commentsLimiter) return commentsLimiter;
  const redis = getRedis();
  if (!redis) return null;
  commentsLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    prefix: "scriptify:ratelimit:comments",
  });
  return commentsLimiter;
}

export async function rateLimitComments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = (req as Request & { user?: { id: string } }).user;
  if (!user?.id) {
    next();
    return;
  }
  const limiter = getCommentsLimiter();
  if (!limiter) {
    next();
    return;
  }
  const key = `user:${user.id}`;
  const { success, remaining, reset } = await limiter.limit(key);
  res.setHeader("X-RateLimit-Limit", "20");
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(reset));
  if (!success) {
    res.status(429).json({
      error: "Comment limit reached. Try again in a minute.",
    });
    return;
  }
  next();
}

let publishLimiter: Ratelimit | null = null;

function getPublishLimiter(): Ratelimit | null {
  if (publishLimiter) return publishLimiter;
  const redis = getRedis();
  if (!redis) return null;
  publishLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "scriptify:ratelimit:publish",
  });
  return publishLimiter;
}

export async function rateLimitPublish(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = (req as Request & { user?: { id: string } }).user;
  if (!user?.id) {
    next();
    return;
  }
  const limiter = getPublishLimiter();
  if (!limiter) {
    next();
    return;
  }
  const key = `user:${user.id}`;
  const { success, remaining, reset } = await limiter.limit(key);
  res.setHeader("X-RateLimit-Limit", "5");
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(reset));
  if (!success) {
    res.status(429).json({
      error: "Publish limit reached. You can publish up to 5 scripts per hour.",
    });
    return;
  }
  next();
}

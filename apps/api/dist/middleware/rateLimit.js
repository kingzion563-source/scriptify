import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getEnvOptional } from "../config.js";
let loginLimiter = null;
let registerLimiter = null;
function getRedis() {
    const url = getEnvOptional("UPSTASH_REDIS_REST_URL");
    const token = getEnvOptional("UPSTASH_REDIS_REST_TOKEN");
    if (!url || !token)
        return null;
    return new Redis({ url, token });
}
function getLoginLimiter() {
    if (loginLimiter)
        return loginLimiter;
    const redis = getRedis();
    if (!redis)
        return null;
    loginLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "15 m"),
        prefix: "scriptify:ratelimit:login",
    });
    return loginLimiter;
}
function getRegisterLimiter() {
    if (registerLimiter)
        return registerLimiter;
    const redis = getRedis();
    if (!redis)
        return null;
    registerLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, "1 h"),
        prefix: "scriptify:ratelimit:register",
    });
    return registerLimiter;
}
function getClientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
        return forwarded.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
    }
    return req.socket.remoteAddress ?? "unknown";
}
export async function rateLimitLogin(req, res, next) {
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
export async function rateLimitRegister(req, res, next) {
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
let commentsLimiter = null;
function getCommentsLimiter() {
    if (commentsLimiter)
        return commentsLimiter;
    const redis = getRedis();
    if (!redis)
        return null;
    commentsLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 m"),
        prefix: "scriptify:ratelimit:comments",
    });
    return commentsLimiter;
}
export async function rateLimitComments(req, res, next) {
    const user = req.user;
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
let aiAnalyzeLimiter = null;
function getAiAnalyzeLimiter() {
    if (aiAnalyzeLimiter)
        return aiAnalyzeLimiter;
    const redis = getRedis();
    if (!redis)
        return null;
    aiAnalyzeLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 h"),
        prefix: "scriptify:ratelimit:ai-analyze",
    });
    return aiAnalyzeLimiter;
}
export async function rateLimitAiAnalyze(req, res, next) {
    const limiter = getAiAnalyzeLimiter();
    if (!limiter) {
        next();
        return;
    }
    const ip = getClientIp(req);
    const { success, remaining, reset } = await limiter.limit(ip);
    res.setHeader("X-RateLimit-Limit", "20");
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(reset));
    if (!success) {
        res.status(429).json({
            error: "Too many AI analysis requests. Try again later.",
        });
        return;
    }
    next();
}
let publishLimiter = null;
function getPublishLimiter() {
    if (publishLimiter)
        return publishLimiter;
    const redis = getRedis();
    if (!redis)
        return null;
    publishLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        prefix: "scriptify:ratelimit:publish",
    });
    return publishLimiter;
}
export async function rateLimitPublish(req, res, next) {
    const user = req.user;
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

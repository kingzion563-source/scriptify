import { Router } from "express";
import bcrypt from "bcrypt";
import { PrismaClient } from "@scriptify/db";
import { signAccessToken } from "../../auth/jwt.js";
import { setAccessCookie, setRefreshCookie, clearAuthCookies, } from "../../auth/cookies.js";
import { createRefreshToken, findRefreshToken, revokeFamily, markRefreshTokenUsed, generateToken, } from "../../auth/refreshToken.js";
import { setPasswordResetToken, consumePasswordResetToken, } from "../../auth/emailTokens.js";
import { rateLimitLogin } from "../../middleware/rateLimit.js";
import { rateLimitRegister } from "../../middleware/rateLimit.js";
import { AUTH } from "../../config.js";
import { addXpJob } from "../../lib/xpQueue.js";
import { registerSchema, loginSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema, } from "./schemas.js";
const router = Router();
const prisma = new PrismaClient();
// POST /api/v1/auth/register — rate limit 3 per hour per IP
router.post("/register", rateLimitRegister, async (req, res) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten().fieldErrors,
            });
            return;
        }
        const { username, password, turnstileToken } = parsed.data;
        const email = parsed.data.email.toLowerCase();
        const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
        if (turnstileSecret && turnstileToken) {
            try {
                const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        secret: turnstileSecret,
                        response: turnstileToken,
                        remoteip: req.headers["x-forwarded-for"] ?? req.socket.remoteAddress,
                    }),
                });
                const data = (await verifyRes.json());
                if (!data.success) {
                    res.status(400).json({ error: "Turnstile verification failed" });
                    return;
                }
            }
            catch {
                res.status(400).json({ error: "Turnstile verification failed" });
                return;
            }
        }
        else if (turnstileSecret && !turnstileToken) {
            res.status(400).json({ error: "Turnstile token required" });
            return;
        }
        const existing = await prisma.user.findFirst({
            where: {
                OR: [{ email: email }, { username: username.toLowerCase() }],
            },
        });
        if (existing) {
            res.status(409).json({
                error: existing.email === email
                    ? "Email already registered"
                    : "Username already taken",
            });
            return;
        }
        const passwordHash = await bcrypt.hash(password, AUTH.BCRYPT_ROUNDS);
        const user = await prisma.user.create({
            data: {
                username: username.toLowerCase(),
                email: email,
                passwordHash,
            },
        });
        const familyId = generateToken();
        const { token: refreshToken } = await createRefreshToken(user.id, familyId);
        const accessToken = signAccessToken({
            sub: user.id,
            username: user.username,
        });
        setAccessCookie(res, accessToken);
        setRefreshCookie(res, refreshToken);
        res.status(201).json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                isPro: user.isPro,
                level: user.level,
                avatarUrl: user.avatarUrl,
                followingCount: user.followingCount,
            },
        });
    }
    catch (err) {
        console.error("Register error:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Registration failed. Please try again." });
        }
    }
});
// POST /api/v1/auth/login — rate limit 5 per 15 min per IP
router.post("/login", rateLimitLogin, async (req, res) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten().fieldErrors,
            });
            return;
        }
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!user ||
            user.isBanned ||
            !(await bcrypt.compare(password, user.passwordHash))) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }
        await prisma.user.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() },
        });
        const familyId = generateToken();
        const { token: refreshToken } = await createRefreshToken(user.id, familyId);
        const accessToken = signAccessToken({
            sub: user.id,
            username: user.username,
        });
        setAccessCookie(res, accessToken);
        setRefreshCookie(res, refreshToken);
        await addXpJob({ eventType: "daily_login", userId: user.id });
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                isPro: user.isPro,
                level: user.level,
                avatarUrl: user.avatarUrl,
                followingCount: user.followingCount,
            },
        });
    }
    catch (err) {
        console.error("Login error:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Sign in failed. Please try again." });
        }
    }
});
// POST /api/v1/auth/logout
router.post("/logout", (req, res) => {
    clearAuthCookies(res);
    res.json({ ok: true });
});
// POST /api/v1/auth/refresh — rotating refresh token
router.post("/refresh", async (req, res) => {
    try {
        const refreshToken = req.cookies?.[AUTH.REFRESH_COOKIE_NAME];
        if (!refreshToken) {
            clearAuthCookies(res);
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const stored = await findRefreshToken(refreshToken);
        if (!stored) {
            clearAuthCookies(res);
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (stored.expiresAt < new Date()) {
            await revokeFamily(stored.family);
            clearAuthCookies(res);
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (stored.isRevoked) {
            await revokeFamily(stored.family);
            clearAuthCookies(res);
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        await markRefreshTokenUsed(refreshToken);
        const { token: newRefreshToken } = await createRefreshToken(stored.userId, stored.family);
        const accessToken = signAccessToken({
            sub: stored.user.id,
            username: stored.user.username,
        });
        setAccessCookie(res, accessToken);
        setRefreshCookie(res, newRefreshToken);
        res.json({
            user: {
                id: stored.user.id,
                username: stored.user.username,
                email: stored.user.email,
                role: stored.user.role,
                isPro: stored.user.isPro,
                level: stored.user.level,
                avatarUrl: stored.user.avatarUrl,
                followingCount: stored.user.followingCount,
            },
        });
    }
    catch (err) {
        console.error("Refresh error:", err);
        clearAuthCookies(res);
        if (!res.headersSent) {
            res.status(401).json({ error: "Unauthorized" });
        }
    }
});
// POST /api/v1/auth/verify-email
router.post("/verify-email", async (req, res) => {
    const parsed = verifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: "Validation failed",
            details: parsed.error.flatten().fieldErrors,
        });
        return;
    }
    // Stub: in production, look up verification token in DB and set user.isVerified
    res.json({ message: "Email verification link sent or already verified" });
});
// POST /api/v1/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: "Validation failed",
            details: parsed.error.flatten().fieldErrors,
        });
        return;
    }
    const { email } = parsed.data;
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
    });
    if (user) {
        const token = generateToken();
        setPasswordResetToken(email.toLowerCase(), user.id, token);
        // TODO: send email via Resend with link containing token
    }
    res.json({
        message: "If an account exists with this email, you will receive a reset link.",
    });
});
// POST /api/v1/auth/reset-password
router.post("/reset-password", async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: "Validation failed",
            details: parsed.error.flatten().fieldErrors,
        });
        return;
    }
    const { token, password } = parsed.data;
    const payload = consumePasswordResetToken(token);
    if (!payload) {
        res.status(400).json({ error: "Invalid or expired reset token" });
        return;
    }
    const passwordHash = await bcrypt.hash(password, AUTH.BCRYPT_ROUNDS);
    await prisma.user.update({
        where: { id: payload.userId },
        data: { passwordHash },
    });
    res.json({ message: "Password reset successfully" });
});
export default router;

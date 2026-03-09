import { Router, Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import prisma from "../../lib/prisma.js";
import { signAccessToken } from "../../auth/jwt.js";
import {
  setAccessCookie,
  setRefreshCookie,
  clearAuthCookies,
} from "../../auth/cookies.js";
import {
  createRefreshToken,
  findRefreshToken,
  revokeFamily,
  markRefreshTokenUsed,
  generateToken,
} from "../../auth/refreshToken.js";
import { rateLimitLogin } from "../../middleware/rateLimit.js";
import { rateLimitRegister } from "../../middleware/rateLimit.js";
import { AUTH } from "../../config.js";
import { addXpJob } from "../../lib/xpQueue.js";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./schemas.js";

const router = Router();

// POST /api/v1/auth/register — rate limit 3 per hour per IP
router.post(
  "/register",
  rateLimitRegister,
  async (req: Request, res: Response): Promise<void> => {
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

      if (process.env.TURNSTILE_SECRET_KEY && turnstileToken) {
        try {
          const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
          const verifyRes = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                secret: turnstileSecret,
                response: turnstileToken,
                remoteip: req.headers["x-forwarded-for"] ?? req.socket.remoteAddress,
              }),
            }
          );
          const data = (await verifyRes.json()) as { success?: boolean };
          if (!data.success) {
            res.status(400).json({ error: "Turnstile verification failed" });
            return;
          }
        } catch {
          res.status(400).json({ error: "Turnstile verification failed" });
          return;
        }
      } else if (process.env.TURNSTILE_SECRET_KEY && !turnstileToken) {
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
          error:
            existing.email === email
              ? "Email already in use"
              : "Username already taken",
        });
        return;
      }

      const passwordHash = await bcrypt.hash(password, AUTH.BCRYPT_ROUNDS);
      // TODO(MVP): New users are marked verified without email verification. Add verification flow later.
      const user = await prisma.user.create({
        data: {
          username: username.toLowerCase(),
          email: email,
          passwordHash,
          isVerified: true,
        },
      });

      const familyId = generateToken();
      const { token: refreshToken } = await createRefreshToken(user.id, familyId);
      const accessToken = signAccessToken({
        sub: user.id,
        username: user.username,
      });

      const ACCESS_MAX_AGE_MS = 900 * 1000;
      const REFRESH_MAX_AGE_MS = 604800 * 1000;
      setAccessCookie(res, accessToken, ACCESS_MAX_AGE_MS);
      setRefreshCookie(res, refreshToken, REFRESH_MAX_AGE_MS);

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
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Registration failed. Please try again." });
      }
    }
  }
);

// POST /api/v1/auth/login — rate limit 5 per 15 min per IP
router.post(
  "/login",
  rateLimitLogin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }
      const { email, password, rememberMe } = parsed.data;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (
        !user ||
        user.isBanned ||
        !(await bcrypt.compare(password, user.passwordHash))
      ) {
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

      const ACCESS_MAX_AGE_MS = 900 * 1000;
      const REFRESH_MAX_AGE_MS = rememberMe === true ? 2592000 * 1000 : 604800 * 1000;
      setAccessCookie(res, accessToken, ACCESS_MAX_AGE_MS);
      setRefreshCookie(res, refreshToken, REFRESH_MAX_AGE_MS);

      try {
        await addXpJob({ eventType: "daily_login", userId: user.id });
      } catch (xpErr) {
        console.warn("XP job failed (non-fatal):", xpErr);
      }

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
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Sign in failed. Please try again." });
      }
    }
  }
);

// POST /api/v1/auth/logout
router.post("/logout", (req: Request, res: Response): void => {
  clearAuthCookies(res);
  res.json({ ok: true });
});

// POST /api/v1/auth/refresh — rotating refresh token
router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
  try {
    let refreshToken = req.cookies?.[AUTH.REFRESH_COOKIE_NAME];
    if (!refreshToken && req.body?.refreshToken) refreshToken = req.body.refreshToken;
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
    const { token: newRefreshToken } = await createRefreshToken(
      stored.userId,
      stored.family
    );
    const accessToken = signAccessToken({
      sub: stored.user.id,
      username: stored.user.username,
    });

    const ACCESS_MAX_AGE_MS = 900 * 1000;
    const REFRESH_MAX_AGE_MS = 604800 * 1000;
    setAccessCookie(res, accessToken, ACCESS_MAX_AGE_MS);
    setRefreshCookie(res, newRefreshToken, REFRESH_MAX_AGE_MS);

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
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch {
    clearAuthCookies(res);
    if (!res.headersSent) {
      res.status(401).json({ error: "Unauthorized" });
    }
  }
});

// POST /api/v1/auth/verify-email
router.post(
  "/verify-email",
  async (req: Request, res: Response): Promise<void> => {
    const parsed = verifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const { token } = parsed.data;
    const now = new Date();
    const record = await prisma.emailVerificationToken.findFirst({
      where: { token, expiresAt: { gt: now } },
    });
    if (!record) {
      res.status(400).json({
        message: "Verification link is invalid or has expired",
      });
      return;
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { isVerified: true },
      }),
      prisma.emailVerificationToken.delete({
        where: { id: record.id },
      }),
    ]);
    res.status(200).json({ message: "Email verified successfully" });
  }
);

// POST /api/v1/auth/forgot-password
router.post(
  "/forgot-password",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }
      const { email } = parsed.data;
      const emailLower = email.toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email: emailLower },
      });
      if (user) {
        const resetToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await prisma.passwordResetToken.create({
          data: { userId: user.id, token: resetToken, expiresAt },
        });
        res.status(200).json({
          message: "If an account exists with this email, you will receive a reset link.",
        });
        return;
      }
      res.status(200).json({
        message:
          "If an account exists with this email, you will receive a reset link.",
      });
    } catch {
      if (!res.headersSent) {
        res.status(200).json({
          message:
            "If an account exists with this email, you will receive a reset link.",
        });
      }
    }
  }
);

// POST /api/v1/auth/reset-password
router.post(
  "/reset-password",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }
      const { token, password } = parsed.data;
      const now = new Date();
      const resetRecord = await prisma.passwordResetToken.findFirst({
        where: {
          token,
          used: false,
          expiresAt: { gt: now },
        },
        include: { user: true },
      });
      if (!resetRecord) {
        res.status(400).json({
          error: "Reset link is invalid or has expired.",
        });
        return;
      }
      const passwordHash = await bcrypt.hash(password, AUTH.BCRYPT_ROUNDS);
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetRecord.userId },
          data: { passwordHash },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetRecord.id },
          data: { used: true },
        }),
      ]);
      await prisma.refreshToken.updateMany({
        where: { userId: resetRecord.userId },
        data: { isRevoked: true },
      });
      clearAuthCookies(res);
      res.status(200).json({ message: "Password reset successfully" });
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ error: "Something went wrong. Please try again." });
      }
    }
  }
);

export default router;

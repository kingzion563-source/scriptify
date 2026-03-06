import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth/jwt.js";
import prisma from "../lib/prisma.js";
import { AUTH } from "../config.js";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  isBanned: boolean;
  isPro: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.[AUTH.ACCESS_COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isBanned: true,
      isPro: true,
    },
  });
  if (!user || user.isBanned) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.user = user as AuthUser;
  next();
}

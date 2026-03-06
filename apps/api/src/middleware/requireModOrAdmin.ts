import type { Request, Response, NextFunction } from "express";

export function requireModOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const role = req.user?.role;
  if (role === "MOD" || role === "ADMIN") {
    next();
    return;
  }
  res.status(403).json({ error: "Moderator access required." });
}


import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import { authenticateToken } from "../../middleware/authenticateToken.js";

const router = Router();

// ─── GET /api/v1/notifications ───────────────────────────────────────────────
router.get("/", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    res.json({
      notifications: notifications.map((n: { id: string; type: string; actorId: string | null; targetType: string | null; targetId: string | null; targetUrl: string | null; isRead: boolean; createdAt: Date }) => ({
        id: n.id,
        type: n.type,
        actorId: n.actorId,
        targetType: n.targetType,
        targetId: n.targetId,
        targetUrl: n.targetUrl,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      unreadCount,
    });
  } catch {
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// ─── PATCH /api/v1/notifications/read-all ─────────────────────────────────────
router.patch(
  "/read-all",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      await prisma.notification.updateMany({
        where: { userId },
        data: { isRead: true },
      });

      res.json({ ok: true });
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

// ─── PATCH /api/v1/notifications/:id/read ─────────────────────────────────────
router.patch(
  "/:id/read",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const notification = await prisma.notification.findFirst({
        where: { id, userId },
      });
      if (!notification) {
        res.status(404).json({ error: "Notification not found" });
        return;
      }

      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });

      res.json({ ok: true });
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

export default router;

import { Router } from "express";
import { PrismaClient } from "@scriptify/db";
import { authenticateToken } from "../../middleware/authenticateToken.js";
const router = Router();
const prisma = new PrismaClient();
// ─── GET /api/v1/notifications ───────────────────────────────────────────────
router.get("/", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
    });
    const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false },
    });
    res.json({
        notifications: notifications.map((n) => ({
            id: n.id,
            type: n.type,
            actorId: n.actorId,
            targetType: n.targetType,
            targetId: n.targetId,
            isRead: n.isRead,
            createdAt: n.createdAt,
        })),
        unreadCount,
    });
});
// ─── PATCH /api/v1/notifications/read-all ─────────────────────────────────────
router.patch("/read-all", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    await prisma.notification.updateMany({
        where: { userId },
        data: { isRead: true },
    });
    res.json({ ok: true });
});
export default router;

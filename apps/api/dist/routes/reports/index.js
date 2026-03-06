import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@scriptify/db";
import { authenticateToken } from "../../middleware/authenticateToken.js";
const router = Router();
const prisma = new PrismaClient();
const createReportSchema = z.object({
    targetType: z.enum(["SCRIPT", "COMMENT"]),
    targetId: z.string().cuid(),
    reason: z.enum(["MALWARE", "STOLEN", "BROKEN", "SPAM", "NSFW", "OTHER"]),
    body: z.string().max(500).optional().nullable(),
    turnstileToken: z.string().min(1),
});
router.post("/", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const parsed = createReportSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: "Validation failed",
            details: parsed.error.flatten().fieldErrors,
        });
        return;
    }
    const { targetType, targetId, reason, body, turnstileToken } = parsed.data;
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
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
            const result = (await verifyRes.json());
            if (!result.success) {
                res.status(400).json({ error: "Turnstile verification failed" });
                return;
            }
        }
        catch {
            res.status(400).json({ error: "Turnstile verification failed" });
            return;
        }
    }
    if (targetType === "SCRIPT") {
        const script = await prisma.script.findUnique({
            where: { id: targetId },
            select: { id: true },
        });
        if (!script) {
            res.status(404).json({ error: "Script not found" });
            return;
        }
    }
    else {
        const comment = await prisma.comment.findUnique({
            where: { id: targetId },
            select: { id: true, scriptId: true },
        });
        if (!comment) {
            res.status(404).json({ error: "Comment not found" });
            return;
        }
    }
    const existing = await prisma.report.findFirst({
        where: {
            reporterId: userId,
            targetType,
            targetId,
            status: "PENDING",
        },
        select: { id: true },
    });
    if (existing) {
        res.status(409).json({ error: "You already reported this item." });
        return;
    }
    const report = await prisma.report.create({
        data: {
            reporterId: userId,
            targetType,
            targetId,
            scriptId: targetType === "SCRIPT" ? targetId : null,
            commentId: targetType === "COMMENT" ? targetId : null,
            reason,
            body: body ?? null,
            status: "PENDING",
        },
        select: { id: true, targetType: true, targetId: true },
    });
    if (targetType === "SCRIPT") {
        const updated = await prisma.script.update({
            where: { id: targetId },
            data: { reportCount: { increment: 1 } },
            select: { reportCount: true },
        });
        if (updated.reportCount >= 3) {
            await prisma.script.update({
                where: { id: targetId },
                data: { isPublished: false },
            });
        }
    }
    res.status(201).json({ report });
});
export default router;

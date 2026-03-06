import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma.js";
import { authenticateToken } from "../../middleware/authenticateToken.js";
import { requireModOrAdmin } from "../../middleware/requireModOrAdmin.js";
import { addNotificationJob } from "../../lib/notificationsQueue.js";

const router = Router();

router.use(authenticateToken, requireModOrAdmin);

const reportsFilterSchema = z.object({
  targetType: z.enum(["SCRIPT", "COMMENT"]).optional(),
  reason: z.enum(["MALWARE", "STOLEN", "BROKEN", "SPAM", "NSFW", "OTHER"]).optional(),
  aiScore: z.coerce.number().min(0).max(100).optional(),
});

// GET /api/v1/mod/reports?targetType=&reason=&aiScore=
router.get("/reports", async (req: Request, res: Response): Promise<void> => {
  const parsed = reportsFilterSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid filter params." });
    return;
  }
  const { targetType, reason, aiScore } = parsed.data;

  const reports = await prisma.report.findMany({
    where: {
      status: "PENDING",
      ...(targetType ? { targetType } : {}),
      ...(reason ? { reason } : {}),
      ...(aiScore != null
        ? {
            script: {
              aiSafetyScore: { gte: aiScore },
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: {
        select: { id: true, username: true, trustScore: true },
      },
      script: {
        select: {
          id: true,
          slug: true,
          title: true,
          coverUrl: true,
          status: true,
          aiSafetyScore: true,
          isPublished: true,
          reportCount: true,
          authorId: true,
          author: { select: { id: true, username: true } },
          game: { select: { name: true, slug: true } },
          tags: { include: { tag: { select: { name: true } } } },
          likeCount: true,
          viewCount: true,
          copyCount: true,
          rawCode: true,
        },
      },
      comment: {
        select: {
          id: true,
          body: true,
          userId: true,
          scriptId: true,
          script: {
            select: {
              id: true,
              slug: true,
              title: true,
              coverUrl: true,
              aiSafetyScore: true,
              authorId: true,
              author: { select: { id: true, username: true } },
            },
          },
        },
      },
    },
    take: 100,
  });

  res.json({
    reports: reports.map((r) => {
      const script = (r.script ?? r.comment?.script ?? null) as
        | {
            id: string;
            slug: string;
            title: string;
            coverUrl: string | null;
            aiSafetyScore: number | null;
            authorId: string;
            author: { username: string };
            game?: { name: string; slug: string } | null;
            status?: string;
            likeCount?: number;
            viewCount?: number;
            copyCount?: number;
            tags?: Array<{ tag: { name: string } }>;
            rawCode?: string;
            reportCount?: number;
            isPublished?: boolean;
          }
        | null;
      return {
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        body: r.body,
        createdAt: r.createdAt,
        reporter: r.reporter,
        aiScan: script
          ? {
              safetyScore: script.aiSafetyScore,
              flagged: (script.aiSafetyScore ?? 100) < 50,
              label: (script.aiSafetyScore ?? 100) < 50 ? "AI flagged" : "AI pass",
            }
          : null,
        script: script
          ? {
              id: script.id,
              slug: script.slug,
              title: script.title,
              coverUrl: script.coverUrl,
              gameName: "game" in script ? script.game?.name ?? "" : "",
              gameSlug: "game" in script ? script.game?.slug ?? "" : "",
              status: (script.status ?? "TESTING").toLowerCase(),
              likeCount: "likeCount" in script ? script.likeCount : 0,
              viewCount: "viewCount" in script ? script.viewCount : 0,
              copyCount: "copyCount" in script ? script.copyCount : 0,
              tags:
                script.tags
                  ? script.tags.map((t: { tag: { name: string } }) => t.tag.name)
                  : [],
              rawCode: "rawCode" in script ? script.rawCode : "",
              authorId: script.authorId,
              authorUsername: script.author.username,
              reportCount: "reportCount" in script ? script.reportCount : 0,
              isPublished: "isPublished" in script ? script.isPublished : false,
            }
          : null,
        comment: r.comment
          ? {
              id: r.comment.id,
              body: r.comment.body,
              userId: r.comment.userId,
              scriptId: r.comment.scriptId,
            }
          : null,
      };
    }),
  });
});

const resolveSchema = z.object({
  action: z
    .enum([
      "RESOLVE_ONLY",
      "APPROVE_SCRIPT",
      "REMOVE_SCRIPT",
      "WARN_AUTHOR",
      "BAN_AUTHOR",
      "SHADOWBAN_AUTHOR",
    ])
    .default("RESOLVE_ONLY"),
  banReason: z.string().max(200).optional(),
});

// POST /api/v1/mod/reports/:id/resolve
router.post("/reports/:id/resolve", async (req: Request, res: Response): Promise<void> => {
  const moderatorId = req.user!.id;
  const reportId = req.params.id;
  const parsed = resolveSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid resolve payload." });
    return;
  }
  const { action, banReason } = parsed.data;

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      script: { select: { id: true, authorId: true } },
      comment: {
        select: {
          id: true,
          userId: true,
          script: { select: { id: true, authorId: true } },
        },
      },
    },
  });
  if (!report) {
    res.status(404).json({ error: "Report not found." });
    return;
  }

  const targetScriptId = report.script?.id ?? report.comment?.script.id ?? null;
  const authorId =
    report.script?.authorId ??
    report.comment?.script.authorId ??
    report.comment?.userId ??
    null;

  if (action === "APPROVE_SCRIPT" && targetScriptId) {
    await prisma.script.update({
      where: { id: targetScriptId },
      data: { isPublished: true },
    });
    if (authorId) {
      const script = await prisma.script.findUnique({
        where: { id: targetScriptId },
        select: { slug: true },
      });
      await addNotificationJob({
        type: "SCRIPT_APPROVED",
        userId: authorId,
        actorId: moderatorId,
        targetType: "SCRIPT",
        targetId: targetScriptId,
        targetUrl: script ? `/script/${script.slug}` : null,
      });
    }
  } else if (action === "REMOVE_SCRIPT" && targetScriptId) {
    await prisma.script.update({
      where: { id: targetScriptId },
      data: { isPublished: false },
    });
  } else if (action === "WARN_AUTHOR" && authorId && targetScriptId) {
    const flaggedScript = await prisma.script.findUnique({
      where: { id: targetScriptId },
      select: { slug: true },
    });
    await addNotificationJob({
      type: "SCRIPT_FLAGGED",
      userId: authorId,
      actorId: moderatorId,
      targetType: "SCRIPT",
      targetId: targetScriptId,
      targetUrl: flaggedScript ? `/script/${flaggedScript.slug}` : null,
    });
  } else if (action === "BAN_AUTHOR" && authorId) {
    await prisma.user.update({
      where: { id: authorId },
      data: { isBanned: true, banReason: banReason ?? "Moderation action" },
    });
  } else if (action === "SHADOWBAN_AUTHOR" && authorId) {
    await prisma.user.update({
      where: { id: authorId },
      data: { isShadowbanned: true },
    });
  }

  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: "RESOLVED",
      reviewedById: moderatorId,
    },
  });

  await prisma.modAuditLog.create({
    data: {
      moderatorId,
      action,
      targetType: report.targetType,
      targetId: report.targetId,
      details: banReason ?? null,
    },
  });

  res.json({ ok: true });
});

const banSchema = z.object({
  banReason: z.string().max(200).optional(),
});

// POST /api/v1/mod/users/:id/ban
router.post("/users/:id/ban", async (req: Request, res: Response): Promise<void> => {
  const moderatorId = req.user!.id;
  const userId = req.params.id;
  const parsed = banSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload." });
    return;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { isBanned: true, banReason: parsed.data.banReason ?? "Moderation action" },
  });
  await prisma.modAuditLog.create({
    data: {
      moderatorId,
      action: "BAN_USER",
      targetType: "USER",
      targetId: userId,
      details: parsed.data.banReason ?? null,
    },
  });
  res.json({ ok: true });
});

// POST /api/v1/mod/users/:id/shadowban
router.post("/users/:id/shadowban", async (req: Request, res: Response): Promise<void> => {
  const moderatorId = req.user!.id;
  const userId = req.params.id;
  await prisma.user.update({
    where: { id: userId },
    data: { isShadowbanned: true },
  });
  await prisma.modAuditLog.create({
    data: {
      moderatorId,
      action: "SHADOWBAN_USER",
      targetType: "USER",
      targetId: userId,
    },
  });
  res.json({ ok: true });
});

// POST /api/v1/mod/scripts/:id/feature
router.post("/scripts/:id/feature", async (req: Request, res: Response): Promise<void> => {
  const moderatorId = req.user!.id;
  const scriptId = req.params.id;
  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    select: { isFeatured: true, authorId: true },
  });
  if (!script) {
    res.status(404).json({ error: "Script not found." });
    return;
  }
  const updated = await prisma.script.update({
    where: { id: scriptId },
    data: { isFeatured: !script.isFeatured },
    select: { isFeatured: true },
  });
  if (updated.isFeatured) {
    const featuredScript = await prisma.script.findUnique({
      where: { id: scriptId },
      select: { slug: true },
    });
    await addNotificationJob({
      type: "SCRIPT_FEATURED",
      userId: script.authorId,
      actorId: moderatorId,
      targetType: "SCRIPT",
      targetId: scriptId,
      targetUrl: featuredScript ? `/script/${featuredScript.slug}` : null,
    });
  }
  await prisma.modAuditLog.create({
    data: {
      moderatorId,
      action: updated.isFeatured ? "FEATURE_SCRIPT" : "UNFEATURE_SCRIPT",
      targetType: "SCRIPT",
      targetId: scriptId,
    },
  });
  res.json({ isFeatured: updated.isFeatured });
});

// GET /api/v1/mod/audit-log
router.get("/audit-log", async (_req: Request, res: Response): Promise<void> => {
  const logs = await prisma.modAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      moderator: { select: { id: true, username: true } },
    },
  });
  res.json({ logs });
});

export default router;


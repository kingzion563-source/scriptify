import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@scriptify/db";
import { authenticateToken } from "../../middleware/authenticateToken.js";
import { verifyAccessToken } from "../../auth/jwt.js";
import { AUTH } from "../../config.js";
import { rateLimitPublish } from "../../middleware/rateLimit.js";
import { rateLimitComments } from "../../middleware/rateLimit.js";
import { runAiAnalysis } from "../../lib/aiAnalyze.js";
import { moderateText } from "../../lib/openaiModeration.js";
import { addNotificationJob } from "../../lib/notificationsQueue.js";
import { broadcastNewComment } from "../../lib/realtimeBroadcast.js";
import { addXpJob } from "../../lib/xpQueue.js";
const router = Router();
const prisma = new PrismaClient();
const EXECUTOR_NAMES = [
    "Synapse Z",
    "Wave",
    "Solara",
    "Fluxus",
    "Delta",
    "Krnl",
    "Xeno",
    "Arceus X",
    "Hydrogen",
    "Codex",
];
function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "script";
}
async function ensureUniqueSlug(baseSlug) {
    let slug = baseSlug;
    let n = 0;
    while (true) {
        const existing = await prisma.script.findUnique({ where: { slug } });
        if (!existing)
            return slug;
        n += 1;
        slug = `${baseSlug}-${n}`;
    }
}
const createScriptBodySchema = z.object({
    title: z.string().min(1).max(80),
    description: z.string().max(2000).optional().nullable(),
    gameId: z.string().cuid().optional().nullable(),
    tags: z
        .array(z.string().min(1).max(30))
        .max(10)
        .default([]),
    executorCompat: z.union([
        z.literal("auto"),
        z.array(z.object({
            name: z.string(),
            compatible: z.boolean().nullable(),
        })),
    ]).default("auto"),
    platform: z.enum(["PC", "MOBILE", "BOTH"]),
    rawCode: z.string().min(1).max(512 * 1024),
    confirmation: z.literal(true, {
        errorMap: () => ({ message: "You must confirm the script is safe" }),
    }),
    turnstileToken: z.string().optional(),
    coverUrl: z.string().url().optional().nullable(),
});
// ─── POST /api/v1/scripts ─────────────────────────────────────────────────────
// Create script: auth + rate limit 5/hour per user, Zod validation, AI pre-mod.
router.post("/", authenticateToken, rateLimitPublish, async (req, res) => {
    const parsed = createScriptBodySchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: "Validation failed",
            details: parsed.error.flatten().fieldErrors,
        });
        return;
    }
    const data = parsed.data;
    const userId = req.user.id;
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret && data.turnstileToken) {
        try {
            const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    secret: turnstileSecret,
                    response: data.turnstileToken,
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
    else if (turnstileSecret && !data.turnstileToken) {
        res.status(400).json({ error: "Turnstile token required" });
        return;
    }
    let aiResult;
    try {
        aiResult = await runAiAnalysis(data.rawCode);
    }
    catch (err) {
        console.error("AI pre-moderation failed:", err);
        res.status(502).json({
            error: err instanceof Error ? err.message : "AI analysis failed. Try again.",
        });
        return;
    }
    if (aiResult.safety_score < 20) {
        await addNotificationJob({
            type: "SCRIPT_FLAGGED",
            userId,
            actorId: null,
            targetType: "SCRIPT",
            targetId: null,
        });
        res.status(400).json({
            error: "Script did not pass safety check. Safety score too low. Do not publish malware, stolen code, or data exfiltration.",
        });
        return;
    }
    const isPublished = aiResult.safety_score >= 50;
    const executorCompat = data.executorCompat === "auto"
        ? aiResult.executor_compat
        : data.executorCompat;
    const baseSlug = slugify(data.title);
    const slug = await ensureUniqueSlug(baseSlug);
    const script = await prisma.$transaction(async (tx) => {
        const s = await tx.script.create({
            data: {
                slug,
                title: data.title.slice(0, 80),
                description: data.description ?? null,
                coverUrl: data.coverUrl ?? null,
                rawCode: data.rawCode,
                status: "TESTING",
                version: "1.0.0",
                platform: data.platform,
                executorCompat: executorCompat,
                authorId: userId,
                gameId: data.gameId ?? null,
                aiSafetyScore: aiResult.safety_score,
                aiSummary: aiResult.summary,
                aiFeatures: aiResult.features,
                aiTags: aiResult.tags,
                requiresKey: aiResult.requires_key,
                isPublished,
            },
        });
        await tx.scriptVersion.create({
            data: {
                scriptId: s.id,
                version: "1.0.0",
                rawCode: data.rawCode,
                authorId: userId,
            },
        });
        await tx.aiScanLog.create({
            data: {
                scriptId: s.id,
                safetyScore: aiResult.safety_score,
                resultJson: aiResult,
                flagged: aiResult.safety_score < 50,
                flaggedReason: aiResult.safety_score < 20
                    ? "Auto-rejected"
                    : aiResult.safety_score < 50
                        ? "Held for review"
                        : null,
            },
        });
        const tagNames = data.tags.length > 0 ? data.tags : aiResult.tags.slice(0, 8);
        const tagIds = [];
        for (const name of tagNames) {
            const normalized = name.toLowerCase().trim().slice(0, 30);
            if (!normalized)
                continue;
            const slugTag = normalized.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
            let tag = await tx.tag.findFirst({
                where: { OR: [{ name: normalized }, { slug: slugTag }] },
            });
            if (!tag) {
                tag = await tx.tag.create({
                    data: { name: normalized, slug: slugTag || `tag-${Date.now()}` },
                });
            }
            tagIds.push(tag.id);
        }
        for (const tagId of tagIds) {
            await tx.scriptTag.create({
                data: { scriptId: s.id, tagId },
            });
        }
        if (data.gameId) {
            await tx.game.update({
                where: { id: data.gameId },
                data: { scriptCount: { increment: 1 } },
            });
        }
        if (aiResult.safety_score >= 20 && aiResult.safety_score < 50) {
            // AI-flagged submissions are held in moderation queue.
            await tx.report.create({
                data: {
                    reporterId: userId,
                    targetType: "SCRIPT",
                    targetId: s.id,
                    scriptId: s.id,
                    reason: "OTHER",
                    body: "AI flagged submission: held for moderation review.",
                    status: "PENDING",
                },
            });
        }
        return s;
    });
    await addXpJob({ eventType: "publish_script", userId, scriptId: script.id });
    if (isPublished) {
        await addNotificationJob({
            type: "SCRIPT_APPROVED",
            userId,
            actorId: null,
            targetType: "SCRIPT",
            targetId: script.id,
        });
    }
    else {
        await addNotificationJob({
            type: "SCRIPT_FLAGGED",
            userId,
            actorId: null,
            targetType: "SCRIPT",
            targetId: script.id,
        });
    }
    res.status(201).json({
        id: script.id,
        slug: script.slug,
        title: script.title,
        isPublished,
        message: isPublished
            ? "Script published successfully."
            : "Script submitted for review. It will be visible after moderation.",
    });
});
// ─── GET /api/v1/scripts/:id/comments ─────────────────────────────────────────
const listCommentsSchema = z.object({
    sort: z.enum(["top", "new"]).optional().default("top"),
    limit: z.coerce.number().min(1).max(50).optional().default(20),
    cursor: z.string().optional(),
});
router.get("/:id/comments", async (req, res) => {
    const { id: scriptId } = req.params;
    const parsed = listCommentsSchema.safeParse({
        sort: req.query.sort,
        limit: req.query.limit,
        cursor: req.query.cursor,
    });
    const sort = parsed.success ? parsed.data.sort : "top";
    const limit = parsed.success ? parsed.data.limit : 20;
    const cursor = parsed.success ? parsed.data.cursor : undefined;
    const script = await prisma.script.findUnique({
        where: { id: scriptId, isPublished: true },
        select: { id: true },
    });
    if (!script) {
        res.status(404).json({ error: "Script not found" });
        return;
    }
    const orderBy = sort === "new" ? { createdAt: "desc" } : { likeCount: "desc" };
    const topLevel = await prisma.comment.findMany({
        where: { scriptId, parentId: null, isDeleted: false },
        orderBy,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
            user: {
                select: { id: true, username: true, avatarUrl: true, level: true, isPro: true },
            },
            replies: {
                where: { isDeleted: false },
                orderBy: { createdAt: "asc" },
                include: {
                    user: {
                        select: { id: true, username: true, avatarUrl: true, level: true, isPro: true },
                    },
                },
            },
        },
    });
    let nextCursor = null;
    if (topLevel.length > limit) {
        const next = topLevel.pop();
        nextCursor = next?.id ?? null;
    }
    const commentIds = topLevel.flatMap((c) => [c.id, ...c.replies.map((r) => r.id)]);
    let userVotes = new Map();
    const accessToken = req.cookies?.[AUTH.ACCESS_COOKIE_NAME];
    if (accessToken && commentIds.length > 0) {
        try {
            const payload = verifyAccessToken(accessToken);
            if (payload) {
                const votes = await prisma.vote.findMany({
                    where: {
                        userId: payload.sub,
                        targetType: "COMMENT",
                        targetId: { in: commentIds },
                    },
                });
                votes.forEach((v) => userVotes.set(v.targetId, v.value));
            }
        }
        catch {
            //
        }
    }
    const mapComment = (c) => ({
        id: c.id,
        body: c.isDeleted ? "[deleted]" : c.body,
        likeCount: c.likeCount,
        dislikeCount: c.dislikeCount ?? 0,
        isEdited: c.isEdited,
        isDeleted: c.isDeleted,
        isPinned: c.isPinned,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        user: c.user,
        userVote: userVotes.get(c.id) ?? null,
        replies: (c.replies ?? []).map((r) => ({
            id: r.id,
            body: r.isDeleted ? "[deleted]" : r.body,
            likeCount: r.likeCount,
            dislikeCount: r.dislikeCount ?? 0,
            isEdited: r.isEdited,
            isDeleted: r.isDeleted,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            user: r.user,
            userVote: userVotes.get(r.id) ?? null,
        })),
    });
    const pinned = await prisma.comment.findFirst({
        where: { scriptId, parentId: null, isPinned: true, isDeleted: false },
        include: {
            user: {
                select: { id: true, username: true, avatarUrl: true, level: true, isPro: true },
            },
            replies: {
                where: { isDeleted: false },
                orderBy: { createdAt: "asc" },
                include: {
                    user: {
                        select: { id: true, username: true, avatarUrl: true, level: true, isPro: true },
                    },
                },
            },
        },
    });
    const list = topLevel.map((c) => mapComment(c));
    const pinnedMapped = pinned && pinned.id ? [mapComment(pinned)] : [];
    const rest = list.filter((c) => !pinned || c.id !== pinned.id);
    const ordered = [...pinnedMapped, ...rest];
    res.json({
        comments: ordered,
        nextCursor,
    });
});
// ─── POST /api/v1/scripts/:id/comments ────────────────────────────────────────
const createCommentSchema = z.object({
    body: z.string().min(1).max(2000),
    parentId: z.string().cuid().optional().nullable(),
});
router.post("/:id/comments", authenticateToken, rateLimitComments, async (req, res) => {
    const { id: scriptId } = req.params;
    const userId = req.user.id;
    const script = await prisma.script.findUnique({
        where: { id: scriptId, isPublished: true },
        include: { author: { select: { id: true } } },
    });
    if (!script) {
        res.status(404).json({ error: "Script not found" });
        return;
    }
    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: "Validation failed",
            details: parsed.error.flatten().fieldErrors,
        });
        return;
    }
    let { body, parentId } = parsed.data;
    if (parentId) {
        const parent = await prisma.comment.findUnique({
            where: { id: parentId, scriptId },
            select: { id: true, parentId: true },
        });
        if (!parent || parent.parentId) {
            res.status(400).json({ error: "Invalid reply: only one level of replies allowed." });
            return;
        }
    }
    const { flagged } = await moderateText(body);
    if (flagged) {
        res.status(201).json({
            message: "Comment held for review.",
            held: true,
        });
        return;
    }
    const comment = await prisma.comment.create({
        data: {
            scriptId,
            userId,
            parentId: parentId ?? null,
            body,
            likeCount: 0,
            dislikeCount: 0,
        },
        include: {
            user: {
                select: { id: true, username: true, avatarUrl: true, level: true, isPro: true },
            },
        },
    });
    if (parentId) {
        const parent = await prisma.comment.findUnique({
            where: { id: parentId },
            select: { userId: true },
        });
        if (parent && parent.userId !== userId) {
            await addNotificationJob({
                type: "REPLY_TO_COMMENT",
                userId: parent.userId,
                actorId: userId,
                targetType: "COMMENT",
                targetId: parentId,
            });
        }
    }
    else {
        if (script.author.id !== userId) {
            await addNotificationJob({
                type: "COMMENT_ON_SCRIPT",
                userId: script.author.id,
                actorId: userId,
                targetType: "SCRIPT",
                targetId: scriptId,
            });
            await addXpJob({
                eventType: "comment_on_your_script",
                userId: script.author.id,
                scriptId,
                actorId: userId,
            });
        }
        await broadcastNewComment(scriptId, {
            id: comment.id,
            body: comment.body,
            likeCount: 0,
            dislikeCount: 0,
            isEdited: false,
            isDeleted: false,
            isPinned: false,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            user: comment.user,
            userVote: null,
            replies: [],
        });
    }
    res.status(201).json({
        id: comment.id,
        body: comment.body,
        likeCount: 0,
        dislikeCount: 0,
        isEdited: false,
        isDeleted: false,
        isPinned: false,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        user: comment.user,
        userVote: null,
        replies: [],
    });
});
// ─── GET /api/v1/scripts/:slug ────────────────────────────────────────────────
// Returns full script detail: author, game, tags, executor compat, versions,
// comment count, related scripts, and the requesting user's vote (if authed).
router.get("/:slug", async (req, res) => {
    const { slug } = req.params;
    const script = await prisma.script.findUnique({
        where: { slug, isPublished: true },
        include: {
            author: {
                select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                    followerCount: true,
                    isPro: true,
                    level: true,
                },
            },
            game: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    thumbnailUrl: true,
                    playerCountCached: true,
                    scriptCount: true,
                },
            },
            tags: {
                include: { tag: { select: { name: true, slug: true } } },
            },
            versions: {
                select: {
                    id: true,
                    version: true,
                    changelog: true,
                    rawCode: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 10,
            },
            _count: { select: { comments: true } },
        },
    });
    if (!script) {
        res.status(404).json({ error: "Script not found" });
        return;
    }
    // Increment view count (fire and forget)
    prisma.script
        .update({ where: { id: script.id }, data: { viewCount: { increment: 1 } } })
        .catch(() => { });
    // Resolve requesting user's vote (optional auth via cookie)
    let userVote = null;
    const accessToken = req.cookies?.[AUTH.ACCESS_COOKIE_NAME];
    if (accessToken) {
        try {
            const payload = verifyAccessToken(accessToken);
            if (payload) {
                const vote = await prisma.vote.findUnique({
                    where: {
                        userId_targetType_targetId: {
                            userId: payload.sub,
                            targetType: "SCRIPT",
                            targetId: script.id,
                        },
                    },
                });
                userVote = vote?.value ?? null;
            }
        }
        catch {
            // Expired or invalid token — proceed without vote
        }
    }
    // Latest AI scan log for risk warnings
    const latestScan = await prisma.aiScanLog.findFirst({
        where: { scriptId: script.id },
        orderBy: { scannedAt: "desc" },
        select: { resultJson: true },
    });
    // Related scripts: same game or overlapping tags, up to 3
    const tagIds = script.tags.map((t) => t.tagId);
    const relatedScripts = await prisma.script.findMany({
        where: {
            isPublished: true,
            id: { not: script.id },
            OR: [
                ...(script.gameId ? [{ gameId: script.gameId }] : []),
                ...(tagIds.length > 0
                    ? [{ tags: { some: { tagId: { in: tagIds } } } }]
                    : []),
            ],
        },
        select: {
            id: true,
            slug: true,
            title: true,
            coverUrl: true,
            status: true,
            likeCount: true,
            viewCount: true,
            copyCount: true,
            aiSafetyScore: true,
            rawCode: true,
            author: {
                select: { username: true, avatarUrl: true, isPro: true },
            },
            game: { select: { name: true, slug: true } },
            tags: { include: { tag: { select: { name: true } } } },
        },
        take: 3,
        orderBy: { copyCount: "desc" },
    });
    res.json({
        id: script.id,
        slug: script.slug,
        title: script.title,
        description: script.description,
        coverUrl: script.coverUrl,
        rawCode: script.rawCode,
        status: script.status.toLowerCase(),
        version: script.version,
        platform: script.platform,
        executorCompat: script.executorCompat,
        viewCount: script.viewCount,
        copyCount: script.copyCount,
        likeCount: script.likeCount,
        dislikeCount: script.dislikeCount,
        aiSafetyScore: script.aiSafetyScore,
        aiSummary: script.aiSummary,
        aiFeatures: script.aiFeatures,
        requiresKey: script.requiresKey,
        isTrending: script.isTrending,
        isFeatured: script.isFeatured,
        createdAt: script.createdAt,
        updatedAt: script.updatedAt,
        lastVerifiedAt: script.lastVerifiedAt,
        author: script.author,
        game: script.game,
        tags: script.tags.map((t) => t.tag.name),
        versions: script.versions,
        commentCount: script._count.comments,
        userVote,
        aiRisks: latestScan
            ? (latestScan.resultJson?.risks ?? [])
            : [],
        relatedScripts: relatedScripts.map((s) => ({
            id: s.id,
            slug: s.slug,
            title: s.title,
            coverUrl: s.coverUrl,
            status: s.status.toLowerCase(),
            likeCount: s.likeCount,
            viewCount: s.viewCount,
            copyCount: s.copyCount,
            aiScore: s.aiSafetyScore,
            rawCode: s.rawCode,
            authorUsername: s.author.username,
            authorAvatar: s.author.avatarUrl,
            isAuthorPro: s.author.isPro,
            gameName: s.game?.name ?? "Unknown",
            gameSlug: s.game?.slug ?? "",
            tags: s.tags.map((t) => t.tag.name),
        })),
    });
});
// ─── GET /api/v1/scripts/:id/raw ─────────────────────────────────────────────
// Returns raw Lua code as text/plain. Checks both Script.id and ScriptVersion.id.
router.get("/:id/raw", async (req, res) => {
    const { id } = req.params;
    // Try ScriptVersion first (version-specific raw links)
    const version = await prisma.scriptVersion.findUnique({
        where: { id },
        select: { rawCode: true, script: { select: { isPublished: true } } },
    });
    if (version && version.script.isPublished) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.send(version.rawCode);
        return;
    }
    // Fall back to Script.id
    const script = await prisma.script.findUnique({
        where: { id, isPublished: true },
        select: { rawCode: true },
    });
    if (!script) {
        res.status(404).json({ error: "Script not found" });
        return;
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(script.rawCode);
});
// ─── POST /api/v1/scripts/:id/copy ───────────────────────────────────────────
// Increments copyCount. No auth required.
router.post("/:id/copy", async (req, res) => {
    const { id } = req.params;
    const script = await prisma.script.findUnique({
        where: { id, isPublished: true },
        select: { id: true, authorId: true, copyCount: true },
    });
    if (!script) {
        res.status(404).json({ error: "Script not found" });
        return;
    }
    const updated = await prisma.script.update({
        where: { id },
        data: { copyCount: { increment: 1 } },
        select: { copyCount: true },
    });
    const newCount = updated.copyCount;
    if (newCount === 10) {
        await addXpJob({ eventType: "script_10_copies", userId: script.authorId, scriptId: id });
    }
    else if (newCount === 100) {
        await addXpJob({ eventType: "script_100_copies", userId: script.authorId, scriptId: id });
    }
    else if (newCount === 1000) {
        await addXpJob({ eventType: "script_1000_copies", userId: script.authorId, scriptId: id });
    }
    res.json({ ok: true });
});
// ─── POST /api/v1/scripts/:id/vote ───────────────────────────────────────────
// Upserts or removes a vote. value: 1 (like), -1 (dislike), 0 (remove).
router.post("/:id/vote", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { value } = req.body;
    const userId = req.user.id;
    if (![-1, 0, 1].includes(value)) {
        res.status(400).json({ error: "Invalid vote value. Use -1, 0, or 1." });
        return;
    }
    const script = await prisma.script.findUnique({
        where: { id, isPublished: true },
        select: { id: true, authorId: true },
    });
    if (!script) {
        res.status(404).json({ error: "Script not found" });
        return;
    }
    const existing = await prisma.vote.findUnique({
        where: {
            userId_targetType_targetId: {
                userId,
                targetType: "SCRIPT",
                targetId: id,
            },
        },
    });
    const wasLike = existing?.value === 1;
    const willLike = value === 1;
    await prisma.$transaction(async (tx) => {
        if (value === 0) {
            if (!existing)
                return;
            await tx.vote.delete({ where: { id: existing.id } });
            if (existing.value === 1) {
                await tx.script.update({
                    where: { id },
                    data: { likeCount: { decrement: 1 } },
                });
            }
            else if (existing.value === -1) {
                await tx.script.update({
                    where: { id },
                    data: { dislikeCount: { decrement: 1 } },
                });
            }
        }
        else if (!existing) {
            await tx.vote.create({
                data: { userId, targetType: "SCRIPT", targetId: id, value },
            });
            if (value === 1) {
                await tx.script.update({
                    where: { id },
                    data: { likeCount: { increment: 1 } },
                });
            }
            else {
                await tx.script.update({
                    where: { id },
                    data: { dislikeCount: { increment: 1 } },
                });
            }
        }
        else if (existing.value !== value) {
            await tx.vote.update({ where: { id: existing.id }, data: { value } });
            if (value === 1) {
                await tx.script.update({
                    where: { id },
                    data: {
                        likeCount: { increment: 1 },
                        dislikeCount: { decrement: 1 },
                    },
                });
            }
            else {
                await tx.script.update({
                    where: { id },
                    data: {
                        likeCount: { decrement: 1 },
                        dislikeCount: { increment: 1 },
                    },
                });
            }
        }
    });
    const updated = await prisma.script.findUnique({
        where: { id },
        select: { likeCount: true, dislikeCount: true },
    });
    if (willLike && !wasLike && script.authorId !== userId) {
        await addXpJob({ eventType: "script_like", userId: script.authorId, scriptId: id, actorId: userId });
    }
    res.json({
        likeCount: updated.likeCount,
        dislikeCount: updated.dislikeCount,
        userVote: value === 0 ? null : value,
    });
});
// POST /api/v1/scripts/:id/trending-boost — Pro only, sets isTrending for 24 hours
router.post("/:id/trending-boost", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    if (!req.user.isPro) {
        res.status(403).json({ error: "Pro subscription required." });
        return;
    }
    const profile = await prisma.user.findUnique({
        where: { id: userId },
        select: { monthlyBoostCredits: true },
    });
    if (!profile || profile.monthlyBoostCredits <= 0) {
        res.status(400).json({ error: "No monthly boost credits remaining." });
        return;
    }
    const script = await prisma.script.findUnique({
        where: { id },
        select: { id: true, authorId: true },
    });
    if (!script) {
        res.status(404).json({ error: "Script not found." });
        return;
    }
    if (script.authorId !== userId) {
        res.status(403).json({ error: "You can only boost your own scripts." });
        return;
    }
    const trendingUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.$transaction([
        prisma.script.update({
            where: { id },
            data: { isTrending: true, trendingUntil },
        }),
        prisma.user.update({
            where: { id: userId },
            data: { monthlyBoostCredits: { decrement: 1 } },
        }),
    ]);
    res.json({
        isTrending: true,
        trendingUntil,
        monthlyBoostCredits: profile.monthlyBoostCredits - 1,
    });
});
export default router;

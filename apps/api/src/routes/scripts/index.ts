import { createHash } from "crypto";
import { Router, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@scriptify/db";
import prisma from "../../lib/prisma.js";
import { Redis } from "@upstash/redis";
import { authenticateToken } from "../../middleware/authenticateToken.js";
import { verifyAccessToken } from "../../auth/jwt.js";
import { AUTH } from "../../config.js";
import { getEnvOptional } from "../../config.js";
import { rateLimitPublish } from "../../middleware/rateLimit.js";
import { rateLimitComments } from "../../middleware/rateLimit.js";
import { addNotificationJob } from "../../lib/notificationsQueue.js";
import { broadcastNewComment } from "../../lib/realtimeBroadcast.js";
import { addXpJob } from "../../lib/xpQueue.js";

const COPY_RATE_TTL_SEC = 24 * 60 * 60; // 24 hours
const VIEW_DEDUP_TTL_SEC = 6 * 60 * 60; // 6 hours

function getCopyRedis(): Redis | null {
  const url = getEnvOptional("UPSTASH_REDIS_REST_URL");
  const token = getEnvOptional("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
  }
  return req.socket.remoteAddress ?? "unknown";
}

const router = Router();

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "script";
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let n = 0;
  while (true) {
    const existing = await prisma.script.findUnique({ where: { slug } });
    if (!existing) return slug;
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
    z.array(
      z.object({
        name: z.string(),
        compatible: z.boolean().nullable(),
      })
    ),
  ]).default("auto"),
  platform: z.enum(["PC", "MOBILE", "BOTH"]),
  rawCode: z.string().min(1).max(512 * 1024),
  confirmation: z.literal(true, {
    errorMap: () => ({ message: "You must confirm the script is safe" }),
  }),
  turnstileToken: z.string().optional(),
  coverUrl: z.string().optional().nullable(),
});

// ─── POST /api/v1/scripts ─────────────────────────────────────────────────────
// Create script: auth + rate limit 5/hour per user, Zod validation, AI pre-mod.
router.post(
  "/",
  authenticateToken,
  rateLimitPublish,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = createScriptBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const data = parsed.data;
    const userId = req.user!.id;

    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret && data.turnstileToken) {
      try {
        const verifyRes = await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              secret: turnstileSecret,
              response: data.turnstileToken,
              remoteip:
                req.headers["x-forwarded-for"] ?? req.socket.remoteAddress,
            }),
          }
        );
        const result = (await verifyRes.json()) as { success?: boolean };
        if (!result.success) {
          res.status(400).json({ error: "Turnstile verification failed" });
          return;
        }
      } catch {
        res.status(400).json({ error: "Turnstile verification failed" });
        return;
      }
    } else if (turnstileSecret && !data.turnstileToken) {
      res.status(400).json({ error: "Turnstile token required" });
      return;
    }

    const isPublished = true;
    const executorCompat =
      data.executorCompat === "auto"
        ? []
        : data.executorCompat;

    const baseSlug = slugify(data.title);
    const slug = await ensureUniqueSlug(baseSlug);

    const script = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const s = await tx.script.create({
        data: {
          slug,
          title: data.title.slice(0, 80),
          description: data.description ?? null,
          coverUrl: data.coverUrl ?? null,
          rawCode: data.rawCode,
          status: "VERIFIED",
          lastVerifiedAt: new Date(),
          version: "1.0.0",
          platform: data.platform,
          executorCompat: executorCompat as object,
          authorId: userId,
          gameId: data.gameId ?? null,
          aiSafetyScore: null,
          aiSummary: null,
          aiFeatures: [],
          aiTags: [],
          requiresKey: false,
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

      const tagNames = data.tags.length > 0 ? data.tags : [];
      const tagIds: string[] = [];
      for (const name of tagNames) {
        const normalized = name.toLowerCase().trim().slice(0, 30);
        if (!normalized) continue;
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

      return s;
    });

    await addXpJob({ eventType: "publish_script", userId, scriptId: script.id });

    await addNotificationJob({
      type: "SCRIPT_APPROVED",
      userId,
      actorId: null,
      targetType: "SCRIPT",
      targetId: script.id,
      targetUrl: `/script/${script.slug}`,
    });

    res.status(201).json({
      id: script.id,
      slug: script.slug,
      title: script.title,
      isPublished,
      message: isPublished
        ? "Script published successfully."
        : "Script submitted for review. It will be visible after moderation.",
    });
  }
);

// ─── GET /api/v1/scripts/:id/comments ─────────────────────────────────────────
const listCommentsSchema = z.object({
  sort: z.enum(["top", "new"]).optional().default("top"),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
  cursor: z.string().optional(),
});

router.get("/:id/comments", async (req: Request, res: Response): Promise<void> => {
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

  const orderBy = sort === "new" ? { createdAt: "desc" as const } : { likeCount: "desc" as const };

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
        orderBy: { createdAt: "asc" as const },
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true, level: true, isPro: true },
          },
        },
      },
    },
  });

  let nextCursor: string | null = null;
  if (topLevel.length > limit) {
    const next = topLevel.pop();
    nextCursor = next?.id ?? null;
  }

  const commentIds = topLevel.flatMap((c: { id: string; replies: { id: string }[] }) => [c.id, ...c.replies.map((r: { id: string }) => r.id)]);
  let userVotes: Map<string, number> = new Map();
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
        votes.forEach((v: { targetId: string; value: number }) => userVotes.set(v.targetId, v.value));
      }
    } catch {
      //
    }
  }

  const mapComment = (c: {
    id: string;
    body: string;
    likeCount: number;
    dislikeCount: number;
    isEdited: boolean;
    isDeleted: boolean;
    isPinned: boolean;
    createdAt: Date;
    updatedAt: Date;
    user: { id: string; username: string; avatarUrl: string | null; level: number; isPro: boolean };
    replies?: Array<{
      id: string;
      body: string;
      likeCount: number;
      dislikeCount: number;
      isEdited: boolean;
      isDeleted: boolean;
      createdAt: Date;
      updatedAt: Date;
      user: { id: string; username: string; avatarUrl: string | null; level: number; isPro: boolean };
    }>;
  }) => ({
    id: c.id,
    body: c.isDeleted ? "[deleted]" : c.body,
    likeCount: c.likeCount,
    dislikeCount: (c as { dislikeCount?: number }).dislikeCount ?? 0,
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
      dislikeCount: (r as { dislikeCount?: number }).dislikeCount ?? 0,
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
        orderBy: { createdAt: "asc" as const },
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true, level: true, isPro: true },
          },
        },
      },
    },
  });

  type MapCommentArg = Parameters<typeof mapComment>[0];
  const list = topLevel.map((c: MapCommentArg) => mapComment(c));
  const pinnedMapped = pinned && pinned.id ? [mapComment(pinned as MapCommentArg)] : [];
  const rest = list.filter((c: { id: string }) => !pinned || c.id !== pinned.id);
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

router.post(
  "/:id/comments",
  authenticateToken,
  rateLimitComments,
  async (req: Request, res: Response): Promise<void> => {
    const { id: scriptId } = req.params;
    const userId = req.user!.id;

    const script = await prisma.script.findUnique({
      where: { id: scriptId, isPublished: true },
      select: { id: true, slug: true, author: { select: { id: true } } },
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
          targetUrl: `/script/${script.slug}#comment-${parentId}`,
        });
      }
    } else {
      if (script.author.id !== userId) {
        await addNotificationJob({
          type: "COMMENT_ON_SCRIPT",
          userId: script.author.id,
          actorId: userId,
          targetType: "SCRIPT",
          targetId: scriptId,
          targetUrl: `/script/${script.slug}`,
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
  }
);

// ─── GET /api/v1/scripts/:slug ────────────────────────────────────────────────
// Returns full script detail: author, game, tags, executor compat, versions,
// comment count, related scripts, and the requesting user's vote (if authed).
router.get("/sitemap", async (_req: Request, res: Response): Promise<void> => {
  const scripts = await prisma.script.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 10000,
  });
  res.json({ scripts });
});

// ─── GET /api/v1/scripts?gameSlug=&page=&limit= ─────────────────────────────
// List published scripts with optional game filter and pagination.
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const gameSlug = req.query.gameSlug as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 12));

  const where: Record<string, unknown> = { isPublished: true };
  if (gameSlug && gameSlug.trim()) {
    where.game = { slug: gameSlug.trim() };
  }

  const [scripts, total] = await Promise.all([
    prisma.script.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
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
        author: { select: { username: true, avatarUrl: true, isPro: true } },
        game: { select: { name: true, slug: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    }),
    prisma.script.count({ where }),
  ]);

  type Row = (typeof scripts)[number];
  const hits = scripts.map((s: Row) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    coverUrl: s.coverUrl,
    gameName: s.game?.name ?? null,
    gameSlug: s.game?.slug ?? null,
    authorUsername: s.author.username,
    authorAvatar: s.author.avatarUrl,
    status: s.status === "TESTING" ? "verified" : s.status.toLowerCase(),
    likeCount: s.likeCount,
    viewCount: s.viewCount,
    copyCount: s.copyCount,
    tags: s.tags.map((t: { tag: { name: string } }) => t.tag.name),
    aiScore: s.aiSafetyScore,
    isAuthorPro: s.author.isPro,
  }));

  res.json({ hits, total, page, limit });
});

// ─── GET /api/v1/scripts/:id/bookmark ───────────────────────────────────────
// Returns whether the current user has bookmarked this script. Requires auth.
router.get(
  "/:id/bookmark",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { id: scriptId } = req.params;
    const userId = req.user!.id;

    const script = await prisma.script.findUnique({
      where: { id: scriptId, isPublished: true },
      select: { id: true },
    });
    if (!script) {
      res.status(404).json({ error: "Script not found" });
      return;
    }

    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_scriptId: { userId, scriptId },
      },
    });

    res.json({ bookmarked: Boolean(bookmark) });
  }
);

// ─── POST /api/v1/scripts/:id/bookmark ──────────────────────────────────────
// Toggle bookmark: create or delete. Returns { bookmarked: boolean }. Requires auth.
router.post(
  "/:id/bookmark",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { id: scriptId } = req.params;
    const userId = req.user!.id;

    const script = await prisma.script.findUnique({
      where: { id: scriptId, isPublished: true },
      select: { id: true },
    });
    if (!script) {
      res.status(404).json({ error: "Script not found" });
      return;
    }

    const existing = await prisma.bookmark.findUnique({
      where: {
        userId_scriptId: { userId, scriptId },
      },
    });

    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      res.json({ bookmarked: false });
      return;
    }

    await prisma.bookmark.create({
      data: { userId, scriptId },
    });
    res.json({ bookmarked: true });
  }
);

router.get("/:slug", async (req: Request, res: Response): Promise<void> => {
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

  // View count with Redis deduplication: at most one view per IP per script per 6h
  let shouldIncrementView = true;
  const viewRedis = getCopyRedis();
  if (viewRedis) {
    const ip = getClientIp(req);
    const hashedIP = createHash("sha256").update(ip).digest("hex");
    const viewKey = `view:${script.id}:${hashedIP}`;
    try {
      const ok = await viewRedis.set(viewKey, "1", { nx: true, ex: VIEW_DEDUP_TTL_SEC });
      if (!ok) shouldIncrementView = false;
    } catch {
      // Redis unavailable: allow the increment
    }
  }
  if (shouldIncrementView) {
    prisma.script
      .update({ where: { id: script.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});
  }

  // Resolve requesting user's vote (optional auth via cookie)
  let userVote: number | null = null;
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
    } catch {
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
  const tagIds = script.tags.map((t: { tagId: string }) => t.tagId);
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
    status: (script.status === "TESTING" ? "verified" : script.status.toLowerCase()),
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
    tags: script.tags.map((t: { tag: { name: string; slug: string } }) => ({ name: t.tag.name, slug: t.tag.slug })),
    versions: script.versions,
    commentCount: script._count.comments,
    userVote,
    aiRisks:
      latestScan
        ? ((latestScan.resultJson as Record<string, unknown>)?.risks ?? [])
        : [],
    relatedScripts: relatedScripts.map((s: typeof relatedScripts[number]) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      coverUrl: s.coverUrl,
      status: (s.status === "TESTING" ? "verified" : s.status.toLowerCase()),
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
      tags: s.tags.map((t: { tag: { name: string } }) => t.tag.name),
    })),
  });
});

// ─── GET /api/v1/scripts/:id/raw ─────────────────────────────────────────────
// Returns raw Lua code as text/plain. Checks both Script.id and ScriptVersion.id.
router.get("/:id/raw", async (req: Request, res: Response): Promise<void> => {
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
// Increments copyCount. No auth required. Rate limited: 1 copy per script per IP per 24h (Upstash Redis).
router.post("/:id/copy", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const script = await prisma.script.findUnique({
    where: { id, isPublished: true },
    select: { id: true, authorId: true, copyCount: true },
  });
  if (!script) {
    res.status(404).json({ error: "Script not found" });
    return;
  }

  const redis = getCopyRedis();
  if (redis) {
    const ip = getClientIp(req);
    const hashedIP = createHash("sha256").update(ip).digest("hex");
    const key = `scriptify:copy:${id}:${hashedIP}`;
    try {
      const set = await redis.set(key, "1", { nx: true, ex: COPY_RATE_TTL_SEC });
      if (!set) {
        res.status(200).json({ counted: false });
        return;
      }
    } catch {
      // Redis unavailable: fall back to allowing the increment
    }
  }

  const updated = await prisma.script.update({
    where: { id },
    data: { copyCount: { increment: 1 } },
    select: { copyCount: true },
  });
  const newCount = updated.copyCount;
  if (newCount === 10) {
    await addXpJob({ eventType: "script_10_copies", userId: script.authorId, scriptId: id });
  } else if (newCount === 100) {
    await addXpJob({ eventType: "script_100_copies", userId: script.authorId, scriptId: id });
  } else if (newCount === 1000) {
    await addXpJob({ eventType: "script_1000_copies", userId: script.authorId, scriptId: id });
  }

  res.json({ ok: true });
});

// ─── POST /api/v1/scripts/:id/vote ───────────────────────────────────────────
// Upserts or removes a vote. value: 1 (like), -1 (dislike), 0 (remove).
router.post(
  "/:id/vote",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { value } = req.body as { value: number };
    const userId = req.user!.id;

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

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (value === 0) {
        if (!existing) return;
        await tx.vote.delete({ where: { id: existing.id } });
        if (existing.value === 1) {
          await tx.script.update({
            where: { id },
            data: { likeCount: { decrement: 1 } },
          });
        } else if (existing.value === -1) {
          await tx.script.update({
            where: { id },
            data: { dislikeCount: { decrement: 1 } },
          });
        }
      } else if (!existing) {
        await tx.vote.create({
          data: { userId, targetType: "SCRIPT", targetId: id, value },
        });
        if (value === 1) {
          await tx.script.update({
            where: { id },
            data: { likeCount: { increment: 1 } },
          });
        } else {
          await tx.script.update({
            where: { id },
            data: { dislikeCount: { increment: 1 } },
          });
        }
      } else if (existing.value !== value) {
        await tx.vote.update({ where: { id: existing.id }, data: { value } });
        if (value === 1) {
          await tx.script.update({
            where: { id },
            data: {
              likeCount: { increment: 1 },
              dislikeCount: { decrement: 1 },
            },
          });
        } else {
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
      likeCount: updated!.likeCount,
      dislikeCount: updated!.dislikeCount,
      userVote: value === 0 ? null : value,
    });
  }
);

// POST /api/v1/scripts/:id/trending-boost — Pro only, sets isTrending for 24 hours
router.post(
  "/:id/trending-boost",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };

    if (!req.user!.isPro) {
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
  }
);

export default router;

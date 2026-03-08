import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma.js";
import { authenticateToken } from "../../middleware/authenticateToken.js";
import { verifyAccessToken } from "../../auth/jwt.js";
import { AUTH } from "../../config.js";
import { addNotificationJob } from "../../lib/notificationsQueue.js";

const router = Router();

function mapScriptToCard(s: {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  status: string;
  viewCount: number;
  copyCount: number;
  likeCount: number;
  aiSafetyScore: number | null;
  rawCode: string;
  author: { username: string; avatarUrl: string | null; isPro: boolean };
  game: { name: string; slug: string } | null;
  tags: { tag: { name: string } }[];
}) {
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    coverUrl: s.coverUrl,
    gameName: s.game?.name ?? "",
    gameSlug: s.game?.slug ?? "",
    authorUsername: s.author.username,
    authorAvatar: s.author.avatarUrl,
    isAuthorPro: s.author.isPro,
    status: (s.status === "TESTING" ? "verified" : s.status.toLowerCase()),
    likeCount: s.likeCount,
    viewCount: s.viewCount,
    copyCount: s.copyCount,
    tags: s.tags.map((t) => t.tag.name),
    rawCode: s.rawCode,
    aiScore: s.aiSafetyScore ?? undefined,
  };
}

// GET /api/v1/users/me — current user (for rehydration with Bearer)
router.get("/me", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isPro: true,
      level: true,
      avatarUrl: true,
      followerCount: true,
      followingCount: true,
    },
  });
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const scriptsCount = await prisma.script.count({
    where: { authorId: userId, isPublished: true },
  });
  const totalCopies = await prisma.script.aggregate({
    where: { authorId: userId, isPublished: true },
    _sum: { copyCount: true },
  });
  res.json({
    user: {
      ...user,
      scriptsCount,
      totalCopies: totalCopies._sum.copyCount ?? 0,
    },
  });
});

// PATCH /api/v1/users/me — update current user (bio, etc.)
const patchMeSchema = z.object({
  bio: z.string().max(200).optional().nullable(),
});

router.patch(
  "/me",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const parsed = patchMeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: { bio: parsed.data.bio ?? undefined },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        avatarUrl: true,
        level: true,
        isPro: true,
        role: true,
        followerCount: true,
        followingCount: true,
      },
    });
    const scriptsCount = await prisma.script.count({
      where: { authorId: userId, isPublished: true },
    });
    const totalCopies = await prisma.script.aggregate({
      where: { authorId: userId, isPublished: true },
      _sum: { copyCount: true },
    });
    res.json({
      user: {
        ...user,
        scriptsCount,
        totalCopies: totalCopies._sum.copyCount ?? 0,
      },
    });
  }
);

// GET /api/v1/users/:username/scripts — scripts for profile tabs (must be before /:username)
router.get("/:username/scripts", async (req: Request, res: Response): Promise<void> => {
  const username = (req.params.username ?? "").toLowerCase();
  const tab = (req.query.tab as string) ?? "scripts";
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(24, Math.max(1, parseInt(req.query.limit as string, 10) || 12));

  const profileUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!profileUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (tab === "scripts") {
    const [scripts, total] = await Promise.all([
      prisma.script.findMany({
        where: { authorId: profileUser.id, isPublished: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: { select: { username: true, avatarUrl: true, isPro: true } },
          game: { select: { name: true, slug: true } },
          tags: { include: { tag: { select: { name: true } } } },
        },
      }),
      prisma.script.count({ where: { authorId: profileUser.id, isPublished: true } }),
    ]);
    res.json({
      scripts: scripts.map((s) => mapScriptToCard(s)),
      total,
      page,
      limit,
    });
    return;
  }

  if (tab === "liked") {
    const accessToken = req.cookies?.[AUTH.ACCESS_COOKIE_NAME];
    if (!accessToken) {
      res.json({ scripts: [], total: 0, page: 1, limit });
      return;
    }
    let viewerId: string | null = null;
    try {
      const payload = verifyAccessToken(accessToken);
      viewerId = payload?.sub ?? null;
    } catch {
      //
    }
    if (viewerId !== profileUser.id) {
      res.json({ scripts: [], total: 0, page, limit });
      return;
    }
    const liked = await prisma.vote.findMany({
      where: { userId: profileUser.id, targetType: "SCRIPT", value: 1 },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { targetId: true },
    });
    const scriptIds = liked.map((v) => v.targetId);
    const [scripts, total] = await Promise.all([
      scriptIds.length > 0
        ? prisma.script.findMany({
            where: { id: { in: scriptIds }, isPublished: true },
            include: {
              author: { select: { username: true, avatarUrl: true, isPro: true } },
              game: { select: { name: true, slug: true } },
              tags: { include: { tag: { select: { name: true } } } },
            },
          })
        : [],
      prisma.vote.count({
        where: { userId: profileUser.id, targetType: "SCRIPT", value: 1 },
      }),
    ]);
    const orderMap = new Map(scriptIds.map((id, i) => [id, i]));
    const ordered = (scripts as typeof scripts).slice().sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    res.json({
      scripts: ordered.map((s) => mapScriptToCard(s)),
      total,
      page,
      limit,
    });
    return;
  }

  if (tab === "collections") {
    let viewerId: string | null = null;
    const accessToken = req.cookies?.[AUTH.ACCESS_COOKIE_NAME];
    if (accessToken) {
      try {
        const payload = verifyAccessToken(accessToken);
        viewerId = payload?.sub ?? null;
      } catch {
        //
      }
    }
    const isOwner = viewerId === profileUser.id;
    const collections = await prisma.collection.findMany({
      where: {
        userId: profileUser.id,
        ...(isOwner ? {} : { isPublic: true }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        scriptCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: collections });
    return;
  }

  if (tab === "activity") {
    const [recentScripts, recentComments] = await Promise.all([
      prisma.script.findMany({
        where: { authorId: profileUser.id, isPublished: true },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          createdAt: true,
        },
      }),
      prisma.comment.findMany({
        where: { userId: profileUser.id, isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          body: true,
          createdAt: true,
          script: {
            select: { title: true, slug: true },
          },
        },
      }),
    ]);
    const scriptItems = recentScripts.map((s) => ({
      type: "script" as const,
      createdAt: s.createdAt,
      scriptTitle: s.title,
      scriptSlug: s.slug,
    }));
    const commentItems = recentComments.map((c) => ({
      type: "comment" as const,
      createdAt: c.createdAt,
      scriptTitle: c.script.title,
      scriptSlug: c.script.slug,
      commentBody: c.body.length > 100 ? c.body.slice(0, 100) + "…" : c.body,
    }));
    const merged = [...scriptItems, ...commentItems]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 20)
      .map((item) => ({
        ...item,
        createdAt:
          item.createdAt instanceof Date
            ? item.createdAt.toISOString()
            : item.createdAt,
      }));
    res.json({ data: merged });
    return;
  }

  res.status(400).json({ error: "Invalid tab" });
});

// GET /api/v1/users/:username — profile by username (public)
router.get("/:username", async (req: Request, res: Response): Promise<void> => {
  const username = (req.params.username ?? "").toLowerCase();
  if (!username) {
    res.status(400).json({ error: "Username required" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      bio: true,
      level: true,
      isPro: true,
      followerCount: true,
      followingCount: true,
      isBanned: true,
    },
  });

  if (!user || user.isBanned) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [scriptsCount, totalCopiesResult] = await Promise.all([
    prisma.script.count({ where: { authorId: user.id, isPublished: true } }),
    prisma.script.aggregate({
      where: { authorId: user.id, isPublished: true },
      _sum: { copyCount: true },
    }),
  ]);

  let isFollowing = false;
  const accessToken = req.cookies?.[AUTH.ACCESS_COOKIE_NAME];
  if (accessToken) {
    try {
      const payload = verifyAccessToken(accessToken);
      if (payload && payload.sub !== user.id) {
        const follow = await prisma.follow.findUnique({
          where: {
            followerId_targetType_targetId: {
              followerId: payload.sub,
              targetType: "USER",
              targetId: user.id,
            },
          },
        });
        isFollowing = !!follow;
      }
    } catch {
      //
    }
  }

  res.json({
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio ?? "",
    level: user.level,
    isPro: user.isPro,
    followerCount: user.followerCount,
    followingCount: user.followingCount,
    scriptsCount,
    totalCopies: totalCopiesResult._sum.copyCount ?? 0,
    isFollowing,
  });
});

// POST /api/v1/users/:id/follow — follow a user (toggle)
router.post(
  "/:id/follow",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const followerId = req.user!.id;
    const targetId = req.params.id;

    if (targetId === followerId) {
      res.status(400).json({ error: "Cannot follow yourself." });
      return;
    }

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, followerCount: true, followingCount: true },
    });
    if (!target) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_targetType_targetId: {
          followerId,
          targetType: "USER",
          targetId,
        },
      },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.follow.delete({ where: { id: existing.id } }),
        prisma.user.update({
          where: { id: targetId },
          data: { followerCount: { decrement: 1 } },
        }),
        prisma.user.update({
          where: { id: followerId },
          data: { followingCount: { decrement: 1 } },
        }),
      ]);
      const updated = await prisma.user.findUnique({
        where: { id: targetId },
        select: { followerCount: true },
      });
      if (!updated) {
        res.status(404).json({ error: "User not found after unfollow." });
        return;
      }
      const followerUpdated = await prisma.user.findUnique({
        where: { id: followerId },
        select: { followingCount: true },
      });
      if (!followerUpdated) {
        res.status(404).json({ error: "User not found after unfollow." });
        return;
      }
      res.json({
        following: false,
        followerCount: updated.followerCount,
        followingCount: followerUpdated.followingCount,
      });
      return;
    }

    await prisma.$transaction([
      prisma.follow.create({
        data: {
          followerId,
          targetType: "USER",
          targetId,
        },
      }),
      prisma.user.update({
        where: { id: targetId },
        data: { followerCount: { increment: 1 } },
      }),
      prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      }),
    ]);

    const follower = await prisma.user.findUnique({
      where: { id: followerId },
      select: { username: true },
    });
    await addNotificationJob({
      type: "NEW_FOLLOWER",
      userId: targetId,
      actorId: followerId,
      targetType: "USER",
      targetId,
      targetUrl: follower ? `/u/${follower.username}` : null,
    });

    const updated = await prisma.user.findUnique({
      where: { id: targetId },
      select: { followerCount: true },
    });
    if (!updated) {
      res.status(404).json({ error: "User not found after follow." });
      return;
    }
    const followerUpdated = await prisma.user.findUnique({
      where: { id: followerId },
      select: { followingCount: true },
    });
    if (!followerUpdated) {
      res.status(404).json({ error: "User not found after follow." });
      return;
    }
    res.json({
      following: true,
      followerCount: updated.followerCount,
      followingCount: followerUpdated.followingCount,
    });
  }
);

export default router;

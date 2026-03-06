import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import { getMeiliClient, SCRIPTS_INDEX } from "../../lib/meilisearch.js";

const router = Router();

const VALID_SORTS: Record<string, string> = {
  recent: "createdAt:desc",
  "most-copied": "copyCount:desc",
  "top-rated": "likeCount:desc",
  "ai-score": "aiSafetyScore:desc",
};

type SearchHit = {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  gameName: string | null;
  gameSlug: string | null;
  authorUsername: string;
  authorAvatar: string | null;
  status: string;
  likeCount: number;
  viewCount: number;
  copyCount: number;
  tags: string[];
  aiScore: number | null;
  isAuthorPro: boolean;
  isTrending: boolean;
  createdAt: string | Date;
};

function sanitizeTag(tag: string): string {
  return tag.replace(/[^a-zA-Z0-9-]/g, "");
}

// GET /api/v1/search?q=&game=&status=&executor=&platform=&sort=&page=&limit=&hasAiSummary=&noKeyRequired=&tag=
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const q = (req.query.q as string) ?? "";
  const game = req.query.game as string | undefined;
  const status = req.query.status as string | undefined;
  const executor = req.query.executor as string | undefined;
  const platform = req.query.platform as string | undefined;
  const rawTag = req.query.tag as string | undefined;
  const tag = rawTag ? sanitizeTag(rawTag) : undefined;
  const sort = (req.query.sort as string) ?? "recent";
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 12));
  const hasAiSummary = req.query.hasAiSummary === "true";
  const noKeyRequired = req.query.noKeyRequired === "true";

  const meili = getMeiliClient();
  if (meili && q.trim()) {
    const filter: string[] = ['isPublished = true'];
    if (game) filter.push(`gameSlug = "${game}"`);
    if (status) {
      const statuses = status.split(",").map((s) => `status = "${s.toUpperCase()}"`);
      filter.push(`(${statuses.join(" OR ")})`);
    }
    if (executor) {
      const execs = executor.split(",").map((e) => `executorCompat = "${e}"`);
      filter.push(`(${execs.join(" OR ")})`);
    }
    if (platform) filter.push(`platform = "${platform.toUpperCase()}"`);
    if (tag) filter.push(`tags = "${tag}"`);
    if (hasAiSummary) filter.push("hasAiSummary = true");
    if (noKeyRequired) filter.push("requiresKey = false");

    try {
      const index = meili.index(SCRIPTS_INDEX);
      const result = await index.search(q, {
        filter: filter.join(" AND "),
        sort: VALID_SORTS[sort] ? [VALID_SORTS[sort]] : ["createdAt:desc"],
        limit,
        offset: (page - 1) * limit,
        attributesToRetrieve: [
          "id",
          "slug",
          "title",
          "coverUrl",
          "gameName",
          "gameSlug",
          "authorUsername",
          "authorAvatar",
          "status",
          "likeCount",
          "viewCount",
          "copyCount",
          "tags",
          "aiScore",
          "aiSafetyScore",
          "isAuthorPro",
          "isTrending",
          "createdAt",
        ],
      });
      const hits = result.hits.map((hit) => {
        const source = hit as Record<string, unknown>;
        return {
          id: String(source.id ?? ""),
          slug: String(source.slug ?? ""),
          title: String(source.title ?? ""),
          coverUrl:
            typeof source.coverUrl === "string" ? source.coverUrl : null,
          gameName:
            typeof source.gameName === "string" ? source.gameName : null,
          gameSlug:
            typeof source.gameSlug === "string" ? source.gameSlug : null,
          authorUsername:
            typeof source.authorUsername === "string"
              ? source.authorUsername
              : "",
          authorAvatar:
            typeof source.authorAvatar === "string" ? source.authorAvatar : null,
          status: String(source.status ?? "TESTING"),
          likeCount:
            typeof source.likeCount === "number" ? source.likeCount : 0,
          viewCount:
            typeof source.viewCount === "number" ? source.viewCount : 0,
          copyCount:
            typeof source.copyCount === "number" ? source.copyCount : 0,
          tags: Array.isArray(source.tags)
            ? source.tags.filter((t): t is string => typeof t === "string")
            : [],
          aiScore:
            typeof source.aiScore === "number"
              ? source.aiScore
              : typeof source.aiSafetyScore === "number"
                ? source.aiSafetyScore
                : null,
          isAuthorPro:
            typeof source.isAuthorPro === "boolean" ? source.isAuthorPro : false,
          isTrending:
            typeof source.isTrending === "boolean" ? source.isTrending : false,
          createdAt:
            typeof source.createdAt === "string"
              ? source.createdAt
              : new Date(0).toISOString(),
        } satisfies SearchHit;
      });
      res.json({
        hits,
        total: result.estimatedTotalHits ?? 0,
        page,
        limit,
      });
      return;
    } catch {
      // Fall through to Prisma
    }
  }

  // Prisma fallback (no Meilisearch or empty query)
  const where: Record<string, unknown> = { isPublished: true };
  if (q.trim()) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (game) where.game = { slug: game };
  if (tag) where.tags = { some: { tag: { slug: tag } } };
  if (status) {
    where.status = { in: status.split(",").map((s) => s.toUpperCase()) };
  }
  if (platform) where.platform = platform.toUpperCase();
  if (hasAiSummary) where.aiSummary = { not: null };
  if (noKeyRequired) where.requiresKey = false;

  const orderBy: Record<string, string> = {};
  switch (sort) {
    case "most-copied": orderBy.copyCount = "desc"; break;
    case "top-rated": orderBy.likeCount = "desc"; break;
    case "ai-score": orderBy.aiSafetyScore = "desc"; break;
    default: orderBy.createdAt = "desc"; break;
  }

  const [scripts, total] = await Promise.all([
    prisma.script.findMany({
      where,
      orderBy,
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
        isTrending: true,
        createdAt: true,
        author: { select: { username: true, avatarUrl: true, isPro: true } },
        game: { select: { name: true, slug: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    }),
    prisma.script.count({ where }),
  ]);

  const hits: SearchHit[] = scripts.map((s: typeof scripts[number]) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    coverUrl: s.coverUrl,
    gameName: s.game?.name ?? null,
    gameSlug: s.game?.slug ?? null,
    authorUsername: s.author.username,
    authorAvatar: s.author.avatarUrl,
    status: s.status,
    likeCount: s.likeCount,
    viewCount: s.viewCount,
    copyCount: s.copyCount,
    tags: s.tags.map((st: { tag: { name: string } }) => st.tag.name),
    aiScore: s.aiSafetyScore,
    isAuthorPro: s.author.isPro,
    isTrending: s.isTrending,
    createdAt: s.createdAt,
  }));

  res.json({ hits, total, page, limit });
});

// GET /api/v1/search/suggestions?q=
router.get("/suggestions", async (req: Request, res: Response): Promise<void> => {
  const q = ((req.query.q as string) ?? "").trim();
  if (!q) {
    res.json({ scripts: [], games: [] });
    return;
  }

  const meili = getMeiliClient();
  if (meili) {
    try {
      const index = meili.index(SCRIPTS_INDEX);
      const result = await index.search(q, {
        limit: 8,
        attributesToRetrieve: [
          "id", "slug", "title", "coverUrl", "status",
          "gameName", "gameSlug",
        ],
      });
      const scripts = result.hits.slice(0, 5);
      // Separate games query
      const gameHits = await prisma.game.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        take: 3,
        select: { id: true, name: true, slug: true, thumbnailUrl: true, scriptCount: true },
      });
      res.json({ scripts, games: gameHits });
      return;
    } catch {
      // Fall through
    }
  }

  // Prisma fallback
  const [scripts, games] = await Promise.all([
    prisma.script.findMany({
      where: {
        isPublished: true,
        title: { contains: q, mode: "insensitive" },
      },
      take: 5,
      select: {
        id: true,
        slug: true,
        title: true,
        coverUrl: true,
        status: true,
        game: { select: { name: true, slug: true } },
      },
    }),
    prisma.game.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 3,
      select: { id: true, name: true, slug: true, thumbnailUrl: true, scriptCount: true },
    }),
  ]);

  const mapped = scripts.map((s: typeof scripts[number]) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    coverUrl: s.coverUrl,
    status: s.status,
    gameName: s.game?.name ?? null,
    gameSlug: s.game?.slug ?? null,
  }));

  res.json({ scripts: mapped, games });
});

export default router;

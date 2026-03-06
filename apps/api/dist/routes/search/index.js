import { Router } from "express";
import { PrismaClient } from "@scriptify/db";
import { getMeiliClient, SCRIPTS_INDEX } from "../../lib/meilisearch.js";
const router = Router();
const prisma = new PrismaClient();
const VALID_SORTS = {
    recent: "createdAt:desc",
    "most-copied": "copyCount:desc",
    "top-rated": "likeCount:desc",
    "ai-score": "aiSafetyScore:desc",
};
// GET /api/v1/search?q=&game=&status=&executor=&platform=&sort=&page=&limit=&hasAiSummary=&noKeyRequired=
router.get("/", async (req, res) => {
    const q = req.query.q ?? "";
    const game = req.query.game;
    const status = req.query.status;
    const executor = req.query.executor;
    const platform = req.query.platform;
    const sort = req.query.sort ?? "recent";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const hasAiSummary = req.query.hasAiSummary === "true";
    const noKeyRequired = req.query.noKeyRequired === "true";
    const meili = getMeiliClient();
    if (meili && q.trim()) {
        const filter = ['isPublished = true'];
        if (game)
            filter.push(`gameSlug = "${game}"`);
        if (status) {
            const statuses = status.split(",").map((s) => `status = "${s.toUpperCase()}"`);
            filter.push(`(${statuses.join(" OR ")})`);
        }
        if (executor) {
            const execs = executor.split(",").map((e) => `executorCompat = "${e}"`);
            filter.push(`(${execs.join(" OR ")})`);
        }
        if (platform)
            filter.push(`platform = "${platform.toUpperCase()}"`);
        if (hasAiSummary)
            filter.push("hasAiSummary = true");
        if (noKeyRequired)
            filter.push("requiresKey = false");
        try {
            const index = meili.index(SCRIPTS_INDEX);
            const result = await index.search(q, {
                filter: filter.join(" AND "),
                sort: VALID_SORTS[sort] ? [VALID_SORTS[sort]] : ["createdAt:desc"],
                limit,
                offset: (page - 1) * limit,
            });
            res.json({
                hits: result.hits,
                total: result.estimatedTotalHits ?? 0,
                page,
                limit,
            });
            return;
        }
        catch {
            // Fall through to Prisma
        }
    }
    // Prisma fallback (no Meilisearch or empty query)
    const where = { isPublished: true };
    if (q.trim()) {
        where.OR = [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
        ];
    }
    if (game)
        where.game = { slug: game };
    if (status) {
        where.status = { in: status.split(",").map((s) => s.toUpperCase()) };
    }
    if (platform)
        where.platform = platform.toUpperCase();
    if (hasAiSummary)
        where.aiSummary = { not: null };
    if (noKeyRequired)
        where.requiresKey = false;
    const orderBy = {};
    switch (sort) {
        case "most-copied":
            orderBy.copyCount = "desc";
            break;
        case "top-rated":
            orderBy.likeCount = "desc";
            break;
        case "ai-score":
            orderBy.aiSafetyScore = "desc";
            break;
        default:
            orderBy.createdAt = "desc";
            break;
    }
    const [scripts, total] = await Promise.all([
        prisma.script.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                author: { select: { username: true, avatarUrl: true, isPro: true } },
                game: { select: { name: true, slug: true, thumbnailUrl: true } },
                tags: { include: { tag: true } },
            },
        }),
        prisma.script.count({ where }),
    ]);
    const hits = scripts.map((s) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        description: s.description,
        coverUrl: s.coverUrl,
        status: s.status,
        platform: s.platform,
        viewCount: s.viewCount,
        copyCount: s.copyCount,
        likeCount: s.likeCount,
        dislikeCount: s.dislikeCount,
        aiSafetyScore: s.aiSafetyScore,
        aiSummary: s.aiSummary,
        requiresKey: s.requiresKey,
        createdAt: s.createdAt,
        authorUsername: s.author.username,
        authorAvatar: s.author.avatarUrl,
        isAuthorPro: s.author.isPro,
        gameName: s.game?.name ?? null,
        gameSlug: s.game?.slug ?? null,
        gameThumbnail: s.game?.thumbnailUrl ?? null,
        tags: s.tags.map((st) => st.tag.name),
        rawCode: s.rawCode,
    }));
    res.json({ hits, total, page, limit });
});
// GET /api/v1/search/suggestions?q=
router.get("/suggestions", async (req, res) => {
    const q = (req.query.q ?? "").trim();
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
        }
        catch {
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
    const mapped = scripts.map((s) => ({
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

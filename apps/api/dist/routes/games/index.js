import { Router } from "express";
import { PrismaClient } from "@scriptify/db";
const router = Router();
const prisma = new PrismaClient();
// GET /api/v1/games?q= — search games by name for publish dropdown
router.get("/", async (req, res) => {
    const q = (req.query.q ?? "").trim();
    const games = await prisma.game.findMany({
        where: q ? { name: { contains: q, mode: "insensitive" } } : {},
        select: {
            id: true,
            name: true,
            slug: true,
            thumbnailUrl: true,
            playerCountCached: true,
            scriptCount: true,
        },
        take: 20,
        orderBy: [{ playerCountCached: "desc" }, { name: "asc" }],
    });
    res.json(games.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        thumbnailUrl: g.thumbnailUrl,
        playerCountCached: g.playerCountCached,
        scriptCount: g.scriptCount,
    })));
});
export default router;

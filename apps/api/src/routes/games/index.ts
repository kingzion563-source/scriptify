import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma.js";

const router = Router();

// GET /api/v1/games?q= — search games by name for publish dropdown
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const q = ((req.query.q as string) ?? "").trim();

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

  res.json(
    games.map((g: (typeof games)[number]) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      thumbnailUrl: g.thumbnailUrl,
      playerCountCached: g.playerCountCached,
      scriptCount: g.scriptCount,
    }))
  );
});

// GET /api/v1/games/:slug — game by slug for game page
router.get("/:slug", async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;
  const game = await prisma.game.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      thumbnailUrl: true,
      playerCountCached: true,
      scriptCount: true,
      category: true,
    },
  });
  if (!game) {
    res.status(404).json({ message: "Game not found" });
    return;
  }
  res.json(game);
});

export default router;

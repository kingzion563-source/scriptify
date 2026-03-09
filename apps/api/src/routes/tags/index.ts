import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma.js";

const router = Router();

// GET /api/v1/tags?q= — tag name suggestions for publish form
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const q = ((req.query.q as string) ?? "").trim();

    const tags = await prisma.tag.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : {},
      select: { name: true, slug: true, usageCount: true },
      take: 15,
      orderBy: { usageCount: "desc" },
    });

    res.json(
      tags.map((t: { name: string; slug: string; usageCount: number }) => ({
        name: t.name,
        slug: t.slug,
        usageCount: t.usageCount,
      }))
    );
  } catch {
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;

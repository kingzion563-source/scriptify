import { Router } from "express";
import { PrismaClient } from "@scriptify/db";
const router = Router();
const prisma = new PrismaClient();
// GET /api/v1/tags?q= — tag name suggestions for publish form
router.get("/", async (req, res) => {
    const q = (req.query.q ?? "").trim();
    const tags = await prisma.tag.findMany({
        where: q ? { name: { contains: q, mode: "insensitive" } } : {},
        select: { name: true, slug: true, usageCount: true },
        take: 15,
        orderBy: { usageCount: "desc" },
    });
    res.json(tags.map((t) => ({
        name: t.name,
        slug: t.slug,
        usageCount: t.usageCount,
    })));
});
export default router;

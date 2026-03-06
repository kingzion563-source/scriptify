import { Router, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@scriptify/db";
import prisma from "../../lib/prisma.js";
import { authenticateToken } from "../../middleware/authenticateToken.js";

const router = Router();

// ─── POST /api/v1/comments/:id/vote ───────────────────────────────────────────
const voteSchema = z.object({ value: z.union([z.literal(1), z.literal(-1), z.literal(0)]) });

router.post(
  "/:id/vote",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { id: commentId } = req.params;
    const userId = req.user!.id;

    const parsed = voteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid vote value. Use -1, 0, or 1." });
      return;
    }
    const { value } = parsed.data;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, likeCount: true, dislikeCount: true },
    });
    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    const existing = await prisma.vote.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: "COMMENT",
          targetId: commentId,
        },
      },
    });

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (value === 0) {
        if (!existing) return;
        await tx.vote.delete({ where: { id: existing.id } });
        if (existing.value === 1) {
          await tx.comment.update({
            where: { id: commentId },
            data: { likeCount: { decrement: 1 } },
          });
        } else if (existing.value === -1) {
          await tx.comment.update({
            where: { id: commentId },
            data: { dislikeCount: { decrement: 1 } },
          });
        }
      } else if (!existing) {
        await tx.vote.create({
          data: { userId, targetType: "COMMENT", targetId: commentId, value },
        });
        if (value === 1) {
          await tx.comment.update({
            where: { id: commentId },
            data: { likeCount: { increment: 1 } },
          });
        } else {
          await tx.comment.update({
            where: { id: commentId },
            data: { dislikeCount: { increment: 1 } },
          });
        }
      } else if (existing.value !== value) {
        await tx.vote.update({ where: { id: existing.id }, data: { value } });
        if (value === 1) {
          await tx.comment.update({
            where: { id: commentId },
            data: { likeCount: { increment: 1 }, dislikeCount: { decrement: 1 } },
          });
        } else {
          await tx.comment.update({
            where: { id: commentId },
            data: { likeCount: { decrement: 1 }, dislikeCount: { increment: 1 } },
          });
        }
      }
    });

    const updated = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { likeCount: true, dislikeCount: true },
    });

    res.json({
      likeCount: updated!.likeCount,
      dislikeCount: updated!.dislikeCount,
      userVote: value === 0 ? null : value,
    });
  }
);

// ─── DELETE /api/v1/comments/:id ─────────────────────────────────────────────
router.delete("/:id", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { id: commentId } = req.params;
  const userId = req.user!.id;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { script: { select: { authorId: true } } },
  });
  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }
  if (comment.userId !== userId) {
    res.status(403).json({ error: "You can only delete your own comments." });
    return;
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: { body: "", isDeleted: true, isEdited: false },
  });

  res.json({ ok: true });
});

// ─── PATCH /api/v1/comments/:id/pin ──────────────────────────────────────────
router.patch(
  "/:id/pin",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const { id: commentId } = req.params;
    const userId = req.user!.id;
    const body = req.body as { isPinned?: boolean };
    const isPinned = Boolean(body?.isPinned);

    const comment = await prisma.comment.findUnique({
      where: { id: commentId, parentId: null },
      include: { script: { select: { authorId: true } } },
    });
    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }
    if (comment.script.authorId !== userId) {
      res.status(403).json({ error: "Only the script author can pin comments." });
      return;
    }

    if (isPinned) {
      await prisma.comment.updateMany({
        where: { scriptId: comment.scriptId, parentId: null },
        data: { isPinned: false },
      });
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { isPinned },
    });

    res.json({ isPinned });
  }
);

export default router;

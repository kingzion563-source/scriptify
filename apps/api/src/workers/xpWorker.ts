import { Worker } from "bullmq";
import { Redis as RedisType } from "ioredis";
const Redis = require("ioredis");
import prisma from "../lib/prisma.js";
import { getEnvOptional } from "../config.js";
import { XP_QUEUE, getXpAmount, type XpJobPayload } from "../lib/xpQueue.js";
import { getLevelFromXp } from "../lib/xpLevels.js";
import { addNotificationJob } from "../lib/notificationsQueue.js";
import { broadcastNewNotification } from "../lib/realtimeBroadcast.js";

function getConnection(): RedisType | null {
  const url = getEnvOptional("REDIS_URL");
  if (!url || (!url.startsWith("redis://") && !url.startsWith("rediss://")))
    return null;
  try {
    const conn = new Redis(url, { maxRetriesPerRequest: null });
    conn.on("error", () => {});
    return conn;
  } catch {
    return null;
  }
}

export async function startXpWorker(): Promise<void> {
  const connection = getConnection();
  if (!connection) return;
  try {
    await connection.ping();
  } catch {
    return;
  }

  const worker = new Worker<XpJobPayload>(
    XP_QUEUE,
    async (job) => {
      const { eventType, userId } = job.data;
      const amount = getXpAmount(eventType);

      if (eventType === "daily_login") {
        const today = new Date().toISOString().slice(0, 10);
        const key = `xp:daily:${userId}:${today}`;
        const redis = getConnection();
        if (redis) {
          const ok = await redis.set(key, "1", "PX", 25 * 60 * 60 * 1000, "NX");
          if (ok !== "OK") return;
        }
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, xp: true, level: true },
      });
      if (!user) return;

      const newXp = Math.max(0, user.xp + amount);
      const newLevel = getLevelFromXp(newXp);
      const levelUp = newLevel > user.level;

      await prisma.user.update({
        where: { id: userId },
        data: { xp: newXp, level: newLevel },
      });

      if (levelUp) {
        const userWithUsername = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });
        await addNotificationJob({
          type: "LEVEL_UP",
          userId,
          targetType: "USER",
          targetId: userId,
          targetUrl: userWithUsername ? `/u/${userWithUsername.username}` : null,
        });
        await broadcastNewNotification(userId);
      }
    },
    { connection, concurrency: 5 }
  );
  worker.on("error", () => {});

  worker.on("failed", () => {
    //
  });
}

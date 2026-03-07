import { Worker } from "bullmq";
import Redis from "ioredis";
import prisma from "../lib/prisma.js";
import { getEnvOptional } from "../config.js";
import { NOTIFICATIONS_QUEUE } from "../lib/notificationsQueue.js";
import type { NotificationPayload } from "../lib/notificationsQueue.js";
import { broadcastNewNotification } from "../lib/realtimeBroadcast.js";

function getConnection(): InstanceType<typeof Redis> | null {
  const url = getEnvOptional("REDIS_URL");
  if (!url || (!url.startsWith("redis://") && !url.startsWith("rediss://"))) return null;
  try {
    const conn = new Redis(url, { maxRetriesPerRequest: null });
    conn.on("error", () => {});
    return conn;
  } catch {
    return null;
  }
}

export async function startNotificationsWorker(): Promise<void> {
  const connection = getConnection();
  if (!connection) return;
  try {
    await connection.ping();
  } catch {
    return;
  }

  const worker = new Worker<NotificationPayload>(
    NOTIFICATIONS_QUEUE,
    async (job) => {
      const { type, userId, actorId, targetType, targetId, targetUrl } = job.data;
      await prisma.notification.create({
        data: {
          userId,
          type,
          actorId: actorId ?? null,
          targetType: targetType ?? null,
          targetId: targetId ?? null,
          targetUrl: targetUrl ?? null,
        },
      });
      await broadcastNewNotification(userId);
    },
    { connection: connection as any, concurrency: 5 }
  );
  worker.on("error", () => {});

  worker.on("completed", () => {});
  worker.on("failed", () => {
    //
  });
}

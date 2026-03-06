import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@scriptify/db";
import { getEnvOptional } from "../config.js";
import { NOTIFICATIONS_QUEUE } from "../lib/notificationsQueue.js";
import { broadcastNewNotification } from "../lib/realtimeBroadcast.js";
const prisma = new PrismaClient();
function getConnection() {
    const url = getEnvOptional("REDIS_URL");
    if (!url || (!url.startsWith("redis://") && !url.startsWith("rediss://")))
        return null;
    return new IORedis(url, { maxRetriesPerRequest: null });
}
export function startNotificationsWorker() {
    const connection = getConnection();
    if (!connection) {
        console.warn("Notifications worker: REDIS_URL not set, skipping.");
        return;
    }
    const worker = new Worker(NOTIFICATIONS_QUEUE, async (job) => {
        const { type, userId, actorId, targetType, targetId } = job.data;
        await prisma.notification.create({
            data: {
                userId,
                type,
                actorId: actorId ?? null,
                targetType: targetType ?? null,
                targetId: targetId ?? null,
            },
        });
        await broadcastNewNotification(userId);
    }, { connection, concurrency: 5 });
    worker.on("completed", () => { });
    worker.on("failed", (job, err) => {
        console.error("Notification job failed:", job?.id, err);
    });
}

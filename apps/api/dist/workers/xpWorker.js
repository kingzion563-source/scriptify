import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@scriptify/db";
import { getEnvOptional } from "../config.js";
import { XP_QUEUE, getXpAmount } from "../lib/xpQueue.js";
import { getLevelFromXp } from "../lib/xpLevels.js";
import { addNotificationJob } from "../lib/notificationsQueue.js";
import { broadcastNewNotification } from "../lib/realtimeBroadcast.js";
const prisma = new PrismaClient();
function getConnection() {
    const url = getEnvOptional("REDIS_URL");
    if (!url || (!url.startsWith("redis://") && !url.startsWith("rediss://")))
        return null;
    return new IORedis(url, { maxRetriesPerRequest: null });
}
export function startXpWorker() {
    const connection = getConnection();
    if (!connection) {
        console.warn("XP worker: REDIS_URL not set, skipping.");
        return;
    }
    const worker = new Worker(XP_QUEUE, async (job) => {
        const { eventType, userId } = job.data;
        const amount = getXpAmount(eventType);
        if (eventType === "daily_login") {
            const today = new Date().toISOString().slice(0, 10);
            const key = `xp:daily:${userId}:${today}`;
            const redis = getConnection();
            if (redis) {
                const ok = await redis.set(key, "1", "PX", 25 * 60 * 60 * 1000, "NX");
                if (ok !== "OK")
                    return;
            }
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, xp: true, level: true },
        });
        if (!user)
            return;
        const newXp = Math.max(0, user.xp + amount);
        const newLevel = getLevelFromXp(newXp);
        const levelUp = newLevel > user.level;
        await prisma.user.update({
            where: { id: userId },
            data: { xp: newXp, level: newLevel },
        });
        if (levelUp) {
            await addNotificationJob({
                type: "LEVEL_UP",
                userId,
                targetType: "USER",
                targetId: userId,
            });
            await broadcastNewNotification(userId);
        }
    }, { connection, concurrency: 5 });
    worker.on("failed", (job, err) => {
        console.error("XP job failed:", job?.id, err);
    });
}

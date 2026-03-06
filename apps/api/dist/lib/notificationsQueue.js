import { Queue } from "bullmq";
import IORedis from "ioredis";
import { getEnvOptional } from "../config.js";
const NOTIFICATIONS_QUEUE = "scriptify:notifications";
let connection = null;
let queue = null;
function getConnection() {
    if (connection)
        return connection;
    const url = getEnvOptional("REDIS_URL");
    if (!url || (!url.startsWith("redis://") && !url.startsWith("rediss://")))
        return null;
    try {
        connection = new IORedis(url, { maxRetriesPerRequest: null });
    }
    catch {
        //
    }
    return connection;
}
function getQueue() {
    if (queue)
        return queue;
    const conn = getConnection();
    if (!conn)
        return null;
    queue = new Queue(NOTIFICATIONS_QUEUE, {
        connection: conn,
        defaultJobOptions: { removeOnComplete: 100 },
    });
    return queue;
}
export async function addNotificationJob(payload) {
    const q = getQueue();
    if (!q)
        return;
    try {
        await q.add(payload.type, payload);
    }
    catch (err) {
        console.error("Notifications queue add failed:", err);
    }
}
export { NOTIFICATIONS_QUEUE };

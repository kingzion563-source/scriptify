import { Queue } from "bullmq";
import IORedis from "ioredis";
import { getEnvOptional } from "../config.js";
const XP_QUEUE = "scriptify:xp";
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
    queue = new Queue(XP_QUEUE, {
        connection: conn,
        defaultJobOptions: { removeOnComplete: 200 },
    });
    return queue;
}
const XP_AMOUNTS = {
    publish_script: 100,
    script_10_copies: 10,
    script_100_copies: 50,
    script_1000_copies: 150,
    script_like: 2,
    comment_on_your_script: 1,
    daily_login: 10,
    script_featured: 500,
    valid_report_against_user: -50,
};
export function getXpAmount(eventType) {
    return XP_AMOUNTS[eventType] ?? 0;
}
export async function addXpJob(payload) {
    const q = getQueue();
    if (!q)
        return;
    try {
        await q.add(payload.eventType, payload);
    }
    catch (err) {
        console.error("XP queue add failed:", err);
    }
}
export { XP_QUEUE };

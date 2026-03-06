import { Queue } from "bullmq";
import Redis from "ioredis";
import { getEnvOptional } from "../config.js";

const NOTIFICATIONS_QUEUE = "scriptify:notifications";

let connection: Redis | null = null;
let queue: Queue | null = null;

function getConnection(): Redis | null {
  if (connection) return connection;
  const url = getEnvOptional("REDIS_URL");
  if (!url || (!url.startsWith("redis://") && !url.startsWith("rediss://"))) return null;
  try {
    connection = new Redis(url, { maxRetriesPerRequest: null });
    connection.on("error", () => {});
  } catch {
    connection = null;
  }
  return connection;
}

function getQueue(): Queue | null {
  if (queue) return queue;
  const conn = getConnection();
  if (!conn) return null;
  queue = new Queue(NOTIFICATIONS_QUEUE, {
    connection: conn as never,
    defaultJobOptions: { removeOnComplete: 100 },
  });
  queue.on("error", () => {});
  return queue;
}

export type NotificationPayload = {
  type:
    | "COMMENT_ON_SCRIPT"
    | "REPLY_TO_COMMENT"
    | "NEW_FOLLOWER"
    | "SCRIPT_MILESTONE"
    | "SCRIPT_FEATURED"
    | "LEVEL_UP"
    | "SCRIPT_FLAGGED"
    | "SCRIPT_APPROVED";
  userId: string;
  actorId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetUrl?: string | null;
};

export async function addNotificationJob(payload: NotificationPayload): Promise<void> {
  const q = getQueue();
  if (!q) return;
  try {
    await q.add(payload.type, payload);
  } catch {
    //
  }
}

export { NOTIFICATIONS_QUEUE };

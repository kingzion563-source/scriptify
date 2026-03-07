import { Queue } from "bullmq";
import Redis from "ioredis";
import { getEnvOptional } from "../config.js";

const XP_QUEUE = "scriptify:xp";

let connection: InstanceType<typeof Redis> | null = null;
let queue: Queue | null = null;

function getConnection(): InstanceType<typeof Redis> | null {
  if (connection) return connection;
  const url = getEnvOptional("REDIS_URL");
  if (!url || (!url.startsWith("redis://") && !url.startsWith("rediss://")))
    return null;
  try {
    connection = new Redis(url, { maxRetriesPerRequest: null });
    if (connection) connection.on("error", () => {});
  } catch {
    connection = null;
  }
  return connection;
}

function getQueue(): Queue | null {
  if (queue) return queue;
  const conn = getConnection();
  if (!conn) return null;
  queue = new Queue(XP_QUEUE, {
    connection: conn as never,
    defaultJobOptions: { removeOnComplete: 200 },
  });
  queue.on("error", () => {});
  return queue;
}

export type XpEventType =
  | "publish_script"
  | "script_10_copies"
  | "script_100_copies"
  | "script_1000_copies"
  | "script_like"
  | "comment_on_your_script"
  | "daily_login"
  | "script_featured"
  | "valid_report_against_user";

export type XpJobPayload = {
  eventType: XpEventType;
  userId: string;
  scriptId?: string;
  actorId?: string;
};

const XP_AMOUNTS: Record<XpEventType, number> = {
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

export function getXpAmount(eventType: XpEventType): number {
  return XP_AMOUNTS[eventType] ?? 0;
}

export async function addXpJob(payload: XpJobPayload): Promise<void> {
  const q = getQueue();
  if (!q) return;
  try {
    await q.add(payload.eventType, payload);
  } catch {
    //
  }
}

export { XP_QUEUE };

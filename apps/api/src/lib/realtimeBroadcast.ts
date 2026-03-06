import { createClient } from "@supabase/supabase-js";
import { getEnvOptional } from "../config.js";

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (supabase) return supabase;
  const url = getEnvOptional("SUPABASE_URL") ?? getEnvOptional("NEXT_PUBLIC_SUPABASE_URL");
  const key = getEnvOptional("SUPABASE_SERVICE_ROLE_KEY") ?? getEnvOptional("SUPABASE_ANON_KEY") ?? getEnvOptional("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

export async function broadcastNewComment(scriptId: string, payload: object): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  try {
    const channel = client.channel(`script:${scriptId}:comments`);
    await channel.send({ type: "broadcast", event: "new_comment", payload });
  } catch {
    //
  }
}

export async function broadcastNewNotification(userId: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  try {
    const channel = client.channel(`user:${userId}:notifications`);
    await channel.send({ type: "broadcast", event: "new_notification", payload: {} });
  } catch {
    //
  }
}

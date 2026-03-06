import { createClient } from "@supabase/supabase-js";
import { getEnvOptional } from "../config.js";
let supabase = null;
function getSupabase() {
    if (supabase)
        return supabase;
    const url = getEnvOptional("SUPABASE_URL") ?? getEnvOptional("NEXT_PUBLIC_SUPABASE_URL");
    const key = getEnvOptional("SUPABASE_SERVICE_ROLE_KEY") ?? getEnvOptional("SUPABASE_ANON_KEY") ?? getEnvOptional("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    if (!url || !key)
        return null;
    supabase = createClient(url, key);
    return supabase;
}
export async function broadcastNewComment(scriptId, payload) {
    const client = getSupabase();
    if (!client)
        return;
    try {
        const channel = client.channel(`script:${scriptId}:comments`);
        await channel.send({ type: "broadcast", event: "new_comment", payload });
    }
    catch (err) {
        console.error("Realtime broadcast failed:", err);
    }
}
export async function broadcastNewNotification(userId) {
    const client = getSupabase();
    if (!client)
        return;
    try {
        const channel = client.channel(`user:${userId}:notifications`);
        await channel.send({ type: "broadcast", event: "new_notification", payload: {} });
    }
    catch (err) {
        console.error("Realtime broadcast failed:", err);
    }
}

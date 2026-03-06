import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnvOptional } from "../config.js";

const BUCKET = "script-covers";

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (client) return client;
  const url = getEnvOptional("SUPABASE_URL");
  const key = getEnvOptional("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  client = createClient(url, key);
  return client;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ALLOWED_MIMES = Object.keys(MIME_TO_EXT);
export const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function uploadCoverImage(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
): Promise<string> {
  const supabase = getClient();
  if (!supabase) {
    throw new Error("Supabase Storage is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
  }

  const ext = MIME_TO_EXT[mimeType];
  if (!ext) {
    throw new Error(`Unsupported file type: ${mimeType}. Allowed: JPG, PNG, WebP.`);
  }

  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error(`File too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB). Max 2 MB.`);
  }

  const timestamp = Date.now();
  const safeName = originalName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 60);
  const path = `covers/${timestamp}-${safeName}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      cacheControl: "public, max-age=31536000, immutable",
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

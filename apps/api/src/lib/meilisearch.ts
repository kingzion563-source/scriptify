import { MeiliSearch } from "meilisearch";
import { getEnvOptional } from "../config.js";

let client: MeiliSearch | null = null;

export function getMeiliClient(): MeiliSearch | null {
  if (client) return client;
  const host = getEnvOptional("MEILISEARCH_HOST");
  const apiKey = getEnvOptional("MEILISEARCH_API_KEY");
  if (!host) return null;
  client = new MeiliSearch({ host, apiKey: apiKey ?? "" });
  return client;
}

export const SCRIPTS_INDEX = "scripts";

export async function ensureScriptsIndex(): Promise<void> {
  const meili = getMeiliClient();
  if (!meili) return;
  const index = meili.index(SCRIPTS_INDEX);
  await index.updateSettings({
    searchableAttributes: [
      "title",
      "description",
      "gameName",
      "tags",
      "aiSummary",
    ],
    filterableAttributes: [
      "status",
      "platform",
      "executorCompat",
      "gameSlug",
      "requiresKey",
      "hasAiSummary",
      "tags",
    ],
    sortableAttributes: [
      "createdAt",
      "copyCount",
      "likeCount",
      "aiSafetyScore",
    ],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
    },
  });
}

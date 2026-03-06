import { MeiliSearch } from "meilisearch";
import { getEnvOptional } from "../config.js";
let client = null;
export function getMeiliClient() {
    if (client)
        return client;
    const host = getEnvOptional("MEILISEARCH_HOST");
    const apiKey = getEnvOptional("MEILISEARCH_API_KEY");
    if (!host)
        return null;
    client = new MeiliSearch({ host, apiKey: apiKey ?? "" });
    return client;
}
export const SCRIPTS_INDEX = "scripts";
export async function ensureScriptsIndex() {
    const meili = getMeiliClient();
    if (!meili)
        return;
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

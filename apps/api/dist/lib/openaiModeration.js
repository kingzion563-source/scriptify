import OpenAI from "openai";
import { getEnvOptional } from "../config.js";
let openai = null;
function getOpenAI() {
    if (openai)
        return openai;
    const key = getEnvOptional("OPENAI_API_KEY");
    if (!key)
        return null;
    openai = new OpenAI({ apiKey: key });
    return openai;
}
export async function moderateText(text) {
    const client = getOpenAI();
    if (!client) {
        return { flagged: false };
    }
    try {
        const result = await client.moderations.create({ input: text });
        const first = result.results[0];
        const flagged = first?.flagged ?? false;
        return { flagged };
    }
    catch {
        return { flagged: false };
    }
}

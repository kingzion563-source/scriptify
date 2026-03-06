import OpenAI from "openai";
import { getEnvOptional } from "../config.js";
const SYSTEM_PROMPT = `You are a Roblox Lua exploit script analyzer for Scriptify. Analyze the provided Lua script and return ONLY a raw JSON object with no markdown and no preamble with these exact keys: title as string max 80 chars, game as string or null, tags as string array up to 8 items lowercase hyphenated, features as string array of human-readable feature names, summary as string 2-3 sentences, safety_score as number 0-100 where 100 is completely safe deducting points for webhooks suspicious HTTP calls obfuscation and data exfiltration, risks as array of objects each with severity as low or medium or high and description as string and optional line as number, executor_compat as array of objects each with name as string and compatible as boolean or null, requires_key as boolean.`;
export async function runAiAnalysis(code) {
    const apiKey = getEnvOptional("OPENAI_API_KEY");
    if (!apiKey) {
        throw new Error("AI analysis is not configured");
    }
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Analyze this Lua script:\n\n\`\`\`lua\n${code}\n\`\`\`` },
        ],
        temperature: 0.2,
        max_tokens: 1500,
    });
    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw)
        throw new Error("Empty AI response");
    let jsonStr = raw;
    const codeFence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;
    const match = raw.match(codeFence);
    if (match)
        jsonStr = match[1].trim();
    return JSON.parse(jsonStr);
}

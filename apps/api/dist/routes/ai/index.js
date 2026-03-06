import { Router } from "express";
import { z } from "zod";
import { getEnvOptional } from "../../config.js";
import { runAiAnalysis } from "../../lib/aiAnalyze.js";
const router = Router();
const analyzeBodySchema = z.object({
    code: z.string().max(512 * 1024, "Script code must be at most 512KB"),
});
// POST /api/v1/ai/analyze — GPT-4o analysis of Lua code. Rate limit applied at app level.
router.post("/analyze", async (req, res) => {
    const parsed = analyzeBodySchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: "Validation failed",
            details: parsed.error.flatten().fieldErrors,
        });
        return;
    }
    const { code } = parsed.data;
    if (!getEnvOptional("OPENAI_API_KEY")) {
        res.status(503).json({
            error: "AI analysis is not configured. Missing OPENAI_API_KEY.",
        });
        return;
    }
    try {
        const data = await runAiAnalysis(code);
        res.json(data);
    }
    catch (err) {
        console.error("AI analyze error:", err);
        res.status(502).json({
            error: err instanceof Error ? err.message : "AI analysis failed",
        });
    }
});
export default router;

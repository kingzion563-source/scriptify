import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRouter from "./routes/auth/index.js";
import searchRouter from "./routes/search/index.js";
import scriptsRouter from "./routes/scripts/index.js";
import aiRouter from "./routes/ai/index.js";
import gamesRouter from "./routes/games/index.js";
import tagsRouter from "./routes/tags/index.js";
import commentsRouter from "./routes/comments/index.js";
import notificationsRouter from "./routes/notifications/index.js";
import usersRouter from "./routes/users/index.js";
import paymentsRouter from "./routes/payments/index.js";
import reportsRouter from "./routes/reports/index.js";
import modRouter from "./routes/mod/index.js";
import { rateLimitAiAnalyze } from "./middleware/rateLimit.js";
const app = express();
const PORT = process.env.PORT ?? 4000;
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";
app.use(cors({
    origin: WEB_ORIGIN,
    credentials: true,
}));
// Stripe webhook needs raw body — mount before express.json()
app.use("/api/v1/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "600kb" }));
app.use(cookieParser());
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/scripts", scriptsRouter);
app.use("/api/v1/ai", rateLimitAiAnalyze, aiRouter);
app.use("/api/v1/games", gamesRouter);
app.use("/api/v1/tags", tagsRouter);
app.use("/api/v1/comments", commentsRouter);
app.use("/api/v1/notifications", notificationsRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/payments", paymentsRouter);
app.use("/api/v1/reports", reportsRouter);
app.use("/api/v1/mod", modRouter);
import { startNotificationsWorker } from "./workers/notificationsWorker.js";
import { startXpWorker } from "./workers/xpWorker.js";
app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err.message);
    if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
    }
});
app.listen(PORT, () => {
    console.log(`Scriptify API listening on http://localhost:${PORT}`);
    startNotificationsWorker();
    startXpWorker();
});

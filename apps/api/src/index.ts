import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRouter from "./routes/auth/index.js";
import searchRouter from "./routes/search/index.js";
import scriptsRouter from "./routes/scripts/index.js";
import gamesRouter from "./routes/games/index.js";
import tagsRouter from "./routes/tags/index.js";
import commentsRouter from "./routes/comments/index.js";
import notificationsRouter from "./routes/notifications/index.js";
import usersRouter from "./routes/users/index.js";
import paymentsRouter from "./routes/payments/index.js";
import reportsRouter from "./routes/reports/index.js";
import modRouter from "./routes/mod/index.js";
import uploadsRouter from "./routes/uploads/index.js";
import { initSentry, Sentry } from "./lib/sentry.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

if (process.env.NODE_ENV === "production" && !process.env.PORT) {
  console.warn("WARNING: PORT env var not set, defaulting to 4000");
}

if (process.env.NODE_ENV === "production" && !process.env.WEB_ORIGIN) {
  throw new Error("WEB_ORIGIN environment variable must be set in production");
}

initSentry();
process.on("unhandledRejection", (reason) => {
  Sentry.captureException(reason);
});
process.on("uncaughtException", (err) => {
  Sentry.captureException(err);
});

app.use(
  cors({
    origin: process.env.WEB_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "Authorization"],
  })
);

// Stripe webhook needs raw body — mount before express.json()
app.use(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/scripts", scriptsRouter);
app.use("/api/v1/games", gamesRouter);
app.use("/api/v1/tags", tagsRouter);
app.use("/api/v1/comments", commentsRouter);
app.use("/api/v1/notifications", notificationsRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/payments", paymentsRouter);
app.use("/api/v1/reports", reportsRouter);
app.use("/api/v1/mod", modRouter);
app.use("/api/v1/uploads", uploadsRouter);

import { startNotificationsWorker } from "./workers/notificationsWorker.js";
import { startXpWorker } from "./workers/xpWorker.js";
import type { Request, Response, NextFunction } from "express";

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  Sentry.captureException(err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  process.stdout.write(`Scriptify API listening on http://localhost:${PORT}\n`);
  void startNotificationsWorker();
  void startXpWorker();
});

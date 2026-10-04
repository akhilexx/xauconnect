/**
 * XAUConnect backend — Express bootstrap.
 *
 * Mounts:  /auth /swap /lp /market /launchpad /wallet /admin  + /ws (WebSocket)
 * Security: helmet, CORS allowlist, Redis-backed rate limiting, zod validation.
 */
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { createServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env, corsOrigins } from "./config.js";
import { logger } from "./logger.js";
import { initDb, closeDb } from "./db/client.js";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { swapRouter } from "./routes/swap.js";
import { lpRouter } from "./routes/lp.js";
import { marketRouter } from "./routes/market.js";
import { launchpadRouter } from "./routes/launchpad.js";
import { walletRouter } from "./routes/wallet.js";
import { adminRouter } from "./routes/admin.js";
import { onrampRouter } from "./routes/onramp.js";
import { isOnrampEnabled } from "./services/onramp/index.js";
import { attachWebSocket, stopWebSocket } from "./ws/server.js";
import { logProductionReadiness } from "./production-check.js";
import { refreshDiscoveryCache } from "./services/discovery-cache.js";
import { monitorLimitOrders } from "./services/limit-orders.js";
import { markGraduatedGoldCurves } from "./services/meteora-dbc.js";

async function main() {
  logProductionReadiness();
  await initDb();

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || corsOrigins.includes(origin) || env.NODE_ENV !== "production") {
          callback(null, true);
        } else {
          callback(new Error("CORS: origin not allowed"));
        }
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "xauconnect-backend",
      version: "1.0.0",
      ts: Date.now(),
      chains: ["ethereum", "bsc", "polygon", "arbitrum", "base", "avalanche", "solana"],
      features: {
        crossChain: true,
        solanaSubmit: true,
        agentApi: true,
        fiatOnramp: isOnrampEnabled(),
        openapi: "/openapi.json",
      },
    });
  });

  app.get("/openapi.json", (_req, res) => {
    res.sendFile("openapi.json", { root: join(dirname(fileURLToPath(import.meta.url)), "..", "openapi") });
  });

  app.use("/auth", authRouter);
  app.use("/swap", swapRouter);
  app.use("/lp", lpRouter);
  app.use("/market", marketRouter);
  app.use("/launchpad", launchpadRouter);
  app.use("/wallet", walletRouter);
  app.use("/onramp", onrampRouter);
  app.use("/admin", adminRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });
  app.use(errorHandler);

  const server = createServer(app);
  attachWebSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`XAUConnect backend listening on :${env.PORT}`);
    void refreshDiscoveryCache();
    setInterval(() => void refreshDiscoveryCache(), 30_000);
    setInterval(() => void monitorLimitOrders(), 15_000);
    setInterval(() => void markGraduatedGoldCurves(), 30_000);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    stopWebSocket();
    server.close();
    await closeDb();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.fatal({ err }, "fatal startup error");
  process.exit(1);
});

/**
 * Prisma client with graceful degradation: when DATABASE_URL is missing or
 * the database is unreachable, `db` stays null and DB-backed features are empty.
 */
import { PrismaClient } from "@prisma/client";
import { env } from "../config.js";
import { logger } from "../logger.js";
import { ensureDbDefaults } from "./ensure-defaults.js";

export let db: PrismaClient | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Connect to Postgres with retry + backoff so a transient blip at startup
 * (Azure Flexible Server cold start, brief network hiccup) does not leave
 * persistence permanently disabled. If every attempt fails we keep retrying in
 * the background so the app self-heals once the database comes back.
 */
export async function initDb(): Promise<void> {
  if (!env.DATABASE_URL) {
    logger.error("DATABASE_URL not set — persistence disabled; admin writes will fail");
    return;
  }

  const maxStartupAttempts = 5;
  for (let attempt = 1; attempt <= maxStartupAttempts; attempt += 1) {
    if (await tryConnect(attempt)) return;
    if (attempt < maxStartupAttempts) await sleep(Math.min(2000 * attempt, 8000));
  }

  // Still down after startup attempts — keep trying in the background so the
  // admin console and persistence recover automatically without a restart.
  logger.error("database still unreachable after startup retries — retrying in background");
  void backgroundReconnect();
}

async function tryConnect(attempt: number): Promise<boolean> {
  const client = new PrismaClient();
  try {
    await client.$connect();
    db = client;
    await ensureDbDefaults(client);
    logger.info({ attempt }, "database connected and defaults ensured");
    return true;
  } catch (err) {
    logger.error({ err: (err as Error).message, attempt }, "database unreachable");
    await client.$disconnect().catch(() => {});
    return false;
  }
}

async function backgroundReconnect(): Promise<void> {
  while (!db) {
    await sleep(30_000);
    await tryConnect(0);
  }
}

export async function closeDb(): Promise<void> {
  await db?.$disconnect();
}

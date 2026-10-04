/**
 * Logs production readiness gaps at startup (never blocks boot).
 */
import { env } from "./config.js";
import { logger } from "./logger.js";

const REQUIRED_FOR_LIVE_SWAPS = [
  "RPC_ETHEREUM",
  "ONEINCH_API_KEY",
  "ZEROX_API_KEY",
] as const;

export function logProductionReadiness(): void {
  if (env.NODE_ENV !== "production") return;

  const missing: string[] = [];
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  for (const key of REQUIRED_FOR_LIVE_SWAPS) {
    if (!process.env[key]) missing.push(key);
  }
  if (!env.JWT_SECRET || env.JWT_SECRET === "dev-secret-change-me") {
    missing.push("JWT_SECRET (strong value)");
  }

  if (missing.length > 0) {
    logger.warn(
      { missing },
      "Production gaps — swap quotes need RPC_* + aggregator keys; see .env.example",
    );
  } else {
    logger.info("Production env: DATABASE_URL + RPC + aggregator keys present");
  }
}

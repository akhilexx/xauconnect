/**
 * Indexer worker — runs on Azure Linux VM (systemd) or locally with INDEXER_ROLE=worker.
 */
import { env } from "../config.js";
import { initDb, closeDb } from "../db/client.js";
import { logger } from "../logger.js";
import { runCandleAggregatorLoop } from "./aggregator/candles.js";
import { heartbeat, startHealthServer } from "./health.js";
import { runRetentionLoop } from "./maintenance/retention.js";
import { runPriceSnapshotLoop } from "./price-service.js";
import { runPoolDiscoveryLoop } from "./streams/pair-created.js";
import { runSolanaLaunchLoop } from "./streams/solana-launches.js";
import { runSwapV2Loop } from "./streams/swap-v2.js";
import { runSwapV3Loop } from "./streams/swap-v3.js";

async function main(): Promise<void> {
  if (!env.INDEXER_ENABLED) {
    logger.error("INDEXER_ENABLED is not true — exiting");
    process.exit(1);
  }

  await initDb();
  startHealthServer(env.INDEXER_HEALTH_PORT);

  setInterval(heartbeat, 30_000);
  heartbeat();

  logger.info("indexer worker starting");

  const tasks = [
    runPoolDiscoveryLoop(),
    runPriceSnapshotLoop(),
    runSolanaLaunchLoop(),
    runSwapV2Loop(),
    runSwapV3Loop(),
    runCandleAggregatorLoop(),
    runRetentionLoop(),
  ];

  await Promise.all(tasks);
}

main().catch(async (err) => {
  logger.error({ err: (err as Error).message }, "indexer worker fatal");
  await closeDb();
  process.exit(1);
});

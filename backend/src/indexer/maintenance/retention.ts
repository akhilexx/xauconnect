/**
 * Data retention — prune old swap events and pool snapshots.
 */
import { db } from "../../db/client.js";
import { logger } from "../../logger.js";

const SWAP_RETAIN_DAYS = 90;
const SNAPSHOT_RETAIN_DAYS = 7;
const RETENTION_INTERVAL_MS = 60 * 60 * 1000;

export async function runRetentionLoop(): Promise<never> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (db) {
      const swapCutoff = new Date(Date.now() - SWAP_RETAIN_DAYS * 24 * 60 * 60 * 1000);
      const snapCutoff = new Date(Date.now() - SNAPSHOT_RETAIN_DAYS * 24 * 60 * 60 * 1000);

      try {
        const [swaps, snaps] = await Promise.all([
          db.swapEvent.deleteMany({ where: { blockTime: { lt: swapCutoff } } }),
          db.poolSnapshot.deleteMany({ where: { capturedAt: { lt: snapCutoff } } }),
        ]);
        if (swaps.count > 0 || snaps.count > 0) {
          logger.info({ swaps: swaps.count, snapshots: snaps.count }, "retention prune");
        }
      } catch (err) {
        logger.warn({ err: (err as Error).message }, "retention failed");
      }
    }
    await new Promise((r) => setTimeout(r, RETENTION_INTERVAL_MS));
  }
}

/**
 * ChainStat aggregation — rolls swap volume/fees into daily per-chain rows
 * that power the admin metrics charts.
 */
import { db } from "../db/client.js";

function utcMidnight(d = new Date()): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/** Increment today's ChainStat row after a recorded swap. */
export async function recordSwapStats(chainKey: string, volumeUsd: number, feeUsd: number): Promise<void> {
  if (!db) return;
  const date = utcMidnight();
  await db.chainStat.upsert({
    where: { chainKey_date: { chainKey, date } },
    update: {
      volumeUsd: { increment: volumeUsd },
      feesUsd: { increment: feeUsd },
      swapCount: { increment: 1 },
    },
    create: { chainKey, date, volumeUsd, feesUsd: feeUsd, swapCount: 1 },
  });
}

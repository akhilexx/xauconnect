/**
 * Indexer cursor persistence — resume block scans after restart.
 */
import { db } from "../../db/client.js";

export async function getCursor(
  chainKey: string,
  stream: string,
  dexKey: string | null,
): Promise<bigint> {
  if (!db) return 0n;
  const row = await db.indexerCursor.findUnique({
    where: {
      chainKey_stream_dexKey: { chainKey, stream, dexKey: dexKey ?? "" },
    },
  });
  return row?.lastBlock ?? 0n;
}

export async function setCursor(
  chainKey: string,
  stream: string,
  dexKey: string | null,
  lastBlock: bigint,
): Promise<void> {
  if (!db) return;
  await db.indexerCursor.upsert({
    where: {
      chainKey_stream_dexKey: { chainKey, stream, dexKey: dexKey ?? "" },
    },
    create: { chainKey, stream, dexKey: dexKey ?? "", lastBlock },
    update: { lastBlock },
  });
}

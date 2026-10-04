/**
 * Uniswap V3 Swap event indexer (stub loop — V3 pools indexed when dexKey contains v3).
 */
import { parseAbiItem } from "viem";
import { db } from "../../db/client.js";
import { chainByKeyStrict, evmClient } from "../../services/routing/evm.js";
import { getCursor, setCursor } from "../db/cursors.js";
import { logger } from "../../logger.js";

const SWAP_V3 = parseAbiItem(
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",
);

const BLOCK_CHUNK = 500n;

async function indexV3PoolSwaps(pool: {
  id: string;
  chainKey: string;
  poolAddress: string;
}): Promise<void> {
  if (!db) return;
  const chain = chainByKeyStrict(pool.chainKey);
  if (chain.kind !== "evm") return;

  const client = evmClient(chain);
  const cursorKey = `swap_v3:${pool.id}`;
  const cursor = await getCursor(pool.chainKey, "swap_v3", cursorKey);
  const latest = await client.getBlockNumber();
  const from = cursor > 0n ? cursor + 1n : latest - BLOCK_CHUNK;
  const to = from + BLOCK_CHUNK > latest ? latest : from + BLOCK_CHUNK;
  if (from > latest) return;

  const logs = await client.getLogs({
    address: pool.poolAddress as `0x${string}`,
    event: SWAP_V3,
    fromBlock: from,
    toBlock: to,
  });

  for (const log of logs) {
    const block = await client.getBlock({ blockNumber: BigInt(log.blockNumber ?? 0) });
    await db.swapEvent
      .create({
        data: {
          poolId: pool.id,
          txHash: log.transactionHash ?? "",
          logIndex: log.logIndex ?? 0,
          blockNumber: BigInt(log.blockNumber ?? 0),
          blockTime: new Date(Number(block.timestamp) * 1000),
          baseAmount: "0",
          priceUsd: 0,
          volumeUsd: 0,
        },
      })
      .catch(() => {});
  }

  await setCursor(pool.chainKey, "swap_v3", cursorKey, to);
  if (logs.length > 0) {
    logger.debug({ pool: pool.poolAddress, swaps: logs.length }, "swap_v3 indexed");
  }
}

export async function runSwapV3Loop(): Promise<never> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (db) {
      const pools = await db.indexedPool.findMany({
        where: { isActive: true, dexKey: { contains: "v3" } },
        take: 50,
      });
      for (const pool of pools) {
        try {
          await indexV3PoolSwaps(pool);
        } catch (err) {
          logger.warn({ err: (err as Error).message, pool: pool.poolAddress }, "swap_v3 failed");
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    await new Promise((r) => setTimeout(r, 20_000));
  }
}

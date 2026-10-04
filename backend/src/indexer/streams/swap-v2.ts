/**
 * Uniswap V2 Swap event indexer.
 */
import { parseAbiItem } from "viem";
import { db } from "../../db/client.js";
import { chainByKeyStrict, evmClient } from "../../services/routing/evm.js";
import { getCursor, setCursor } from "../db/cursors.js";
import { quoteTokenUsd } from "../onchain/native-usd.js";
import { logger } from "../../logger.js";

const SWAP_V2 = parseAbiItem(
  "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)",
);

const BLOCK_CHUNK = 1_000n;

async function indexPoolSwaps(pool: {
  id: string;
  chainKey: string;
  poolAddress: string;
  baseTokenAddress: string;
  token0Address: string;
  token1Address: string;
}): Promise<void> {
  if (!db) return;
  const chain = chainByKeyStrict(pool.chainKey);
  if (chain.kind !== "evm") return;

  const client = evmClient(chain);
  const cursorKey = `swap_v2:${pool.id}`;
  const cursor = await getCursor(pool.chainKey, "swap_v2", cursorKey);
  const latest = await client.getBlockNumber();
  const from = cursor > 0n ? cursor + 1n : latest - BLOCK_CHUNK;
  const to = from + BLOCK_CHUNK > latest ? latest : from + BLOCK_CHUNK;
  if (from > latest) return;

  const logs = await client.getLogs({
    address: pool.poolAddress as `0x${string}`,
    event: SWAP_V2,
    fromBlock: from,
    toBlock: to,
  });

  const baseIsToken0 =
    pool.baseTokenAddress.toLowerCase() === pool.token0Address.toLowerCase();
  const quoteToken = baseIsToken0 ? pool.token1Address : pool.token0Address;

  for (const log of logs) {
    const args = log.args as {
      sender?: string;
      amount0In: bigint;
      amount1In: bigint;
      amount0Out: bigint;
      amount1Out: bigint;
    };
    const block = await client.getBlock({ blockNumber: BigInt(log.blockNumber ?? 0) });
    const baseIn = baseIsToken0 ? args.amount0In : args.amount1In;
    const baseOut = baseIsToken0 ? args.amount0Out : args.amount1Out;
    const baseAmount = baseIn > 0n ? baseIn : baseOut;

    const quoteUsd = await quoteTokenUsd(pool.chainKey, quoteToken);
    const priceUsd = quoteUsd; // simplified; refined by reserve math in production

    const volumeUsd = Number(baseAmount) / 1e18 * priceUsd;

    await db.swapEvent
      .create({
        data: {
          poolId: pool.id,
          txHash: log.transactionHash ?? "",
          logIndex: log.logIndex ?? 0,
          blockNumber: BigInt(log.blockNumber ?? 0),
          blockTime: new Date(Number(block.timestamp) * 1000),
          sender: args.sender?.toLowerCase(),
          amount0In: args.amount0In.toString(),
          amount1In: args.amount1In.toString(),
          amount0Out: args.amount0Out.toString(),
          amount1Out: args.amount1Out.toString(),
          baseAmount: baseAmount.toString(),
          priceUsd,
          volumeUsd: Math.abs(volumeUsd),
        },
      })
      .catch(() => {});
  }

  await setCursor(pool.chainKey, "swap_v2", cursorKey, to);
  if (logs.length > 0) {
    logger.debug({ pool: pool.poolAddress, swaps: logs.length }, "swap_v2 indexed");
  }
}

export async function runSwapV2Loop(): Promise<never> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (db) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const pools = await db.indexedPool.findMany({
        where: { isActive: true, createdAt: { gte: since } },
        take: 100,
      });
      for (const pool of pools) {
        try {
          await indexPoolSwaps(pool);
        } catch (err) {
          logger.warn({ err: (err as Error).message, pool: pool.poolAddress }, "swap_v2 failed");
        }
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    await new Promise((r) => setTimeout(r, 15_000));
  }
}

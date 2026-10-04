/**
 * EVM PairCreated log scanner — discovers new V2 liquidity pools.
 */
import { decodeEventLog, parseAbiItem, type Log } from "viem";
import { DEXES } from "@xauconnect/utils";
import { chainByKeyStrict, evmClient } from "../../services/routing/evm.js";
import { getCursor, setCursor } from "../db/cursors.js";
import { pickBaseToken, upsertIndexedPool } from "../db/pools.js";
import { logger } from "../../logger.js";

const PAIR_CREATED = parseAbiItem(
  "event PairCreated(address indexed token0, address indexed token1, address pair, uint256)",
);

const BLOCK_CHUNK_DEFAULT = 500n;
const BLOCK_CHUNK_BY_CHAIN: Record<string, bigint> = {
  polygon: 50n,
  ethereum: 500n,
  arbitrum: 500n,
  base: 500n,
  bsc: 2000n,
  avalanche: 500n,
};
const PAIR_CREATED_ABI = [PAIR_CREATED] as const;
const SCAN_INTERVAL_MS = 12_000;

function decodePairCreated(log: Log) {
  try {
    const decoded = decodeEventLog({
      abi: PAIR_CREATED_ABI,
      data: log.data,
      topics: log.topics,
    });
    const args = decoded.args as unknown as {
      token0?: string;
      token1?: string;
      pair?: string;
    };
    if (args.token0 && args.token1 && args.pair) {
      return { token0: args.token0, token1: args.token1, pair: args.pair };
    }
  } catch {
    /* fall through to manual decode */
  }

  // Manual decode for indexed token0/token1 + pair in data (V2 factory standard)
  if (log.topics.length >= 3 && log.data.length >= 66) {
    const token0 = (`0x${log.topics[1]!.slice(26)}`) as string;
    const token1 = (`0x${log.topics[2]!.slice(26)}`) as string;
    const pair = (`0x${log.data.slice(26, 66)}`) as string;
    if (token0.length === 42 && token1.length === 42 && pair.length === 42) {
      return { token0, token1, pair };
    }
  }
  return null;
}

function v2Factories() {
  return DEXES.filter((d) => d.protocol === "uniswap-v2" && d.factory);
}

async function scanFactory(chainKey: string, factory: string, dexKey: string): Promise<void> {
  const chain = chainByKeyStrict(chainKey);
  if (chain.kind !== "evm") return;

  const client = evmClient(chain);
  const cursor = await getCursor(chainKey, "pair_created", dexKey);
  const latest = await client.getBlockNumber();
  const chunk = BLOCK_CHUNK_BY_CHAIN[chainKey] ?? BLOCK_CHUNK_DEFAULT;
  const from = cursor > 0n ? cursor + 1n : latest - chunk;
  const to = from + chunk > latest ? latest : from + chunk;
  if (from > latest) return;

  const logs = await client.getLogs({
    address: factory as `0x${string}`,
    event: PAIR_CREATED,
    fromBlock: from,
    toBlock: to,
  });

  let inserted = 0;
  for (const log of logs) {
    const decoded = decodePairCreated(log);
    if (!decoded) continue;
    const { token0, token1, pair } = decoded;
    const base = pickBaseToken(chainKey, token0.toLowerCase(), token1.toLowerCase(), chain);
    const row = await upsertIndexedPool({
      chainKey,
      dexKey,
      poolAddress: pair.toLowerCase(),
      token0Address: token0.toLowerCase(),
      token1Address: token1.toLowerCase(),
      baseTokenAddress: base,
      createdBlock: BigInt(log.blockNumber ?? 0),
      createdAt: new Date(),
    });
    if (row) inserted++;
  }

  await setCursor(chainKey, "pair_created", dexKey, to);
  if (logs.length > 0) {
    logger.info({ chainKey, dexKey, logs: logs.length, inserted, to: to.toString() }, "pair_created scan");
  }
}

export async function runPoolDiscoveryLoop(): Promise<never> {
  const factories = v2Factories();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (const dex of factories) {
      try {
        await scanFactory(dex.chainKey, dex.factory!, dex.key);
      } catch (err) {
        logger.warn({ err: (err as Error).message, dex: dex.id }, "pair_created scan failed");
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    await new Promise((r) => setTimeout(r, SCAN_INTERVAL_MS));
  }
}

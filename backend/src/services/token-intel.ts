/**
 * Token intelligence — dev wallet activity + early-buyer (sniper) analysis.
 */
import { db } from "../db/client.js";
import { logger } from "../logger.js";
import { findPoolForToken } from "../indexer/db/pools.js";
import { heliusAddressTransactions, heliusWalletHistory } from "./helius.js";
import { tokenAddressEq } from "./token-address.js";

const SNIPER_BLOCK_WINDOW = 5n;
const WSOL = "So11111111111111111111111111111111111111112";

export interface DevWalletEvent {
  kind: string;
  symbol: string;
  amount: string;
  usdValue: number;
  hash: string;
  timestamp: number;
}

export interface DevWalletIntel {
  creatorAddress: string | null;
  tracked: boolean;
  events: DevWalletEvent[];
  alerts: Array<{ severity: "low" | "medium" | "high"; message: string }>;
}

export interface SniperWallet {
  address: string;
  blockOffset: number;
  volumeUsd: number;
  txHash: string;
  bundled: boolean;
  buyCount: number;
}

export interface SniperIntel {
  riskScore: number;
  earlyBuyerCount: number;
  bundleCount: number;
  totalEarlyVolumeUsd: number;
  snipers: SniperWallet[];
}

async function resolveCreator(chainKey: string, address: string): Promise<string | null> {
  if (!db) return null;
  const token = await db.token.findFirst({
    where: { chainKey, address: chainKey === "solana" ? address : { equals: address, mode: "insensitive" } },
    select: { creatorAddress: true },
  });
  if (token?.creatorAddress) return token.creatorAddress;

  const pool = await findPoolForToken(chainKey, address);
  if (pool?.creatorAddress) return pool.creatorAddress;

  if (chainKey === "solana") {
    try {
      const txs = await heliusAddressTransactions("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", {
        limit: 50,
        type: "CREATE",
      });
      for (const tx of txs) {
        const mint = tx.tokenTransfers?.find(
          (tt) => tt.mint && tokenAddressEq("solana", tt.mint, address),
        )?.mint;
        if (mint) return tx.feePayer;
      }
    } catch (err) {
      logger.debug({ err: (err as Error).message }, "solana creator lookup failed");
    }
  }
  return null;
}

export async function getDevWalletIntel(
  chainKey: string,
  address: string,
): Promise<DevWalletIntel> {
  const creatorAddress = await resolveCreator(chainKey, address);
  if (!creatorAddress) {
    return { creatorAddress: null, tracked: false, events: [], alerts: [] };
  }

  const events: DevWalletEvent[] = [];
  const alerts: DevWalletIntel["alerts"] = [];

  if (chainKey === "solana") {
    const history = await heliusWalletHistory(creatorAddress, 20);
    for (const row of history) {
      events.push({
        kind: row.kind,
        symbol: row.symbol,
        amount: row.amount,
        usdValue: row.usdValue,
        hash: row.hash,
        timestamp: row.timestamp,
      });
      if (row.kind === "send" && row.symbol !== WSOL.slice(0, 4)) {
        alerts.push({
          severity: "high",
          message: `Creator sent ${row.amount} ${row.symbol}`,
        });
      }
    }
  }

  return {
    creatorAddress,
    tracked: true,
    events: events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15),
    alerts: alerts.slice(0, 5),
  };
}

export async function getSniperIntel(chainKey: string, address: string): Promise<SniperIntel> {
  const empty: SniperIntel = {
    riskScore: 0,
    earlyBuyerCount: 0,
    bundleCount: 0,
    totalEarlyVolumeUsd: 0,
    snipers: [],
  };
  if (!db) return empty;

  const pool = await findPoolForToken(chainKey, address);
  if (!pool) return empty;

  const createdBlock = pool.createdBlock;
  const windowEnd = createdBlock + SNIPER_BLOCK_WINDOW;

  const swaps = await db.swapEvent.findMany({
    where: {
      poolId: pool.id,
      blockNumber: { gte: createdBlock, lte: windowEnd },
    },
    orderBy: [{ blockNumber: "asc" }, { blockTime: "asc" }],
    take: 200,
  });

  if (swaps.length === 0) return empty;

  const byTx = new Map<string, typeof swaps>();
  for (const s of swaps) {
    const list = byTx.get(s.txHash) ?? [];
    list.push(s);
    byTx.set(s.txHash, list);
  }

  const bySender = new Map<
    string,
    { volumeUsd: number; blockOffset: number; txHash: string; bundled: boolean; buyCount: number }
  >();

  for (const s of swaps) {
    const sender = s.sender ?? `unknown-${s.txHash.slice(0, 8)}`;
    const blockOffset = Number(s.blockNumber - createdBlock);
    const bundled = (byTx.get(s.txHash)?.length ?? 0) > 1;
    const prev = bySender.get(sender);
    if (prev) {
      prev.volumeUsd += s.volumeUsd;
      prev.buyCount += 1;
      prev.bundled = prev.bundled || bundled;
      prev.blockOffset = Math.min(prev.blockOffset, blockOffset);
    } else {
      bySender.set(sender, {
        volumeUsd: s.volumeUsd,
        blockOffset,
        txHash: s.txHash,
        bundled,
        buyCount: 1,
      });
    }
  }

  const snipers: SniperWallet[] = [...bySender.entries()]
    .filter(([addr]) => !addr.startsWith("unknown-"))
    .map(([addr, v]) => ({
      address: addr,
      blockOffset: v.blockOffset,
      volumeUsd: v.volumeUsd,
      txHash: v.txHash,
      bundled: v.bundled,
      buyCount: v.buyCount,
    }))
    .sort((a, b) => a.blockOffset - b.blockOffset || b.volumeUsd - a.volumeUsd)
    .slice(0, 20);

  const bundleCount = [...byTx.values()].filter((g) => g.length > 1).length;
  const totalEarlyVolumeUsd = swaps.reduce((sum, s) => sum + s.volumeUsd, 0);
  const earlyBuyerCount = snipers.length;

  let riskScore = 0;
  if (earlyBuyerCount >= 8) riskScore += 35;
  else if (earlyBuyerCount >= 4) riskScore += 20;
  if (bundleCount >= 3) riskScore += 30;
  else if (bundleCount >= 1) riskScore += 15;
  const block0Buys = snipers.filter((s) => s.blockOffset === 0).length;
  if (block0Buys >= 3) riskScore += 25;
  riskScore = Math.min(100, riskScore);

  return {
    riskScore,
    earlyBuyerCount,
    bundleCount,
    totalEarlyVolumeUsd,
    snipers,
  };
}

export async function getTokenIntel(chainKey: string, address: string) {
  const [devWallet, snipers] = await Promise.all([
    getDevWalletIntel(chainKey, address),
    getSniperIntel(chainKey, address),
  ]);
  return { devWallet, snipers };
}

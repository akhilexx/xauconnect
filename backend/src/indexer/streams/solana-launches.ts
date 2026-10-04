/**
 * Solana new-token discovery via Helius Enhanced Transactions + RPC signatures.
 */
import { env } from "../../config.js";
import { db } from "../../db/client.js";
import {
  heliusAddressTransactions,
  heliusConfigured,
  heliusParsedTransactions,
  launchMintFromTx,
} from "../../services/helius.js";
import { getCursor, setCursor } from "../db/cursors.js";
import { upsertIndexedPool } from "../db/pools.js";
import { logger } from "../../logger.js";
import { markGraduatedGoldCurves } from "../../services/meteora-dbc.js";
import { DBC_PROGRAM_ID, USDC_MINT } from "../../services/gold-curve.js";

const PROGRAMS = [
  { programId: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", dexKey: "pumpfun" },
  { programId: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", dexKey: "raydium" },
  { programId: DBC_PROGRAM_ID, dexKey: "meteora-dbc" },
] as const;

const POLL_MS = 5_000;
const WSOL = "So11111111111111111111111111111111111111112";

async function heliusRpc<T>(method: string, params: unknown[]): Promise<T> {
  const url = env.RPC_SOLANA;
  if (!url) throw new Error("RPC_SOLANA not set");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}

interface SigInfo {
  signature: string;
  slot: number;
  err: unknown;
}

async function upsertLaunch(
  dexKey: string,
  programId: string,
  mint: string,
  slot: number,
  creatorAddress?: string,
): Promise<void> {
  await upsertIndexedPool({
    chainKey: "solana",
    dexKey,
    poolAddress: `${programId}:${mint}`,
    token0Address: mint,
    token1Address: WSOL,
    baseTokenAddress: mint,
    creatorAddress,
    createdBlock: BigInt(slot),
    createdAt: new Date(),
  });
  logger.debug({ dexKey, mint, slot }, "solana launch detected");
}

async function scanPumpfun(programId: string, dexKey: string): Promise<void> {
  const cursorSlot = Number(await getCursor("solana", "solana_launch", dexKey));
  const txs = await heliusAddressTransactions(programId, { limit: 25, type: "CREATE" });

  for (const tx of txs) {
    if (tx.slot <= cursorSlot) continue;
    const mint = launchMintFromTx(tx, dexKey);
    if (!mint) continue;
    await upsertLaunch(dexKey, programId, mint, tx.slot, tx.feePayer);
  }

  const topSlot = txs[0]?.slot;
  if (topSlot && topSlot > cursorSlot) {
    await setCursor("solana", "solana_launch", dexKey, BigInt(topSlot));
  }
}

async function scanRaydium(programId: string, dexKey: string): Promise<void> {
  const cursorSlot = Number(await getCursor("solana", "solana_launch", dexKey));
  const sigs = await heliusRpc<SigInfo[]>("getSignaturesForAddress", [
    programId,
    { limit: 25 },
  ]);

  const fresh = sigs.filter((s) => !s.err && s.slot > cursorSlot);
  const head = sigs[0];
  if (fresh.length === 0) {
    if (head && head.slot > cursorSlot) {
      await setCursor("solana", "solana_launch", dexKey, BigInt(head.slot));
    }
    return;
  }

  const txs = heliusConfigured()
    ? await heliusParsedTransactions(fresh.map((s) => s.signature))
    : [];

  const txBySig = new Map(txs.map((t) => [t.signature, t]));

  for (const sig of fresh) {
    const tx = txBySig.get(sig.signature);
    const mint = tx ? launchMintFromTx(tx, dexKey) : null;
    if (!mint) continue;
    await upsertLaunch(dexKey, programId, mint, sig.slot, tx?.feePayer);
  }

  if (head && head.slot > cursorSlot) {
    await setCursor("solana", "solana_launch", dexKey, BigInt(head.slot));
  }
}

const QUOTE_MINTS = new Set([WSOL, USDC_MINT, "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"]);

interface ParsedTx {
  meta?: {
    logMessages?: string[] | null;
    postTokenBalances?: Array<{ mint?: string }> | null;
  } | null;
}

/** Index Meteora DBC pool creates. Swaps on the same program are ignored. */
async function scanDbc(programId: string, dexKey: string): Promise<void> {
  const cursorSlot = Number(await getCursor("solana", "solana_launch", dexKey));
  const sigs = await heliusRpc<SigInfo[]>("getSignaturesForAddress", [programId, { limit: 20 }]);
  const fresh = sigs.filter((s) => !s.err && s.slot > cursorSlot);
  const head = sigs[0];
  for (const sig of fresh) {
    const tx = await heliusRpc<ParsedTx | null>("getTransaction", [
      sig.signature,
      { maxSupportedTransactionVersion: 0, encoding: "jsonParsed" },
    ]);
    const logs = (tx?.meta?.logMessages ?? []).join("\n");
    if (!logs.includes("InitializeVirtualPoolWithSplToken")) continue;
    const mint = (tx?.meta?.postTokenBalances ?? []).find((b) => b.mint && !QUOTE_MINTS.has(b.mint))?.mint;
    if (!mint) continue;
    await upsertLaunch(dexKey, programId, mint, sig.slot);
  }
  if (head && head.slot > cursorSlot) {
    await setCursor("solana", "solana_launch", dexKey, BigInt(head.slot));
  }
}

async function scanProgram(programId: string, dexKey: string): Promise<void> {
  if (dexKey === "meteora-dbc") {
    await scanDbc(programId, dexKey);
    return;
  }
  if (dexKey === "pumpfun" && heliusConfigured()) {
    await scanPumpfun(programId, dexKey);
    return;
  }
  await scanRaydium(programId, dexKey);
}

export async function runSolanaLaunchLoop(): Promise<never> {
  if (!env.RPC_SOLANA) {
    logger.warn("RPC_SOLANA not set — Solana launch indexer disabled");
    // eslint-disable-next-line no-constant-condition
    while (true) await new Promise((r) => setTimeout(r, 60_000));
  }

  if (!heliusConfigured()) {
    logger.warn("Helius API key not set — Solana indexer uses basic RPC parsing only");
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (db) {
      for (const { programId, dexKey } of PROGRAMS) {
        try {
          await scanProgram(programId, dexKey);
        } catch (err) {
          logger.warn({ err: (err as Error).message, dexKey }, "solana launch scan failed");
        }
      }
      try {
        await markGraduatedGoldCurves();
      } catch (err) {
        logger.warn({ err: (err as Error).message }, "gold curve graduation poll failed");
      }
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

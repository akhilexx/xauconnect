/**
 * Helius Enhanced Transactions API — parsed Solana txs (launches, wallet history).
 * https://docs.helius.dev/solana-apis/enhanced-transactions-api
 */
import { env } from "../config.js";
import { logger } from "../logger.js";
import { withTimeout } from "./routing/evm.js";

const ENHANCED_BASE = "https://api-mainnet.helius-rpc.com/v0";
const HTTP_MS = 12_000;

const WSOL = "So11111111111111111111111111111111111111112";
const STABLE_MINTS = new Set([
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
]);

export interface HeliusTokenTransfer {
  mint: string;
  tokenAmount: number;
  fromUserAccount?: string;
  toUserAccount?: string;
}

export interface HeliusEnhancedTx {
  signature: string;
  slot: number;
  timestamp: number;
  type: string;
  source?: string;
  description?: string;
  fee: number;
  feePayer: string;
  tokenTransfers?: HeliusTokenTransfer[];
  nativeTransfers?: Array<{
    amount: number;
    fromUserAccount?: string;
    toUserAccount?: string;
  }>;
}

/** Resolve Helius API key from HELIUS_API_KEY or RPC_SOLANA query param. */
export function heliusApiKey(): string | undefined {
  if (env.HELIUS_API_KEY) return env.HELIUS_API_KEY;
  const url = env.RPC_SOLANA;
  if (!url) return undefined;
  try {
    return new URL(url).searchParams.get("api-key") ?? undefined;
  } catch {
    return undefined;
  }
}

export function heliusConfigured(): boolean {
  return Boolean(heliusApiKey());
}

function enhancedUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const key = heliusApiKey();
  if (!key) throw new Error("Helius API key not configured (HELIUS_API_KEY or RPC_SOLANA)");
  const u = new URL(`${ENHANCED_BASE}${path}`);
  u.searchParams.set("api-key", key);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== "") u.searchParams.set(k, String(v));
  }
  return u.toString();
}

/** GET /v0/addresses/{address}/transactions/ */
export async function heliusAddressTransactions(
  address: string,
  opts?: { limit?: number; before?: string; type?: string },
): Promise<HeliusEnhancedTx[]> {
  const url = enhancedUrl(`/addresses/${address}/transactions/`, {
    limit: opts?.limit ?? 25,
    before: opts?.before,
    type: opts?.type,
  });
  const res = await withTimeout(fetch(url, { headers: { accept: "application/json" } }), HTTP_MS);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`helius address txs ${res.status} ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? (data as HeliusEnhancedTx[]) : [];
}

/** POST /v0/transactions/ — batch-parse signatures into enhanced form. */
export async function heliusParsedTransactions(signatures: string[]): Promise<HeliusEnhancedTx[]> {
  if (signatures.length === 0) return [];
  const url = enhancedUrl("/transactions/");
  const res = await withTimeout(
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ transactions: signatures }),
    }),
    HTTP_MS,
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`helius parse txs ${res.status} ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? (data as HeliusEnhancedTx[]) : [];
}

/** Pick the launch mint from a pump.fun / Raydium create tx. */
export function launchMintFromTx(tx: HeliusEnhancedTx, dexKey: string): string | null {
  if (dexKey === "pumpfun") {
    if (tx.type !== "CREATE" || tx.source !== "PUMP_FUN") return null;
  }

  for (const tt of tx.tokenTransfers ?? []) {
    if (tt.mint && tt.mint !== WSOL && !STABLE_MINTS.has(tt.mint)) return tt.mint;
  }
  return null;
}

export interface WalletHistoryRow {
  id: string;
  kind: string;
  chainKey: string;
  symbol: string;
  amount: string;
  usdValue: number;
  hash: string;
  timestamp: number;
}

function historyKind(tx: HeliusEnhancedTx): string {
  if (tx.type === "SWAP") return "swap";
  if (tx.type === "CREATE") return "launch";
  return "transfer";
}

/** Map Helius enhanced tx → wallet history row for a given owner. */
export function heliusTxToHistory(tx: HeliusEnhancedTx, owner: string): WalletHistoryRow | null {
  const kind = historyKind(tx);

  for (const tt of tx.tokenTransfers ?? []) {
    const recv = tt.toUserAccount === owner;
    const send = tt.fromUserAccount === owner;
    if (!recv && !send) continue;
    return {
      id: tx.signature,
      kind: recv ? "receive" : send ? "send" : kind,
      chainKey: "solana",
      symbol: tt.mint.slice(0, 4),
      amount: String(tt.tokenAmount ?? 0),
      usdValue: 0,
      hash: tx.signature,
      timestamp: tx.timestamp > 1e12 ? tx.timestamp : tx.timestamp * 1000,
    };
  }

  for (const nt of tx.nativeTransfers ?? []) {
    const recv = nt.toUserAccount === owner;
    const send = nt.fromUserAccount === owner;
    if (!recv && !send) continue;
    const sol = (nt.amount ?? 0) / 1e9;
    return {
      id: tx.signature,
      kind: recv ? "receive" : send ? "send" : kind,
      chainKey: "solana",
      symbol: "SOL",
      amount: sol.toFixed(6),
      usdValue: 0,
      hash: tx.signature,
      timestamp: tx.timestamp > 1e12 ? tx.timestamp : tx.timestamp * 1000,
    };
  }

  if (kind === "swap" || kind === "launch") {
    return {
      id: tx.signature,
      kind,
      chainKey: "solana",
      symbol: "SOL",
      amount: "0",
      usdValue: 0,
      hash: tx.signature,
      timestamp: tx.timestamp > 1e12 ? tx.timestamp : tx.timestamp * 1000,
    };
  }

  return null;
}

/** Wallet activity for a Solana address via Helius enhanced API. */
export async function heliusWalletHistory(
  address: string,
  limit = 25,
): Promise<WalletHistoryRow[]> {
  try {
    const txs = await heliusAddressTransactions(address, { limit });
    return txs
      .map((tx) => heliusTxToHistory(tx, address))
      .filter((row): row is WalletHistoryRow => row !== null);
  } catch (err) {
    logger.debug({ err: (err as Error).message, address }, "helius wallet history failed");
    return [];
  }
}

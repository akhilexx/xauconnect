/**
 * 1inch Business API base URL — shared by same-chain (Swap v6) and cross-chain (Fusion+).
 *
 * 1inch returns quote data and unsigned EVM calldata / Solana tx bytes only.
 * It never broadcasts transactions; see docs/SWAP_EXECUTION.md.
 */
import { env } from "../../config.js";

/** Trim trailing slash; validated in config (default https://api.1inch.com). */
export const ONEINCH_API_BASE = env.ONEINCH_API_BASE.replace(/\/$/, "");

export function oneInchUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${ONEINCH_API_BASE}${suffix}`;
}

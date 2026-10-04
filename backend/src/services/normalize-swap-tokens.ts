/**
 * Agent-friendly normalization before zod validation on swap quote/build bodies.
 * Resolves token tickers (ETH, USDT) to on-chain addresses via the catalog.
 */
import { searchSwapTokens } from "@xauconnect/utils";
import { ApiError } from "../middleware/error.js";

function looksLikeAddress(v: string): boolean {
  if (v.startsWith("0x") && v.length >= 42) return true;
  // Solana base58 addresses are typically 32–44 chars without 0x prefix.
  if (!v.startsWith("0x") && v.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(v)) return true;
  return false;
}

function resolveTokenSymbol(chainKey: string, symbol: string): string | null {
  const q = symbol.trim();
  if (!q || looksLikeAddress(q)) return null;
  const { tokens } = searchSwapTokens({
    chainKey,
    search: q,
    limit: 20,
  });
  const upper = q.toUpperCase();
  const exact = tokens.find((t) => t.symbol.toUpperCase() === upper);
  return exact?.address ?? null;
}

/** Map tokenIn/tokenOut tickers to catalog addresses when agents send symbols. */
export function normalizeSwapTokens(body: Record<string, unknown>): Record<string, unknown> {
  const chainKey = body.chainKey;
  if (typeof chainKey === "string") {
    const out = { ...body };
    for (const field of ["tokenIn", "tokenOut"] as const) {
      const val = out[field];
      if (typeof val !== "string" || looksLikeAddress(val)) continue;
      const resolved = resolveTokenSymbol(chainKey, val);
      if (!resolved) {
        throw new ApiError(
          400,
          `Unknown token "${val}" on ${chainKey} — use GET /swap/tokens?chainKey=${chainKey}&search=${encodeURIComponent(val)} for the contract address`,
          "UNKNOWN_TOKEN",
        );
      }
      out[field] = resolved;
    }
    return out;
  }
  const nested = body.request;
  if (nested && typeof nested === "object") {
    return { ...body, request: normalizeSwapTokens(nested as Record<string, unknown>) };
  }
  return body;
}

/** Full quote-body pipeline: human amounts → token symbols → zod. */
export function prepareQuoteBody(
  raw: Record<string, unknown>,
  resolveHumanAmount: (b: Record<string, unknown>) => Record<string, unknown>,
): Record<string, unknown> {
  return normalizeSwapTokens(resolveHumanAmount(raw));
}

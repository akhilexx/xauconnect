/**
 * Live USD prices for wallet valuation and swap analytics.
 * CoinGecko batch (cached) → DexScreener spot → demo fallback.
 */
import { DEFAULT_TOKENS, type TokenInfo } from "@xauconnect/utils";
import { cached } from "../cache.js";
import { demoUsdPrice } from "../demo/data.js";
import { dexTokenLookup } from "./dexscreener.js";

const PRICE_CACHE_SEC = 120;

const COINGECKO_IDS = [
  ...new Set(
    DEFAULT_TOKENS.map((t) => t.coingeckoId).filter((id): id is string => Boolean(id)),
  ),
];

async function fetchCoingeckoPriceMap(): Promise<Record<string, number>> {
  if (COINGECKO_IDS.length === 0) return {};
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS.join(",")}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(4_000) },
    );
    if (!res.ok) return {};
    const data = (await res.json()) as Record<string, { usd?: number }>;
    const out: Record<string, number> = {};
    for (const [id, row] of Object.entries(data)) {
      const usd = row?.usd;
      if (usd != null && usd > 0) out[id] = usd;
    }
    return out;
  } catch {
    return {};
  }
}

async function coingeckoPriceMap(): Promise<Record<string, number>> {
  return cached("prices:coingecko:v1", PRICE_CACHE_SEC, fetchCoingeckoPriceMap);
}

/** USD price for a catalog token (stablecoins pegged at $1). */
export async function tokenUsdPrice(token: Pick<TokenInfo, "symbol" | "address" | "chainKey" | "coingeckoId">): Promise<number> {
  if (token.symbol === "USDC" || token.symbol === "USDT" || token.symbol === "DAI") return 1;

  const cg = await coingeckoPriceMap();
  if (token.coingeckoId && cg[token.coingeckoId] != null && cg[token.coingeckoId]! > 0) {
    return cg[token.coingeckoId]!;
  }

  const spot = await dexTokenLookup(token.address, token.chainKey).catch(() => null);
  if (spot?.priceUsd != null && spot.priceUsd > 0) return spot.priceUsd;

  return demoUsdPrice(token.coingeckoId, token.address);
}

/** Estimate swap notional from tokenIn base units. */
export async function estimateVolumeUsd(
  chainKey: string,
  tokenInAddress: string,
  amountInBase: string,
): Promise<number> {
  const token = DEFAULT_TOKENS.find(
    (t) => t.chainKey === chainKey && t.address.toLowerCase() === tokenInAddress.toLowerCase(),
  );
  if (!token) return 0;
  const raw = BigInt(amountInBase);
  if (raw <= 0n) return 0;
  const formatted = Number(raw) / 10 ** token.decimals;
  if (!Number.isFinite(formatted)) return 0;
  const price = await tokenUsdPrice(token);
  return formatted * price;
}

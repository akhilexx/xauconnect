/**
 * Reject aggregator quotes whose output USD value is implausibly low vs input.
 * Catches broken bridge routes (e.g. ETH → Polygon amAAVE via illiquid paths).
 */
import {
  findSwapCatalogToken,
  getChainByKey,
  isCatalogNative,
} from "@xauconnect/utils";
import { cached } from "../../cache.js";
import { nativeTokenUsd } from "../../indexer/onchain/native-usd.js";
import { logger } from "../../logger.js";
import { lookupToken } from "../market-lookup.js";

/** Output must retain at least this fraction of input USD (before user slippage). */
const MIN_OUTPUT_VALUE_RATIO = 0.72;

const NATIVE_COINGECKO: Record<string, string> = {
  ethereum: "ethereum",
  bsc: "binancecoin",
  polygon: "matic-network",
  arbitrum: "ethereum",
  base: "ethereum",
  avalanche: "avalanche-2",
  solana: "solana",
};

async function coingeckoUsd(id: string): Promise<number | null> {
  const map = await cached(`cg:usd:${id}`, 90, async () => {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`,
        { signal: AbortSignal.timeout(5_000) },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, { usd?: number }>;
      const usd = data[id]?.usd;
      return usd != null && usd > 0 ? usd : null;
    } catch {
      return null;
    }
  });
  return map;
}

/** Tokens missing from catalog but required for sane ratio/USD math. */
const WELL_KNOWN_DECIMALS: Record<string, number> = {
  "0x833589fcd6edb6e08f4c7c32d6f7b81b7868770": 6, // Base native USDC
};

function isWrappedNative(chainKey: string, address: string): boolean {
  const wrapped = getChainByKey(chainKey)?.wrappedNative;
  return wrapped?.toLowerCase() === address.toLowerCase();
}

function decimalsFor(chainKey: string, address: string): number {
  const catalog = findSwapCatalogToken(chainKey, address);
  if (catalog?.decimals != null) return catalog.decimals;
  const known = WELL_KNOWN_DECIMALS[address.toLowerCase()];
  if (known != null) return known;
  return 18;
}

function amountHuman(amountBase: string, decimals: number): number | null {
  try {
    const amount = BigInt(amountBase);
    if (amount <= 0n) return null;
    const human = Number(amount) / 10 ** decimals;
    return Number.isFinite(human) && human > 0 ? human : null;
  } catch {
    return null;
  }
}

function isStableLike(chainKey: string, address: string): boolean {
  const catalog = findSwapCatalogToken(chainKey, address);
  if (catalog?.tags?.includes("stable")) return true;
  const sym = catalog?.symbol?.toUpperCase() ?? "";
  return (
    sym === "USDT" ||
    sym === "USDC" ||
    sym === "DAI" ||
    sym === "USDC.E" ||
    sym === "USDCET" ||
    sym === "USDCE" ||
    sym === "BUSD" ||
    sym === "FDUSD" ||
    sym === "TUSD"
  );
}

/** Decimal-aware ratio guard — catches bad routes when USD oracles are down (429). */
function validateOutputInputRatio(params: {
  fromChainKey: string;
  tokenIn: string;
  amountIn: string;
  toChainKey: string;
  tokenOut: string;
  amountOut: string;
  slippageBps?: number;
}): { ok: true } | { ok: false; reason: string } {
  const inDec = decimalsFor(params.fromChainKey, params.tokenIn);
  const outDec = decimalsFor(params.toChainKey, params.tokenOut);
  const inHuman = amountHuman(params.amountIn, inDec);
  const outHuman = amountHuman(params.amountOut, outDec);
  if (inHuman == null || outHuman == null) {
    return { ok: false, reason: "Invalid swap amounts" };
  }

  const ratio = outHuman / inHuman;
  const slippage = (params.slippageBps ?? 50) / 10_000;
  const isCrossChain = params.fromChainKey !== params.toChainKey;
  const bothStable =
    isStableLike(params.fromChainKey, params.tokenIn) &&
    isStableLike(params.toChainKey, params.tokenOut);

  if (bothStable) {
    // Cross-chain stables lose value to bridge + protocol fees — allow wider band.
    const min = isCrossChain ? 0.72 - slippage : 0.9 - slippage;
    const max = 1.1 + slippage;
    if (ratio < min || ratio > max) {
      return {
        ok: false,
        reason: `Stable swap ratio ${ratio.toFixed(3)} is outside ${min.toFixed(2)}–${max.toFixed(2)}`,
      };
    }
    return { ok: true };
  }

  // Same-decimal pairs: reject only when ratio is extreme AND not a native↔stable leg
  // (e.g. BSC WBNB→USDT are both 18 decimals but ~600:1 human ratio is valid).
  if (inDec === outDec && (ratio > 25 || ratio < 0.000_001)) {
    const nativeIn =
      isCatalogNative(params.fromChainKey, params.tokenIn) ||
      isWrappedNative(params.fromChainKey, params.tokenIn);
    const nativeOut =
      isCatalogNative(params.toChainKey, params.tokenOut) ||
      isWrappedNative(params.toChainKey, params.tokenOut);
    const stableIn = isStableLike(params.fromChainKey, params.tokenIn);
    const stableOut = isStableLike(params.toChainKey, params.tokenOut);
    if ((nativeIn && stableOut) || (nativeOut && stableIn) || (stableIn && stableOut)) {
      return { ok: true };
    }
    return {
      ok: false,
      reason: `Quoted output/input ratio ${ratio.toExponential(2)} is implausible`,
    };
  }

  return { ok: true };
}

async function tokenUsd(chainKey: string, address: string): Promise<number | null> {
  const catalog = findSwapCatalogToken(chainKey, address);

  if (catalog?.coingeckoId) {
    const cg = await coingeckoUsd(catalog.coingeckoId);
    if (cg != null) return cg;
  }

  if (isCatalogNative(chainKey, address)) {
    const nativeCg = NATIVE_COINGECKO[chainKey];
    if (nativeCg) {
      const cg = await coingeckoUsd(nativeCg);
      if (cg != null) return cg;
    }
    const native = await nativeTokenUsd(chainKey).catch(() => 0);
    if (native > 0) return native;
    const wrapped = getChainByKey(chainKey)?.wrappedNative;
    if (wrapped) {
      const spot = await lookupToken(chainKey, wrapped).catch(() => null);
      if (spot?.priceUsd && spot.priceUsd > 0) return spot.priceUsd;
    }
    return null;
  }

  const spot = await lookupToken(chainKey, address).catch(() => null);
  if (spot?.priceUsd && spot.priceUsd > 0) return spot.priceUsd;
  return null;
}

async function usdValue(
  chainKey: string,
  tokenAddress: string,
  amountBase: string,
): Promise<number | null> {
  let amount: bigint;
  try {
    amount = BigInt(amountBase);
  } catch {
    return null;
  }
  if (amount <= 0n) return null;

  const price = await tokenUsd(chainKey, tokenAddress);
  if (price == null || price <= 0) return null;

  const decimals = decimalsFor(chainKey, tokenAddress);
  const human = Number(amount) / 10 ** decimals;
  if (!Number.isFinite(human) || human <= 0) return null;
  return human * price;
}

export async function validateSwapEconomics(params: {
  fromChainKey: string;
  tokenIn: string;
  amountIn: string;
  toChainKey: string;
  tokenOut: string;
  amountOut: string;
  slippageBps?: number;
  /** Cross-chain: reject when USD prices cannot be verified. */
  strict?: boolean;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const ratioCheck = validateOutputInputRatio(params);
  if (!ratioCheck.ok) {
    logger.warn(
      {
        from: params.fromChainKey,
        to: params.toChainKey,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        reason: ratioCheck.reason,
      },
      "quote failed token ratio check",
    );
    return ratioCheck;
  }

  const [inUsd, outUsd] = await Promise.all([
    usdValue(params.fromChainKey, params.tokenIn, params.amountIn),
    usdValue(params.toChainKey, params.tokenOut, params.amountOut),
  ]);

  if (inUsd == null || outUsd == null) {
    if (params.strict) {
      logger.debug(
        { inUsd, outUsd, tokenIn: params.tokenIn, tokenOut: params.tokenOut },
        "quote sanity: missing USD prices",
      );
      return { ok: false, reason: "Unable to verify quote against market prices" };
    }
    return { ok: true };
  }

  if (inUsd <= 0) {
    return { ok: false, reason: "Invalid input amount" };
  }

  const ratio = outUsd / inUsd;
  const slippage = (params.slippageBps ?? 50) / 10_000;
  const threshold = MIN_OUTPUT_VALUE_RATIO - slippage;

  if (ratio < threshold) {
    logger.warn(
      {
        from: params.fromChainKey,
        to: params.toChainKey,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        inUsd,
        outUsd,
        ratio,
        threshold,
      },
      "quote failed USD sanity check",
    );
    return {
      ok: false,
      reason: `Quoted output ($${outUsd.toFixed(2)}) is far below input value ($${inUsd.toFixed(2)})`,
    };
  }

  return { ok: true };
}

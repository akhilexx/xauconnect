/**
 * Native / wrapped-native USD oracle via canonical WETH-USDC (or chain equivalent) V2 pool.
 */
import type { Address } from "viem";
import type { ChainInfo } from "@xauconnect/utils";
import { chainByKeyStrict, evmClient, withTimeout } from "../../services/routing/evm.js";
import { FACTORY_ABI, PAIR_ABI } from "./abis.js";
import { readV2ReservesPrice } from "./evm-v2-price.js";

const CACHE_MS = 30_000;
const cache = new Map<string, { at: number; usd: number }>();

/** Resolve the reference WETH/USDC V2 pair for a chain (via factory). */
async function referencePair(chain: ChainInfo): Promise<Address | null> {
  if (!chain.wrappedNative || !chain.usdc) return null;
  const v2Factory = chain.key === "ethereum"
    ? "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
    : chain.key === "bsc"
      ? "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"
      : chain.key === "polygon"
        ? "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32"
        : chain.key === "arbitrum"
          ? "0xc35DADB65012eC5796536bD9864eD8773aBc74C4"
          : chain.key === "base"
            ? "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6"
            : chain.key === "avalanche"
              ? "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
              : null;
  if (!v2Factory) return null;

  const client = evmClient(chain);
  const pair = await withTimeout(
    client.readContract({
      address: v2Factory as Address,
      abi: FACTORY_ABI,
      functionName: "getPair",
      args: [chain.wrappedNative as Address, chain.usdc as Address],
    }),
    5_000,
  );
  if (pair === "0x0000000000000000000000000000000000000000") return null;
  return pair as Address;
}

/** USD price of 1 native token (ETH, BNB, etc.). */
export async function nativeTokenUsd(chainKey: string): Promise<number> {
  const hit = cache.get(chainKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.usd;

  const chain = chainByKeyStrict(chainKey);
  if (chain.kind !== "evm" || !chain.wrappedNative || !chain.usdc) return 0;

  try {
    const pair = await referencePair(chain);
    if (!pair) return hit?.usd ?? 0;

    const client = evmClient(chain);
    const [token0] = await Promise.all([
      client.readContract({ address: pair, abi: PAIR_ABI, functionName: "token0" }),
    ]);
    const wrappedLower = chain.wrappedNative.toLowerCase();
    const baseIsWrapped = (token0 as string).toLowerCase() === wrappedLower;

    const { priceUsd } = await readV2ReservesPrice({
      chainKey,
      poolAddress: pair,
      baseTokenAddress: chain.wrappedNative,
      quoteTokenAddress: chain.usdc,
      baseIsToken0: baseIsWrapped,
    });

    cache.set(chainKey, { at: Date.now(), usd: priceUsd });
    return priceUsd;
  } catch {
    return hit?.usd ?? 0;
  }
}

/** USD price of a quote token (USDC = 1, WETH = native, else 0). */
export async function quoteTokenUsd(chainKey: string, quoteAddress: string): Promise<number> {
  const chain = chainByKeyStrict(chainKey);
  const q = quoteAddress.toLowerCase();
  if (chain.usdc && q === chain.usdc.toLowerCase()) return 1;
  if (chain.wrappedNative && q === chain.wrappedNative.toLowerCase()) {
    return nativeTokenUsd(chainKey);
  }
  return 0;
}

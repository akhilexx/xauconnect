/**
 * Direct on-chain quoting for UniswapV2-family and UniswapV3-family venues
 * (Uniswap, PancakeSwap, SushiSwap, QuickSwap, Trader Joe, Camelot, ...).
 * One code path per protocol family — venue addresses come from the registry.
 */
import { type Address } from "viem";
import {
  NATIVE_TOKEN_ADDRESS,
  isNativeToken,
  type ChainInfo,
  type DexInfo,
  type QuoteRequest,
  type RouteQuote,
} from "@xauconnect/utils";
import { evmClient, V2_ROUTER_ABI, V3_QUOTER_ABI, withTimeout } from "./evm.js";

const QUOTE_TIMEOUT_MS = 4_500;

/** Map the native pseudo-address to the chain's wrapped token for pool math. */
function poolToken(chain: ChainInfo, token: string): Address {
  if (isNativeToken(chain, token)) return chain.wrappedNative as Address;
  return token as Address;
}

export async function quoteV2(
  chain: ChainInfo,
  dex: DexInfo,
  req: QuoteRequest,
): Promise<RouteQuote | null> {
  if (!dex.router || !chain.wrappedNative) return null;
  const client = evmClient(chain);
  const tokenIn = poolToken(chain, req.tokenIn);
  const tokenOut = poolToken(chain, req.tokenOut);
  if (tokenIn === tokenOut) return null;

  // Try the direct pair first, then route through wrapped native.
  const paths: Address[][] = [[tokenIn, tokenOut]];
  const wn = chain.wrappedNative as Address;
  if (tokenIn !== wn && tokenOut !== wn) paths.push([tokenIn, wn, tokenOut]);

  for (const path of paths) {
    try {
      const amounts = await withTimeout(
        client.readContract({
          address: dex.router as Address,
          abi: V2_ROUTER_ABI,
          functionName: "getAmountsOut",
          args: [BigInt(req.amountIn), path],
        }),
        QUOTE_TIMEOUT_MS,
      );
      const out = amounts[amounts.length - 1];
      if (out && out > 0n) {
        return baseQuote(dex, req, out, path.map((p, i) => ({
          tokenIn: path[i] as string,
          tokenOut: (path[i + 1] ?? p) as string,
        })).slice(0, path.length - 1));
      }
    } catch {
      // pair missing or RPC issue — try next path / venue
    }
  }
  return null;
}

export async function quoteV3(
  chain: ChainInfo,
  dex: DexInfo,
  req: QuoteRequest,
): Promise<RouteQuote | null> {
  if (!dex.quoter || !chain.wrappedNative) return null;
  const client = evmClient(chain);
  const tokenIn = poolToken(chain, req.tokenIn);
  const tokenOut = poolToken(chain, req.tokenOut);
  if (tokenIn === tokenOut) return null;

  let best: { out: bigint; feeTier: number } | null = null;
  for (const feeTier of dex.feeTiers ?? [500, 3000]) {
    try {
      const { result } = await withTimeout(
        client.simulateContract({
          address: dex.quoter as Address,
          abi: V3_QUOTER_ABI,
          functionName: "quoteExactInputSingle",
          args: [
            {
              tokenIn,
              tokenOut,
              amountIn: BigInt(req.amountIn),
              fee: feeTier,
              sqrtPriceLimitX96: 0n,
            },
          ],
        }),
        QUOTE_TIMEOUT_MS,
      );
      const out = result[0];
      if (out > 0n && (!best || out > best.out)) best = { out, feeTier };
    } catch {
      // pool doesn't exist at this tier
    }
  }
  if (!best) return null;
  return baseQuote(dex, req, best.out, [
    { tokenIn: tokenIn as string, tokenOut: tokenOut as string, feeTier: best.feeTier },
  ]);
}

/** Shared quote shaping — protocol fee is applied later by the engine. */
function baseQuote(
  dex: DexInfo,
  req: QuoteRequest,
  amountOut: bigint,
  path: RouteQuote["path"],
): RouteQuote {
  return {
    dexId: dex.id,
    dexName: dex.name,
    protocol: dex.protocol,
    amountOut: amountOut.toString(),
    amountOutAfterFee: amountOut.toString(), // engine adjusts
    protocolFee: "0",
    priceImpactBps: 0, // engine estimates vs. best quote
    path,
    simulated: false,
  };
}

export { NATIVE_TOKEN_ADDRESS };

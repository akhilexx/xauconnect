/**
 * Demo quote generator — keeps the swap UI fully functional with realistic,
 * deterministic venue spreads when no live venue can be reached.
 */
import {
  findToken,
  getDexesForChain,
  type QuoteRequest,
  type RouteQuote,
} from "@xauconnect/utils";
import { demoUsdPrice, hashSeed, rng } from "../../demo/data.js";

const SCALE = 10n ** 12n;

function decimalsOf(chainKey: string, address: string): number {
  return findToken(chainKey, address)?.decimals ?? (chainKey === "solana" ? 6 : 18);
}

function priceOf(chainKey: string, address: string): number {
  const known = findToken(chainKey, address);
  return demoUsdPrice(known?.coingeckoId, `${chainKey}:${address.toLowerCase()}`);
}

export function demoQuotes(req: QuoteRequest): RouteQuote[] {
  const dexes = getDexesForChain(req.chainKey);
  const decIn = decimalsOf(req.chainKey, req.tokenIn);
  const decOut = decimalsOf(req.chainKey, req.tokenOut);
  const priceIn = priceOf(req.chainKey, req.tokenIn);
  const priceOut = priceOf(req.chainKey, req.tokenOut);
  if (priceOut === 0) return [];

  const amountIn = BigInt(req.amountIn);
  // out = in * (priceIn/priceOut) * 10^(decOut-decIn), via fixed-point scale.
  const ratioScaled = BigInt(Math.max(1, Math.round((priceIn / priceOut) * Number(SCALE))));
  let idealOut = (amountIn * ratioScaled) / SCALE;
  const decDiff = decOut - decIn;
  idealOut =
    decDiff >= 0 ? idealOut * 10n ** BigInt(decDiff) : idealOut / 10n ** BigInt(-decDiff);

  // Size-dependent price impact: ~1bps per $1k notional, venue-jittered.
  const notionalUsd = (Number(amountIn) / 10 ** decIn) * priceIn;
  const baseImpactBps = Math.min(2_000, Math.max(1, Math.round(notionalUsd / 1_000)));

  return dexes.map((dex) => {
    const r = rng(hashSeed(`${dex.id}:${req.tokenIn}:${req.tokenOut}`));
    // Meta-aggregators tend to find slightly better routes in the demo too.
    const venueEdgeBps = dex.protocol === "meta" ? r() * 20 : 10 + r() * 50;
    const impactBps = baseImpactBps + (dex.protocol === "meta" ? 0 : Math.round(r() * 8));
    const totalSlipBps = BigInt(Math.round(venueEdgeBps) + impactBps);
    const out = (idealOut * (10_000n - totalSlipBps)) / 10_000n;

    return {
      dexId: dex.id,
      dexName: dex.name,
      protocol: dex.protocol,
      amountOut: out.toString(),
      amountOutAfterFee: out.toString(),
      protocolFee: "0",
      priceImpactBps: impactBps,
      estimatedGasUsd: dex.protocol === "meta" ? 4 + r() * 6 : 1.5 + r() * 4,
      path: [{ tokenIn: req.tokenIn, tokenOut: req.tokenOut }],
      simulated: true,
    } satisfies RouteQuote;
  });
}

/**
 * Routing engine — fans a quote request out to every venue on the requested
 * chain (direct V2/V3 quoting + meta-aggregators), applies the protocol fee,
 * and returns the comparison table sorted best-first.
 *
 * Fee model: the on-chain AggregatorRouter skims the fee from the INPUT side;
 * for display we equivalently present it on the output side so users see
 * exactly what lands in their wallet.
 */
import {
  applyFeeBps,
  clampSwapFeeBps,
  defaultSwapFeeBpsForChain,
  getDexesForChain,
  minOutAfterSlippage,
  type AggregatedQuote,
  type QuoteRequest,
  type RouteQuote,
} from "@xauconnect/utils";
import { logger } from "../../logger.js";
import { cached } from "../../cache.js";
import { db } from "../../db/client.js";
import { chainByKeyStrict } from "./evm.js";
import { quoteV2, quoteV3 } from "./direct.js";
import { quote0x, quote1inch, quoteJupiter, quoteParaswap } from "./meta.js";
import { isRouteExecutable } from "./executable.js";
import { validateSwapEconomics } from "./quote-sanity.js";
import { ApiError } from "../../middleware/error.js";
import { quoteGoldCurve } from "../meteora-dbc.js";

/** Resolve the effective swap fee bps for a chain (DB hot-config > env). */
export async function swapFeeBpsFor(chainKey: string): Promise<number> {
  if (db) {
    try {
      const config = await db.feeConfig.findUnique({ where: { chainKey } });
      if (config?.enabled) return clampSwapFeeBps(config.swapFeeBps);
    } catch {
      // fall through to env default
    }
  }
  return clampSwapFeeBps(defaultSwapFeeBpsForChain(chainKey));
}

async function venueQuotes(req: QuoteRequest, feeBps: number): Promise<RouteQuote[]> {
  const chain = chainByKeyStrict(req.chainKey);
  const venues = getDexesForChain(req.chainKey);

  const tasks = venues.map(async (dex): Promise<RouteQuote | null> => {
    try {
      switch (dex.protocol) {
        case "uniswap-v2":
          return await quoteV2(chain, dex, req);
        case "uniswap-v3":
          return await quoteV3(chain, dex, req);
        case "meta":
          if (dex.key === "1inch") return await quote1inch(chain, dex, req, feeBps);
          if (dex.key === "0x") return await quote0x(chain, dex, req, feeBps);
          if (dex.key === "paraswap") return await quoteParaswap(chain, dex, req);
          if (dex.key === "jupiter") return await quoteJupiter(chain, dex, req, feeBps);
          return null;
        case "solana-amm":
          if (dex.key === "meteora-dbc") return await quoteGoldCurve(req);
          // Raydium/Orca direct quoting requires their SDKs; Jupiter covers
          // both venues' liquidity on Solana. Demo fallback fills the rows.
          return null;
        default:
          return null;
      }
    } catch (err) {
      logger.debug({ dex: dex.id, err: (err as Error).message }, "venue quote failed");
      return null;
    }
  });

  const settled = await Promise.all(tasks);
  return settled.filter((q): q is RouteQuote => q !== null);
}

export async function aggregateQuotes(req: QuoteRequest): Promise<AggregatedQuote> {
  const feeBps = await swapFeeBpsFor(req.chainKey);
  const cacheKey =
    `quote:${req.chainKey}:${req.tokenIn}:${req.tokenOut}:${req.amountIn}:${req.slippageBps}:fee${feeBps}`;

  return cached(cacheKey, 5, async () => {
    const quotes = await venueQuotes(req, feeBps);

    if (quotes.length === 0) {
      throw new ApiError(
        503,
        "No live swap routes available for this request",
        "NO_LIVE_QUOTES",
      );
    }

    // Apply the protocol fee and estimate price impact vs. the best raw rate.
    const bestRaw = quotes.reduce<bigint>(
      (max, q) => (BigInt(q.amountOut) > max ? BigInt(q.amountOut) : max),
      0n,
    );
    for (const quote of quotes) {
      const gross = BigInt(quote.amountOut);
      // Meta-aggregator quotes include integrator fee in the API response.
      if (quote.protocol === "meta" && quote.protocolFee !== "0") {
        if (quote.priceImpactBps === 0 && bestRaw > 0n) {
          quote.priceImpactBps = Number(((bestRaw - gross) * 10_000n) / bestRaw);
        }
      } else {
        const { fee, net } = applyFeeBps(gross, feeBps);
        quote.protocolFee = fee.toString();
        quote.amountOutAfterFee = net.toString();
        if (quote.priceImpactBps === 0 && bestRaw > 0n) {
          quote.priceImpactBps = Number(((bestRaw - gross) * 10_000n) / bestRaw);
        }
      }
      quote.executable = isRouteExecutable(req.chainKey, quote);
    }

    const sanityChecks = await Promise.all(
      quotes.map(async (quote) => {
        const check = await validateSwapEconomics({
          fromChainKey: req.chainKey,
          tokenIn: req.tokenIn,
          amountIn: req.amountIn,
          toChainKey: req.chainKey,
          tokenOut: req.tokenOut,
          amountOut: quote.amountOutAfterFee,
          slippageBps: req.slippageBps,
        });
        return check.ok;
      }),
    );
    const saneQuotes = quotes.filter((_, i) => sanityChecks[i]);

    if (saneQuotes.length === 0) {
      throw new ApiError(
        503,
        "No reliable swap routes available for this pair",
        "NO_LIVE_QUOTES",
      );
    }

    saneQuotes.sort((a, b) => {
      if (a.executable !== b.executable) return a.executable ? -1 : 1;
      const diff = BigInt(b.amountOutAfterFee) - BigInt(a.amountOutAfterFee);
      return diff > 0n ? 1 : diff < 0n ? -1 : 0;
    });

    const best = saneQuotes.find((q) => q.executable) ?? saneQuotes[0] ?? null;
    const minAmountOut = best
      ? minOutAfterSlippage(BigInt(best.amountOutAfterFee), req.slippageBps).toString()
      : null;

    return {
      request: req,
      quotes: saneQuotes,
      best,
      protocolFeeBps: feeBps,
      minAmountOut,
      quotedAt: Date.now(),
    } satisfies AggregatedQuote;
  });
}

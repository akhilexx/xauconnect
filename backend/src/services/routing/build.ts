/**
 * Swap transaction builder + pre-flight simulation.
 *
 * Solana → Jupiter with platformFeeBps.
 * EVM meta (1inch / 0x) → integrator swap tx (always, even when own router is deployed).
 * EVM direct → own AggregatorRouter when ROUTER_ADDRESS_* is set; on failure → 1inch / 0x fallback.
 */
import { encodeFunctionData, keccak256, toBytes, type Address } from "viem";
import {
  getDexById,
  isNativeToken,
  normalizeEvmAddress,
  type QuoteRequest,
  type RouteQuote,
  type SwapTx,
} from "@xauconnect/utils";
import { chainByKeyStrict, evmClient, AGGREGATOR_ROUTER_ABI } from "./evm.js";
import {
  build0xSwap,
  build1inchSwap,
  buildJupiterSwap,
  buildMetaEvmSwap,
} from "./meta.js";
import { swapFeeBpsFor } from "./engine.js";
import { isMetaEvmRoute, routerAddressFor } from "./executable.js";
import { simulateSolanaTransactionBase64 } from "../solana-simulate.js";
import { buildGoldCurveSwap } from "../meteora-dbc.js";
import { logger } from "../../logger.js";

async function buildEvmMetaSwapTx(
  chainKey: string,
  route: RouteQuote,
  req: QuoteRequest,
  feeBps: number,
): Promise<SwapTx> {
  const metaTx = await buildMetaEvmSwap(chainKey, route, req, feeBps);
  if (metaTx) {
    return {
      chainKey,
      evm: metaTx,
      simulation: { success: true, expectedOut: route.amountOutAfterFee },
    };
  }

  const fallback = await buildMetaIntegratorFallback(
    chainKey,
    req,
    feeBps,
    route.amountOutAfterFee,
  );
  if (fallback) {
    return fallback;
  }

  return {
    chainKey,
    simulation: { success: false, error: "SWAP_BUILD_FAILED" },
  };
}

/** When own router cannot serve a direct route, try 1inch then 0x (order flipped on Arbitrum). */
async function buildMetaIntegratorFallback(
  chainKey: string,
  req: QuoteRequest,
  feeBps: number,
  expectedOut: string,
): Promise<SwapTx | null> {
  const chain = chainByKeyStrict(chainKey);
  if (chain.kind !== "evm" || !req.taker) return null;
  const taker = normalizeEvmAddress(req.taker);
  if (!taker) return null;

  const try0xFirst = chainKey === "arbitrum";
  const attempts = try0xFirst
    ? ([build0xSwap, build1inchSwap] as const)
    : ([build1inchSwap, build0xSwap] as const);

  for (const build of attempts) {
    const metaTx = await build(chain, { ...req, taker }, feeBps);
    if (metaTx) {
      logger.info({ chainKey, integrator: metaTx.to }, "evm swap via meta fallback");
      return {
        chainKey,
        evm: metaTx,
        simulation: { success: true, expectedOut },
      };
    }
  }
  return null;
}

async function buildOwnRouterSwapTx(
  chainKey: string,
  route: RouteQuote,
  req: QuoteRequest,
  minAmountOut: string,
  router: `0x${string}`,
): Promise<SwapTx> {
  const chain = chainByKeyStrict(chainKey);
  const dex = getDexById(route.dexId);
  const adapterId = keccak256(toBytes(dex?.key ?? route.dexId));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 10);
  const isNativeIn = isNativeToken(chain, req.tokenIn);

  const data = encodeFunctionData({
    abi: AGGREGATOR_ROUTER_ABI,
    functionName: "swap",
    args: [
      adapterId,
      req.tokenIn as Address,
      req.tokenOut as Address,
      BigInt(req.amountIn),
      BigInt(minAmountOut),
      "0x",
      deadline,
    ],
  });

  const value = isNativeIn ? req.amountIn : "0";

  let simulation: SwapTx["simulation"] = { success: true, expectedOut: route.amountOutAfterFee };
  const taker = req.taker ? normalizeEvmAddress(req.taker) : null;
  if (taker) {
    try {
      await evmClient(chain).call({
        account: taker,
        to: router,
        data,
        value: BigInt(value),
      });
    } catch (err) {
      const message = (err as Error).message.split("\n")[0] ?? "simulation reverted";
      logger.debug({ err: message, dexId: route.dexId }, "own router simulation failed");
      simulation = { success: false, error: message, expectedOut: undefined };
    }
  }

  return { chainKey, evm: { to: router, data, value }, simulation };
}

export async function buildSwapTx(
  req: QuoteRequest,
  route: RouteQuote,
  minAmountOut: string,
): Promise<SwapTx> {
  const chain = chainByKeyStrict(req.chainKey);
  const feeBps = await swapFeeBpsFor(req.chainKey);
  const taker = req.taker ? normalizeEvmAddress(req.taker) : null;
  const reqWithTaker = taker ? { ...req, taker } : req;

  if (chain.kind === "solana") {
    if (!taker) {
      return {
        chainKey: req.chainKey,
        simulation: {
          success: false,
          error: "TAKER_REQUIRED — pass a Solana wallet address in taker to build the transaction",
        },
      };
    }
    let serialized: string | null = null;
    try {
      if (route.dexId.includes("meteora-dbc")) {
        serialized = await buildGoldCurveSwap(reqWithTaker, taker);
      } else if (route.dexId.includes("jupiter") || route.protocol === "meta") {
        serialized = await buildJupiterSwap(reqWithTaker, taker, feeBps);
      }
    } catch (err) {
      const message = (err as Error).message;
      if (message === "SOLANA_FEE_ACCOUNT_REQUIRED") {
        return {
          chainKey: req.chainKey,
          simulation: { success: false, error: message },
        };
      }
      logger.debug({ err: message }, "jupiter build");
    }
    if (!serialized) {
      const needsFeeAta = chain.key === "solana" && feeBps > 0;
      return {
        chainKey: req.chainKey,
        simulation: {
          success: false,
          error: needsFeeAta ? "SOLANA_FEE_ACCOUNT_REQUIRED" : "SWAP_BUILD_FAILED",
        },
      };
    }

    const preflight = await simulateSolanaTransactionBase64(serialized);
    if (!preflight.success) {
      return {
        chainKey: req.chainKey,
        simulation: {
          success: false,
          error: preflight.error ?? "SWAP_BUILD_FAILED",
        },
      };
    }

    return {
      chainKey: req.chainKey,
      solanaTransaction: serialized,
      simulation: { success: true, expectedOut: route.amountOutAfterFee },
    };
  }

  if (!taker) {
    return {
      chainKey: req.chainKey,
      simulation: {
        success: false,
        error: req.taker
          ? "INVALID_TAKER_ADDRESS — taker must be a valid 0x address (40 hex chars; checksum optional)"
          : "TAKER_REQUIRED — pass taker in quote/build for unsigned EVM calldata",
      },
    };
  }

  // 1inch / 0x — always use integrator build (never route through AggregatorRouter).
  if (isMetaEvmRoute(route)) {
    return buildEvmMetaSwapTx(req.chainKey, route, reqWithTaker, feeBps);
  }

  const router = routerAddressFor(req.chainKey);

  if (router) {
    const own = await buildOwnRouterSwapTx(req.chainKey, route, reqWithTaker, minAmountOut, router);
    if (own.simulation.success) {
      return own;
    }

    const fallback = await buildMetaIntegratorFallback(
      req.chainKey,
      reqWithTaker,
      feeBps,
      route.amountOutAfterFee,
    );
    if (fallback) {
      return fallback;
    }

    return own;
  }

  const fallback = await buildMetaIntegratorFallback(
    req.chainKey,
    reqWithTaker,
    feeBps,
    route.amountOutAfterFee,
  );
  if (fallback) {
    return fallback;
  }

  return {
    chainKey: req.chainKey,
    evm: { to: "0x0000000000000000000000000000000000000000", data: "0x", value: "0" },
    simulation: {
      success: false,
      expectedOut: undefined,
      error: "ROUTER_NOT_CONFIGURED",
    },
  };
}

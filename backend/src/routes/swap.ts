/**
 * Swap aggregation routes — quotes, tx building, swap recording.
 */
import { Router } from "express";
import { z } from "zod";
import {
  DEXES,
  ChainKeySchema, tokenAddressEq,
  QuoteRequestSchema,
  RouteQuoteSchema,
  CrossChainQuoteRequestSchema,
  CrossChainBuildRequestSchema,
  searchSwapTokens,
  getSwapCatalogMeta,
} from "@xauconnect/utils";
import { asyncHandler, validate, ApiError } from "../middleware/error.js";
import { logger } from "../logger.js";
import { quoteLimiter, standardLimiter } from "../middleware/rate-limit.js";
import { aggregateQuotes, swapFeeBpsFor } from "../services/routing/engine.js";
import { buildSwapTx } from "../services/routing/build.js";
import {
  buildCrossChain,
  quoteCrossChain,
  status0xCrossChain,
} from "../services/routing/cross-chain.js";
import { submitSignedSolanaTransaction } from "../services/solana-submit.js";
import { SolanaSubmitError } from "../services/solana-errors.js";
import { db } from "../db/client.js";
import { trackBuild, queueSettlement } from "../services/settlement/ledger.js";
import {
  CreateLimitOrderSchema,
  cancelLimitOrder,
  createLimitOrder,
  listLimitOrders,
} from "../services/limit-orders.js";
import { attachSwapRequestId, logSwapApiUsage, asSwapReq } from "../middleware/api-usage-log.js";
import { resolveQuoteAmountIn } from "../services/swap-amount.js";
import { normalizeSwapTaker } from "../services/normalize-swap-taker.js";
import { prepareQuoteBody, normalizeSwapTokens } from "../services/normalize-swap-tokens.js";
import { readEvmAllowance } from "../services/swap-allowance.js";
import { supportedChains } from "../services/market.js";

import { requireAuth } from "../middleware/auth.js";
function orderOwner(claim:string,session:string) {
  if(!session || session==="admin:console" || (session.startsWith("0x") ? claim.toLowerCase()!==session : claim!==session))
    throw new ApiError(403,"Sign in with the order wallet","WALLET_REQUIRED");
  return session;
}
export const swapRouter = Router();
swapRouter.use(attachSwapRequestId, logSwapApiUsage);

/** Venue + chain registries for the frontend selectors. */
swapRouter.get("/chains", standardLimiter, (_req, res) => {
  res.json({ chains: supportedChains() });
});

swapRouter.get("/dexes", standardLimiter, (req, res) => {
  const chainKey = req.query.chainKey as string | undefined;
  const dexes = chainKey ? DEXES.filter((d) => d.chainKey === chainKey) : DEXES;
  res.json({ dexes });
});

/** Per-chain swap levy + default slippage (admin-configured). */
swapRouter.get("/settings", standardLimiter, asyncHandler(async (req, res) => {
  const chainKey = req.query.chainKey as string | undefined;
  if (chainKey) {
    const feeConfig = db
      ? await db.feeConfig.findUnique({ where: { chainKey } })
      : null;
    res.json({
      chainKey,
      swapFeeBps: feeConfig?.enabled ? feeConfig.swapFeeBps : await swapFeeBpsFor(chainKey),
      defaultSlippageBps: feeConfig?.defaultSlippageBps ?? 50,
    });
    return;
  }
  const settings = await Promise.all(
    supportedChains().map(async (c) => {
      const feeConfig = db ? await db.feeConfig.findUnique({ where: { chainKey: c.key } }) : null;
      return {
        chainKey: c.key,
        swapFeeBps: feeConfig?.enabled ? feeConfig.swapFeeBps : await swapFeeBpsFor(c.key),
        defaultSlippageBps: feeConfig?.defaultSlippageBps ?? 50,
      };
    }),
  );
  res.json({ settings });
}));

swapRouter.get("/tokens", standardLimiter, (req, res) => {
  const chainKey = (req.query.chainKey as string | undefined) ?? "all";
  const search = req.query.search as string | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const offset = req.query.offset ? Number(req.query.offset) : 0;
  const tagsRaw = req.query.tags as string | undefined;
  const tags = tagsRaw ? (tagsRaw.split(",") as ("native" | "stable" | "btc" | "meme")[]) : undefined;

  const result = searchSwapTokens({
    chainKey: chainKey === "all" ? undefined : chainKey,
    search,
    limit: Number.isFinite(limit) ? limit : 50,
    offset: Number.isFinite(offset) ? offset : 0,
    tags,
  });

  res.json({
    ...result,
    meta: getSwapCatalogMeta(),
  });
});

swapRouter.get("/allowance", standardLimiter, asyncHandler(async (req, res) => {
  const chainKey = req.query.chainKey as string;
  const token = req.query.token as string;
  const owner = req.query.owner as string;
  const spender = req.query.spender as string;
  if (!chainKey || !token || !owner || !spender) {
    throw new ApiError(400, "chainKey, token, owner, and spender required", "MISSING_PARAMS");
  }
  const allowance = await readEvmAllowance(chainKey, token, owner, spender);
  res.json({ allowance, token, owner, spender, chainKey });
}));

/** Cross-chain quote (0x Cross-Chain API + 1inch Fusion+ fallback). */
swapRouter.post(
  "/cross-chain/quote",
  quoteLimiter,
  asyncHandler(async (req, res) => {
    const request = validate(CrossChainQuoteRequestSchema, req.body);
    if (request.fromChainKey === request.toChainKey) {
      throw new ApiError(400, "Use same-chain quote when chains match", "SAME_CHAIN");
    }
    const quote = await quoteCrossChain(request);
    if (!quote) {
      throw new ApiError(503, "No cross-chain route available for this pair", "NO_CROSS_CHAIN_ROUTE");
    }
    res.json({ quote });
  }),
);

swapRouter.post(
  "/cross-chain/build",
  quoteLimiter,
  asyncHandler(async (req, res) => {
    const { request, quote } = validate(CrossChainBuildRequestSchema, req.body);
    // Transaction payloads supplied by a caller must never reach a signing wallet.
    const fresh=await quoteCrossChain(request);
    if(!fresh || fresh.provider!==quote.provider || BigInt(fresh.amountOut)<BigInt(quote.minAmountOut))
      throw new ApiError(409,"Route changed. Refresh the quote.","QUOTE_EXPIRED");
    res.json(await buildCrossChain(request, fresh));
  }),
);

swapRouter.get(
  "/cross-chain/status/:quoteId",
  standardLimiter,
  asyncHandler(async (req, res) => {
    const quoteId = req.params.quoteId ?? "";
    const originChainKey = req.query.originChainKey as string;
    const originTxHash = req.query.originTxHash as string;
    const toChainKey = req.query.toChainKey as string;
    if (!originChainKey || !originTxHash || !toChainKey) {
      throw new ApiError(400, "originChainKey, originTxHash, and toChainKey required", "MISSING_PARAMS");
    }
    res.json(await status0xCrossChain(quoteId, originChainKey, originTxHash, toChainKey));
  }),
);

/** Aggregate quotes across every venue on the chain. */
async function handleQuote(req: import("express").Request, res: import("express").Response) {
  const raw = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
  const normalized = prepareQuoteBody(raw, resolveQuoteAmountIn);
  const request = normalizeSwapTaker(validate(QuoteRequestSchema, normalized));
  if (tokenAddressEq(request.chainKey, request.tokenIn, request.tokenOut)) {
    throw new ApiError(400, "tokenIn and tokenOut must differ", "SAME_TOKEN");
  }
  res.json(await aggregateQuotes(request));
}

swapRouter.get("/quote", standardLimiter, (_req, res) => {
  res.status(405).json({
    error: {
      code: "METHOD_NOT_ALLOWED",
      message: "Use POST /api/swap/quote with a JSON body (chainKey, tokenIn, tokenOut, amountIn).",
      hints: [
        "amountIn must be a base-unit string (e.g. \"1000000000000000000\") or integer number",
        "Resolve symbols via GET /api/swap/tokens?chainKey=ethereum&search=ETH",
        "See https://xauconnect.com/developers/quickstart",
      ],
    },
  });
});

swapRouter.post("/quote", quoteLimiter, asyncHandler(handleQuote));

/** Common agent typo: plural /quotes → same handler. */
swapRouter.post("/quotes", quoteLimiter, asyncHandler(handleQuote));

swapRouter.get("/build", standardLimiter, (_req, res) => {
  res.status(405).json({
    error: {
      code: "METHOD_NOT_ALLOWED",
      message: "Use POST /api/swap/build with { request, route, minAmountOut } from a quote response.",
      hints: ["Call POST /api/swap/quote first, then pass best route + minAmountOut"],
    },
  });
});

const BuildSchema = z.object({
  request: QuoteRequestSchema,
  route: RouteQuoteSchema,
  minAmountOut: z.string().regex(/^\d+$/),
});

/** Build + simulate the swap transaction for the chosen route. */
swapRouter.post(
  "/build",
  quoteLimiter,
  asyncHandler(async (req, res) => {
    const raw = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
    const body = normalizeSwapTokens(raw);
    const { request, route, minAmountOut } = validate(BuildSchema, body);
    const normalized = normalizeSwapTaker(request);
    if (tokenAddressEq(request.chainKey,request.tokenIn,request.tokenOut) || BigInt(request.amountIn)===0n)
      throw new ApiError(400,"Choose different assets and a positive input","INVALID_PAIR");
    const built = await buildSwapTx(normalized, route, minAmountOut);
    res.json(await trackBuild(normalized, built, asSwapReq(req).clientMeta));
  }),
);

const SubmitSolanaSchema = z.object({
  signedTransaction: z.string().min(16).max(1644),
  buildId:z.string().uuid().optional(),
});

/** Broadcast a wallet-signed Solana tx via server RPC (avoids browser 403 on public RPC). */
swapRouter.post(
  "/submit-solana",
  quoteLimiter,
  asyncHandler(async (req, res) => {
    const { signedTransaction, buildId } = validate(SubmitSolanaSchema, req.body);
    const raw = Uint8Array.from(Buffer.from(signedTransaction, "base64"));
    try {
      const result = await submitSignedSolanaTransaction(raw);
      if (buildId) await queueSettlement(buildId,"solana",result.signature).catch(()=>logger.warn({signature:result.signature},"Solana settlement queue unavailable"));
      res.json(result);
    } catch (err) {
      const code =
        err instanceof SolanaSubmitError ? err.code : "SOLANA_SUBMIT_FAILED";
      logger.warn({ err: (err as Error).message, code }, "solana swap submit failed");
      throw new ApiError(503, "Couldn't complete Solana swap", code);
    }
  }),
);

const RecordSchema = z.object({ buildId: z.string().uuid(), chainKey: ChainKeySchema, txHash: z.string().max(88) }).strict();

/** A submission requests verification. Only the settlement worker can write a Swap. */
swapRouter.post("/record", standardLimiter, asyncHandler(async (req, res) => {
  const {buildId,chainKey,txHash}=validate(RecordSchema,req.body);
  const result=await queueSettlement(buildId,chainKey,txHash);
  res.status(result.status==="verified"?200:202).json(result);
}));

/** Create a limit order (monitored server-side until price triggers). */
swapRouter.post(
  "/limit-orders",
  standardLimiter, requireAuth,
  asyncHandler(async (req, res) => {
    if (!db) throw new ApiError(503, "Database required for limit orders", "DB_REQUIRED");
    const input = validate(CreateLimitOrderSchema, req.body);
    const order = await createLimitOrder({...input,userAddress:orderOwner(input.userAddress,req.session!.address)});
    res.status(201).json({ order });
  }),
);

swapRouter.get(
  "/limit-orders",
  standardLimiter, requireAuth,
  asyncHandler(async (req, res) => {
    const userAddress = req.query.userAddress as string | undefined;
    if (!userAddress) throw new ApiError(400, "userAddress required", "MISSING_ADDRESS");
    const chainKey = req.query.chainKey as string | undefined;
    res.json({ orders: await listLimitOrders(orderOwner(userAddress,req.session!.address), chainKey) });
  }),
);

swapRouter.delete(
  "/limit-orders/:id",
  standardLimiter, requireAuth,
  asyncHandler(async (req, res) => {
    if (!db) throw new ApiError(503, "Database required", "DB_REQUIRED");
    const userAddress = req.query.userAddress as string | undefined;
    if (!userAddress) throw new ApiError(400, "userAddress required", "MISSING_ADDRESS");
    const order = await cancelLimitOrder(req.params.id ?? "", orderOwner(userAddress,req.session!.address));
    res.json({ order });
  }),
);

/**
 * Cross-chain swap routing — 0x Cross-Chain API (primary) + 1inch Fusion+ (fallback).
 */
import {
  applyFeeBps,
  grossFromNetAfterFee,
  getChainByKey,
  minOutAfterSlippage,
  NATIVE_TOKEN_ADDRESS,
  SOLANA_NATIVE_MINT,
  type CrossChainBuild,
  type CrossChainExecutionStep,
  type CrossChainQuote,
  type CrossChainQuoteRequest,
} from "@xauconnect/utils";
import { env } from "../../config.js";
import { logger } from "../../logger.js";
import { aggregateQuotes, swapFeeBpsFor } from "./engine.js";
import { evmIntegratorFeeRecipient } from "./integrator-fees.js";
import { oneInchUrl } from "./oneinch-api.js";
import { validateSwapEconomics } from "./quote-sanity.js";
import { withTimeout } from "./evm.js";

const HTTP_TIMEOUT_MS = 20_000;

function attachExecutionSteps(build: CrossChainBuild): CrossChainBuild {
  const executionSteps: CrossChainExecutionStep[] = [];
  if (build.evm) {
    executionSteps.push({
      stepIndex: 0,
      chainKey: build.fromChainKey,
      action: "sign_and_send_evm",
      txPayload: {
        evm: { to: build.evm.to, data: build.evm.data, value: build.evm.value },
      },
    });
  }
  if (build.solanaTransaction) {
    executionSteps.push({
      stepIndex: executionSteps.length,
      chainKey: build.fromChainKey,
      action: "sign_and_submit_solana",
      txPayload: { solanaTransaction: build.solanaTransaction },
    });
  }
  for (const step of build.steps) {
    if (step.status === "complete") continue;
    executionSteps.push({
      stepIndex: executionSteps.length,
      chainKey: step.chainKey ?? build.toChainKey,
      action: step.label,
    });
  }
  return { ...build, executionSteps };
}

/** Net/gross/fee fields aligned with same-chain RouteQuote semantics. */
function shapeCrossChainAmounts(
  buyAmount: bigint,
  feeBps: number,
  slippageBps: number,
  /** When true, buyAmount is already net (0x with feeBps param). */
  buyAmountIsNet = false,
): Pick<CrossChainQuote, "amountOut" | "amountOutGross" | "protocolFee" | "minAmountOut"> {
  if (feeBps <= 0 || buyAmount <= 0n) {
    return {
      amountOutGross: buyAmount.toString(),
      amountOut: buyAmount.toString(),
      protocolFee: "0",
      minAmountOut: minOutAfterSlippage(buyAmount, slippageBps).toString(),
    };
  }
  const net = buyAmountIsNet ? buyAmount : applyFeeBps(buyAmount, feeBps).net;
  const gross = buyAmountIsNet ? grossFromNetAfterFee(buyAmount, feeBps) : buyAmount;
  const protocolFee = (gross - net).toString();
  return {
    amountOutGross: gross.toString(),
    amountOut: net.toString(),
    protocolFee,
    minAmountOut: minOutAfterSlippage(net, slippageBps).toString(),
  };
}

/** 0x uses chain id or 'solana' for origin/destination. */
function chainTo0x(chainKey: string): string {
  const chain = getChainByKey(chainKey);
  if (!chain) throw new Error(`Unknown chain: ${chainKey}`);
  if (chain.kind === "solana") return "solana";
  return String(chain.id);
}

function tokenFor0x(chainKey: string, address: string): string {
  const chain = getChainByKey(chainKey);
  if (!chain) return address;
  if (chain.kind === "solana") {
    return address === SOLANA_NATIVE_MINT
      ? "So11111111111111111111111111111111111111112"
      : address;
  }
  return address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
    ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    : address;
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await withTimeout(
    fetch(url, { headers: { accept: "application/json", ...headers } }),
    HTTP_TIMEOUT_MS,
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`http ${res.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
  }
  return res.json();
}

async function acceptCrossChainQuote(
  req: CrossChainQuoteRequest,
  quote: CrossChainQuote | null,
): Promise<CrossChainQuote | null> {
  if (!quote) return null;
  const check = await validateSwapEconomics({
    fromChainKey: req.fromChainKey,
    tokenIn: req.tokenIn,
    amountIn: req.amountIn,
    toChainKey: req.toChainKey,
    tokenOut: req.tokenOut,
    amountOut: quote.amountOut,
    slippageBps: req.slippageBps,
    strict: req.fromChainKey !== req.toChainKey,
  });
  if (!check.ok) {
    logger.debug({ reason: check.reason, routeId: quote.routeId }, "cross-chain quote rejected");
    return null;
  }
  return quote;
}

export async function quoteCrossChain(
  req: CrossChainQuoteRequest,
): Promise<CrossChainQuote | null> {
  if (req.fromChainKey === req.toChainKey) return null;

  const feeBps = await swapFeeBpsFor(req.fromChainKey);

  if (env.ZEROX_API_KEY) {
    try {
      const q = await acceptCrossChainQuote(req, await quote0xCrossChain(req, feeBps));
      if (q) return q;
    } catch (err) {
      logger.debug({ err: (err as Error).message }, "0x cross-chain quote failed");
    }
  }

  // 1inch Fusion+ requires signed orders + secret hashes (not wallet approve/send).
  // Skip until full SDK integration — avoids quotes we cannot execute.

  try {
    const composite = await acceptCrossChainQuote(req, await quoteViaUsdcBridge(req, feeBps));
    if (composite) return composite;
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "composite USDC bridge quote failed");
  }

  return null;
}

/** When direct bridge fails (e.g. BSC BTC → ETH WBTC), route via USDC on each side. */
async function quoteViaUsdcBridge(
  req: CrossChainQuoteRequest,
  feeBps: number,
): Promise<CrossChainQuote | null> {
  const fromChain = getChainByKey(req.fromChainKey);
  const toChain = getChainByKey(req.toChainKey);
  if (!fromChain?.usdc || !toChain?.usdc) return null;

  const srcUsdc = fromChain.usdc;
  const dstUsdc = toChain.usdc;
  const needsHop1 = req.tokenIn.toLowerCase() !== srcUsdc.toLowerCase();
  const needsHop3 = req.tokenOut.toLowerCase() !== dstUsdc.toLowerCase();

  if (!needsHop1 && !needsHop3) return null;

  let bridgeAmountIn = req.amountIn;
  let hop1: { request: import("@xauconnect/utils").QuoteRequest; route: import("@xauconnect/utils").RouteQuote } | undefined;

  if (needsHop1) {
    try {
      const hop1Quote = await aggregateQuotes({
        chainKey: req.fromChainKey,
        tokenIn: req.tokenIn,
        tokenOut: srcUsdc,
        amountIn: req.amountIn,
        slippageBps: req.slippageBps,
        taker: req.taker,
      });
      if (!hop1Quote.best) return null;
      bridgeAmountIn = hop1Quote.best.amountOutAfterFee;
      hop1 = { request: hop1Quote.request, route: hop1Quote.best };
    } catch {
      return null;
    }
  }

  const bridgeReq: CrossChainQuoteRequest = {
    ...req,
    tokenIn: srcUsdc,
    tokenOut: dstUsdc,
    amountIn: bridgeAmountIn,
  };

  let hop2 =
    (env.ZEROX_API_KEY ? await quote0xCrossChain(bridgeReq, feeBps).catch(() => null) : null) ??
    (env.ONEINCH_API_KEY ? await quote1inchFusionPlus(bridgeReq, feeBps).catch(() => null) : null);
  if (!hop2) return null;

  let finalOut = hop2.amountOut;
  let hop3: { request: import("@xauconnect/utils").QuoteRequest; route: import("@xauconnect/utils").RouteQuote } | undefined;

  if (needsHop3) {
    try {
      const hop3Quote = await aggregateQuotes({
        chainKey: req.toChainKey,
        tokenIn: dstUsdc,
        tokenOut: req.tokenOut,
        amountIn: hop2.amountOut,
        slippageBps: req.slippageBps,
        taker: req.takerDestination ?? req.taker,
      });
      if (!hop3Quote.best) return null;
      finalOut = hop3Quote.best.amountOutAfterFee;
      hop3 = { request: hop3Quote.request, route: hop3Quote.best };
    } catch {
      return null;
    }
  }

  const amounts =
    hop3 != null
      ? {
          amountOutGross: hop3.route.amountOut,
          amountOut: finalOut,
          protocolFee: hop3.route.protocolFee,
          minAmountOut: minOutAfterSlippage(BigInt(finalOut), req.slippageBps).toString(),
        }
      : {
          amountOutGross: hop2.amountOutGross ?? hop2.amountOut,
          amountOut: hop2.amountOut,
          protocolFee: hop2.protocolFee ?? "0",
          minAmountOut: minOutAfterSlippage(BigInt(hop2.amountOut), req.slippageBps).toString(),
        };

  const minOut = amounts.minAmountOut;
  const steps: CrossChainQuote["steps"] = [];
  if (hop1) {
    steps.push({
      id: "swap-source",
      label: `Swap to USDC on ${fromChain.name}`,
      chainKey: req.fromChainKey,
      status: "pending",
    });
  }
  steps.push(
    { id: "approve", label: "Approve token", chainKey: req.fromChainKey, status: "pending" },
    { id: "origin", label: "Confirm on source chain", chainKey: req.fromChainKey, status: "pending" },
    { id: "bridge", label: "Bridge in progress", status: "pending" },
    { id: "dest", label: "Receive on destination", chainKey: req.toChainKey, status: "pending" },
  );
  if (hop3) {
    steps.push({
      id: "swap-dest",
      label: `Swap to ${toChain.name} token`,
      chainKey: req.toChainKey,
      status: "pending",
    });
  }

  return {
    provider: hop2.provider,
    fromChainKey: req.fromChainKey,
    toChainKey: req.toChainKey,
    tokenIn: req.tokenIn,
    tokenOut: req.tokenOut,
    amountIn: req.amountIn,
    amountOut: amounts.amountOut,
    amountOutGross: amounts.amountOutGross,
    protocolFee: amounts.protocolFee,
    minAmountOut: minOut,
    estimatedDurationSec: (hop2.estimatedDurationSec ?? 120) + (hop1 ? 30 : 0) + (hop3 ? 30 : 0),
    bridgeName: hop2.bridgeName ?? "XAU Bridge",
    steps,
    routeId: `composite-${hop2.routeId}`,
    quoteId: hop2.quoteId,
    protocolFeeBps: feeBps,
    raw: { composite: true, hop1, hop2, hop2Request: bridgeReq, hop3 },
  };
}

async function quote0xCrossChain(
  req: CrossChainQuoteRequest,
  feeBps: number,
): Promise<CrossChainQuote | null> {
  const params = new URLSearchParams({
    originChain: chainTo0x(req.fromChainKey),
    destinationChain: chainTo0x(req.toChainKey),
    sellToken: tokenFor0x(req.fromChainKey, req.tokenIn),
    buyToken: tokenFor0x(req.toChainKey, req.tokenOut),
    sellAmount: req.amountIn,
    originAddress: req.taker,
    sortQuotesBy: "price",
    maxNumQuotes: "1",
  });
  if (req.takerDestination) {
    params.set("destinationAddress", req.takerDestination);
  }
  if (feeBps > 0) {
    params.set("feeBps", String(feeBps));
    params.set("feeRecipient", evmIntegratorFeeRecipient());
  }

  const data = await getJson(`https://api.0x.org/cross-chain/quotes?${params}`, {
    "0x-api-key": env.ZEROX_API_KEY!,
  });

  const quote = data?.quotes?.[0];
  if (!quote?.buyAmount) return null;

  const buyAmount = BigInt(quote.buyAmount);
  const amounts = shapeCrossChainAmounts(buyAmount, feeBps, req.slippageBps, feeBps > 0);
  const routeId = quote.quoteId ?? `0x-cc-${Date.now()}`;

  return {
    provider: "0x-cross-chain",
    fromChainKey: req.fromChainKey,
    toChainKey: req.toChainKey,
    tokenIn: req.tokenIn,
    tokenOut: req.tokenOut,
    amountIn: req.amountIn,
    amountOut: amounts.amountOut,
    amountOutGross: amounts.amountOutGross,
    protocolFee: amounts.protocolFee,
    minAmountOut: amounts.minAmountOut,
    estimatedDurationSec: quote.estimatedTimeSeconds ?? undefined,
    bridgeName: quote.steps?.[0]?.provider ?? "XAU Bridge",
    steps: [
      { id: "approve", label: "Approve token", chainKey: req.fromChainKey, status: "pending" },
      { id: "origin", label: "Confirm on source chain", chainKey: req.fromChainKey, status: "pending" },
      { id: "bridge", label: "Bridge in progress", status: "pending" },
      { id: "dest", label: "Receive on destination", chainKey: req.toChainKey, status: "pending" },
    ],
    routeId,
    quoteId: quote.quoteId,
    protocolFeeBps: feeBps,
    raw: quote,
  };
}

function chainTo1inch(chainKey: string): string {
  const chain = getChainByKey(chainKey);
  if (!chain) throw new Error(`Unknown chain: ${chainKey}`);
  if (chain.kind === "solana") return "501";
  return String(chain.id);
}

async function quote1inchFusionPlus(
  req: CrossChainQuoteRequest,
  feeBps: number,
): Promise<CrossChainQuote | null> {
  const fromChain = getChainByKey(req.fromChainKey);
  const toChain = getChainByKey(req.toChainKey);
  if (!fromChain || !toChain) return null;
  if (fromChain.kind === "solana" && toChain.kind === "solana") return null;

  const params = new URLSearchParams({
    srcChain: chainTo1inch(req.fromChainKey),
    dstChain: chainTo1inch(req.toChainKey),
    srcTokenAddress: tokenFor0x(req.fromChainKey, req.tokenIn),
    dstTokenAddress: tokenFor0x(req.toChainKey, req.tokenOut),
    amount: req.amountIn,
    walletAddress: req.taker,
    enableEstimate: "true",
  });
  if (req.takerDestination) {
    params.set("receiver", req.takerDestination);
  }

  const data = await getJson(
    `${oneInchUrl("/fusion-plus/quoter/v1.2/quote/receive")}?${params}`,
    { Authorization: `Bearer ${env.ONEINCH_API_KEY}` },
  );

  const dstAmount = data?.dstTokenAmount ?? data?.toTokenAmount ?? data?.quote?.dstTokenAmount;
  if (!dstAmount) return null;

  const buyAmount = BigInt(dstAmount);
  const amounts = shapeCrossChainAmounts(buyAmount, feeBps, req.slippageBps, false);
  const routeId = data.quoteId ?? `1inch-fp-${Date.now()}`;

  return {
    provider: "1inch-fusion-plus",
    fromChainKey: req.fromChainKey,
    toChainKey: req.toChainKey,
    tokenIn: req.tokenIn,
    tokenOut: req.tokenOut,
    amountIn: req.amountIn,
    amountOut: amounts.amountOut,
    amountOutGross: amounts.amountOutGross,
    protocolFee: amounts.protocolFee,
    minAmountOut: amounts.minAmountOut,
    estimatedDurationSec: data.estimatedExecutionTime ?? 120,
    bridgeName: "XAU Bridge",
    steps: [
      { id: "approve", label: "Approve token", chainKey: req.fromChainKey, status: "pending" },
      { id: "origin", label: "Sign cross-chain order", chainKey: req.fromChainKey, status: "pending" },
      { id: "bridge", label: "Bridge in progress", status: "pending" },
      { id: "dest", label: "Receive on destination", chainKey: req.toChainKey, status: "pending" },
    ],
    routeId,
    quoteId: data.quoteId,
    protocolFeeBps: feeBps,
    raw: data,
  };
}

export async function buildCrossChain(
  req: CrossChainQuoteRequest,
  quote: CrossChainQuote,
): Promise<CrossChainBuild> {
  const raw = quote.raw as { composite?: boolean; hop1?: unknown; hop2?: CrossChainQuote; hop2Request?: CrossChainQuoteRequest; hop3?: unknown };
  if (raw?.composite && raw.hop2 && raw.hop2Request) {
    return buildCrossChain(raw.hop2Request, raw.hop2);
  }
  let result: CrossChainBuild;
  if (quote.provider === "0x-cross-chain") {
    result = await build0xCrossChain(req, quote);
  } else if (quote.provider === "1inch-fusion-plus" && env.ZEROX_API_KEY) {
    const feeBps = await swapFeeBpsFor(req.fromChainKey);
    const fresh = await quote0xCrossChain(req, feeBps);
    if (fresh) result = await build0xCrossChain(req, fresh);
    else result = await build1inchFusionPlus(req, quote);
  } else {
    result = await build1inchFusionPlus(req, quote);
  }
  return attachExecutionSteps(result);
}

async function build0xCrossChain(
  req: CrossChainQuoteRequest,
  quote: CrossChainQuote,
): Promise<CrossChainBuild> {
  const fromChain = getChainByKey(req.fromChainKey);

  function extractEvmTx(rawQuote: unknown): { to?: string; data?: string; value?: string } | null {
    const raw = rawQuote as {
      transaction?: {
        details?: { to?: string; data?: string; value?: string; serializedTransaction?: string };
        to?: string;
        data?: string;
        value?: string;
      };
    };
    return raw?.transaction?.details ?? raw?.transaction ?? null;
  }

  let activeQuote = quote;
  let tx = extractEvmTx(quote.raw);

  if ((!tx?.to || !tx?.data) && env.ZEROX_API_KEY) {
    const feeBps = await swapFeeBpsFor(req.fromChainKey);
    const fresh = await quote0xCrossChain(req, feeBps);
    if (fresh) {
      activeQuote = fresh;
      tx = extractEvmTx(fresh.raw);
    }
  }

  const raw = activeQuote.raw as {
    transaction?: {
      chainType?: string;
      details?: {
        to?: string;
        data?: string;
        value?: string;
        serializedTransaction?: string;
      };
    };
    solanaTransaction?: string;
  };

  const solTx =
    raw?.transaction?.details?.serializedTransaction ??
    raw?.solanaTransaction ??
    (raw as { solanaTransaction?: string }).solanaTransaction;

  if (fromChain?.kind === "solana" && solTx) {
    return {
      fromChainKey: req.fromChainKey,
      toChainKey: req.toChainKey,
      provider: "0x-cross-chain",
      solanaTransaction: solTx,
      quoteId: activeQuote.quoteId,
      routeId: activeQuote.routeId,
      steps: activeQuote.steps,
    };
  }

  if (!tx?.to || !tx?.data) {
    throw new Error("SWAP_BUILD_FAILED");
  }

  return {
    fromChainKey: req.fromChainKey,
    toChainKey: req.toChainKey,
    provider: "0x-cross-chain",
    evm: {
      to: tx.to,
      data: tx.data,
      value: tx.value ?? "0",
      chainId: typeof fromChain?.id === "number" ? fromChain.id : undefined,
    },
    quoteId: activeQuote.quoteId,
    routeId: activeQuote.routeId,
    steps: activeQuote.steps,
  };
}

async function build1inchFusionPlus(
  req: CrossChainQuoteRequest,
  quote: CrossChainQuote,
): Promise<CrossChainBuild> {
  const raw = quote.raw as {
    tx?: { to?: string; data?: string; value?: string };
    quoteId?: string;
  };
  const fromChain = getChainByKey(req.fromChainKey);

  if (raw?.tx?.to && raw?.tx?.data) {
    return {
      fromChainKey: req.fromChainKey,
      toChainKey: req.toChainKey,
      provider: "1inch-fusion-plus",
      evm: {
        to: raw.tx.to,
        data: raw.tx.data,
        value: raw.tx.value ?? "0",
        chainId: typeof fromChain?.id === "number" ? fromChain.id : undefined,
      },
      quoteId: quote.quoteId,
      routeId: quote.routeId,
      steps: quote.steps,
    };
  }

  if (quote.quoteId && fromChain?.kind === "evm" && env.ONEINCH_API_KEY) {
    const body = {
      quoteId: quote.quoteId,
      walletAddress: req.taker,
      receiver: req.takerDestination ?? req.taker,
    };
    const res = await withTimeout(
      fetch(oneInchUrl("/fusion-plus/relayer/v1.2/orders/create/evm"), {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          Authorization: `Bearer ${env.ONEINCH_API_KEY}`,
        },
        body: JSON.stringify(body),
      }),
      HTTP_TIMEOUT_MS,
    );
    if (res.ok) {
      const data = (await res.json()) as { tx?: { to?: string; data?: string; value?: string } };
      if (data.tx?.to && data.tx?.data) {
        return {
          fromChainKey: req.fromChainKey,
          toChainKey: req.toChainKey,
          provider: "1inch-fusion-plus",
          evm: {
            to: data.tx.to,
            data: data.tx.data,
            value: data.tx.value ?? "0",
            chainId: typeof fromChain.id === "number" ? fromChain.id : undefined,
          },
          quoteId: quote.quoteId,
          routeId: quote.routeId,
          steps: quote.steps,
        };
      }
    }
  }

  if (fromChain?.kind === "solana" && quote.quoteId && env.ONEINCH_API_KEY) {
    const res = await withTimeout(
      fetch(oneInchUrl("/fusion-plus/relayer/v1.2/orders/create/solana"), {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          Authorization: `Bearer ${env.ONEINCH_API_KEY}`,
        },
        body: JSON.stringify({ quoteId: quote.quoteId, walletAddress: req.taker }),
      }),
      HTTP_TIMEOUT_MS,
    );
    if (res.ok) {
      const data = (await res.json()) as { transaction?: string; solanaTransaction?: string };
      const solTx = data.solanaTransaction ?? data.transaction;
      if (solTx) {
        return {
          fromChainKey: req.fromChainKey,
          toChainKey: req.toChainKey,
          provider: "1inch-fusion-plus",
          solanaTransaction: solTx,
          quoteId: quote.quoteId,
          routeId: quote.routeId,
          steps: quote.steps,
        };
      }
    }
  }

  throw new Error("Cross-chain order missing transaction data");
}

type ZeroXCrossChainStatus = {
  status?: string;
  transactions?: Array<{ chain?: string; chainId?: number; txHash?: string }>;
};

const CROSS_CHAIN_DONE = new Set([
  "bridge_filled",
  "bridge_complete",
  "completed",
  "confirmed",
  "success",
]);

const CROSS_CHAIN_FAILED = new Set([
  "bridge_failed",
  "origin_tx_reverted",
  "failed",
]);

/** Normalize 0x /status into a stable shape for the swap UI. */
export function normalizeCrossChainStatus(
  raw: unknown,
  toChainKey: string,
): { status: "pending" | "completed" | "failed" | "unknown"; destinationTxHash?: string } {
  const body = raw as ZeroXCrossChainStatus;
  const rawStatus = (body?.status ?? "unknown").toLowerCase();
  const destChain = getChainByKey(toChainKey);

  let destinationTxHash: string | undefined;
  if (Array.isArray(body?.transactions) && body.transactions.length > 0) {
    const destMatch = body.transactions.find(
      (tx) =>
        tx.chain === toChainKey ||
        tx.chain === chainTo0x(toChainKey) ||
        (destChain?.kind === "evm" && tx.chainId === destChain.id),
    );
    destinationTxHash = destMatch?.txHash ?? body.transactions.at(-1)?.txHash;
  }

  if (CROSS_CHAIN_DONE.has(rawStatus) || rawStatus.endsWith("_filled")) {
    return { status: "completed", destinationTxHash };
  }
  if (CROSS_CHAIN_FAILED.has(rawStatus) || rawStatus.includes("failed") || rawStatus.includes("reverted")) {
    return { status: "failed", destinationTxHash };
  }
  if (rawStatus === "unknown") return { status: "unknown", destinationTxHash };
  return { status: "pending", destinationTxHash };
}

export async function status0xCrossChain(
  quoteId: string,
  originChainKey: string,
  originTxHash: string,
  toChainKey: string,
): Promise<{ status: "pending" | "completed" | "failed" | "unknown"; destinationTxHash?: string; raw?: unknown }> {
  if (!env.ZEROX_API_KEY) return { status: "unknown" };
  const params = new URLSearchParams({
    quoteId,
    originChain: chainTo0x(originChainKey),
    originTxHash,
  });
  const raw = await getJson(`https://api.0x.org/cross-chain/status?${params}`, {
    "0x-api-key": env.ZEROX_API_KEY,
  });
  return { ...normalizeCrossChainStatus(raw, toChainKey), raw };
}

export { CHAINS } from "@xauconnect/utils";

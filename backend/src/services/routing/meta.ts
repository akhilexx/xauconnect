/**
 * Meta-aggregator adapters: 1inch, 0x, Paraswap (EVM) and Jupiter (Solana).
 * Quotes and swap tx builds include integrator fees when configured.
 */
import {
  grossFromNetAfterFee,
  isNativeToken,
  NATIVE_TOKEN_ADDRESS,
  SOLANA_NATIVE_MINT,
  type ChainInfo,
  type DexInfo,
  type QuoteRequest,
  type RouteQuote,
} from "@xauconnect/utils";
import { env } from "../../config.js";
import { logger } from "../../logger.js";
import { chainByKeyStrict, withTimeout } from "./evm.js";
import { oneInchUrl } from "./oneinch-api.js";
import {
  evmIntegratorFeeRecipient,
  oneInchFeePercent,
  solanaFeeWallet,
} from "./integrator-fees.js";
import { ensureSolanaFeeTokenAccountInitialized, solanaFeeTokenAccountForMint } from "./solana-fee-ata.js";
import {
  assembleJupiterSwapTx,
  fetchJupiterBuild,
  fetchJupiterOrder,
} from "./jupiter-v2.js";

const HTTP_TIMEOUT_MS = 12_000;

async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await withTimeout(
    fetch(url, { headers: { accept: "application/json", ...headers } }),
    HTTP_TIMEOUT_MS,
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`http ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  return res.json();
}

function evmTokenParam(chain: ChainInfo, token: string): string {
  return isNativeToken(chain, token) ? NATIVE_TOKEN_ADDRESS : token;
}

function shape(dex: DexInfo, amountOut: bigint, req: QuoteRequest): RouteQuote {
  return {
    dexId: dex.id,
    dexName: dex.name,
    protocol: dex.protocol,
    amountOut: amountOut.toString(),
    amountOutAfterFee: amountOut.toString(),
    protocolFee: "0",
    priceImpactBps: 0,
    path: [{ tokenIn: req.tokenIn, tokenOut: req.tokenOut }],
    simulated: false,
  };
}

/** Net integrator quote → gross display + protocolFee fields. */
function shapeWithIntegratorFee(
  dex: DexInfo,
  netOut: bigint,
  req: QuoteRequest,
  feeBps: number,
): RouteQuote | null {
  if (netOut <= 0n) return null;
  const quote = shape(dex, netOut, req);
  if (feeBps <= 0) return quote;
  const gross = grossFromNetAfterFee(netOut, feeBps);
  quote.amountOut = gross.toString();
  quote.amountOutAfterFee = netOut.toString();
  quote.protocolFee = (gross - netOut).toString();
  return quote;
}

/** 1inch Swap API v6 — https://business.1inch.com/portal/documentation */
export async function quote1inch(
  chain: ChainInfo,
  dex: DexInfo,
  req: QuoteRequest,
  feeBps: number,
): Promise<RouteQuote | null> {
  if (!env.ONEINCH_API_KEY || chain.kind !== "evm") return null;
  try {
    const src = evmTokenParam(chain, req.tokenIn);
    const dst = evmTokenParam(chain, req.tokenOut);
    const fee = oneInchFeePercent(feeBps);
    const referrer = evmIntegratorFeeRecipient();
    let url =
      oneInchUrl(`/swap/v6.0/${chain.id}/quote`) +
      `?src=${src}&dst=${dst}&amount=${req.amountIn}`;
    if (fee > 0) {
      url += `&fee=${fee}&referrer=${referrer}`;
    }
    const data = await getJson(url, { Authorization: `Bearer ${env.ONEINCH_API_KEY}` });
    const out = BigInt(data.dstAmount ?? data.toAmount ?? 0);
    return shapeWithIntegratorFee(dex, out, req, fee > 0 ? feeBps : 0);
  } catch (err) {
    logger.debug({ dex: dex.id, err: (err as Error).message }, "1inch quote failed");
    return null;
  }
}

/** 0x Swap API — https://0x.org/docs */
export async function quote0x(
  chain: ChainInfo,
  dex: DexInfo,
  req: QuoteRequest,
  feeBps: number,
): Promise<RouteQuote | null> {
  if (!env.ZEROX_API_KEY || chain.kind !== "evm") return null;
  try {
    const sellToken = evmTokenParam(chain, req.tokenIn);
    const buyToken = evmTokenParam(chain, req.tokenOut);
    const recipient = evmIntegratorFeeRecipient();
    let url =
      `https://api.0x.org/swap/allowance-holder/price?chainId=${chain.id}` +
      `&sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${req.amountIn}`;
    if (feeBps > 0) {
      url += `&swapFeeRecipient=${recipient}&swapFeeBps=${feeBps}`;
    }
    const data = await getJson(url, { "0x-api-key": env.ZEROX_API_KEY, "0x-version": "v2" });
    const out = BigInt(data.buyAmount ?? 0);
    return shapeWithIntegratorFee(dex, out, req, feeBps);
  } catch (err) {
    logger.debug({ dex: dex.id, err: (err as Error).message }, "0x quote failed");
    return null;
  }
}

/** Paraswap v5 prices — https://developers.paraswap.network */
export async function quoteParaswap(
  chain: ChainInfo,
  dex: DexInfo,
  req: QuoteRequest,
): Promise<RouteQuote | null> {
  if (!env.PARASWAP_API_KEY || chain.kind !== "evm") return null;
  try {
    const url =
      `https://api.paraswap.io/prices?network=${chain.id}` +
      `&srcToken=${req.tokenIn}&destToken=${req.tokenOut}&amount=${req.amountIn}&side=SELL`;
    const data = await getJson(url, { "X-API-KEY": env.PARASWAP_API_KEY });
    const out = BigInt(data.priceRoute?.destAmount ?? 0);
    return out > 0n ? shape(dex, out, req) : null;
  } catch {
    return null;
  }
}

function jupiterMintParams(req: QuoteRequest): { inputMint: string; outputMint: string } {
  const solChain = chainByKeyStrict("solana");
  return {
    inputMint: isNativeToken(solChain, req.tokenIn) ? SOLANA_NATIVE_MINT : req.tokenIn,
    outputMint: isNativeToken(solChain, req.tokenOut) ? SOLANA_NATIVE_MINT : req.tokenOut,
  };
}

/** Jupiter v2 quote — `/order` for price-only; `/build` when integrator fee applies. */
export async function quoteJupiter(
  chain: ChainInfo,
  dex: DexInfo,
  req: QuoteRequest,
  feeBps: number,
): Promise<RouteQuote | null> {
  if (chain.kind !== "solana" || !env.JUPITER_API_KEY) return null;
  try {
    const { inputMint, outputMint } = jupiterMintParams(req);

    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: req.amountIn,
      slippageBps: String(req.slippageBps),
    });
    if (feeBps > 0) {
      params.set("platformFeeBps", String(feeBps));
    }
    const data = await withTimeout(fetchJupiterOrder(params), HTTP_TIMEOUT_MS);
    const out = BigInt(String(data.outAmount ?? 0));
    const quote = shapeWithIntegratorFee(dex, out, req, 0);
    if (!quote) return null;
    quote.priceImpactBps = Math.round(Number(data.priceImpactPct ?? 0) * 10_000);
    return quote;
  } catch (err) {
    logger.debug({ dex: dex.id, err: (err as Error).message }, "jupiter quote failed");
    return null;
  }
}

/** Jupiter v2 `/build` — unsigned base64 VersionedTransaction for wallet signing. */
export async function buildJupiterSwap(
  req: QuoteRequest,
  userPublicKey: string,
  feeBps: number,
): Promise<string | null> {
  if (!env.JUPITER_API_KEY) {
    throw new Error("JUPITER_API_KEY required for Jupiter v2");
  }
  try {
    const { inputMint, outputMint } = jupiterMintParams(req);
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: req.amountIn,
      slippageBps: String(req.slippageBps),
      taker: userPublicKey,
    });
    if (feeBps > 0) {
      const feeWallet = solanaFeeWallet();
      const feeReady = await ensureSolanaFeeTokenAccountInitialized(outputMint);
      if (!feeReady) {
        throw new Error("SOLANA_FEE_ACCOUNT_REQUIRED");
      }
      params.set("platformFeeBps", String(feeBps));
      params.set("feeAccount", await solanaFeeTokenAccountForMint(feeWallet, outputMint));
    }

    const build = await withTimeout(fetchJupiterBuild(params), HTTP_TIMEOUT_MS);
    if (!build.swapInstruction) {
      throw new Error("jupiter v2 build returned no swap instruction");
    }
    return assembleJupiterSwapTx(build, userPublicKey);
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "jupiter swap build failed");
    throw err;
  }
}

export interface EvmSwapCalldata {
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
}

/** 1inch swap tx for wallet signing. */
export async function build1inchSwap(
  chain: ChainInfo,
  req: QuoteRequest,
  feeBps: number,
): Promise<EvmSwapCalldata | null> {
  if (!env.ONEINCH_API_KEY || !req.taker || chain.kind !== "evm") return null;
  try {
    const src = evmTokenParam(chain, req.tokenIn);
    const dst = evmTokenParam(chain, req.tokenOut);
    const slippage = req.slippageBps / 100;
    const fee = oneInchFeePercent(feeBps);
    const referrer = evmIntegratorFeeRecipient();
    let url =
      oneInchUrl(`/swap/v6.0/${chain.id}/swap`) +
      `?src=${src}&dst=${dst}&amount=${req.amountIn}&from=${req.taker}&slippage=${slippage}`;
    if (fee > 0) {
      url += `&fee=${fee}&referrer=${referrer}`;
    }
    const data = await getJson(url, { Authorization: `Bearer ${env.ONEINCH_API_KEY}` });
    const tx = data.tx;
    if (!tx?.to || !tx?.data) return null;
    return {
      to: tx.to as `0x${string}`,
      data: tx.data as `0x${string}`,
      value: tx.value ? String(tx.value) : "0",
    };
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "1inch swap build failed");
    return null;
  }
}

/** 0x swap tx for wallet signing. */
export async function build0xSwap(
  chain: ChainInfo,
  req: QuoteRequest,
  feeBps: number,
): Promise<EvmSwapCalldata | null> {
  if (!env.ZEROX_API_KEY || !req.taker || chain.kind !== "evm") return null;
  try {
    const sellToken = evmTokenParam(chain, req.tokenIn);
    const buyToken = evmTokenParam(chain, req.tokenOut);
    const recipient = evmIntegratorFeeRecipient();
    let url =
      `https://api.0x.org/swap/allowance-holder/quote?chainId=${chain.id}` +
      `&sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${req.amountIn}` +
      `&taker=${req.taker}&slippageBps=${req.slippageBps}`;
    if (feeBps > 0) {
      url += `&swapFeeRecipient=${recipient}&swapFeeBps=${feeBps}`;
    }
    const data = await getJson(url, { "0x-api-key": env.ZEROX_API_KEY, "0x-version": "v2" });
    const tx = data.transaction;
    if (!tx?.to || !tx?.data) return null;
    return {
      to: tx.to as `0x${string}`,
      data: tx.data as `0x${string}`,
      value: tx.value ? String(tx.value) : "0",
    };
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "0x swap build failed");
    return null;
  }
}

/** Build EVM meta-aggregator calldata for the selected route. */
export async function buildMetaEvmSwap(
  chainKey: string,
  route: RouteQuote,
  req: QuoteRequest,
  feeBps: number,
): Promise<EvmSwapCalldata | null> {
  const chain = chainByKeyStrict(chainKey);
  if (chain.kind !== "evm") return null;
  if (route.dexId.startsWith("1inch-")) return build1inchSwap(chain, req, feeBps);
  if (route.dexId.startsWith("0x-")) return build0xSwap(chain, req, feeBps);
  return null;
}

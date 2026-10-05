/**
 * Meteora DBC (Gold Curve) — create, quote, swap, fees, and graduation.
 *
 * Pre-graduation trades are built here. After the pool migrates to DAMM v2,
 * quotes return null and the existing Jupiter builder takes over.
 */
import BN from "bn.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  Connection,
  TransactionMessage,
  VersionedTransaction,
  type ConfirmedSignatureInfo,
  type Transaction,
} from "@solana/web3.js";
import { CpAmm } from "@meteora-ag/cp-amm-sdk";
import {
  ActivationType,
  BaseFeeMode,
  DynamicBondingCurveClient,
  SwapMode,
  U64_MAX,
  calculateFeeSchedulerEndingBaseFeeBps,
  deriveDammV2PoolAddress,
  deriveDbcPoolAddress,
  feeNumeratorToBps,
  getBaseFeeNumerator,
  getCurrentPoint,
  getPriceFromSqrtPrice,
  TokenDecimal,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import type { CurvePreset, CurveQuote, QuoteRequest, RouteQuote } from "@xauconnect/utils";
import { db } from "../db/client.js";
import { logger } from "../logger.js";
import { solanaRpcUrls, withSolanaConnection } from "./solana-rpc.js";
import {
  CREATOR_LOCKED_LP_PCT,
  CREATOR_TRADING_FEE_PCT,
  DAMM_V2_FEE_CONFIG,
  GOLD_CURVE_DECIMALS,
  PARTNER_LOCKED_LP_PCT,
  USDC_MINT,
  WSOL_MINT,
  goldCurveConfigAddress,
  goldCurveParameters,
  keeperThresholdRaw,
  presetForConfig,
  quoteDecimals,
  quoteMintFor,
  segmentNames,
} from "./gold-curve.js";

const APP_ORIGIN = "https://xauconnect.com";
const LOCKED_LP =
  "100% of the graduated DAMM v2 liquidity is permanently locked, split evenly between the creator and XAUConnect. Neither side can pull liquidity. Both can claim trading fees.";

export interface PreparedGoldCurve {
  solanaTransaction: string;
  mint: string;
  pool: string;
  config: string;
  quoteMint: string;
  metadataUrl: string;
}

export interface GoldCurveView {
  mint: string;
  pool: string;
  config: string;
  quoteMint: string;
  quoteSymbol: "SOL" | "USDC";
  quoteDecimals: number;
  preset: CurvePreset | "external";
  segment: string;
  segmentIndex: number;
  segmentCount: number;
  progress: number;
  raised: string;
  threshold: string;
  raisedRaw: string;
  thresholdRaw: string;
  feeBpsNow: number;
  feeBpsFinal: number;
  feeEndsAt: number | null;
  migrated: boolean;
  dammPool: string | null;
  feeClaimer: string;
  leftoverReceiver: string;
  creatorTradingFeePercentage: number;
  partnerLockedPct: number;
  creatorLockedPct: number;
  lockedLp: string;
}

export interface CreatorFeePool {
  pool: string;
  mint: string;
  symbol: string | null;
  name: string | null;
  quoteSymbol: "SOL" | "USDC";
  unclaimedBase: string;
  unclaimedQuote: string;
  migrated: boolean;
  preset: CurvePreset | "external" | null;
}

const metadataCache = new Map<string, Record<string, unknown>>();

export function rememberGoldCurveMetadata(mint: string, metadata: Record<string, unknown>): void {
  metadataCache.set(mint, metadata);
}

export function cachedGoldCurveMetadata(mint: string): Record<string, unknown> | null {
  return metadataCache.get(mint) ?? null;
}

async function withDbc<T>(
  fn: (client: DynamicBondingCurveClient, connection: Connection) => Promise<T>,
): Promise<T | null> {
  return withSolanaConnection(async (connection) => {
    const client = DynamicBondingCurveClient.create(connection, "confirmed");
    return fn(client, connection);
  });
}

function asNumber(value: { toNumber?: () => number } | number | bigint | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value.toNumber === "function") return value.toNumber();
  return Number(value ?? 0);
}

function toBaseUnits(amount: string, decimals: number): BN {
  const [whole = "0", frac = ""] = amount.split(".");
  const fraction = (frac + "0".repeat(decimals)).slice(0, decimals);
  return new BN(whole)
    .mul(new BN(10).pow(new BN(decimals)))
    .add(new BN(fraction || "0"));
}

async function versionedBase64(
  connection: Connection,
  tx: Transaction,
  feePayer: PublicKey,
  extraSigners: Keypair[] = [],
): Promise<string> {
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions: tx.instructions,
  }).compileToV0Message();
  const vtx = new VersionedTransaction(message);
  if (extraSigners.length) vtx.sign(extraSigners);
  return Buffer.from(vtx.serialize()).toString("base64");
}

export async function prepareGoldCurvePool(input: {
  preset: CurvePreset;
  quote: CurveQuote;
  creator: string;
  name: string;
  symbol: string;
  firstBuyAmount?: string;
}): Promise<PreparedGoldCurve> {
  const configAddress = goldCurveConfigAddress(input.preset, input.quote);
  if (!configAddress) {
    throw new Error("GOLD_CURVE_CONFIG_MISSING");
  }

  const creator = new PublicKey(input.creator);
  const config = new PublicKey(configAddress);
  const quoteMint = new PublicKey(quoteMintFor(input.quote));
  const baseMint = Keypair.generate();
  const pool = deriveDbcPoolAddress(quoteMint, baseMint.publicKey, config);
  const metadataUrl = `${APP_ORIGIN}/api/launchpad/meta/${baseMint.publicKey.toBase58()}`;
  if (metadataUrl.length > 200) throw new Error("Metadata URL exceeds the 200-character limit");

  const buyRaw =
    input.firstBuyAmount && Number(input.firstBuyAmount) > 0
      ? toBaseUnits(input.firstBuyAmount, quoteDecimals(input.quote))
      : null;
  const curveParams = goldCurveParameters(input.preset, input.quote);

  const prepared = await withDbc(async (client, connection) => {
    let minimumAmountOut = new BN(1);
    if (buyRaw) {
      try {
        const simulated = client.pool.getQuoteFromInputAmount({
          config: curveParams,
          swapBaseForQuote: false,
          amountIn: buyRaw,
          slippageBps: 500,
          currentPoint: new BN(Math.floor(Date.now() / 1000)),
        });
        if (simulated.minimumAmountOut && !simulated.minimumAmountOut.isZero()) {
          minimumAmountOut = simulated.minimumAmountOut;
        }
      } catch (err) {
        logger.debug({ err: (err as Error).message }, "gold curve first-buy quote skipped");
      }
    }
    const tx = buyRaw
      ? await client.creator.createPoolWithFirstBuy({
          createPoolParam: {
            name: input.name,
            symbol: input.symbol,
            uri: metadataUrl,
            payer: creator,
            poolCreator: creator,
            config,
            baseMint: baseMint.publicKey,
          },
          firstBuyParam: {
            buyer: creator,
            buyAmount: buyRaw,
            minimumAmountOut,
            referralTokenAccount: null,
          },
        })
      : await client.creator.createPool({
          name: input.name,
          symbol: input.symbol,
          uri: metadataUrl,
          payer: creator,
          poolCreator: creator,
          config,
          baseMint: baseMint.publicKey,
        });
    const solanaTransaction = await versionedBase64(connection, tx, creator, [baseMint]);
    return { solanaTransaction };
  });

  if (!prepared) throw new Error("SOLANA_RPC_UNAVAILABLE");

  return {
    solanaTransaction: prepared.solanaTransaction,
    mint: baseMint.publicKey.toBase58(),
    pool: pool.toBase58(),
    config: configAddress,
    quoteMint: quoteMint.toBase58(),
    metadataUrl,
  };
}

async function knownPoolAddress(mint: string): Promise<string | null> {
  if (!db) return null;
  const launch = await db.launch.findFirst({
    where: { poolAddress: { not: null }, token: { chainKey: "solana", address: mint } },
    select: { poolAddress: true },
  });
  if (launch?.poolAddress && !launch.poolAddress.includes(":")) return launch.poolAddress;
  const indexed = await db.indexedPool.findFirst({
    where: { chainKey: "solana", dexKey: "meteora-dbc", baseTokenAddress: mint },
    select: { poolAddress: true },
  });
  if (indexed?.poolAddress && !indexed.poolAddress.includes(":")) return indexed.poolAddress;
  const known = launch?.poolAddress || indexed?.poolAddress;
  return known ? "lookup" : null;
}

async function isKnownDbcMint(mint: string): Promise<boolean> {
  const marker = await knownPoolAddress(mint);
  return marker !== null;
}

async function resolvePoolAddress(
  client: DynamicBondingCurveClient,
  mint: string,
): Promise<string | null> {
  const known = await knownPoolAddress(mint);
  if (known && known !== "lookup") return known;
  if (!known) return null;
  const found = await client.state.getPoolByBaseMint(mint);
  return found?.publicKey.toBase58() ?? null;
}

function quoteSymbolOf(mint: string): "SOL" | "USDC" {
  return mint === USDC_MINT ? "USDC" : "SOL";
}

export async function quoteGoldCurve(req: QuoteRequest): Promise<RouteQuote | null> {
  if (req.chainKey !== "solana") return null;
  const outIsBase = await isKnownDbcMint(req.tokenOut);
  const inIsBase = outIsBase ? false : await isKnownDbcMint(req.tokenIn);
  if (!outIsBase && !inIsBase) return null;
  const baseMint = outIsBase ? req.tokenOut : req.tokenIn;
  const quoted = await withDbc(async (client, connection) => {
    const poolAddress = await resolvePoolAddress(client, baseMint);
    if (!poolAddress) return null;
    const pool = await client.state.getPool(poolAddress);
    if (!pool || asNumber(pool.poolState.isMigrated) === 1) return null;
    const config = await client.state.getPoolConfig(pool.poolState.config);
    if (!config) return null;
    const quoteMint = config.quoteMint.toBase58();
    const swapBaseForQuote = inIsBase;
    const other = swapBaseForQuote ? req.tokenOut : req.tokenIn;
    if (other !== quoteMint) return null;
    const currentPoint = await getCurrentPoint(connection, config.activationType as ActivationType);
    const quote = client.pool.swapQuote2({
      virtualPool: pool,
      config,
      swapBaseForQuote,
      hasReferral: false,
      eligibleForFirstSwapWithMinFee: false,
      currentPoint,
      slippageBps: req.slippageBps,
      swapMode: SwapMode.ExactIn,
      amountIn: new BN(req.amountIn),
    });
    const amountOut = quote.outputAmount.toString();
    if (amountOut === "0") return null;
    return {
      dexId: "meteora-dbc-solana",
      dexName: "Gold Curve",
      protocol: "solana-amm",
      amountOut,
      amountOutAfterFee: amountOut,
      protocolFee: "0",
      priceImpactBps: 0,
      path: [{ tokenIn: req.tokenIn, tokenOut: req.tokenOut }],
      simulated: false,
      executable: true,
    } satisfies RouteQuote;
  });
  return quoted;
}

export async function buildGoldCurveSwap(req: QuoteRequest, taker: string): Promise<string | null> {
  const outIsBase = await isKnownDbcMint(req.tokenOut);
  const inIsBase = outIsBase ? false : await isKnownDbcMint(req.tokenIn);
  if (!outIsBase && !inIsBase) return null;
  const baseMint = outIsBase ? req.tokenOut : req.tokenIn;
  return withDbc(async (client, connection) => {
    const poolAddress = await resolvePoolAddress(client, baseMint);
    if (!poolAddress) return null;
    const pool = await client.state.getPool(poolAddress);
    if (!pool || asNumber(pool.poolState.isMigrated) === 1) return null;
    const config = await client.state.getPoolConfig(pool.poolState.config);
    if (!config) return null;
    const swapBaseForQuote = inIsBase;
    const currentPoint = await getCurrentPoint(connection, config.activationType as ActivationType);
    const quoted = client.pool.swapQuote2({
      virtualPool: pool,
      config,
      swapBaseForQuote,
      hasReferral: false,
      eligibleForFirstSwapWithMinFee: false,
      currentPoint,
      slippageBps: req.slippageBps,
      swapMode: SwapMode.ExactIn,
      amountIn: new BN(req.amountIn),
    });
    const minimumAmountOut = quoted.minimumAmountOut ?? new BN(1);
    const owner = new PublicKey(taker);
    const tx = await client.pool.swap2({
      owner,
      pool: new PublicKey(poolAddress),
      swapBaseForQuote,
      referralTokenAccount: null,
      payer: owner,
      swapMode: SwapMode.ExactIn,
      amountIn: new BN(req.amountIn),
      minimumAmountOut,
    });
    return versionedBase64(connection, tx, owner);
  });
}

function activeSegment(
  sqrtPrice: BN,
  curve: Array<{ sqrtPrice: BN; liquidity: BN }>,
  names: string[],
): { index: number; name: string; count: number } {
  const points = curve.filter((point) => !point.liquidity.isZero());
  let index = 0;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!point) break;
    if (sqrtPrice.lt(point.sqrtPrice)) {
      index = i;
      break;
    }
    index = i;
  }
  const count = Math.max(names.length, 1);
  const clamped = Math.min(index, count - 1);
  return { index: clamped, name: names[clamped] ?? "Curve", count };
}

async function findDammPool(connection: Connection, base: PublicKey, quote: PublicKey): Promise<string | null> {
  const feeConfig = new PublicKey(DAMM_V2_FEE_CONFIG);
  const candidates = [
    deriveDammV2PoolAddress(feeConfig, base, quote),
    deriveDammV2PoolAddress(feeConfig, quote, base),
  ];
  const infos = await connection.getMultipleAccountsInfo(candidates);
  const hit = candidates.find((_, i) => infos[i] != null);
  return hit?.toBase58() ?? null;
}

export async function goldCurveState(mint: string): Promise<GoldCurveView | null> {
  return withDbc(async (client, connection) => {
    const poolAddress = await resolvePoolAddress(client, mint);
    if (!poolAddress) return null;
    const pool = await client.state.getPool(poolAddress);
    if (!pool) return null;
    const state = pool.poolState;
    const configPk = state.config;
    const config = await client.state.getPoolConfig(configPk);
    if (!config) return null;

    const matched = presetForConfig(configPk.toBase58());
    const preset: CurvePreset | "external" = matched?.preset ?? "external";
    const names = segmentNames(preset);
    const segment = activeSegment(new BN(state.sqrtPrice.toString()), config.curve, names);
    const quoteMint = config.quoteMint.toBase58();
    const decimals = quoteMint === USDC_MINT ? 6 : 9;
    const progress = await client.state.getPoolQuoteTokenCurveProgress(poolAddress);
    const migrated = asNumber(state.isMigrated) === 1 || asNumber(state.migrationProgress) >= 3;
    const currentPoint = await getCurrentPoint(connection, config.activationType as ActivationType);
    const baseFee = config.poolFees.baseFee;
    const feeNumerator = getBaseFeeNumerator(
      new BN(baseFee.cliffFeeNumerator.toString()),
      baseFee.firstFactor,
      new BN(baseFee.secondFactor.toString()),
      new BN(baseFee.thirdFactor.toString()),
      baseFee.baseFeeMode as BaseFeeMode,
      currentPoint,
      new BN(state.activationPoint.toString()),
    );
    const feeBpsNow = Math.round(feeNumeratorToBps(feeNumerator));
    const feeBpsFinal = Math.round(
      calculateFeeSchedulerEndingBaseFeeBps(
        Number(baseFee.cliffFeeNumerator.toString()),
        baseFee.firstFactor,
        Number(baseFee.secondFactor.toString()),
        Number(baseFee.thirdFactor.toString()),
        baseFee.baseFeeMode as BaseFeeMode,
      ),
    );
    const activation = asNumber(state.activationPoint);
    const periodSeconds = asNumber(baseFee.secondFactor);
    const feeEndsAt =
      baseFee.firstFactor > 0 && activation > 0 ? activation + baseFee.firstFactor * periodSeconds : null;
    const dammPool = migrated
      ? await findDammPool(connection, state.baseMint, config.quoteMint)
      : null;

    return {
      mint,
      pool: poolAddress,
      config: configPk.toBase58(),
      quoteMint,
      quoteSymbol: quoteSymbolOf(quoteMint),
      quoteDecimals: decimals,
      preset,
      segment: segment.name,
      segmentIndex: segment.index,
      segmentCount: names.length,
      progress: Number.isFinite(progress) ? progress : 0,
      raised: formatUnits(state.quoteReserve.toString(), decimals),
      threshold: formatUnits(config.migrationQuoteThreshold.toString(), decimals),
      raisedRaw: state.quoteReserve.toString(),
      thresholdRaw: config.migrationQuoteThreshold.toString(),
      feeBpsNow,
      feeBpsFinal,
      feeEndsAt,
      migrated,
      dammPool,
      feeClaimer: config.feeClaimer.toBase58(),
      leftoverReceiver: config.leftoverReceiver.toBase58(),
      creatorTradingFeePercentage: config.creatorTradingFeePercentage,
      partnerLockedPct: config.partnerPermanentLockedLiquidityPercentage || PARTNER_LOCKED_LP_PCT,
      creatorLockedPct: config.creatorPermanentLockedLiquidityPercentage || CREATOR_LOCKED_LP_PCT,
      lockedLp: LOCKED_LP,
    };
  });
}

export interface GoldCurveMarket {
  pool: string;
  priceUsd: number;
  liquidityUsd: number;
  /** Null when the swap scan did not finish. Callers keep the previous volume. */
  volume24hUsd: number | null;
  marketCapUsd: number;
  fdvUsd: number;
  /** Null when the pool is older than a day, so lifetime move is not a 24h change. */
  change24hPct: number | null;
  /** Null when a swap landed in the last hour and we have no hourly price. */
  change1hPct: number | null;
  holders: number | null;
}

const GOLD_MARKET_MS = 20_000;
const goldMarketCache = new Map<string, { at: number; market: GoldCurveMarket }>();
let solUsdCache: { at: number; usd: number } | null = null;

function spotPrice(sqrtPrice: BN, baseDecimals: number, quoteDecimals: number): number {
  const price = getPriceFromSqrtPrice(sqrtPrice, baseDecimals as TokenDecimal, quoteDecimals).toNumber();
  return Number.isFinite(price) ? price : 0;
}

async function solPriceUsd(): Promise<number> {
  if (solUsdCache && Date.now() - solUsdCache.at < 60_000) return solUsdCache.usd;
  try {
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${WSOL_MINT}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return solUsdCache?.usd ?? 0;
    const body = (await res.json()) as unknown;
    const pairs = Array.isArray(body) ? body : ((body as { pairs?: unknown[] }).pairs ?? []);
    let usd = 0;
    let liquidity = -1;
    for (const pair of pairs) {
      const row = pair as { priceUsd?: string; liquidity?: { usd?: number } };
      const price = Number(row.priceUsd ?? 0);
      const liq = Number(row.liquidity?.usd ?? 0);
      if (price > 0 && liq >= liquidity) {
        usd = price;
        liquidity = liq;
      }
    }
    if (usd > 0) solUsdCache = { at: Date.now(), usd };
    return usd;
  } catch {
    return solUsdCache?.usd ?? 0;
  }
}

type TokenBalanceRow = {
  accountIndex: number;
  mint: string;
  uiTokenAmount: { uiAmount: number | null; uiAmountString?: string | null };
};

function uiTokens(row: TokenBalanceRow | undefined): number {
  if (!row) return 0;
  if (row.uiTokenAmount.uiAmount != null) return row.uiTokenAmount.uiAmount;
  const parsed = Number(row.uiTokenAmount.uiAmountString ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Quote tokens that changed hands in one swap. Two equal legs count once. */
function quoteMoved(
  meta: { preTokenBalances?: TokenBalanceRow[] | null; postTokenBalances?: TokenBalanceRow[] | null },
  quoteMint: string,
): number {
  const post = meta.postTokenBalances ?? [];
  const pre = meta.preTokenBalances ?? [];
  const deltas: number[] = [];
  for (const row of post) {
    if (row.mint !== quoteMint) continue;
    const before = pre.find((item) => item.accountIndex === row.accountIndex);
    const delta = Math.abs(uiTokens(row) - uiTokens(before));
    if (delta > 0) deltas.push(delta);
  }
  if (deltas.length === 0) return 0;
  const max = Math.max(...deltas);
  const min = Math.min(...deltas);
  if (deltas.length > 1 && min > 0 && Math.abs(max - min) / max < 0.02) return max;
  return deltas.reduce((sum, n) => sum + n, 0);
}

async function curveSwapVolume(
  connection: Connection,
  pool: PublicKey,
  quoteMint: string,
): Promise<{ volumeQuote: number; known: boolean; tradedLastHour: boolean }> {
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 86_400;
  const signatures: ConfirmedSignatureInfo[] = [];
  let before: string | undefined;
  for (let page = 0; page < 5; page++) {
    const batch = await connection.getSignaturesForAddress(pool, { limit: 100, before });
    if (batch.length === 0) break;
    signatures.push(...batch);
    const oldest = batch[batch.length - 1]?.blockTime ?? 0;
    if (batch.length < 100 || oldest < dayAgo) break;
    before = batch[batch.length - 1]?.signature;
  }

  const day = signatures.filter((row) => !row.err && (row.blockTime ?? 0) >= dayAgo);
  let volumeQuote = 0;
  let parsed = 0;
  let tradedLastHour = false;
  const txs = await mapLimit(day, 6, async (row) => {
    try {
      const tx = await rawParsedTransaction(connection, row.signature);
      return { row, tx };
    } catch (err) {
      logger.debug({ err: (err as Error).message }, "curve swap tx skipped");
      return { row, tx: null };
    }
  });
  let missed = 0;
  for (const item of txs) {
    const tx = item?.tx;
    if (!tx?.meta) {
      missed += 1;
      continue;
    }
    if (tx.meta.err) continue;
    parsed += 1;
    const logs = (tx.meta.logMessages ?? []).join(" ");
    if (!logs.includes("Instruction: Swap")) continue;
    if ((item.row.blockTime ?? 0) >= now - 3_600) tradedLastHour = true;
    volumeQuote += quoteMoved(tx.meta, quoteMint);
  }
  if (day.length > 0 && (parsed === 0 || missed > 0)) {
    logger.warn(
      { pool: pool.toBase58(), signatures: day.length, parsed, missed },
      "curve swap scan was incomplete",
    );
  }
  return {
    volumeQuote,
    known: missed === 0 && (parsed > 0 || day.length === 0),
    tradedLastHour,
  };
}

async function rawParsedTransaction(
  connection: Connection,
  signature: string,
): Promise<{ meta?: { err: unknown; logMessages?: string[] | null; preTokenBalances?: TokenBalanceRow[] | null; postTokenBalances?: TokenBalanceRow[] | null } | null } | null> {
  const res = await fetch(connection.rpcEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 1 }],
    }),
    signal: AbortSignal.timeout(12_000),
  });
  const json = (await res.json()) as {
    error?: { message?: string };
    result?: { meta?: { err: unknown; logMessages?: string[] | null; preTokenBalances?: TokenBalanceRow[] | null; postTokenBalances?: TokenBalanceRow[] | null } | null } | null;
  };
  if (json.error) throw new Error(json.error.message ?? "getTransaction failed");
  return json.result ?? null;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) continue;
      out[index] = await fn(item);
    }
  });
  await Promise.all(workers);
  return out;
}

async function curveHolders(connection: Connection, mint: string, vault: string): Promise<number | null> {
  try {
    const largest = await connection.getTokenLargestAccounts(new PublicKey(mint));
    const positive = largest.value.filter((row) => (row.uiAmount ?? 0) > 0);
    if (positive.length < 20) {
      return positive.filter((row) => row.address.toBase58() !== vault).length;
    }
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "curve holder scan failed");
  }

  const url = solanaRpcUrls().find((item) => item.includes("helius"));
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccounts",
        params: { mint, limit: 1000, options: { showZeroBalance: false } },
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      result?: { token_accounts?: Array<{ address?: string; owner?: string; amount?: string }> };
    };
    const accounts = json.result?.token_accounts ?? [];
    const owners = new Set<string>();
    for (const account of accounts) {
      if (account.address === vault) continue;
      if (BigInt(account.amount ?? "0") <= 0n) continue;
      if (account.owner) owners.add(account.owner);
    }
    return owners.size;
  } catch {
    return null;
  }
}

/**
 * Spot price, quote sitting in the curve, and swap volume for a Gold Curve mint.
 * Returns null for tokens that are not one of our curves, and for pools that
 * have already migrated to DAMM v2.
 */
export async function goldCurveMarket(
  mint: string,
  hint?: { priceUsd?: number },
): Promise<GoldCurveMarket | null> {
  const hit = goldMarketCache.get(mint);
  if (hit && Date.now() - hit.at < GOLD_MARKET_MS) return hit.market;
  if (!(await knownPoolAddress(mint))) return null;

  let market: GoldCurveMarket | null = null;
  for (const url of [...solanaRpcUrls()].reverse()) {
    try {
      const connection = new Connection(url, "confirmed");
      const client = DynamicBondingCurveClient.create(connection, "confirmed");
      market = await (async () => {
    const poolAddress = await resolvePoolAddress(client, mint);
    if (!poolAddress) return null;
    const pool = await client.state.getPool(poolAddress);
    if (!pool) return null;
    const state = pool.poolState;
    if (asNumber(state.isMigrated) === 1) return null;
    const config = await client.state.getPoolConfig(state.config);
    if (!config) return null;

    const quoteMint = config.quoteMint.toBase58();
    const quoteDec = quoteMint === USDC_MINT ? 6 : 9;
    const supplyInfo = await connection.getTokenSupply(state.baseMint);
    const baseDec = supplyInfo.value.decimals;
    const supplyRaw = BigInt(supplyInfo.value.amount);
    const baseRaw = BigInt(state.baseReserve.toString());
    const scale = 10 ** baseDec;
    const supplyTokens = Number(supplyRaw) / scale;
    const circulating = Math.max(0, (Number(supplyRaw) - Number(baseRaw)) / scale);
    const spot = spotPrice(new BN(state.sqrtPrice.toString()), baseDec, quoteDec);
    const startSqrt = config.sqrtStartPrice;
    const start = startSqrt ? spotPrice(new BN(startSqrt.toString()), baseDec, quoteDec) : spot;
    if (!(spot > 0)) return null;

    let quoteUsd = quoteMint === USDC_MINT ? 1 : await solPriceUsd();
    if (!(quoteUsd > 0) && hint?.priceUsd && hint.priceUsd > 0) quoteUsd = hint.priceUsd / spot;
    if (!(quoteUsd > 0)) return null;

    const quoteInCurve = Number(formatUnits(state.quoteReserve.toString(), quoteDec));
    let volumeQuote = 0;
    let volumeKnown = false;
    let tradedLastHour = false;
    try {
      const volume = await curveSwapVolume(connection, new PublicKey(poolAddress), quoteMint);
      volumeQuote = volume.volumeQuote;
      volumeKnown = volume.known;
      tradedLastHour = volume.tradedLastHour;
    } catch (err) {
      logger.debug({ err: (err as Error).message, mint }, "curve volume scan failed");
    }

    const activation = asNumber(state.activationPoint);
    const ageSec = activation > 1_000_000_000 ? Math.floor(Date.now() / 1000) - activation : Number.POSITIVE_INFINITY;
    const priceUsd = spot * quoteUsd;
    const holders = await curveHolders(connection, mint, state.baseVault.toBase58());

    const change24hPct =
      ageSec <= 86_400 && start > 0 ? ((spot - start) / start) * 100 : null;

    return {
      pool: poolAddress,
      priceUsd,
      liquidityUsd: quoteInCurve * quoteUsd,
      volume24hUsd: volumeKnown ? volumeQuote * quoteUsd : null,
      marketCapUsd: circulating * priceUsd,
      fdvUsd: supplyTokens * priceUsd,
      change24hPct: change24hPct != null && Number.isFinite(change24hPct) && Math.abs(change24hPct) < 1_000
        ? change24hPct
        : null,
      change1hPct: tradedLastHour ? null : 0,
      holders,
    } satisfies GoldCurveMarket;
      })();
      break;
    } catch (err) {
      logger.debug({ err: (err as Error).message, mint }, "gold curve market rpc failed");
    }
  }

  if (market?.volume24hUsd != null) goldMarketCache.set(mint, { at: Date.now(), market });
  return market;
}

export function formatUnits(raw: string, decimals: number): string {
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const frac = padded.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

export async function creatorFeePools(creator: string): Promise<CreatorFeePool[]> {
  const listed = await withDbc(async (client) => {
    const fees = await client.state.getPoolsFeesByCreator(creator);
    const rows: CreatorFeePool[] = [];
    for (const fee of fees) {
      const pool = await client.state.getPool(fee.poolAddress);
      if (!pool) continue;
      const config = await client.state.getPoolConfig(pool.poolState.config);
      const mint = pool.poolState.baseMint.toBase58();
      const quoteMint = config?.quoteMint.toBase58() ?? WSOL_MINT;
      const preset = config ? (presetForConfig(pool.poolState.config.toBase58())?.preset ?? "external") : null;
      let symbol: string | null = null;
      let name: string | null = null;
      if (db) {
        const token = await db.token.findUnique({
          where: { chainKey_address: { chainKey: "solana", address: mint } },
          select: { symbol: true, name: true },
        });
        symbol = token?.symbol ?? null;
        name = token?.name ?? null;
      }
      rows.push({
        pool: fee.poolAddress.toBase58(),
        mint,
        symbol,
        name,
        quoteSymbol: quoteSymbolOf(quoteMint),
        unclaimedBase: fee.creatorBaseFee.toString(),
        unclaimedQuote: fee.creatorQuoteFee.toString(),
        migrated: asNumber(pool.poolState.isMigrated) === 1,
        preset,
      });
    }
    return rows;
  });
  return listed ?? [];
}

export async function buildCreatorClaim(input: {
  creator: string;
  pool: string;
  kind: "trading" | "surplus" | "locked-lp";
}): Promise<string> {
  const creator = new PublicKey(input.creator);
  const pool = new PublicKey(input.pool);
  const built = await withDbc(async (client, connection) => {
    if (input.kind === "surplus") {
      const tx = await client.creator.creatorWithdrawSurplus({ creator, pool });
      return versionedBase64(connection, tx, creator);
    }
    if (input.kind === "locked-lp") {
      const tx = await claimLockedLpFee(client, connection, creator, pool);
      return versionedBase64(connection, tx, creator);
    }
    const tx = await client.creator.claimCreatorTradingFeeToReceiver({
      creator,
      payer: creator,
      pool,
      maxBaseAmount: U64_MAX,
      maxQuoteAmount: U64_MAX,
      receiver: creator,
    });
    return versionedBase64(connection, tx, creator);
  });
  if (!built) throw new Error("SOLANA_RPC_UNAVAILABLE");
  return built;
}

async function claimLockedLpFee(
  client: DynamicBondingCurveClient,
  connection: Connection,
  creator: PublicKey,
  pool: PublicKey,
): Promise<Transaction> {
  const virtual = await client.state.getPool(pool);
  if (!virtual) throw new Error("POOL_NOT_FOUND");
  if (asNumber(virtual.poolState.isMigrated) !== 1 && asNumber(virtual.poolState.migrationProgress) < 3) {
    throw new Error("LOCKED_LP_FEES_START_AFTER_GRADUATION");
  }
  const config = await client.state.getPoolConfig(virtual.poolState.config);
  if (!config) throw new Error("CONFIG_NOT_FOUND");
  const dammPool = await findDammPool(connection, virtual.poolState.baseMint, config.quoteMint);
  if (!dammPool) throw new Error("DAMM_POOL_NOT_FOUND");

  const cp = new CpAmm(connection);
  const dammKey = new PublicKey(dammPool);
  const poolState = await cp.fetchPoolState(dammKey);
  const positions = await cp.getUserPositionByPool(dammKey, creator);
  const hit = positions[0];
  if (!hit) throw new Error("NO_LOCKED_POSITION_FOR_CREATOR");
  return cp.claimPositionFee({
    owner: creator,
    pool: dammKey,
    position: hit.position,
    positionNftAccount: hit.positionNftAccount,
    tokenAMint: poolState.tokenAMint,
    tokenBMint: poolState.tokenBMint,
    tokenAVault: poolState.tokenAVault,
    tokenBVault: poolState.tokenBVault,
    tokenAProgram: TOKEN_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
    receiver: creator,
    feePayer: creator,
  });
}

export async function markGraduatedGoldCurves(): Promise<void> {
  if (!db) return;
  const rows = await db.launch.findMany({
    where: { status: "DEPLOYED", poolAddress: { not: null }, token: { chainKey: "solana" } },
    select: { id: true, poolAddress: true },
    take: 30,
  });
  if (rows.length === 0) return;
  await withDbc(async (client) => {
    for (const row of rows) {
      if (!row.poolAddress) continue;
      try {
        const pool = await client.state.getPool(row.poolAddress);
        if (!pool) continue;
        const raised = pool.poolState.quoteReserve.toString();
        const migrated =
          asNumber(pool.poolState.isMigrated) === 1 || asNumber(pool.poolState.migrationProgress) >= 3;
        await db!.launch.update({
          where: { id: row.id },
          data: migrated
            ? { status: "GRADUATED", graduatedAt: new Date(), curveNativeRaised: raised }
            : { curveNativeRaised: raised },
        });
      } catch (err) {
        logger.debug({ err: (err as Error).message, pool: row.poolAddress }, "gold curve graduation check failed");
      }
    }
  });
}

export const GOLD_CURVE_TOKEN_DECIMALS = GOLD_CURVE_DECIMALS;
export const GOLD_CURVE_CREATOR_FEE_PCT = CREATOR_TRADING_FEE_PCT;

export function expectedKeeperThreshold(quote: CurveQuote): string {
  return keeperThresholdRaw(quote);
}

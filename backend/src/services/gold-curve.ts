/**
 * Gold Curve — three published Meteora DBC partner configs.
 *
 * Fair: one segment, fixed 1% fee.
 * Shield: one segment, 50% cliff decaying to 1% over 10 minutes.
 * Distribute: three segments (fast, deep, steep), fixed 1% fee.
 *
 * Graduation thresholds are exactly 10 SOL and 750 USDC so Meteora keepers
 * auto-migrate into DAMM v2. A custom threshold never migrates.
 */
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import { PROTOCOL_WALLETS } from "@xauconnect/utils";
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  TokenAuthorityOption,
  TokenDecimal,
  TokenType,
  buildCurve,
  buildCurveWithCustomSqrtPrices,
  createSqrtPrices,
  validateConfigParameters,
  type ConfigParameters,
  type FeeConfig,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import type { CurvePreset, CurveQuote } from "@xauconnect/utils";
import { env } from "../config.js";

export const DBC_PROGRAM_ID = "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
export const WSOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
/** DAMM v2 100 bps fee option. Keepers migrate into this config. */
export const DAMM_V2_FEE_CONFIG = "Hv8Lmzmnju6m7kcokVKvwqz7QPmdX9XfKjJsXz8RXcjp";

export const GOLD_CURVE_SUPPLY = 1_000_000_000;
export const GOLD_CURVE_DECIMALS = 6;
/** Whole tokens held back for the disclosed leftover receiver. 0.1% of supply. */
const LEFTOVER_TOKENS = 1_000_000;
/** Share of supply that migrates into the locked DAMM v2 pool. */
const MIGRATION_SUPPLY_PCT = 20;
export const CREATOR_TRADING_FEE_PCT = 50;
export const PARTNER_LOCKED_LP_PCT = 50;
export const CREATOR_LOCKED_LP_PCT = 50;

/** Shield: 50% → 1% across 10 one-minute steps. */
export const SHIELD_START_FEE_BPS = 5000;
export const SHIELD_END_FEE_BPS = 100;
export const SHIELD_PERIODS = 10;
export const SHIELD_DURATION_SEC = 600;
export const FIXED_FEE_BPS = 100;

const SOL_THRESHOLD_LAMPORTS = 10_000_000_000;
const USDC_THRESHOLD_BASE = 750_000_000;

const ENV_KEY = {
  fair_sol: "DBC_CONFIG_FAIR_SOL",
  fair_usdc: "DBC_CONFIG_FAIR_USDC",
  shield_sol: "DBC_CONFIG_SHIELD_SOL",
  shield_usdc: "DBC_CONFIG_SHIELD_USDC",
  distribute_sol: "DBC_CONFIG_DISTRIBUTE_SOL",
  distribute_usdc: "DBC_CONFIG_DISTRIBUTE_USDC",
} as const;

export type GoldCurveKey = keyof typeof ENV_KEY;

export function curveKey(preset: CurvePreset, quote: CurveQuote): GoldCurveKey {
  return `${preset}_${quote}`;
}

export function goldCurveConfigAddress(preset: CurvePreset, quote: CurveQuote): string | null {
  const raw = env[ENV_KEY[curveKey(preset, quote)]];
  const value = raw?.trim();
  return value && value.length >= 32 ? value : null;
}

export function presetForConfig(address: string): { preset: CurvePreset; quote: CurveQuote } | null {
  const keys = Object.keys(ENV_KEY) as GoldCurveKey[];
  for (const key of keys) {
    const raw = env[ENV_KEY[key]]?.trim();
    if (raw && raw === address) {
      const [preset, quote] = key.split("_") as [CurvePreset, CurveQuote];
      return { preset, quote };
    }
  }
  return null;
}

export function quoteMintFor(quote: CurveQuote): string {
  return quote === "sol" ? WSOL_MINT : USDC_MINT;
}

export function quoteDecimals(quote: CurveQuote): number {
  return quote === "sol" ? 9 : 6;
}

export function keeperThresholdRaw(quote: CurveQuote): string {
  return quote === "sol" ? String(SOL_THRESHOLD_LAMPORTS) : String(USDC_THRESHOLD_BASE);
}

export function segmentNames(preset: CurvePreset | "external"): string[] {
  if (preset === "distribute") return ["Discovery", "Middle", "Last mile"];
  if (preset === "shield") return ["Shield"];
  if (preset === "fair") return ["Even"];
  return ["Curve"];
}

function fixedFee(): FeeConfig {
  return {
    baseFeeParams: {
      baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
      feeSchedulerParam: {
        startingFeeBps: FIXED_FEE_BPS,
        endingFeeBps: FIXED_FEE_BPS,
        numberOfPeriod: 0,
        totalDuration: 0,
      },
    },
    dynamicFeeEnabled: false,
    collectFeeMode: CollectFeeMode.QuoteToken,
    creatorTradingFeePercentage: CREATOR_TRADING_FEE_PCT,
    poolCreationFee: 0,
    enableFirstSwapWithMinFee: false,
  };
}

function shieldFee(): FeeConfig {
  return {
    baseFeeParams: {
      baseFeeMode: BaseFeeMode.FeeSchedulerExponential,
      feeSchedulerParam: {
        startingFeeBps: SHIELD_START_FEE_BPS,
        endingFeeBps: SHIELD_END_FEE_BPS,
        numberOfPeriod: SHIELD_PERIODS,
        totalDuration: SHIELD_DURATION_SEC,
      },
    },
    dynamicFeeEnabled: false,
    collectFeeMode: CollectFeeMode.QuoteToken,
    creatorTradingFeePercentage: CREATOR_TRADING_FEE_PCT,
    poolCreationFee: 0,
    enableFirstSwapWithMinFee: false,
  };
}

function baseParams(quote: CurveQuote, fee: FeeConfig) {
  return {
    token: {
      tokenType: TokenType.SPLToken,
      tokenBaseDecimal: TokenDecimal.SIX,
      tokenQuoteDecimal: quoteDecimals(quote),
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: GOLD_CURVE_SUPPLY,
      leftover: LEFTOVER_TOKENS,
    },
    fee,
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.FixedBps100,
      migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
    },
    liquidityDistribution: {
      partnerPermanentLockedLiquidityPercentage: PARTNER_LOCKED_LP_PCT,
      partnerLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: CREATOR_LOCKED_LP_PCT,
      creatorLiquidityPercentage: 0,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: ActivationType.Timestamp,
  };
}

/**
 * Three-segment curve whose natural quote capacity is at least the keeper
 * threshold. The stored threshold is then pinned to exactly 10 SOL / 750 USDC
 * so a keeper migrates the pool. Pinning below the curve's capacity migrates
 * slightly before the last price; pinning above it would leave the pool stuck.
 */
function distributeCurve(quote: CurveQuote): ConfigParameters {
  const decimals = quoteDecimals(quote);
  const target = quote === "sol" ? SOL_THRESHOLD_LAMPORTS : USDC_THRESHOLD_BASE;
  let lo = quote === "sol" ? 1e-8 : 1e-6;
  let hi = quote === "sol" ? 1e-3 : 1e-1;
  let best: ConfigParameters | null = null;
  let bestGot = 0;

  for (let i = 0; i < 48; i++) {
    const end = (lo + hi) / 2;
    const prices = [end / 40, end / 10, end / 2.5, end];
    const built = buildCurveWithCustomSqrtPrices({
      ...baseParams(quote, fixedFee()),
      sqrtPrices: createSqrtPrices(prices, TokenDecimal.SIX, decimals),
      liquidityWeights: [1, 4, 1],
    });
    const got = Number(built.migrationQuoteThreshold.toString());
    if (!best || Math.abs(got - target) < Math.abs(bestGot - target)) {
      best = built;
      bestGot = got;
    }
    if (got === target) return built;
    if (got < target) lo = end;
    else hi = end;
  }

  if (!best || bestGot < target) {
    throw new Error(
      `Distribute ${quote} curve raised ${bestGot} quote base units, under the keeper threshold ${target}`,
    );
  }
  best.migrationQuoteThreshold = new BN(target);
  return best;
}

const built = new Map<string, ConfigParameters>();

export function goldCurveParameters(preset: CurvePreset, quote: CurveQuote): ConfigParameters {
  const key = curveKey(preset, quote);
  const cached = built.get(key);
  if (cached) return cached;

  const params =
    preset === "distribute"
      ? distributeCurve(quote)
      : buildCurve({
          ...baseParams(quote, preset === "shield" ? shieldFee() : fixedFee()),
          percentageSupplyOnMigration: MIGRATION_SUPPLY_PCT,
          migrationQuoteThreshold: quote === "sol" ? 10 : 750,
        });

  const partner = new PublicKey(PROTOCOL_WALLETS.feeCollectorSolana);
  validateConfigParameters({
    ...params,
    feeClaimer: partner,
    leftoverReceiver: partner,
    quoteMint: new PublicKey(quoteMintFor(quote)),
    payer: partner,
  } as Parameters<typeof validateConfigParameters>[0]);
  const threshold = params.migrationQuoteThreshold.toString();
  const expected = keeperThresholdRaw(quote);
  if (threshold !== expected) {
    throw new Error(`Gold Curve ${key} threshold ${threshold} is not the keeper amount ${expected}`);
  }
  built.set(key, params);
  return params;
}

export function assertGoldCurvesBuild(): void {
  const presets: CurvePreset[] = ["fair", "shield", "distribute"];
  const quotes: CurveQuote[] = ["sol", "usdc"];
  for (const preset of presets) {
    for (const quote of quotes) goldCurveParameters(preset, quote);
  }
}

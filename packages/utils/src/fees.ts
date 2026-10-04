/**
 * XAUConnect — Protocol fee math (mirrors FeeCollector.sol semantics).
 *
 * All fees are expressed in basis points (bps): 1 bps = 0.01%.
 * Swap fee window: 0–10_000 bps (0–100%). LP fee default: 10 bps. Curve fee: 100 bps.
 * On-chain FeeCollector.sol still enforces its own bounds until redeployed; the
 * admin dashboard + backend quoting honour the full 0–100% range.
 */

export const BPS_DENOMINATOR = 10_000n;

/** Protocol-wide fee bounds for hot-config (admin + backend quoting). */
export const SWAP_FEE_MIN_BPS = 0;
export const SWAP_FEE_MAX_BPS = 10_000;
export const SWAP_FEE_DEFAULT_BPS = 30;
/** Default integrator levy before own contracts — Solana via Jupiter. */
export const JUPITER_PLATFORM_FEE_BPS_DEFAULT = 500;
/** Default integrator levy before own contracts — EVM via 1inch / 0x. */
export const EVM_INTEGRATOR_FEE_BPS_DEFAULT = 300;
export const LP_FEE_DEFAULT_BPS = 10;
export const CURVE_FEE_BPS = 100;

export type FeeKind = "swap" | "lp" | "launch" | "listing" | "curve" | "graduation";

export interface FeeResult {
  /** Amount captured by the protocol. */
  fee: bigint;
  /** Amount remaining after the fee. */
  net: bigint;
  bps: number;
}

/** Deduct `bps` from `amount`, floor division (matches Solidity). */
export function applyFeeBps(amount: bigint, bps: number): FeeResult {
  if (bps < 0 || bps > 10_000) throw new RangeError(`fee bps out of range: ${bps}`);
  const fee = (amount * BigInt(bps)) / BPS_DENOMINATOR;
  return { fee, net: amount - fee, bps };
}

/** Clamp a configured swap fee into the protocol's allowed window. */
export function clampSwapFeeBps(bps: number): number {
  return Math.min(SWAP_FEE_MAX_BPS, Math.max(SWAP_FEE_MIN_BPS, Math.round(bps)));
}

/** Chain-default swap levy for API integrator paths (5% Solana, 3% EVM). */
export function defaultSwapFeeBpsForChain(chainKey: string): number {
  return chainKey === "solana" ? JUPITER_PLATFORM_FEE_BPS_DEFAULT : EVM_INTEGRATOR_FEE_BPS_DEFAULT;
}

/** Gross output from net after an integrator fee (floor division). */
export function grossFromNetAfterFee(net: bigint, feeBps: number): bigint {
  if (feeBps <= 0) return net;
  return (net * BPS_DENOMINATOR) / (BPS_DENOMINATOR - BigInt(feeBps));
}

/** Minimum output after slippage tolerance, floor division. */
export function minOutAfterSlippage(amountOut: bigint, slippageBps: number): bigint {
  if (slippageBps < 0 || slippageBps > 10_000) {
    throw new RangeError(`slippage bps out of range: ${slippageBps}`);
  }
  return (amountOut * (BPS_DENOMINATOR - BigInt(slippageBps))) / BPS_DENOMINATOR;
}

/**
 * Price impact in bps given a spot (mid) price expectation vs. executed price.
 * Positive = the trade executes worse than spot.
 */
export function priceImpactBps(expectedOut: bigint, actualOut: bigint): number {
  if (expectedOut <= 0n) return 0;
  const diff = expectedOut - actualOut;
  if (diff <= 0n) return 0;
  return Number((diff * BPS_DENOMINATOR) / expectedOut);
}

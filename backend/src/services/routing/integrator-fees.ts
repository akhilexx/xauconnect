/**
 * Integrator fee recipients and 1inch/0x/Jupiter param helpers.
 */
import {
  defaultSwapFeeBpsForChain,
  PROTOCOL_WALLETS,
  clampSwapFeeBps,
} from "@xauconnect/utils";
import { env } from "../../config.js";

export function evmIntegratorFeeRecipient(): string {
  return env.PROTOCOL_FEE_COLLECTOR_EVM ?? PROTOCOL_WALLETS.feeCollectorEvm;
}

export function solanaFeeWallet(): string {
  return env.SOLANA_FEE_WALLET ?? PROTOCOL_WALLETS.feeCollectorSolana;
}

/** Env fallback when DB config is absent (5% Solana, 3% EVM). */
export function envIntegratorFeeBps(chainKey: string): number {
  if (chainKey === "solana") {
    return clampSwapFeeBps(env.JUPITER_PLATFORM_FEE_BPS ?? defaultSwapFeeBpsForChain(chainKey));
  }
  return clampSwapFeeBps(env.EVM_INTEGRATOR_FEE_BPS ?? defaultSwapFeeBpsForChain(chainKey));
}

/** 1inch `fee` query param is percent (3 = 3%), capped at 3 by their API. */
export function oneInchFeePercent(feeBps: number): number {
  return Math.min(3, feeBps / 100);
}

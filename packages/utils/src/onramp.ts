/**
 * XAUConnect — Fiat on-ramp / off-ramp (Buy & Sell crypto) shared contract.
 *
 * XAUConnect never touches card data or holds fiat. Card authorization,
 * Apple Pay / Google Pay, KYC/AML and fiat settlement are handled by a licensed
 * aggregator (Onramper → MoonPay, Transak, Banxa, Stripe, Guardarian, …). We
 * surface our own Liquid-Glass quote UI, add a transparent partner fee, and hand
 * off to the provider's PCI-compliant hosted checkout for payment.
 *
 * Types here are shared by the backend (proxy validation), SDK, and web app.
 */
import { z } from "zod";

export type OnrampType = "buy" | "sell";

/**
 * Map an XAUConnect chain key → Onramper crypto-network id.
 * Used to scope the buy/sell experience to the chains we support and to
 * pre-fill the connected wallet address on the correct network.
 */
export const ONRAMP_NETWORK_BY_CHAIN: Record<string, string> = {
  ethereum: "ethereum",
  bsc: "bsc",
  polygon: "polygon",
  arbitrum: "arbitrum",
  base: "base",
  avalanche: "avaxc",
  solana: "solana",
};

export const ONRAMP_CHAIN_BY_NETWORK: Record<string, string> = Object.fromEntries(
  Object.entries(ONRAMP_NETWORK_BY_CHAIN).map(([chain, network]) => [network, chain]),
);

/** The chains we expose for fiat buy/sell (must have a network mapping). */
export const ONRAMP_CHAIN_KEYS = Object.keys(ONRAMP_NETWORK_BY_CHAIN);

/**
 * Partner-fee (our markup) percentage for a given chain, derived from the
 * platform swap-fee bps. "Match swap fees" → 3% on EVM, 5% on Solana.
 * Onramper expects `partnerFee` as a percentage number (clamped to its max).
 */
export const ONRAMP_PARTNER_FEE_MAX_PCT = 5;

export function onrampFeePctForChain(
  chainKey: string,
  feeBpsByChain?: Record<string, number>,
): number {
  const bps =
    feeBpsByChain?.[chainKey] ?? (chainKey === "solana" ? 500 : 300);
  return Math.min(ONRAMP_PARTNER_FEE_MAX_PCT, Math.max(0, bps / 100));
}

// ─── Geo / defaults ───────────────────────────────────────────────────────────

export const OnrampGeoSchema = z.object({
  /** ISO-3166 alpha-2, uppercase (e.g. "US", "IN", "GB"). */
  country: z.string().length(2).nullable(),
  /** Best-guess local fiat currency code (e.g. "USD", "INR"). */
  currency: z.string().nullable(),
  /** True when detected from a request header rather than defaulted. */
  detected: z.boolean(),
});
export type OnrampGeo = z.infer<typeof OnrampGeoSchema>;

export const OnrampDefaultsSchema = z.object({
  country: z.string().nullable(),
  /** Recommended default fiat currency for the country. */
  fiat: z.string(),
  /** Recommended default crypto id (Onramper id, e.g. "eth", "usdc_solana"). */
  crypto: z.string(),
  /** Recommended default fiat amount. */
  amount: z.number(),
  /** Recommended default payment method id (e.g. "creditcard", "applepay"). */
  paymentMethod: z.string(),
});
export type OnrampDefaults = z.infer<typeof OnrampDefaultsSchema>;

// ─── Assets & payment methods ──────────────────────────────────────────────────

export const OnrampPaymentMethodSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
});
export type OnrampPaymentMethod = z.infer<typeof OnrampPaymentMethodSchema>;

export const OnrampAssetSchema = z.object({
  /** Onramper crypto id (e.g. "eth", "usdc", "usdc_polygon"). */
  id: z.string(),
  code: z.string(),
  name: z.string(),
  /** Onramper network id (e.g. "ethereum", "solana"). */
  network: z.string().optional(),
  /** Mapped XAUConnect chain key when the network is one we support. */
  chainKey: z.string().optional(),
  icon: z.string().optional(),
  decimals: z.number().optional(),
});
export type OnrampAsset = z.infer<typeof OnrampAssetSchema>;

export const OnrampFiatSchema = z.object({
  code: z.string(),
  name: z.string().optional(),
  icon: z.string().optional(),
});
export type OnrampFiat = z.infer<typeof OnrampFiatSchema>;

// ─── Quote ─────────────────────────────────────────────────────────────────────

export const OnrampQuoteRequestSchema = z.object({
  type: z.enum(["buy", "sell"]).default("buy"),
  /** Fiat currency code (e.g. "USD"). */
  fiat: z.string().min(2).max(8),
  /** Onramper crypto id (e.g. "eth"). */
  crypto: z.string().min(1).max(40),
  /** Amount of the source currency (fiat for buy, crypto for sell). */
  amount: z.number().positive(),
  paymentMethod: z.string().optional(),
  /** ISO country override; auto-detected server-side when omitted. */
  country: z.string().length(2).optional(),
  /** Destination wallet (buy) — required to surface an executable quote. */
  walletAddress: z.string().optional(),
});
export type OnrampQuoteRequest = z.infer<typeof OnrampQuoteRequestSchema>;

export const OnrampQuoteSchema = z.object({
  /** Provider id chosen as the best route (e.g. "moonpay"). */
  provider: z.string(),
  type: z.enum(["buy", "sell"]),
  fiat: z.string(),
  crypto: z.string(),
  /** Fiat the user pays (buy) or receives (sell). */
  fiatAmount: z.number(),
  /** Crypto the user receives (buy) or sells (sell). */
  cryptoAmount: z.number(),
  /** Provider exchange rate (crypto per 1 fiat or vice-versa). */
  rate: z.number(),
  networkFee: z.number().default(0),
  transactionFee: z.number().default(0),
  /** Our partner markup, denominated in fiat. */
  partnerFeeFiat: z.number().default(0),
  partnerFeePct: z.number().default(0),
  paymentMethod: z.string(),
  availablePaymentMethods: z.array(OnrampPaymentMethodSchema).default([]),
  quoteId: z.string().optional(),
  recommendations: z.array(z.string()).default([]),
});
export type OnrampQuote = z.infer<typeof OnrampQuoteSchema>;

export const OnrampQuotesResponseSchema = z.object({
  best: OnrampQuoteSchema.nullable(),
  quotes: z.array(OnrampQuoteSchema),
  quotedAt: z.number(),
});
export type OnrampQuotesResponse = z.infer<typeof OnrampQuotesResponseSchema>;

// ─── Checkout (hand-off to provider hosted page) ────────────────────────────────

export const OnrampCheckoutRequestSchema = z.object({
  type: z.enum(["buy", "sell"]).default("buy"),
  provider: z.string().min(1),
  fiat: z.string().min(2).max(8),
  crypto: z.string().min(1).max(40),
  amount: z.number().positive(),
  paymentMethod: z.string().min(1),
  /** Destination crypto wallet (buy) or source wallet (sell). */
  walletAddress: z.string().optional(),
  /** Onramper network id for the crypto. */
  network: z.string().optional(),
  email: z.string().email().optional(),
  country: z.string().length(2).optional(),
});
export type OnrampCheckoutRequest = z.infer<typeof OnrampCheckoutRequestSchema>;

export const OnrampCheckoutResponseSchema = z.object({
  transactionId: z.string(),
  /** Hosted provider URL to render in an iframe or redirect the user to. */
  url: z.string(),
  /** "iframe" | "redirect" — how the provider expects to be opened. */
  redirectType: z.enum(["iframe", "redirect"]).default("redirect"),
});
export type OnrampCheckoutResponse = z.infer<typeof OnrampCheckoutResponseSchema>;

// ─── Service availability ────────────────────────────────────────────────────

export const OnrampConfigSchema = z.object({
  /** False until a fiat provider (Transak / Onramper) is configured on the backend. */
  enabled: z.boolean(),
  modes: z.array(z.enum(["buy", "sell"])),
  /** Active provider id, e.g. "transak" | "onramper". */
  provider: z.string().optional(),
  /** Active provider display label. */
  providerLabel: z.string().optional(),
  /** Onramper widget host for direct-widget fallback. */
  widgetHost: z.string().optional(),
  /** Public (publishable) Onramper key for client-side widget URLs. */
  publishableKey: z.string().optional(),
});
export type OnrampConfig = z.infer<typeof OnrampConfigSchema>;

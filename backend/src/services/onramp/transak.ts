/**
 * Transak adapter — fiat on-ramp / off-ramp (Buy & Sell crypto).
 *
 * Transak is the Merchant of Record: it handles card authorization, Apple Pay /
 * Google Pay, KYC/AML and fiat settlement, and delivers the purchased crypto
 * straight to the user's own wallet (non-custodial). A staging API key is issued
 * instantly on signup (no KYB) so the full flow can be built + tested today;
 * production keys unlock after a one-time KYB.
 *
 * Public, key-only endpoints used here:
 *   GET /api/v1/pricing/public/quotes              — live price + fees
 *   GET /cryptocoverage/api/v1/public/crypto-currencies
 *   GET /fiat/public/v1/currencies/fiat-currencies
 * Checkout is a hand-off to the hosted widget URL (global[-stg].transak.com).
 */
import {
  ONRAMP_CHAIN_BY_NETWORK,
  type OnrampAsset,
  type OnrampDefaults,
  type OnrampFiat,
  type OnrampPaymentMethod,
  type OnrampQuote,
  type OnrampQuotesResponse,
  type OnrampType,
} from "@xauconnect/utils";
import { env } from "../../config.js";
import { logger } from "../../logger.js";
import { currencyForCountry } from "./geo.js";
import type {
  OnrampCheckoutArgs,
  OnrampCheckoutResult,
  OnrampProvider,
  OnrampQuoteArgs,
} from "./types.js";

function isStaging(): boolean {
  return env.TRANSAK_ENVIRONMENT !== "production";
}
function apiBase(): string {
  return isStaging() ? "https://api-stg.transak.com" : "https://api.transak.com";
}
function widgetHost(): string {
  return isStaging() ? "https://global-stg.transak.com" : "https://global.transak.com";
}

/** Canonical (Onramper-style) network ↔ Transak network id. */
function toTransakNetwork(network?: string): string | undefined {
  if (!network) return undefined;
  return network === "avaxc" ? "avaxcchain" : network;
}
function fromTransakNetwork(network?: string): string | undefined {
  if (!network) return undefined;
  const n = network.toLowerCase();
  if (n === "avaxcchain") return "avaxc";
  if (n === "mainnet") return "ethereum";
  return n;
}

/** Transak's documented payment method ids → friendly labels. */
const PAYMENT_LABELS: Record<string, string> = {
  credit_debit_card: "Credit / debit card",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  sepa_bank_transfer: "SEPA bank transfer",
  gbp_bank_transfer: "Faster Payments (GBP)",
  pm_open_banking: "Open banking",
  pm_wire: "Wire transfer",
  inr_upi: "UPI",
  pm_ach_pull: "ACH",
};
const DEFAULT_PAYMENT_METHODS: OnrampPaymentMethod[] = Object.entries(PAYMENT_LABELS).map(
  ([id, name]) => ({ id, name }),
);

function transakEnabled(): boolean {
  return Boolean(env.TRANSAK_API_KEY);
}

async function transakFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  headers: Record<string, string> = {},
): Promise<T> {
  const url = new URL(path, apiBase());
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { headers: { accept: "application/json", ...headers } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.warn({ path, status: res.status, text: text.slice(0, 300) }, "transak api error");
    throw new Error(`Transak ${res.status}`);
  }
  return (await res.json()) as T;
}

// ── Assets ──────────────────────────────────────────────────────────────────

interface RawCrypto {
  response?: Array<{
    symbol?: string;
    name?: string;
    uniqueId?: string;
    isAllowed?: boolean;
    network?: { name?: string };
    image?: { thumb?: string; small?: string };
    decimals?: number;
  }>;
}
interface RawFiat {
  response?: Array<{
    symbol?: string;
    name?: string;
    icon?: string;
    paymentOptions?: Array<{ id?: string; name?: string }>;
  }>;
}

async function fetchFiatCurrencies(): Promise<NonNullable<RawFiat["response"]>> {
  const raw = await transakFetch<RawFiat>("/fiat/public/v1/currencies/fiat-currencies", {}, {
    "x-api-key": env.TRANSAK_API_KEY ?? "",
  });
  return raw.response ?? [];
}

async function getAssets(
  _type: OnrampType,
  source: string,
  _country: string | null,
): Promise<{ crypto: OnrampAsset[]; fiat: OnrampFiat[] }> {
  const [rawCrypto, rawFiat] = await Promise.all([
    transakFetch<RawCrypto>("/cryptocoverage/api/v1/public/crypto-currencies", {}, {
      "x-api-key": env.TRANSAK_API_KEY ?? "",
    }).catch(() => ({ response: [] }) as RawCrypto),
    fetchFiatCurrencies().catch(() => []),
  ]);

  const crypto: OnrampAsset[] = (rawCrypto.response ?? [])
    .filter((c) => c.isAllowed !== false && c.symbol)
    .map((c) => {
      const network = fromTransakNetwork(c.network?.name);
      return {
        id: (c.symbol ?? "").toUpperCase(),
        code: (c.symbol ?? "").toUpperCase(),
        name: c.name ?? c.symbol ?? "",
        network,
        chainKey: network ? ONRAMP_CHAIN_BY_NETWORK[network] : undefined,
        icon: c.image?.small ?? c.image?.thumb,
        decimals: c.decimals,
      } satisfies OnrampAsset;
    })
    // Prefer assets on chains we support.
    .sort((a, b) => Number(Boolean(b.chainKey)) - Number(Boolean(a.chainKey)));

  const fiat: OnrampFiat[] = (rawFiat.length ? rawFiat : [{ symbol: source, name: source }]).map(
    (f) => ({ code: (f.symbol ?? "").toUpperCase(), name: f.name, icon: f.icon }),
  );

  return { crypto, fiat };
}

async function getPaymentTypes(
  _type: OnrampType,
  source: string,
  _destination: string,
  _country: string | null,
): Promise<OnrampPaymentMethod[]> {
  try {
    const fiats = await fetchFiatCurrencies();
    const match = fiats.find((f) => (f.symbol ?? "").toUpperCase() === source.toUpperCase());
    const opts = match?.paymentOptions ?? [];
    if (opts.length) {
      return opts
        .filter((p) => p.id)
        .map((p) => ({ id: p.id!, name: p.name ?? PAYMENT_LABELS[p.id!] ?? p.id! }));
    }
  } catch {
    /* fall through */
  }
  return DEFAULT_PAYMENT_METHODS;
}

async function getDefaults(type: OnrampType, country: string | null): Promise<OnrampDefaults> {
  return {
    country,
    fiat: currencyForCountry(country),
    crypto: "ETH",
    amount: type === "buy" ? 100 : 0.05,
    paymentMethod: "credit_debit_card",
  };
}

// ── Quotes ──────────────────────────────────────────────────────────────────

interface RawQuoteResponse {
  response?: {
    quoteId?: string;
    conversionPrice?: number;
    fiatCurrency?: string;
    cryptoCurrency?: string;
    fiatAmount?: number;
    cryptoAmount?: number;
    totalFee?: number;
    isBuyOrSell?: string;
    network?: string;
    feeBreakdown?: Array<{ name?: string; value?: number; id?: string }>;
    paymentMethod?: string;
  };
}

async function getQuotes(args: OnrampQuoteArgs): Promise<OnrampQuotesResponse> {
  const network = toTransakNetwork(args.network) ?? "ethereum";
  const paymentMethod = args.paymentMethod ?? "credit_debit_card";
  const isBuyOrSell = args.type === "buy" ? "BUY" : "SELL";
  const params: Record<string, string | number | undefined> = {
    partnerApiKey: env.TRANSAK_API_KEY,
    fiatCurrency: args.fiat.toUpperCase(),
    cryptoCurrency: args.crypto.toUpperCase(),
    network,
    isBuyOrSell,
    paymentMethod,
    quoteCountryCode: args.country ?? undefined,
  };
  if (args.type === "buy") params.fiatAmount = args.amount;
  else params.cryptoAmount = args.amount;

  let r: RawQuoteResponse["response"];
  try {
    const raw = await transakFetch<RawQuoteResponse>("/api/v1/pricing/public/quotes", params);
    r = raw.response;
  } catch {
    return { best: null, quotes: [], quotedAt: Date.now() };
  }
  if (!r || typeof r.cryptoAmount !== "number") {
    return { best: null, quotes: [], quotedAt: Date.now() };
  }

  const networkFee =
    r.feeBreakdown?.find((f) => f.id === "network_fee" || /network/i.test(f.name ?? ""))?.value ?? 0;

  // Transak's own + our dashboard markup are already inside totalFee, so we do
  // not add a separate partner fee here (configure your markup in the Transak
  // dashboard). partnerFee* are reported as 0 to avoid implying a double charge.
  const quote: OnrampQuote = {
    provider: "transak",
    type: args.type,
    fiat: (r.fiatCurrency ?? args.fiat).toUpperCase(),
    crypto: (r.cryptoCurrency ?? args.crypto).toUpperCase(),
    fiatAmount: r.fiatAmount ?? (args.type === "buy" ? args.amount : 0),
    cryptoAmount: r.cryptoAmount ?? (args.type === "sell" ? args.amount : 0),
    rate: r.conversionPrice ?? 0,
    networkFee,
    transactionFee: r.totalFee ?? 0,
    partnerFeeFiat: 0,
    partnerFeePct: 0,
    paymentMethod: r.paymentMethod ?? paymentMethod,
    availablePaymentMethods: [],
    quoteId: r.quoteId,
    recommendations: [],
  };
  return { best: quote, quotes: [quote], quotedAt: Date.now() };
}

// ── Checkout (hosted widget hand-off) ─────────────────────────────────────────

async function createCheckout(args: OnrampCheckoutArgs): Promise<OnrampCheckoutResult> {
  const url = new URL(widgetHost());
  const q = url.searchParams;
  q.set("apiKey", env.TRANSAK_API_KEY ?? "");
  q.set("productsAvailed", args.type === "buy" ? "BUY" : "SELL");
  q.set("fiatCurrency", args.fiat.toUpperCase());
  q.set("cryptoCurrencyCode", args.crypto.toUpperCase());
  const network = toTransakNetwork(args.network);
  if (network) q.set("network", network);
  if (args.paymentMethod) q.set("paymentMethod", args.paymentMethod);
  if (args.type === "buy") q.set("fiatAmount", String(args.amount));
  else q.set("cryptoAmount", String(args.amount));
  if (args.walletAddress) {
    q.set("walletAddress", args.walletAddress);
    q.set("disableWalletAddressForm", "true");
  }
  if (args.email) q.set("email", args.email);
  if (args.country) q.set("countryCode", args.country);
  q.set("partnerOrderId", args.partnerContext);
  q.set("themeColor", "C8A03C"); // XAUConnect gold
  if (args.successUrl) q.set("redirectURL", args.successUrl);

  return {
    // Transak's own order id arrives via webhook; correlate on partnerOrderId.
    transactionId: args.partnerContext,
    url: url.toString(),
    redirectType: "iframe",
  };
}

export const transakProvider: OnrampProvider = {
  id: "transak",
  label: "Transak",
  isEnabled: transakEnabled,
  getDefaults,
  getAssets,
  getPaymentTypes,
  getQuotes,
  createCheckout,
};

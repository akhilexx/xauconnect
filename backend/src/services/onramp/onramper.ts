/**
 * Onramper adapter — fiat on-ramp / off-ramp (Buy & Sell crypto).
 *
 * XAUConnect never custodies fiat or card data. This service is a thin,
 * server-side proxy/normalizer over the Onramper aggregator API, which compares
 * and routes across every connected regulated payment provider. The backend
 * holds the secret key, detects the user's country (Cloudflare CF-IPCountry),
 * injects our partner-fee markup, and hands off to the provider's PCI-compliant
 * hosted checkout for the actual payment + KYC.
 *
 * Everything degrades gracefully when ONRAMPER_API_KEY is absent: callers see
 * `enabled: false` and the UI shows a "coming soon" state.
 */
import {
  ONRAMP_CHAIN_BY_NETWORK,
  ONRAMP_NETWORK_BY_CHAIN,
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

function onramperEnabled(): boolean {
  return Boolean(env.ONRAMPER_API_KEY);
}

class OnrampDisabledError extends Error {
  constructor() {
    super("Fiat buy/sell is not configured");
    this.name = "OnrampDisabledError";
  }
}

// ── Low-level fetch ───────────────────────────────────────────────────────────

async function onramperFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  init?: RequestInit,
): Promise<T> {
  if (!env.ONRAMPER_API_KEY) throw new OnrampDisabledError();
  const url = new URL(path, env.ONRAMPER_API_BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: env.ONRAMPER_API_KEY,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.warn({ path, status: res.status, text: text.slice(0, 300) }, "onramper api error");
    throw new Error(`Onramper ${res.status}`);
  }
  return (await res.json()) as T;
}

function networkToChainKey(network?: string): string | undefined {
  if (!network) return undefined;
  return ONRAMP_CHAIN_BY_NETWORK[network.toLowerCase()];
}

// ── Defaults (country-aware auto currency/crypto/amount/payment) ────────────────

interface RawDefaults {
  message?: {
    defaults?: {
      recommended?: {
        source?: string;
        target?: string;
        amount?: number;
        paymentMethod?: string;
      };
    };
  };
}

export async function getDefaults(type: OnrampType, country: string | null): Promise<OnrampDefaults> {
  const raw = await onramperFetch<RawDefaults>("/supported/defaults/all", {
    type,
    country: country ?? undefined,
  });
  const rec = raw.message?.defaults?.recommended ?? {};
  // For buy: source=fiat, target=crypto. For sell: source=crypto, target=fiat.
  const fiat = type === "buy" ? rec.source : rec.target;
  const crypto = type === "buy" ? rec.target : rec.source;
  return {
    country,
    fiat: (fiat ?? currencyForCountry(country)).toUpperCase(),
    crypto: crypto ?? "eth",
    amount: rec.amount ?? 100,
    paymentMethod: rec.paymentMethod ?? "creditcard",
  };
}

// ── Assets & payment methods ────────────────────────────────────────────────────

interface RawAssets {
  message?: {
    crypto?: Array<{ id: string; code?: string; name?: string; network?: { id?: string }; icon?: string; decimals?: number }>;
    fiat?: Array<{ id?: string; code?: string; name?: string; icon?: string }>;
  };
}

export async function getAssets(
  type: OnrampType,
  source: string,
  country: string | null,
): Promise<{ crypto: OnrampAsset[]; fiat: OnrampFiat[] }> {
  const raw = await onramperFetch<RawAssets>("/supported/assets", {
    type,
    source,
    country: country ?? undefined,
  });
  const crypto: OnrampAsset[] = (raw.message?.crypto ?? [])
    .map((c) => {
      const network = c.network?.id;
      return {
        id: c.id,
        code: (c.code ?? c.id).toUpperCase(),
        name: c.name ?? c.code ?? c.id,
        network,
        chainKey: networkToChainKey(network),
        icon: c.icon,
        decimals: c.decimals,
      };
    })
    // Prefer assets on chains we support, but keep the rest available too.
    .sort((a, b) => Number(Boolean(b.chainKey)) - Number(Boolean(a.chainKey)));
  const fiat: OnrampFiat[] = (raw.message?.fiat ?? []).map((f) => ({
    code: (f.code ?? f.id ?? "").toUpperCase(),
    name: f.name,
    icon: f.icon,
  }));
  return { crypto, fiat };
}

interface RawPaymentTypes {
  message?: Array<{ paymentTypeId: string; name?: string; icon?: string; details?: { currencyStatus?: string } }>;
}

export async function getPaymentTypes(
  type: OnrampType,
  source: string,
  destination: string,
  country: string | null,
): Promise<OnrampPaymentMethod[]> {
  const raw = await onramperFetch<RawPaymentTypes>(`/supported/payment-types/${encodeURIComponent(source)}`, {
    type,
    destination,
    country: country ?? undefined,
  });
  return (raw.message ?? []).map((p) => ({
    id: p.paymentTypeId,
    name: p.name ?? p.paymentTypeId,
    icon: p.icon,
  }));
}

// ── Quotes ───────────────────────────────────────────────────────────────────

interface RawQuote {
  rate?: number;
  networkFee?: number;
  transactionFee?: number;
  payout?: number;
  availablePaymentMethods?: Array<{ paymentTypeId: string; name?: string; icon?: string }>;
  ramp?: string;
  paymentMethod?: string;
  quoteId?: string;
  recommendations?: string[];
  errors?: Array<{ message?: string }>;
}

export async function getQuotes(opts: OnrampQuoteArgs): Promise<OnrampQuotesResponse> {
  // Buy:  /quotes/{fiat}/{crypto}   amount = fiat.
  // Sell: /quotes/{crypto}/{fiat}   amount = crypto.
  const [pathSource, pathDest] =
    opts.type === "buy" ? [opts.fiat, opts.crypto] : [opts.crypto, opts.fiat];
  const raw = await onramperFetch<RawQuote[]>(
    `/quotes/${encodeURIComponent(pathSource.toLowerCase())}/${encodeURIComponent(pathDest.toLowerCase())}`,
    {
      amount: opts.amount,
      type: opts.type,
      paymentMethod: opts.paymentMethod,
      country: opts.country ?? undefined,
      walletAddress: opts.walletAddress,
      partnerFee: opts.partnerFeePct > 0 ? opts.partnerFeePct : undefined,
    },
  );

  const quotes: OnrampQuote[] = (Array.isArray(raw) ? raw : [])
    .filter((q) => !q.errors?.length && typeof q.payout === "number" && q.payout > 0)
    .map((q) => {
      const fiatAmount = opts.type === "buy" ? opts.amount : (q.payout ?? 0);
      const cryptoAmount = opts.type === "buy" ? (q.payout ?? 0) : opts.amount;
      return {
        provider: q.ramp ?? "unknown",
        type: opts.type,
        fiat: opts.fiat.toUpperCase(),
        crypto: opts.crypto,
        fiatAmount,
        cryptoAmount,
        rate: q.rate ?? 0,
        networkFee: q.networkFee ?? 0,
        transactionFee: q.transactionFee ?? 0,
        partnerFeeFiat: Number(((fiatAmount * opts.partnerFeePct) / 100).toFixed(2)),
        partnerFeePct: opts.partnerFeePct,
        paymentMethod: q.paymentMethod ?? opts.paymentMethod ?? "creditcard",
        availablePaymentMethods: (q.availablePaymentMethods ?? []).map((p) => ({
          id: p.paymentTypeId,
          name: p.name ?? p.paymentTypeId,
          icon: p.icon,
        })),
        quoteId: q.quoteId,
        recommendations: q.recommendations ?? [],
      } satisfies OnrampQuote;
    })
    // Best route = most crypto for buy, most fiat for sell.
    .sort((a, b) =>
      opts.type === "buy" ? b.cryptoAmount - a.cryptoAmount : b.fiatAmount - a.fiatAmount,
    );

  return { best: quotes[0] ?? null, quotes, quotedAt: Date.now() };
}

// ── Checkout (hand-off) ────────────────────────────────────────────────────────

interface RawCheckout {
  message?: {
    transactionInformation?: {
      transactionId?: string;
      url?: string;
      type?: string;
    };
  };
}

export async function createCheckout(opts: OnrampCheckoutArgs): Promise<OnrampCheckoutResult> {
  const body: Record<string, unknown> = {
    onramp: opts.routeProvider,
    source: opts.type === "buy" ? opts.fiat.toLowerCase() : opts.crypto,
    destination: opts.type === "buy" ? opts.crypto : opts.fiat.toLowerCase(),
    amount: opts.amount,
    type: opts.type,
    paymentMethod: opts.paymentMethod,
    network: opts.network,
    originatingHost: env.ONRAMPER_WIDGET_HOST.replace(/^https?:\/\//, ""),
    partnerContext: opts.partnerContext,
    country: opts.country ?? undefined,
    email: opts.email,
  };
  if (opts.walletAddress) body.wallet = { address: opts.walletAddress };
  if (opts.successUrl) {
    body.supportedParams = {
      partnerData: { redirectUrl: { success: encodeURIComponent(opts.successUrl) } },
    };
  }

  const raw = await onramperFetch<RawCheckout>("/checkout/intent", {}, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const info = raw.message?.transactionInformation;
  if (!info?.url || !info.transactionId) {
    throw new Error("Onramper did not return a checkout URL");
  }
  return {
    transactionId: info.transactionId,
    url: info.url,
    redirectType: info.type === "iframe" ? "iframe" : "redirect",
  };
}

export function networkForChain(chainKey?: string): string | undefined {
  return chainKey ? ONRAMP_NETWORK_BY_CHAIN[chainKey] : undefined;
}

/** Onramper aggregator as a pluggable provider. */
export const onramperProvider: OnrampProvider = {
  id: "onramper",
  label: "Onramper (aggregator)",
  isEnabled: onramperEnabled,
  getDefaults,
  getAssets,
  getPaymentTypes,
  getQuotes,
  createCheckout,
};

export { OnrampDisabledError };

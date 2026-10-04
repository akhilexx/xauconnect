/**
 * Provider-agnostic contract for a fiat on-ramp / off-ramp backend.
 *
 * Each integration (Transak, Onramper, …) implements OnrampProvider. The
 * registry (./index.ts) picks the active provider based on which API keys are
 * configured + the ONRAMP_PROVIDER preference, so the same /onramp routes work
 * regardless of which partner is live.
 */
import type {
  OnrampAsset,
  OnrampDefaults,
  OnrampFiat,
  OnrampPaymentMethod,
  OnrampQuotesResponse,
  OnrampType,
} from "@xauconnect/utils";

export interface OnrampCheckoutResult {
  /** Provider order id when known immediately, else our partner context. */
  transactionId: string;
  /** Hosted provider URL to render in an iframe or redirect the user to. */
  url: string;
  redirectType: "iframe" | "redirect";
}

export interface OnrampQuoteArgs {
  type: OnrampType;
  fiat: string;
  crypto: string;
  amount: number;
  paymentMethod?: string;
  country: string | null;
  walletAddress?: string;
  /** Our markup (%) for display + (where supported) pass-through. */
  partnerFeePct: number;
  /** Resolved provider network id for the crypto (e.g. "ethereum"). */
  network?: string;
}

export interface OnrampCheckoutArgs {
  type: OnrampType;
  fiat: string;
  crypto: string;
  amount: number;
  paymentMethod: string;
  walletAddress?: string;
  network?: string;
  email?: string;
  country: string | null;
  partnerContext: string;
  successUrl?: string;
  /** Aggregators (Onramper): the specific sub-provider chosen from the quote. */
  routeProvider?: string;
}

export interface OnrampProvider {
  /** Stable id, e.g. "transak". */
  readonly id: string;
  /** Human label for admin/UI. */
  readonly label: string;
  /** True when this provider's keys are configured. */
  isEnabled(): boolean;
  getDefaults(type: OnrampType, country: string | null): Promise<OnrampDefaults>;
  getAssets(
    type: OnrampType,
    source: string,
    country: string | null,
  ): Promise<{ crypto: OnrampAsset[]; fiat: OnrampFiat[] }>;
  getPaymentTypes(
    type: OnrampType,
    source: string,
    destination: string,
    country: string | null,
  ): Promise<OnrampPaymentMethod[]>;
  getQuotes(args: OnrampQuoteArgs): Promise<OnrampQuotesResponse>;
  createCheckout(args: OnrampCheckoutArgs): Promise<OnrampCheckoutResult>;
}

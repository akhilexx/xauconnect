/**
 * Fiat on-ramp / off-ramp provider registry.
 *
 * Picks the active provider from the configured keys + ONRAMP_PROVIDER
 * preference, so the /onramp routes are provider-agnostic. Priority order
 * (when ONRAMP_PROVIDER="auto"): Transak first (instant onboarding, Merchant of
 * Record, delivers to the user's wallet), then the Onramper aggregator.
 */
import type { OnrampConfig, OnrampType } from "@xauconnect/utils";
import { env } from "../../config.js";
import { transakProvider } from "./transak.js";
import { onramperProvider, OnrampDisabledError } from "./onramper.js";
import type {
  OnrampCheckoutArgs,
  OnrampProvider,
  OnrampQuoteArgs,
} from "./types.js";

/** Priority order for "auto" selection. */
const ALL: OnrampProvider[] = [transakProvider, onramperProvider];

export function activeProvider(): OnrampProvider | null {
  const pref = env.ONRAMP_PROVIDER;
  if (pref && pref !== "auto") {
    const chosen = ALL.find((p) => p.id === pref);
    if (chosen?.isEnabled()) return chosen;
  }
  return ALL.find((p) => p.isEnabled()) ?? null;
}

function active(): OnrampProvider {
  const p = activeProvider();
  if (!p) throw new OnrampDisabledError();
  return p;
}

export function isOnrampEnabled(): boolean {
  return activeProvider() != null;
}

export function onrampConfig(): OnrampConfig {
  const p = activeProvider();
  return {
    enabled: Boolean(p),
    modes: ["buy", "sell"],
    provider: p?.id,
    providerLabel: p?.label,
    widgetHost: env.ONRAMPER_WIDGET_HOST,
    publishableKey: env.ONRAMPER_PUBLISHABLE_KEY,
  };
}

export const getDefaults = (type: OnrampType, country: string | null) =>
  active().getDefaults(type, country);
export const getAssets = (type: OnrampType, source: string, country: string | null) =>
  active().getAssets(type, source, country);
export const getPaymentTypes = (
  type: OnrampType,
  source: string,
  destination: string,
  country: string | null,
) => active().getPaymentTypes(type, source, destination, country);
export const getQuotes = (args: OnrampQuoteArgs) => active().getQuotes(args);
export const createCheckout = (args: OnrampCheckoutArgs) => active().createCheckout(args);

export { geoFor, detectCountry } from "./geo.js";
export { onrampPartnerFeePct } from "./fees.js";
export { OnrampDisabledError } from "./onramper.js";
export type { OnrampProvider } from "./types.js";

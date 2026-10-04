/**
 * Provider-agnostic geo + currency detection for fiat buy/sell.
 * Reads the visitor's country from edge headers (Cloudflare / Vercel) and maps
 * it to a best-guess local fiat currency.
 */
import type { Request } from "express";
import type { OnrampGeo } from "@xauconnect/utils";

/** Read the visitor's ISO-2 country from edge headers (Cloudflare/Vercel). */
export function detectCountry(req: Request): string | null {
  const candidates = [
    req.headers["cf-ipcountry"],
    req.headers["x-vercel-ip-country"],
    req.headers["x-country-code"],
  ];
  for (const c of candidates) {
    const v = Array.isArray(c) ? c[0] : c;
    if (v && /^[A-Za-z]{2}$/.test(v) && v.toUpperCase() !== "XX") {
      return v.toUpperCase();
    }
  }
  return null;
}

/** Rough country → local fiat fallback (provider /defaults is authoritative). */
export const COUNTRY_FIAT: Record<string, string> = {
  US: "USD", GB: "GBP", IN: "INR", AU: "AUD", CA: "CAD", JP: "JPY",
  SG: "SGD", AE: "AED", NG: "NGN", BR: "BRL", ZA: "ZAR", PH: "PHP",
  ID: "IDR", MX: "MXN", TR: "TRY", KR: "KRW", CH: "CHF", SE: "SEK",
};

export const EU_COUNTRIES = new Set([
  "AT", "BE", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT",
  "LU", "MT", "NL", "PT", "SK", "SI", "ES",
]);

export function currencyForCountry(country: string | null): string {
  if (!country) return "USD";
  return COUNTRY_FIAT[country] ?? (EU_COUNTRIES.has(country) ? "EUR" : "USD");
}

export function geoFor(req: Request): OnrampGeo {
  const country = detectCountry(req);
  if (!country) return { country: null, currency: null, detected: false };
  return { country, currency: currencyForCountry(country), detected: true };
}

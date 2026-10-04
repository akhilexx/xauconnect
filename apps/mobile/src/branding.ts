/**
 * Branding helpers — mirrors @xauconnect/utils/branding (the mobile app lives
 * outside the pnpm workspace). Liquidity sources are surfaced as branded XAU
 * routes; third-party venue names are never displayed.
 */
const ROUTE_ALIASES = [
  "Aurum", "Midas", "Bullion", "Ingot", "Karat", "Vault", "Mint", "Lustre",
  "Gilt", "Sovereign", "Krona", "Ducat", "Florin", "Guinea", "Doubloon",
  "Solidus", "Talent", "Stater", "Oban", "Koban", "Tael", "Mohur", "Dinar",
  "Crown",
] as const;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Stable branded route name for a liquidity source, e.g. "Aurum Route". */
export function brandedRouteName(sourceId: string): string {
  return `${ROUTE_ALIASES[hashId(sourceId) % ROUTE_ALIASES.length]} Route`;
}

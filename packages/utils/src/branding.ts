/**
 * XAUConnect branding layer.
 *
 * XAUConnect is presented as its own DEX brand: liquidity sources are surfaced
 * as named "XAU routes" / "XAU pools", never as third-party venue names.
 * The mapping is deterministic (hash of the internal venue id) so a given
 * source always renders under the same brand identity.
 */

const ROUTE_ALIASES = [
  "Aurum",
  "Midas",
  "Bullion",
  "Ingot",
  "Karat",
  "Vault",
  "Mint",
  "Lustre",
  "Gilt",
  "Sovereign",
  "Krona",
  "Ducat",
  "Florin",
  "Guinea",
  "Doubloon",
  "Solidus",
  "Talent",
  "Stater",
  "Oban",
  "Koban",
  "Tael",
  "Mohur",
  "Dinar",
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

/** Stable branded pool name for an LP source, e.g. "Midas Pool". */
export function brandedPoolName(sourceId: string): string {
  return `${ROUTE_ALIASES[hashId(sourceId) % ROUTE_ALIASES.length]} Pool`;
}

/**
 * Brand a list of sources, guaranteeing uniqueness within the list
 * (hash collisions get a roman-numeral suffix).
 */
export function brandRouteNames(sourceIds: string[]): Map<string, string> {
  return brandNames(sourceIds, "Route");
}

/** Same as {@link brandRouteNames} but with the "Pool" suffix. */
export function brandPoolNames(sourceIds: string[]): Map<string, string> {
  return brandNames(sourceIds, "Pool");
}

function brandNames(sourceIds: string[], suffix: string): Map<string, string> {
  const used = new Map<string, number>();
  const out = new Map<string, string>();
  for (const id of sourceIds) {
    const base = `${ROUTE_ALIASES[hashId(id) % ROUTE_ALIASES.length]} ${suffix}`;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    out.set(id, count === 0 ? base : `${base} ${"II III IV V".split(" ")[count - 1] ?? count + 1}`);
  }
  return out;
}

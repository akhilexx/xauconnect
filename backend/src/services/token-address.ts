/**
 * Chain-aware token address normalization.
 * Solana base58 is case-sensitive on-chain, but DexScreener / profile feeds
 * often disagree on letter casing — matching is case-insensitive for Solana.
 */
export function normalizeTokenAddress(chainKey: string, address: string): string {
  if (chainKey === "solana") return address;
  return address.toLowerCase();
}

export function tokenAddressEq(chainKey: string, a: string, b: string): boolean {
  if (a === b) return true;
  if (chainKey === "solana") return a.toLowerCase() === b.toLowerCase();
  return a.toLowerCase() === b.toLowerCase();
}

export function tokenCacheKey(chainKey: string, address: string): string {
  if (chainKey === "solana") return `${chainKey}:${address.toLowerCase()}`;
  return `${chainKey}:${address.toLowerCase()}`;
}

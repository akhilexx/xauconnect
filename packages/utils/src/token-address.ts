/** Chain-aware token address helpers (shared by web, mobile, backend). */

export function tokenAddressEq(chainKey: string, a: string, b: string): boolean {
  if (a === b) return true;
  if (chainKey === "solana") return a.toLowerCase() === b.toLowerCase();
  return a.toLowerCase() === b.toLowerCase();
}

/** True when the query looks like a pasted contract / mint address. */
export function looksLikeTokenAddress(chainKey: string, query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  if (chainKey === "solana") return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q);
  return /^0x[a-fA-F0-9]{40}$/.test(q);
}

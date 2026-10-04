/** EVM checksummed or lowercase hex address. */
export function isEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

/** Solana base58 pubkey (32–44 chars). */
export function isSolanaAddress(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim());
}

export function isWatchableAddress(value: string): boolean {
  const v = value.trim();
  return isEvmAddress(v) || isSolanaAddress(v);
}

export function addressKind(value: string): "evm" | "solana" | null {
  const v = value.trim();
  if (isEvmAddress(v)) return "evm";
  if (isSolanaAddress(v)) return "solana";
  return null;
}

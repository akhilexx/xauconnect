/**
 * Shared Solana RPC connection with fallbacks (Helius last — save quota for submit).
 */
import { Connection } from "@solana/web3.js";
import { getChainByKey } from "@xauconnect/utils";
import { rpcUrl } from "../config.js";

export const SOLANA_RPC_FALLBACKS = [
  "https://solana-rpc.publicnode.com",
  "https://api.mainnet-beta.solana.com",
];

/** Prefer public RPCs first; Helius primary is appended last to reduce 429 during broadcast. */
export function solanaRpcUrls(): string[] {
  const chain = getChainByKey("solana");
  const primary = chain ? rpcUrl("solana", chain.defaultRpc) : SOLANA_RPC_FALLBACKS[0]!;
  return [...new Set([...SOLANA_RPC_FALLBACKS, primary])];
}

export async function withSolanaConnection<T>(
  fn: (connection: Connection) => Promise<T>,
): Promise<T | null> {
  for (const url of solanaRpcUrls()) {
    try {
      const connection = new Connection(url, "confirmed");
      return await fn(connection);
    } catch {
      // try next RPC
    }
  }
  return null;
}

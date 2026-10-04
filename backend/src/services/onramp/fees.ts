/**
 * Provider-agnostic partner-fee resolution for fiat buy/sell.
 * Reads the admin-configured onrampFeeBps per chain (defaults match swap
 * pricing: 3% EVM, 5% Solana) and returns a percentage.
 */
import { onrampFeePctForChain } from "@xauconnect/utils";
import { db } from "../../db/client.js";

/** Our partner markup (%) for the chain backing this crypto. */
export async function onrampPartnerFeePct(chainKey?: string): Promise<number> {
  const key = chainKey ?? "ethereum";
  if (db) {
    try {
      const cfg = await db.feeConfig.findUnique({ where: { chainKey: key } });
      if (cfg) {
        const bps = (cfg as { onrampFeeBps?: number }).onrampFeeBps ?? cfg.swapFeeBps;
        return onrampFeePctForChain(key, { [key]: bps });
      }
    } catch {
      /* fall through to default */
    }
  }
  return onrampFeePctForChain(key);
}

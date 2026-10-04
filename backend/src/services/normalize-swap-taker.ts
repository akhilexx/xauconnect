/**
 * Normalize optional taker on swap API requests (agent-friendly checksum handling).
 * Solana pubkeys stay as base58. EVM addresses are checksummed.
 */
import { PublicKey } from "@solana/web3.js";
import { normalizeEvmAddress } from "@xauconnect/utils";
import { ApiError } from "../middleware/error.js";

export function normalizeSwapTaker<T extends { taker?: string; chainKey?: string }>(req: T): T {
  if (!req.taker) return req;
  if (req.chainKey === "solana") {
    try {
      const canonical = new PublicKey(req.taker).toBase58();
      return { ...req, taker: canonical };
    } catch {
      throw new ApiError(
        400,
        "Invalid taker address — expected a Solana public key",
        "INVALID_TAKER_ADDRESS",
      );
    }
  }
  const normalized = normalizeEvmAddress(req.taker);
  if (!normalized) {
    throw new ApiError(
      400,
      "Invalid taker address — expected 0x followed by 40 hex characters",
      "INVALID_TAKER_ADDRESS",
    );
  }
  return { ...req, taker: normalized };
}

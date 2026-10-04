/**
 * Lenient EVM address parsing for agent/API callers.
 * Accepts lowercase hex even when EIP-55 checksum is wrong (common from LLM output).
 */
import { getAddress } from "viem";

const HEX_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

/** Normalize to checksummed address, or null if not valid 20-byte hex. */
export function normalizeEvmAddress(value: string | undefined | null): `0x${string}` | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!HEX_ADDRESS.test(trimmed)) return null;
  try {
    return getAddress(trimmed);
  } catch {
    try {
      return getAddress(trimmed.toLowerCase() as `0x${string}`);
    } catch {
      return null;
    }
  }
}

export function isValidEvmAddress(value: string | undefined | null): boolean {
  return normalizeEvmAddress(value) != null;
}

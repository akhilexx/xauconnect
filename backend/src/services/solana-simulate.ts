/**
 * Pre-sign simulation for unsigned Solana versioned transactions.
 */
import { VersionedTransaction } from "@solana/web3.js";
import { withSolanaConnection } from "./solana-rpc.js";
import { mapSolanaProgramError } from "./solana-errors.js";

export async function simulateSolanaTransactionBase64(
  serializedBase64: string,
): Promise<{ success: boolean; error?: string }> {
  let raw: Uint8Array;
  try {
    raw = Uint8Array.from(Buffer.from(serializedBase64, "base64"));
  } catch {
    return { success: false, error: "SWAP_BUILD_FAILED" };
  }

  const result = await withSolanaConnection(async (connection) => {
    const tx = VersionedTransaction.deserialize(raw);
    return connection.simulateTransaction(tx, {
      sigVerify: false,
      commitment: "confirmed",
    });
  });

  if (!result) {
    return { success: false, error: "SOLANA_SUBMIT_FAILED" };
  }

  if (result.value.err) {
    const logs = result.value.logs ?? [];
    return {
      success: false,
      error: mapSolanaProgramError(result.value.err, logs),
    };
  }

  return { success: true };
}

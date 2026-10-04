/**
 * Broadcast signed Solana transactions via server RPC (Helius + fallbacks).
 * Waits for confirmed success before returning — never report success on a reverted tx.
 */
import { Connection, type SendOptions } from "@solana/web3.js";
import { logger } from "../logger.js";
import { withTimeout } from "./routing/evm.js";
import { mapSolanaProgramError, SolanaSubmitError } from "./solana-errors.js";
import { solanaRpcUrls } from "./solana-rpc.js";

const SUBMIT_TIMEOUT_MS = 25_000;
const CONFIRM_TIMEOUT_MS = 60_000;

const SEND_OPTS: SendOptions = {
  skipPreflight: false,
  maxRetries: 3,
  preflightCommitment: "confirmed",
};

export interface SolanaSubmitResult {
  signature: string;
  confirmed: true;
  slot: number;
}

async function verifyConfirmed(
  connection: Connection,
  signature: string,
): Promise<number> {
  const status = await withTimeout(
    connection.confirmTransaction(signature, "confirmed"),
    CONFIRM_TIMEOUT_MS,
  );
  if (status.value.err) {
    const code = mapSolanaProgramError(status.value.err);
    throw new SolanaSubmitError("Swap failed on-chain", code);
  }

  const tx = await withTimeout(
    connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    }),
    15_000,
  );

  if (!tx) {
    throw new SolanaSubmitError(
      "Transaction not found after confirmation",
      "SOLANA_SWAP_FAILED",
    );
  }
  if (tx.meta?.err) {
    const code = mapSolanaProgramError(tx.meta.err, tx.meta.logMessages ?? []);
    throw new SolanaSubmitError("Swap failed on-chain", code);
  }

  return tx.slot;
}

/** Submit a signed serialized transaction; return signature once confirmed on-chain. */
export async function submitSignedSolanaTransaction(
  raw: Uint8Array,
): Promise<SolanaSubmitResult> {
  let lastErr: Error | undefined;
  for (const url of solanaRpcUrls()) {
    for (const skipPreflight of [false, true]) {
      try {
        const connection = new Connection(url, "confirmed");
        const signature = await withTimeout(
          connection.sendRawTransaction(raw, { ...SEND_OPTS, skipPreflight }),
          SUBMIT_TIMEOUT_MS,
        );
        const slot = await verifyConfirmed(connection, signature);
        logger.info({ signature, slot, url }, "solana swap confirmed");
        return { signature, confirmed: true, slot };
      } catch (err) {
        lastErr = err as Error;
        const code = err instanceof SolanaSubmitError ? err.code : undefined;
        logger.warn(
          { err: lastErr.message, code, url, skipPreflight },
          "solana submit attempt failed",
        );
        if (err instanceof SolanaSubmitError && code !== "SOLANA_SUBMIT_FAILED") {
          throw err;
        }
      }
    }
  }
  throw new SolanaSubmitError(
    lastErr?.message ?? "SOLANA_SUBMIT_FAILED",
    "SOLANA_SUBMIT_FAILED",
  );
}

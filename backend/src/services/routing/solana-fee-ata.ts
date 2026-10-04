/**
 * Jupiter platform-fee recipient SPL token accounts (derived ATAs per output mint).
 */
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotent,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { SOLANA_NATIVE_MINT } from "@xauconnect/utils";
import { env } from "../../config.js";
import { logger } from "../../logger.js";
import { withSolanaConnection } from "../solana-rpc.js";
import { solanaFeeWallet } from "./integrator-fees.js";

const SOL_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function feeCollectorKeypair(): Keypair | null {
  const key = env.SOLANA_FEE_COLLECTOR_KEY?.trim();
  if (!key) return null;
  try {
    const payer = Keypair.fromSecretKey(bs58.decode(key));
    const owner = new PublicKey(solanaFeeWallet());
    if (!payer.publicKey.equals(owner)) {
      logger.warn("SOLANA_FEE_COLLECTOR_KEY does not match SOLANA_FEE_WALLET");
      return null;
    }
    return payer;
  } catch {
    logger.warn("SOLANA_FEE_COLLECTOR_KEY is not valid bs58");
    return null;
  }
}

export function isValidSolanaMint(mint: string): boolean {
  return mint === SOLANA_NATIVE_MINT || SOL_ADDR_RE.test(mint);
}

async function mintTokenProgram(mint: string): Promise<PublicKey> {
  const mintPk = new PublicKey(mint);
  const info = await withSolanaConnection((connection) => connection.getAccountInfo(mintPk));
  if (!info) return TOKEN_PROGRAM_ID;
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  return TOKEN_PROGRAM_ID;
}

function deriveFeeAta(feeWallet: string, outputMint: string, tokenProgram: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(
    new PublicKey(outputMint),
    new PublicKey(feeWallet),
    false,
    tokenProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}

export async function isSolanaFeeTokenAccountInitialized(
  feeWallet: string,
  outputMint: string,
): Promise<boolean> {
  if (!isValidSolanaMint(outputMint)) return false;
  const tokenProgram = await mintTokenProgram(outputMint);
  const ata = deriveFeeAta(feeWallet, outputMint, tokenProgram);
  const info = await withSolanaConnection((connection) => connection.getAccountInfo(ata));
  return info != null;
}

/** Create the fee-collector ATA for an output mint when missing. Returns false if unavailable. */
export async function ensureSolanaFeeTokenAccountInitialized(outputMint: string): Promise<boolean> {
  const feeWallet = solanaFeeWallet();
  if (!isValidSolanaMint(outputMint)) return false;
  if (await isSolanaFeeTokenAccountInitialized(feeWallet, outputMint)) return true;

  const payer = feeCollectorKeypair();
  if (!payer) return false;

  const tokenProgram = await mintTokenProgram(outputMint);
  const mintPk = new PublicKey(outputMint);
  const owner = new PublicKey(feeWallet);
  const ata = deriveFeeAta(feeWallet, outputMint, tokenProgram);

  try {
    await withSolanaConnection((connection) =>
      createAssociatedTokenAccountIdempotent(
        connection,
        payer,
        mintPk,
        owner,
        { commitment: "confirmed" },
        tokenProgram,
      ),
    );
    logger.info({ outputMint, ata: ata.toBase58() }, "created solana fee ATA");
  } catch (err) {
    logger.warn({ outputMint, err: (err as Error).message }, "solana fee ATA creation failed");
    return false;
  }

  return isSolanaFeeTokenAccountInitialized(feeWallet, outputMint);
}

/** Derive the fee-collector ATA for a mint (Token vs Token-2022 aware). */
export async function solanaFeeTokenAccountForMint(
  feeWallet: string,
  outputMint: string,
): Promise<string> {
  const tokenProgram = await mintTokenProgram(outputMint);
  return deriveFeeAta(feeWallet, outputMint, tokenProgram).toBase58();
}

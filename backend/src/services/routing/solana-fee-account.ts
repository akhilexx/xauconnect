/**
 * Derive the SPL associated token account that receives Jupiter platform fees.
 */
import { PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

export function solanaFeeTokenAccount(feeWallet: string, outputMint: string): string {
  const owner = new PublicKey(feeWallet);
  const mint = new PublicKey(outputMint);
  return getAssociatedTokenAddressSync(
    mint,
    owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  ).toBase58();
}

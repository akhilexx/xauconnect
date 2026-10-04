/**
 * Map Solana / Jupiter simulation and on-chain errors to stable client codes.
 */

const CODE_BY_HEX: Record<string, string> = {
  "0x1771": "SLIPPAGE_EXCEEDED",
  "0x1782": "SWAP_BUILD_FAILED",
  "0x1789": "SOLANA_FEE_ACCOUNT_REQUIRED",
  "0x178e": "INSUFFICIENT_FUNDS",
};

export function mapSolanaProgramError(err: unknown, logs: string[] = []): string {
  const blob = `${JSON.stringify(err)} ${logs.join(" ")}`;

  for (const [hex, code] of Object.entries(CODE_BY_HEX)) {
    if (blob.includes(hex)) return code;
  }

  if (/slippage|SlippageTolerance/i.test(blob)) return "SLIPPAGE_EXCEEDED";
  if (/InsufficientFunds|insufficient/i.test(blob)) return "INSUFFICIENT_FUNDS";
  if (/InvalidTokenAccount|invalid account/i.test(blob)) return "SOLANA_FEE_ACCOUNT_REQUIRED";
  if (/Blockhash not found|expired/i.test(blob)) return "SOLANA_TX_EXPIRED";
  if (/429|rate limit|max usage/i.test(blob)) return "SOLANA_SUBMIT_FAILED";

  return "SOLANA_SWAP_FAILED";
}

export class SolanaSubmitError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "SolanaSubmitError";
  }
}

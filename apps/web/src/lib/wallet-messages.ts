/** Shared copy — Ethereum/BNB and Solana are separate connect sessions in the browser. */

export const SOLANA_CONNECT_TITLE = "Solana needs a separate connection";

export const SOLANA_CONNECT_BODY_WALLET_ALREADY =
  "Your Ethereum / BNB Chain wallet is connected — but Solana uses a different address. Connect Phantom, Solflare, or Trust Wallet for Solana, even if you already use that app for other networks.";

/** @deprecated use SOLANA_CONNECT_BODY_WALLET_ALREADY */
export const SOLANA_CONNECT_BODY_EVM_ALREADY = SOLANA_CONNECT_BODY_WALLET_ALREADY;

export const SOLANA_CONNECT_BODY =
  "Solana swaps need a Solana wallet (Phantom, Solflare, Trust Wallet, etc.). This is separate from your Ethereum / BNB Chain wallet — same app can hold both, but the site must connect each side once.";

export const SOLANA_CONNECT_TOAST = {
  title: "Connect a Solana wallet",
  description:
    "Solana is separate from your Ethereum / BNB Chain connection — connect Phantom, Solflare, or Trust (Solana) to swap here.",
} as const;

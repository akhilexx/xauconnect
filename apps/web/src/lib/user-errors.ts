import { XauApiError } from "@xauconnect/sdk";

const USER_MESSAGES: Record<string, string> = {
  NO_LIVE_QUOTES:
    "Swaps aren't available for this pair right now. Try a different token or chain.",
  NO_CROSS_CHAIN_ROUTE:
    "No reliable cross-chain route for this pair. Try the underlying token (e.g. AAVE instead of amAAVE) or a stablecoin bridge.",
  ROUTER_NOT_CONFIGURED: "Swaps on this network aren't live yet. Check back soon.",
  SWAP_BUILD_FAILED: "Couldn't prepare this swap. Try again or choose another route.",
  SOLANA_SUBMIT_FAILED:
    "Couldn't broadcast this swap. Try again in a moment or reconnect your Solana wallet.",
  SOLANA_SWAP_FAILED:
    "This swap didn't complete on-chain. Try again with a fresh quote.",
  SOLANA_FEE_ACCOUNT_REQUIRED:
    "This token pair isn't ready for swaps yet — try USDC or check back shortly.",
  SOLANA_TX_EXPIRED:
    "The quote expired before signing. Tap Swap again to refresh the route.",
  SLIPPAGE_EXCEEDED:
    "Price moved too much — increase slippage or try a smaller amount.",
  INSUFFICIENT_FUNDS:
    "Not enough balance to cover the swap and network fees.",
  SWAP_REVERTED:
    "The swap was rejected on-chain. Try again or pick another route.",
  INTERNAL: "Something went wrong. Please try again.",
};

function looksRpcBlocked(message: string): boolean {
  return /403|access forbidden|429|too many requests|rate limit/i.test(message);
}

const INTERNAL_MARKERS =
  /RPC_|API_KEY|ROUTER_ADDRESS|\.env|configure|deploy|aggregator|ONEINCH|ZEROX|JUPITER|HELIUS|nssm|FeeCollector|AggregatorRouter|hardhat/i;

function looksInternal(message: string): boolean {
  return INTERNAL_MARKERS.test(message);
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err ?? "");
}

/** Never show backend ops / env hints to end users. */
export function userFacingError(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (err instanceof XauApiError && USER_MESSAGES[err.code]) {
    return USER_MESSAGES[err.code]!;
  }
  const message = extractMessage(err);
  if (USER_MESSAGES[message]) return USER_MESSAGES[message]!;
  if (/evm wallet/i.test(message)) {
    return "Connect your wallet to complete this swap.";
  }
  if (/is not an Object|"data" in|invalid struct/i.test(message)) {
    return "Your wallet didn't respond — reopen it and try again.";
  }
  if (/user rejected|user denied|rejected the request|cancelled|canceled|4001/i.test(message)) {
    return "Transaction cancelled in your wallet.";
  }
  if (/cover network fees|enough.*\b(ETH|POL|BNB|AVAX|SOL)\b/i.test(message)) {
    return "Network fees are paid in the chain's native token (e.g. POL on Polygon). Keep a small amount in your wallet before swapping — even when you're buying that token.";
  }
  if (/not enough|insufficient|NOT_ENOUGH_BALANCE/i.test(message)) {
    return "Not enough balance for this amount — try Max or a smaller amount.";
  }
  if (/connect your wallet/i.test(message)) return message;
  if (looksRpcBlocked(message)) {
    return "Network is busy — wait a moment and try again.";
  }
  if (!message || looksInternal(message)) return fallback;
  return message.length > 160 ? `${message.slice(0, 157)}…` : message;
}

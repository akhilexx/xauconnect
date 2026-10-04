import { getChainByKey, type TokenInfo } from "@xauconnect/utils";
import { toast } from "@xauconnect/ui";

export function explorerTxUrl(chainKey: string, txHash: string): string | undefined {
  const chain = getChainByKey(chainKey);
  if (!chain?.explorerUrl) return undefined;
  const base = chain.explorerUrl.replace(/\/$/, "");
  return `${base}/tx/${txHash}`;
}

export interface SwapSuccessDetails {
  chainKey: string;
  tokenIn: Pick<TokenInfo, "symbol">;
  tokenOut: Pick<TokenInfo, "symbol">;
  amountInFormatted: string;
  amountOutFormatted: string;
  txHash: string;
}

/** Confirmed swap toast with amounts + explorer link (all chains). */
export function showSwapConfirmedToast(details: SwapSuccessDetails): void {
  const url = explorerTxUrl(details.chainKey, details.txHash);
  const summary = `${details.amountInFormatted} ${details.tokenIn.symbol} → ${details.amountOutFormatted} ${details.tokenOut.symbol}`;

  toast.success("Swap confirmed", {
    description: url ? `${summary}\n${url}` : summary,
    duration: 12_000,
    action: url
      ? {
          label: "View tx",
          onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
        }
      : undefined,
  });
}

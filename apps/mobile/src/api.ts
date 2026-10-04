/**
 * Lightweight API client for the XAUConnect backend.
 *
 * Mirrors packages/sdk XauApiClient. The Expo app lives outside the pnpm
 * workspace (Metro manages its own node_modules), so the relevant client
 * surface is duplicated here — keep the endpoints in sync with the SDK.
 */
import Constants from "expo-constants";

const BASE_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as any)?.error?.message ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export interface MarketToken {
  chainKey: string;
  address: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change24hPct: number;
  volume24hUsd: number;
  liquidityUsd: number;
  marketCapUsd?: number;
  holders?: number;
  logoURI?: string;
  xauLaunch: boolean;
}

export interface RouteQuote {
  dexId: string;
  dexName: string;
  amountOutAfterFee: string;
  protocolFee: string;
  priceImpactBps: number;
  simulated: boolean;
}

export interface AggregatedQuote {
  quotes: RouteQuote[];
  best: RouteQuote | null;
  protocolFeeBps: number;
}

export interface TokenInfo {
  chainKey: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface WalletBalance {
  chainKey: string;
  symbol: string;
  balanceFormatted: string;
  usdValue: number;
}

export interface WalletTx {
  id: string;
  kind: string;
  chainKey: string;
  symbol: string;
  amount: string;
  usdValue: number;
  hash: string;
  timestamp: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface LaunchFeedItem {
  id: string;
  type: string;
  status: string;
  token: { chainKey: string; address: string; symbol: string; name: string; logoURI?: string };
}

export interface TokenLaunchRequest {
  chainKey: string;
  name: string;
  symbol: string;
  totalSupply: string;
  description: string;
  launchType: "standard" | "bonding-curve";
  feeCurrency: "native" | "usdc" | "xau";
  creator: string;
}

export const api = {
  discovery: (tab: string, chainKey?: string) =>
    request<{ tokens: MarketToken[] }>(
      `/market/discovery/${tab}${chainKey ? `?chainKey=${chainKey}` : ""}`,
    ),
  tokenDetail: (chainKey: string, address: string) =>
    request<{ token: MarketToken }>(`/market/token/${chainKey}/${address}`),
  candles: (chainKey: string, address: string, interval: "15m" | "1h" | "4h" | "1d" = "1h") =>
    request<{ candles: Candle[] }>(
      `/market/candles/${chainKey}/${address}?interval=${interval}`,
    ),
  tokens: (chainKey: string) =>
    request<{ tokens: TokenInfo[] }>(`/swap/tokens?chainKey=${chainKey}`),
  quote: (input: { chainKey: string; tokenIn: string; tokenOut: string; amountIn: string }) =>
    request<AggregatedQuote>("/swap/quote", { method: "POST", body: JSON.stringify(input) }),
  walletBalances: (address: string) =>
    request<{ balances: WalletBalance[]; live: boolean }>(`/wallet/${address}/balances`),
  walletHistory: (address: string) =>
    request<{ history: WalletTx[] }>(`/wallet/${address}/history`),
  launches: () => request<{ launches: LaunchFeedItem[] }>("/launchpad/launches"),
  prepareLaunch: (launch: TokenLaunchRequest) =>
    request<{ metadataURI: string; contractCall: { contract: string; method: string }; feeCurrency: string }>(
      "/launchpad/prepare",
      { method: "POST", body: JSON.stringify(launch) },
    ),
};

export { formatUsd } from "@xauconnect/utils";

export function formatPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

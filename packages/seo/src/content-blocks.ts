/**
 * Reusable prose blocks for SEO content — combined with page-specific tokens
 * and seeded variant selection so ~20k pages do not share identical paragraphs.
 */
import { BRAND_NAME } from "@xauconnect/utils";

export interface ChainFacts {
  name: string;
  native: string;
  kind: "evm" | "solana";
  explorer: string;
  gasProfile: string;
  liquidityNote: string;
  walletNote: string;
  avgBlockTime: string;
}

export const CHAIN_FACTS: Record<string, ChainFacts> = {
  ethereum: {
    name: "Ethereum",
    native: "ETH",
    kind: "evm",
    explorer: "Etherscan",
    gasProfile: "Gas on Ethereum spikes during NFT mints and macro volatility; batch approvals when possible and quote again if your transaction sits pending for more than a few minutes.",
    liquidityNote: "Ethereum mainnet still anchors the deepest stablecoin and ETH pairs globally, which is why large notional trades often route here first even when L2 fees are lower.",
    walletNote: "MetaMask, Rabby, Coinbase Wallet, and WalletConnect-compatible wallets all work on Ethereum mainnet.",
    avgBlockTime: "~12 seconds",
  },
  bsc: {
    name: "BNB Chain",
    native: "BNB",
    kind: "evm",
    explorer: "BscScan",
    gasProfile: "BNB Chain fees are typically a fraction of a cent, making it attractive for frequent rebalancing — still leave extra BNB for approve + swap in the same session.",
    liquidityNote: "PancakeSwap-style pools and BNB-native memecoins dominate volume; USDT and USDC pairs are the usual anchors for sizing trades.",
    walletNote: "MetaMask and Trust Wallet users should confirm they are on BNB Chain (chain id 56) before signing.",
    avgBlockTime: "~3 seconds",
  },
  polygon: {
    name: "Polygon",
    native: "POL",
    kind: "evm",
    explorer: "Polygonscan",
    gasProfile: "Polygon gas is inexpensive but not zero — keep a small POL balance for approvals and failed-tx retries.",
    liquidityNote: "QuickSwap and Uniswap v3 forks provide broad token coverage; bridged assets may have thinner local liquidity than native Ethereum listings.",
    walletNote: "Any EVM wallet with Polygon network added can connect; verify the network badge before approving.",
    avgBlockTime: "~2 seconds",
  },
  arbitrum: {
    name: "Arbitrum One",
    native: "ETH",
    kind: "evm",
    explorer: "Arbiscan",
    gasProfile: "Arbitrum charges L2 execution fees in ETH while posting data to Ethereum — quotes include gas estimates but mempool congestion can still delay confirmation.",
    liquidityNote: "Arbitrum concentrates DeFi-native liquidity for ETH, USDC, and ARB ecosystem tokens; bridged assets from other L2s may require an extra hop.",
    walletNote: "Use an Arbitrum-configured EVM wallet; bridged ETH is still ETH on this network for gas.",
    avgBlockTime: "~0.25 seconds (soft)",
  },
  base: {
    name: "Base",
    native: "ETH",
    kind: "evm",
    explorer: "Basescan",
    gasProfile: "Base offers low L2 gas with Coinbase-ecosystem inflows; weekend congestion is usually mild compared to mainnet.",
    liquidityNote: "Base has grown quickly for memecoins and consumer apps — verify contract age and liquidity depth on newer tickers.",
    walletNote: "Coinbase Wallet, MetaMask, and Rabby support Base; confirm chain id 8453 in the wallet header.",
    avgBlockTime: "~2 seconds",
  },
  avalanche: {
    name: "Avalanche C-Chain",
    native: "AVAX",
    kind: "evm",
    explorer: "Snowtrace",
    gasProfile: "AVAX gas is moderate; Trader Joe and Pangolin pools cover most major assets on C-Chain.",
    liquidityNote: "Subnet activity does not automatically mean C-Chain liquidity — always check the pair on C-Chain explorers.",
    walletNote: "Add Avalanche C-Chain to your EVM wallet; do not confuse with X-Chain or P-Chain addresses.",
    avgBlockTime: "~2 seconds",
  },
  solana: {
    name: "Solana",
    native: "SOL",
    kind: "solana",
    explorer: "Solscan",
    gasProfile: "Solana prioritization fees can rise during hot mints; if a Jupiter route fails simulation, retry with a slightly higher priority fee or reduce trade size.",
    liquidityNote: "Raydium, Orca, and Jupiter-routed paths cover most SPL tokens; always confirm mint address, not just ticker symbol.",
    walletNote: "Phantom, Solflare, Backpack, and WalletConnect Solana sessions are supported.",
    avgBlockTime: "~400 ms",
  },
};

export function chainFacts(chainKey?: string): ChainFacts {
  return CHAIN_FACTS[chainKey ?? "ethereum"] ?? CHAIN_FACTS.ethereum!;
}

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickVariant<T>(items: readonly T[], seed: number, offset = 0): T {
  return items[(seed + offset) % items.length]!;
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function joinParagraphs(...parts: (string | null | undefined)[]): string {
  return parts.filter((p): p is string => Boolean(p)).join("\n\n");
}

export const RISK_FOOTER = `${BRAND_NAME} is non-custodial: you sign transactions in your own wallet. Digital assets are volatile; nothing here is investment advice. Verify contract addresses on the official explorer before approving.`;

/** Format a USD price with sensible precision for tokens of any magnitude. */
export function formatUsdPrice(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  if (value >= 0.0001) return `$${value.toFixed(6)}`;
  return `$${value.toExponential(2)}`;
}

/** Compact USD for volume / liquidity / market cap (e.g. $1.2M, $3.4B). */
export function formatCompactUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

/** Signed percentage, e.g. +4.21% / -1.80%. */
export function formatSignedPct(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export interface MarketFigures {
  priceUsd?: number;
  change24hPct?: number;
  volume24hUsd?: number;
  marketCapUsd?: number;
  liquidityUsd?: number;
  marketCapRank?: number;
  asOf?: string;
}

/** Has at least a real price to render a data-backed block. */
export function hasMarketData(m?: MarketFigures | null): boolean {
  return Boolean(m && typeof m.priceUsd === "number" && m.priceUsd > 0);
}

/**
 * A factual, data-backed sentence describing current market figures.
 * Returns null when there is no real price (so we never fabricate numbers).
 */
export function marketSummarySentence(symbol: string, m?: MarketFigures | null): string | null {
  if (!hasMarketData(m)) return null;
  const parts: string[] = [];
  const asOf = m!.asOf ? ` (as of ${m!.asOf})` : "";
  parts.push(`As of the latest data refresh${asOf}, ${symbol} trades around ${formatUsdPrice(m!.priceUsd!)}`);
  if (typeof m!.change24hPct === "number" && Number.isFinite(m!.change24hPct)) {
    const dir = m!.change24hPct >= 0 ? "up" : "down";
    parts.push(`${dir} ${formatSignedPct(Math.abs(m!.change24hPct))} over 24 hours`);
  }
  let tail = "";
  if (m!.marketCapUsd && m!.marketCapUsd > 0) {
    tail += ` Market capitalization is approximately ${formatCompactUsd(m!.marketCapUsd)}`;
    if (m!.marketCapRank) tail += ` (rank #${m!.marketCapRank})`;
    tail += ".";
  }
  if (m!.volume24hUsd && m!.volume24hUsd > 0) {
    tail += ` Reported 24h trading volume is ${formatCompactUsd(m!.volume24hUsd)}`;
    if (m!.liquidityUsd && m!.liquidityUsd > 0) {
      tail += ` against ${formatCompactUsd(m!.liquidityUsd)} of on-chain liquidity`;
    }
    tail += ".";
  }
  return `${parts.join(", ")}.${tail}`;
}

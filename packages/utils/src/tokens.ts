/**
 * XAUConnect — Curated default token lists per chain.
 *
 * The full searchable list is hydrated at runtime from CoinGecko/DexScreener;
 * these are the always-available majors used to seed the swap UI.
 */
import { NATIVE_TOKEN_ADDRESS, SOLANA_NATIVE_MINT } from "./chains.js";

export type TokenInfo = {
  chainKey: string;
  /** Contract address (EVM) or mint (Solana). Native uses the pseudo-address. */
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  /** CoinGecko id used for logo + price lookups. */
  coingeckoId?: string;
  logoURI?: string;
  /** Product catalog metadata (optional). */
  marketCapRank?: number;
  tags?: string[];
};

export const DEFAULT_TOKENS: readonly TokenInfo[] = [
  // ── Ethereum ───────────────────────────────────────────────────────────────
  { chainKey: "ethereum", address: NATIVE_TOKEN_ADDRESS, symbol: "ETH", name: "Ether", decimals: 18, coingeckoId: "ethereum" },
  { chainKey: "ethereum", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18, coingeckoId: "weth" },
  { chainKey: "ethereum", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6, coingeckoId: "usd-coin" },
  { chainKey: "ethereum", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6, coingeckoId: "tether" },
  { chainKey: "ethereum", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, coingeckoId: "dai" },
  { chainKey: "ethereum", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8, coingeckoId: "wrapped-bitcoin" },
  { chainKey: "ethereum", address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK", name: "Chainlink", decimals: 18, coingeckoId: "chainlink" },
  { chainKey: "ethereum", address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI", name: "Uniswap", decimals: 18, coingeckoId: "uniswap" },
  { chainKey: "ethereum", address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", symbol: "SHIB", name: "Shiba Inu", decimals: 18, coingeckoId: "shiba-inu" },
  { chainKey: "ethereum", address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", symbol: "PEPE", name: "Pepe", decimals: 18, coingeckoId: "pepe" },

  // ── BNB Chain ──────────────────────────────────────────────────────────────
  { chainKey: "bsc", address: NATIVE_TOKEN_ADDRESS, symbol: "BNB", name: "BNB", decimals: 18, coingeckoId: "binancecoin" },
  { chainKey: "bsc", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", symbol: "WBNB", name: "Wrapped BNB", decimals: 18, coingeckoId: "wbnb" },
  { chainKey: "bsc", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18, coingeckoId: "usd-coin" },
  { chainKey: "bsc", address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether USD", decimals: 18, coingeckoId: "tether" },
  { chainKey: "bsc", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", symbol: "CAKE", name: "PancakeSwap", decimals: 18, coingeckoId: "pancakeswap-token" },
  { chainKey: "bsc", address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", symbol: "ETH", name: "Binance-Peg Ether", decimals: 18, coingeckoId: "ethereum" },

  // ── Polygon ────────────────────────────────────────────────────────────────
  { chainKey: "polygon", address: NATIVE_TOKEN_ADDRESS, symbol: "POL", name: "Polygon Ecosystem Token", decimals: 18, coingeckoId: "polygon-ecosystem-token" },
  { chainKey: "polygon", address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", symbol: "WPOL", name: "Wrapped POL", decimals: 18, coingeckoId: "wmatic" },
  { chainKey: "polygon", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6, coingeckoId: "usd-coin" },
  { chainKey: "polygon", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether USD", decimals: 6, coingeckoId: "tether" },
  { chainKey: "polygon", address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", symbol: "WETH", name: "Wrapped Ether", decimals: 18, coingeckoId: "weth" },

  // ── Arbitrum ───────────────────────────────────────────────────────────────
  { chainKey: "arbitrum", address: NATIVE_TOKEN_ADDRESS, symbol: "ETH", name: "Ether", decimals: 18, coingeckoId: "ethereum" },
  { chainKey: "arbitrum", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", name: "Wrapped Ether", decimals: 18, coingeckoId: "weth" },
  { chainKey: "arbitrum", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6, coingeckoId: "usd-coin" },
  { chainKey: "arbitrum", address: "0x912CE59144191C1204E64559FE8253a0e49E6548", symbol: "ARB", name: "Arbitrum", decimals: 18, coingeckoId: "arbitrum" },
  { chainKey: "arbitrum", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether USD", decimals: 6, coingeckoId: "tether" },

  // ── Base ───────────────────────────────────────────────────────────────────
  { chainKey: "base", address: NATIVE_TOKEN_ADDRESS, symbol: "ETH", name: "Ether", decimals: 18, coingeckoId: "ethereum" },
  { chainKey: "base", address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18, coingeckoId: "weth" },
  { chainKey: "base", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6, coingeckoId: "usd-coin" },
  { chainKey: "base", address: "0x532f27101965dd16442E59d40670FaF5eBB142E4", symbol: "BRETT", name: "Brett", decimals: 18, coingeckoId: "based-brett" },
  { chainKey: "base", address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", symbol: "AERO", name: "Aerodrome", decimals: 18, coingeckoId: "aerodrome-finance" },

  // ── Avalanche ──────────────────────────────────────────────────────────────
  { chainKey: "avalanche", address: NATIVE_TOKEN_ADDRESS, symbol: "AVAX", name: "Avalanche", decimals: 18, coingeckoId: "avalanche-2" },
  { chainKey: "avalanche", address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", symbol: "WAVAX", name: "Wrapped AVAX", decimals: 18, coingeckoId: "wrapped-avax" },
  { chainKey: "avalanche", address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", name: "USD Coin", decimals: 6, coingeckoId: "usd-coin" },
  { chainKey: "avalanche", address: "0x60781C2586D68229fde47564546784ab3fACA982", symbol: "PNG", name: "Pangolin", decimals: 18, coingeckoId: "pangolin" },

  // ── Solana ─────────────────────────────────────────────────────────────────
  { chainKey: "solana", address: SOLANA_NATIVE_MINT, symbol: "SOL", name: "Solana", decimals: 9, coingeckoId: "solana" },
  { chainKey: "solana", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "USDC", name: "USD Coin", decimals: 6, coingeckoId: "usd-coin" },
  { chainKey: "solana", address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", symbol: "USDT", name: "Tether USD", decimals: 6, coingeckoId: "tether" },
  { chainKey: "solana", address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", name: "Bonk", decimals: 5, coingeckoId: "bonk" },
  { chainKey: "solana", address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", symbol: "WIF", name: "dogwifhat", decimals: 6, coingeckoId: "dogwifcoin" },
  { chainKey: "solana", address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", symbol: "JUP", name: "Jupiter", decimals: 6, coingeckoId: "jupiter-exchange-solana" },
] as const;

export function getTokensForChain(chainKey: string): TokenInfo[] {
  return DEFAULT_TOKENS.filter((t) => t.chainKey === chainKey);
}

export function findToken(chainKey: string, address: string): TokenInfo | undefined {
  const lower = address.toLowerCase();
  return DEFAULT_TOKENS.find(
    (t) => t.chainKey === chainKey && t.address.toLowerCase() === lower,
  );
}

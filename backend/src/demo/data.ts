/**
 * Demo fallback dataset — used whenever a live integration (CoinGecko,
 * DexScreener, 1inch, RPC...) is unavailable or unkeyed, so the entire
 * platform remains fully navigable offline.
 *
 * Numbers are deterministic per (seed, day) so the UI looks alive but stable.
 */
import { DEFAULT_TOKENS, type MarketToken, type Candle } from "@xauconnect/utils";

/** Mulberry32 — tiny deterministic PRNG. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable reference USD prices for the majors (demo only). */
const REFERENCE_PRICES: Record<string, number> = {
  ethereum: 3400,
  weth: 3400,
  "usd-coin": 1,
  tether: 1,
  dai: 1,
  "wrapped-bitcoin": 67000,
  chainlink: 16,
  uniswap: 9.5,
  "shiba-inu": 0.000019,
  pepe: 0.0000125,
  binancecoin: 590,
  wbnb: 590,
  "pancakeswap-token": 2.6,
  "polygon-ecosystem-token": 0.48,
  wmatic: 0.48,
  arbitrum: 0.85,
  "based-brett": 0.09,
  "aerodrome-finance": 1.15,
  "avalanche-2": 29,
  "wrapped-avax": 29,
  pangolin: 0.35,
  solana: 155,
  bonk: 0.000023,
  dogwifcoin: 1.9,
  "jupiter-exchange-solana": 0.82,
};

export function demoUsdPrice(coingeckoId?: string, fallbackSeed = "x"): number {
  if (coingeckoId && REFERENCE_PRICES[coingeckoId] !== undefined) {
    return REFERENCE_PRICES[coingeckoId];
  }
  // Meme-coin price in the micro range, deterministic per token.
  const r = rng(hashSeed(coingeckoId ?? fallbackSeed));
  return 0.000001 * (1 + r() * 400);
}

const MEME_NAMES: Array<[string, string]> = [
  ["Golden Doge", "GDOGE"],
  ["Liquid Cat", "LQCAT"],
  ["Aurum Pepe", "AUPEPE"],
  ["Moon Nugget", "NUGGET"],
  ["Glass Frog", "GFROG"],
  ["Midas Inu", "MIDAS"],
  ["Pink Bull", "PBULL"],
  ["Solar Hamster", "SHAM"],
  ["Gilded Whale", "GWHALE"],
  ["Bubble Bear", "BBLE"],
  ["Karat Koala", "KARAT"],
  ["Nano Lion", "NLION"],
];

/** Synthesized meme tokens that appear in the discovery feed (demo mode). */
export function demoMemeTokens(): MarketToken[] {
  const chains = ["ethereum", "bsc", "base", "solana"] as const;
  return MEME_NAMES.map(([name, symbol], i) => {
    const chainKey = chains[i % chains.length]!;
    const r = rng(hashSeed(`${symbol}-${chainKey}`));
    const priceUsd = demoUsdPrice(undefined, symbol);
    const launchedDaysAgo = Math.floor(r() * 14);
    return {
      chainKey,
      address:
        chainKey === "solana"
          ? `${symbol.padEnd(4, "x")}DemoMint11111111111111111111111111`.slice(0, 44)
          : `0x${(hashSeed(symbol) >>> 0).toString(16).padStart(8, "0").repeat(5)}`.slice(0, 42),
      symbol,
      name,
      priceUsd,
      change1hPct: (r() - 0.45) * 12,
      change24hPct: (r() - 0.4) * 90,
      volume24hUsd: 50_000 + r() * 4_000_000,
      liquidityUsd: 30_000 + r() * 1_500_000,
      marketCapUsd: 200_000 + r() * 40_000_000,
      holders: Math.floor(150 + r() * 25_000),
      createdAt: Date.now() - launchedDaysAgo * 86_400_000,
      xauLaunch: i % 3 === 0, // every third demo meme "launched on XAUConnect"
      auditBadge: i % 3 === 0 ? ("verified" as const) : ("none" as const),
    };
  });
}

/** Majors as MarketTokens (demo mode). */
export function demoMajorTokens(): MarketToken[] {
  return DEFAULT_TOKENS.filter((t) => !t.address.startsWith("0xEeee")).map((t) => {
    const r = rng(hashSeed(`${t.symbol}-${t.chainKey}-major`));
    const priceUsd = demoUsdPrice(t.coingeckoId, t.symbol);
    return {
      chainKey: t.chainKey,
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      priceUsd,
      change1hPct: (r() - 0.5) * 2,
      change24hPct: (r() - 0.5) * 10,
      volume24hUsd: 5_000_000 + r() * 500_000_000,
      liquidityUsd: 10_000_000 + r() * 800_000_000,
      marketCapUsd: 100_000_000 + r() * 50_000_000_000,
      holders: Math.floor(50_000 + r() * 2_000_000),
      xauLaunch: false,
      auditBadge: "verified" as const,
      logoURI: undefined,
      createdAt: undefined,
    };
  });
}

/** Deterministic OHLCV random walk for charts (demo mode). */
export function demoCandles(
  seedKey: string,
  basePrice: number,
  intervalSeconds: number,
  count: number,
): Candle[] {
  const r = rng(hashSeed(seedKey));
  const now = Math.floor(Date.now() / 1000);
  const start = now - intervalSeconds * count;
  const candles: Candle[] = [];
  let price = basePrice * (0.75 + r() * 0.5);

  for (let i = 0; i < count; i++) {
    const drift = (r() - 0.495) * 0.04;
    const open = price;
    const close = Math.max(open * (1 + drift), basePrice * 0.05);
    const high = Math.max(open, close) * (1 + r() * 0.015);
    const low = Math.min(open, close) * (1 - r() * 0.015);
    candles.push({
      time: start + i * intervalSeconds,
      open,
      high,
      low,
      close,
      volume: basePrice * (10_000 + r() * 200_000),
    });
    price = close;
  }
  return candles;
}

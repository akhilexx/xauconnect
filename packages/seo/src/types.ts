import { z } from "zod";

export const SEO_PAGE_KINDS = [
  "chain",
  "swap-hub",
  "swap-token",
  "buy",
  "sell",
  "meme-hub",
  "meme-token",
  "launch",
  "discover",
  "trade",
  "pair",
  "cross-chain-swap",
  "cross-chain-search",
  "learn",
  "guide",
  "search",
  "token-deep",
] as const;

export type SeoPageKind = (typeof SEO_PAGE_KINDS)[number];

/** Real market data baked into a page at generation time (CoinGecko/DexScreener). */
export const MarketDataSchema = z.object({
  priceUsd: z.number().optional(),
  change24hPct: z.number().optional(),
  volume24hUsd: z.number().optional(),
  marketCapUsd: z.number().optional(),
  liquidityUsd: z.number().optional(),
  marketCapRank: z.number().optional(),
  /** ISO date (YYYY-MM-DD) the figures were captured. */
  asOf: z.string().optional(),
  source: z.string().optional(),
});

export type MarketData = z.infer<typeof MarketDataSchema>;

export const SeoFaqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const SeoSectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
});

export const SeoPageConfigSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(SEO_PAGE_KINDS),
  path: z.string().min(1),
  chainKey: z.string().optional(),
  fromChainKey: z.string().optional(),
  toChainKey: z.string().optional(),
  tokenSlug: z.string().optional(),
  pairSlug: z.string().optional(),
  slug: z.string().optional(),
  title: z.string().min(1),
  h1: z.string().min(1),
  description: z.string().min(1),
  eyebrow: z.string().optional(),
  intro: z.string().min(1),
  sections: z.array(SeoSectionSchema).min(1),
  faqs: z.array(SeoFaqSchema).min(1),
  relatedPaths: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  tokenAddress: z.string().optional(),
  tokenSymbol: z.string().optional(),
  tokenName: z.string().optional(),
  marketData: MarketDataSchema.optional(),
  swapPreset: z
    .object({
      tokenOut: z.string().optional(),
      tokenIn: z.string().optional(),
      fromChainKey: z.string().optional(),
      toChainKey: z.string().optional(),
    })
    .optional(),
  canonicalPath: z.string().optional(),
  priority: z.number().optional(),
  noindex: z.boolean().optional(),
  enriched: z.boolean().optional(),
  relatedLinks: z
    .array(
      z.object({
        path: z.string(),
        title: z.string(),
        description: z.string(),
        category: z.enum(["token", "article", "chain", "guide", "pair", "hub"]),
      }),
    )
    .optional(),
});

export type SeoFaq = z.infer<typeof SeoFaqSchema>;
export type SeoSection = z.infer<typeof SeoSectionSchema>;
export type SeoPageConfig = z.infer<typeof SeoPageConfigSchema>;

export const TokenCatalogEntrySchema = z.object({
  chainKey: z.string(),
  address: z.string(),
  symbol: z.string(),
  name: z.string(),
  slug: z.string(),
  decimals: z.number().int().positive(),
  coingeckoId: z.string().optional(),
  logoURI: z.string().optional(),
  isMeme: z.boolean().optional(),
  marketCapRank: z.number().optional(),
  market: MarketDataSchema.optional(),
});

export type TokenCatalogEntry = z.infer<typeof TokenCatalogEntrySchema>;

export const PairCatalogEntrySchema = z.object({
  chainKey: z.string(),
  pairSlug: z.string(),
  baseSymbol: z.string(),
  quoteSymbol: z.string(),
  baseAddress: z.string(),
  quoteAddress: z.string(),
  title: z.string(),
});

export type PairCatalogEntry = z.infer<typeof PairCatalogEntrySchema>;

export const LearnEntrySchema = z.object({
  slug: z.string(),
  kind: z.enum(["learn", "guide"]),
  title: z.string(),
  h1: z.string(),
  description: z.string(),
  eyebrow: z.string().optional(),
  topic: z.string().optional(),
});

export type LearnEntry = z.infer<typeof LearnEntrySchema>;

export const SearchEntrySchema = z.object({
  slug: z.string(),
  phrase: z.string(),
  title: z.string(),
  h1: z.string(),
  description: z.string(),
  eyebrow: z.string().optional(),
  chainKey: z.string().optional(),
  tokenSymbol: z.string().optional(),
  tokenInSymbol: z.string().optional(),
  tokenOutSymbol: z.string().optional(),
  keywords: z.array(z.string()).default([]),
});

export type SearchEntry = z.infer<typeof SearchEntrySchema>;

export const CrossChainEntrySchema = z.object({
  fromChainKey: z.string(),
  toChainKey: z.string(),
  pairSlug: z.string(),
  tokenInSymbol: z.string(),
  tokenOutSymbol: z.string(),
  tokenInAddress: z.string(),
  tokenOutAddress: z.string(),
  title: z.string(),
  h1: z.string(),
  description: z.string(),
});

export type CrossChainEntry = z.infer<typeof CrossChainEntrySchema>;

export const CrossChainSearchEntrySchema = SearchEntrySchema.extend({
  fromChainKey: z.string(),
  toChainKey: z.string(),
});

export type CrossChainSearchEntry = z.infer<typeof CrossChainSearchEntrySchema>;

export const RegistryManifestSchema = z.object({
  generatedAt: z.string(),
  pageCount: z.number().int(),
  checksum: z.string(),
  counts: z.record(z.string(), z.number()),
});

export type RegistryManifest = z.infer<typeof RegistryManifestSchema>;

export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://xauconnect.com";

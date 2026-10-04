/**
 * XAUConnect backend — environment configuration (zod-validated).
 * Production requires DATABASE_URL, RPC_* endpoints, and aggregator API keys.
 */
import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().default("dev-secret-change-me"),
  ADMIN_ADDRESSES: z.string().default(""),
  /** Credentials for the /admin/login console (override via env). */
  ADMIN_EMAIL: z.string().default(""),
  ADMIN_PASSWORD: z.string().default(""),
  CORS_ORIGINS: z
    .string()
    .default(
      "http://localhost:3000,http://localhost:5555,https://xauconnect.com,https://www.xauconnect.com",
    ),

  PROTOCOL_FEE_BPS_DEFAULT: z.coerce.number().min(0).max(10_000).default(30),
  /** Jupiter platformFeeBps when admin DB config is absent (500 = 5%). */
  JUPITER_PLATFORM_FEE_BPS: z.coerce.number().min(0).max(10_000).default(500),
  /** 1inch / 0x integrator fee when admin DB config is absent (300 = 3%). */
  EVM_INTEGRATOR_FEE_BPS: z.coerce.number().min(0).max(10_000).default(300),
  LP_FEE_BPS: z.coerce.number().min(0).max(100).default(10),
  LAUNCHPAD_CURVE_FEE_BPS: z.coerce.number().default(100),

  // RPC overrides (defaults live in the chain registry)
  RPC_ETHEREUM: z.string().optional(),
  RPC_BSC: z.string().optional(),
  RPC_POLYGON: z.string().optional(),
  RPC_ARBITRUM: z.string().optional(),
  RPC_BASE: z.string().optional(),
  RPC_AVALANCHE: z.string().optional(),
  RPC_SOLANA: z.string().optional(),

  // External API keys — all optional
  ONEINCH_API_KEY: z.string().optional(),
  /** 1inch Business API host — both .com and .dev work with the same key (see docs/SWAP_EXECUTION.md). */
  ONEINCH_API_BASE: z.string().url().default("https://api.1inch.com"),
  ZEROX_API_KEY: z.string().optional(),
  PARASWAP_API_KEY: z.string().optional(),
  JUPITER_API_KEY: z.string().optional(),
  COINGECKO_API_KEY: z.string().optional(),
  BIRDEYE_API_KEY: z.string().optional(),
  WEB3_STORAGE_TOKEN: z.string().optional(),

  // ── Fiat on-ramp / off-ramp (Buy & Sell crypto) — Onramper aggregator ──
  /** Server-side secret key (pk_prod_… / sk_…) used for quote + checkout proxy. */
  ONRAMPER_API_KEY: z.string().optional(),
  /** Public publishable key for client-side widget URLs (pk_prod_…). */
  ONRAMPER_PUBLISHABLE_KEY: z.string().optional(),
  /** Webhook signing secret used to authenticate Onramper status callbacks. */
  ONRAMPER_WEBHOOK_SECRET: z.string().optional(),
  /** API host — prod by default; set to staging during sandbox testing. */
  ONRAMPER_API_BASE: z.string().url().default("https://api.onramper.com"),
  /** Hosted widget host used for the checkout hand-off. */
  ONRAMPER_WIDGET_HOST: z.string().url().default("https://buy.onramper.com"),

  // ── Fiat on-ramp / off-ramp — Transak (Merchant of Record; instant staging) ──
  /** Partner API key (Partner Dashboard → Developers). Staging key is instant. */
  TRANSAK_API_KEY: z.string().optional(),
  /** Partner API secret — used only server-side to sign URLs / verify webhooks. */
  TRANSAK_API_SECRET: z.string().optional(),
  /** "staging" (sandbox, no KYB) or "production" (after KYB approval). */
  TRANSAK_ENVIRONMENT: z.enum(["staging", "production"]).default("staging"),

  /**
   * Preferred fiat provider when more than one is configured:
   * "transak" | "onramper" | "auto" (first enabled by priority). Default auto.
   */
  ONRAMP_PROVIDER: z.enum(["auto", "transak", "onramper"]).default("auto"),

  /** Protocol hot wallets — integrator fees (API path) and FeeCollector withdrawal target. */
  PROTOCOL_FEE_COLLECTOR_EVM: z.string().optional(),
  PROTOCOL_TREASURY_EVM: z.string().optional(),
  PROTOCOL_OPERATIONS_EVM: z.string().optional(),
  SOLANA_FEE_WALLET: z.string().optional(),
  /** bs58 secret — creates Jupiter fee ATAs on demand when an output mint is new. */
  SOLANA_FEE_COLLECTOR_KEY: z.string().optional(),
  /** Mainnet Meteora DBC partner configs (Fair / Shield / Distribute × SOL / USDC). */
  DBC_CONFIG_FAIR_SOL: z.string().optional(),
  DBC_CONFIG_FAIR_USDC: z.string().optional(),
  DBC_CONFIG_SHIELD_SOL: z.string().optional(),
  DBC_CONFIG_SHIELD_USDC: z.string().optional(),
  DBC_CONFIG_DISTRIBUTE_SOL: z.string().optional(),
  DBC_CONFIG_DISTRIBUTE_USDC: z.string().optional(),

  /** Run the chain indexer worker on its own host. */
  INDEXER_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  INDEXER_ROLE: z.enum(["worker", "none"]).default("none"),
  INDEXER_HEALTH_PORT: z.coerce.number().default(4100),
  /** db | hybrid | external — market API data source preference */
  MARKET_SOURCE: z.enum(["db", "hybrid", "external"]).default("hybrid"),
  HELIUS_API_KEY: z.string().optional(),
  /** Signs FeeCollector.setSwapFeeBps when admin saves fees (deployer / FEE_MANAGER role). */
  FEE_MANAGER_PRIVATE_KEY: z.string().optional(),
  DEPLOYER_PRIVATE_KEY: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);

export const adminAddresses = new Set(
  env.ADMIN_ADDRESSES.split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean),
);

export const corsOrigins = env.CORS_ORIGINS.split(",").map((o) => o.trim());

/** Resolve the RPC URL for a chain key, env-override first. */
export function rpcUrl(chainKey: string, fallback: string): string {
  const key = `RPC_${chainKey.toUpperCase()}` as keyof typeof env;
  return (env[key] as string | undefined) ?? fallback;
}

/**
 * XAUConnect — DEX & LP provider registry (the aggregation matrix).
 *
 * Every venue XAUConnect routes through. The backend instantiates one
 * `DexAdapter` per entry; the on-chain `AggregatorRouter` keeps a mirrored
 * adapter registry so the protocol fee is captured on every swap.
 *
 * IMPORTANT: router/factory addresses below are the well-known canonical
 * deployments. ALWAYS re-verify against each protocol's official docs before
 * pointing mainnet funds at them (see README "Mainnet checklist").
 */

export type DexProtocol =
  | "uniswap-v2" // constant-product AMM with the UniswapV2Router02 ABI
  | "uniswap-v3" // concentrated liquidity (SwapRouter + QuoterV2 ABI)
  | "solana-amm" // Raydium/Orca style Solana AMM
  | "meta"; // meta-aggregator HTTP API (1inch, 0x, Paraswap, Jupiter)

export interface DexInfo {
  /** Unique id: `${key}-${chainKey}`. */
  id: string;
  /** Protocol family key, e.g. "uniswap-v3". */
  key: string;
  name: string;
  protocol: DexProtocol;
  chainKey: string;
  /** Swap router address (EVM direct venues). */
  router?: string;
  /** Pair/pool factory address. */
  factory?: string;
  /** QuoterV2 address (uniswap-v3 family only). */
  quoter?: string;
  /** V3 fee tiers in hundredths of a bip (500 = 0.05%). */
  feeTiers?: number[];
  /** Whether the venue supports LP add/remove through our LiquidityZap. */
  supportsLp: boolean;
  url: string;
}

const V3_FEE_TIERS = [100, 500, 3000, 10000];

export const DEXES: readonly DexInfo[] = [
  // ── Ethereum ───────────────────────────────────────────────────────────────
  {
    id: "uniswap-v2-ethereum",
    key: "uniswap-v2",
    name: "Uniswap V2",
    protocol: "uniswap-v2",
    chainKey: "ethereum",
    router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    supportsLp: true,
    url: "https://uniswap.org",
  },
  {
    id: "uniswap-v3-ethereum",
    key: "uniswap-v3",
    name: "Uniswap V3",
    protocol: "uniswap-v3",
    chainKey: "ethereum",
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    feeTiers: V3_FEE_TIERS,
    supportsLp: true,
    url: "https://uniswap.org",
  },
  {
    id: "sushiswap-ethereum",
    key: "sushiswap",
    name: "SushiSwap",
    protocol: "uniswap-v2",
    chainKey: "ethereum",
    router: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    factory: "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac",
    supportsLp: true,
    url: "https://sushi.com",
  },

  // ── BNB Chain ──────────────────────────────────────────────────────────────
  {
    id: "pancakeswap-v2-bsc",
    key: "pancakeswap-v2",
    name: "PancakeSwap V2",
    protocol: "uniswap-v2",
    chainKey: "bsc",
    router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    factory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
    supportsLp: true,
    url: "https://pancakeswap.finance",
  },
  {
    id: "pancakeswap-v3-bsc",
    key: "pancakeswap-v3",
    name: "PancakeSwap V3",
    protocol: "uniswap-v3",
    chainKey: "bsc",
    router: "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
    factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
    quoter: "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
    feeTiers: [100, 500, 2500, 10000],
    supportsLp: true,
    url: "https://pancakeswap.finance",
  },
  {
    id: "biswap-bsc",
    key: "biswap",
    name: "BiSwap",
    protocol: "uniswap-v2",
    chainKey: "bsc",
    router: "0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8",
    factory: "0x858E3312ed3A876947EA49d572A7C42DE08af7EE",
    supportsLp: true,
    url: "https://biswap.org",
  },
  {
    id: "apeswap-bsc",
    key: "apeswap",
    name: "ApeSwap",
    protocol: "uniswap-v2",
    chainKey: "bsc",
    router: "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7",
    factory: "0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6",
    supportsLp: true,
    url: "https://apeswap.finance",
  },

  // ── Polygon ────────────────────────────────────────────────────────────────
  {
    id: "quickswap-polygon",
    key: "quickswap",
    name: "QuickSwap",
    protocol: "uniswap-v2",
    chainKey: "polygon",
    router: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
    factory: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32",
    supportsLp: true,
    url: "https://quickswap.exchange",
  },
  {
    id: "uniswap-v3-polygon",
    key: "uniswap-v3",
    name: "Uniswap V3",
    protocol: "uniswap-v3",
    chainKey: "polygon",
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    feeTiers: V3_FEE_TIERS,
    supportsLp: true,
    url: "https://uniswap.org",
  },
  {
    id: "sushiswap-polygon",
    key: "sushiswap",
    name: "SushiSwap",
    protocol: "uniswap-v2",
    chainKey: "polygon",
    router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    factory: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
    supportsLp: true,
    url: "https://sushi.com",
  },

  // ── Arbitrum ───────────────────────────────────────────────────────────────
  {
    id: "uniswap-v3-arbitrum",
    key: "uniswap-v3",
    name: "Uniswap V3",
    protocol: "uniswap-v3",
    chainKey: "arbitrum",
    router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    feeTiers: V3_FEE_TIERS,
    supportsLp: true,
    url: "https://uniswap.org",
  },
  {
    id: "camelot-arbitrum",
    key: "camelot",
    name: "Camelot",
    protocol: "uniswap-v2",
    chainKey: "arbitrum",
    router: "0xc873fEcbd354f5A56E00E710B90EF4201db2448d",
    factory: "0x6EcCab422D763aC031210895C81787E87B43A652",
    supportsLp: true,
    url: "https://camelot.exchange",
  },
  {
    id: "sushiswap-arbitrum",
    key: "sushiswap",
    name: "SushiSwap",
    protocol: "uniswap-v2",
    chainKey: "arbitrum",
    router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    factory: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
    supportsLp: true,
    url: "https://sushi.com",
  },

  // ── Base ───────────────────────────────────────────────────────────────────
  {
    id: "uniswap-v3-base",
    key: "uniswap-v3",
    name: "Uniswap V3",
    protocol: "uniswap-v3",
    chainKey: "base",
    router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    feeTiers: V3_FEE_TIERS,
    supportsLp: true,
    url: "https://uniswap.org",
  },
  {
    id: "aerodrome-base",
    key: "aerodrome",
    name: "Aerodrome",
    protocol: "uniswap-v2",
    chainKey: "base",
    router: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
    factory: "0x420DD381b31aEf6683db6B902084cB0FFECe40Da",
    supportsLp: true,
    url: "https://aerodrome.finance",
  },
  {
    id: "baseswap-base",
    key: "baseswap",
    name: "BaseSwap",
    protocol: "uniswap-v2",
    chainKey: "base",
    router: "0x327Df1E6de05895d2ab08513aaDD9313Fe505d86",
    factory: "0xFDa619b6d20975be80A10332cD39b9a4b0FAa8BB",
    supportsLp: true,
    url: "https://baseswap.fi",
  },

  // ── Avalanche ──────────────────────────────────────────────────────────────
  {
    id: "traderjoe-avalanche",
    key: "traderjoe",
    name: "Trader Joe",
    protocol: "uniswap-v2",
    chainKey: "avalanche",
    router: "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
    factory: "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10",
    supportsLp: true,
    url: "https://traderjoexyz.com",
  },
  {
    id: "pangolin-avalanche",
    key: "pangolin",
    name: "Pangolin",
    protocol: "uniswap-v2",
    chainKey: "avalanche",
    router: "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106",
    factory: "0xefa94DE7a4656D787667C749f7E1223D71E9FD88",
    supportsLp: true,
    url: "https://pangolin.exchange",
  },

  // ── Solana ─────────────────────────────────────────────────────────────────
  {
    id: "jupiter-solana",
    key: "jupiter",
    name: "Jupiter",
    protocol: "meta",
    chainKey: "solana",
    supportsLp: false,
    url: "https://jup.ag",
  },
  {
    id: "meteora-dbc-solana",
    key: "meteora-dbc",
    name: "Gold Curve",
    protocol: "solana-amm",
    chainKey: "solana",
    supportsLp: false,
    url: "https://docs.meteora.ag/overview/products/dbc",
  },
  {
    id: "raydium-solana",
    key: "raydium",
    name: "Raydium",
    protocol: "solana-amm",
    chainKey: "solana",
    supportsLp: true,
    url: "https://raydium.io",
  },
  {
    id: "orca-solana",
    key: "orca",
    name: "Orca",
    protocol: "solana-amm",
    chainKey: "solana",
    supportsLp: true,
    url: "https://orca.so",
  },

  // ── EVM meta-aggregators (comparison/fallback sources, all EVM chains) ─────
  ...(["ethereum", "bsc", "polygon", "arbitrum", "base", "avalanche"] as const).flatMap(
    (chainKey) => [
      {
        id: `1inch-${chainKey}`,
        key: "1inch",
        name: "1inch",
        protocol: "meta" as const,
        chainKey,
        supportsLp: false,
        url: "https://1inch.io",
      },
      {
        id: `0x-${chainKey}`,
        key: "0x",
        name: "0x (Matcha)",
        protocol: "meta" as const,
        chainKey,
        supportsLp: false,
        url: "https://0x.org",
      },
      {
        id: `paraswap-${chainKey}`,
        key: "paraswap",
        name: "Paraswap",
        protocol: "meta" as const,
        chainKey,
        supportsLp: false,
        url: "https://paraswap.io",
      },
    ],
  ),
] as const;

export function getDexesForChain(chainKey: string): DexInfo[] {
  return DEXES.filter((d) => d.chainKey === chainKey);
}

export function getDexById(id: string): DexInfo | undefined {
  return DEXES.find((d) => d.id === id);
}

export function getLpDexesForChain(chainKey: string): DexInfo[] {
  return DEXES.filter((d) => d.chainKey === chainKey && d.supportsLp);
}

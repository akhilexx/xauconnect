/**
 * Shared viem public clients (one per EVM chain) + minimal venue ABIs.
 */
import { createPublicClient, fallback, http, type Chain, type PublicClient } from "viem";
import { mainnet, bsc, polygon, arbitrum, base, avalanche } from "viem/chains";
import { CHAINS, type ChainInfo } from "@xauconnect/utils";
import { rpcUrl } from "../../config.js";

const VIEM_CHAINS: Record<string, Chain> = {
  ethereum: mainnet,
  bsc,
  polygon,
  arbitrum,
  base,
  avalanche,
};

const clients = new Map<string, PublicClient>();

const RPC_FALLBACKS: Record<string, string[]> = {
  ethereum: [
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth",
    "https://ethereum.publicnode.com",
  ],
  bsc: [
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.binance.org",
    "https://bsc-rpc.publicnode.com",
  ],
  polygon: [
    "https://polygon-bor-rpc.publicnode.com",
    "https://rpc.ankr.com/polygon",
    "https://1rpc.io/matic",
  ],
  arbitrum: [
    "https://arb1.arbitrum.io/rpc",
    "https://rpc.ankr.com/arbitrum",
    "https://arbitrum-one.publicnode.com",
  ],
  base: [
    "https://mainnet.base.org",
    "https://base-rpc.publicnode.com",
    "https://rpc.ankr.com/base",
  ],
  avalanche: [
    "https://api.avax.network/ext/bc/C/rpc",
    "https://avalanche-c-chain-rpc.publicnode.com",
    "https://rpc.ankr.com/avalanche",
  ],
};

function rpcUrls(chain: ChainInfo): string[] {
  const envOverride = rpcUrl(chain.key, chain.defaultRpc);
  const fallbacks = RPC_FALLBACKS[chain.key] ?? [chain.defaultRpc];
  const urls = envOverride !== chain.defaultRpc ? [envOverride, ...fallbacks] : fallbacks;
  return [...new Set(urls)];
}

export function evmClient(chain: ChainInfo): PublicClient {
  let client = clients.get(chain.key);
  if (!client) {
    const viemChain = VIEM_CHAINS[chain.key];
    const urls = rpcUrls(chain);
    client = createPublicClient({
      chain: viemChain,
      transport: fallback(
        urls.map((u) => http(u, { timeout: 8_000, retryCount: 1 })),
        { rank: false },
      ),
    });
    clients.set(chain.key, client);
  }
  return client;
}

export function chainByKeyStrict(chainKey: string): ChainInfo {
  const chain = CHAINS.find((c) => c.key === chainKey);
  if (!chain) throw new Error(`unknown chain: ${chainKey}`);
  return chain;
}

/** UniswapV2Router02.getAmountsOut */
export const V2_ROUTER_ABI = [
  {
    name: "getAmountsOut",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

/** Uniswap V3 QuoterV2.quoteExactInputSingle */
export const V3_QUOTER_ABI = [
  {
    name: "quoteExactInputSingle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

/** AggregatorRouter.swap — used by /swap/build to encode calldata. */
export const AGGREGATOR_ROUTER_ABI = [
  {
    name: "swap",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "adapterId", type: "bytes32" },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "adapterData", type: "bytes" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

/** Wrap a promise with a hard timeout so slow venues never stall a quote. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

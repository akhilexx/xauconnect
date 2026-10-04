/**
 * On-chain contract bindings — minimal ABIs + per-chain address registry
 * for wagmi/viem consumption in the frontends.
 *
 * Populate addresses after running `pnpm --filter @xauconnect/contracts
 * deploy:<network>` (see packages/contracts/scripts/deploy.ts output).
 */

export interface DeployedContracts {
  feeCollector?: `0x${string}`;
  aggregatorRouter?: `0x${string}`;
  liquidityZap?: `0x${string}`;
  tokenFactory?: `0x${string}`;
  launchpad?: `0x${string}`;
  xauToken?: `0x${string}`;
}

/** Per-chain deployments — keep in sync with deploy script output. */
export const CONTRACTS: Record<string, DeployedContracts> = {
  // sepolia: { aggregatorRouter: "0x...", tokenFactory: "0x...", launchpad: "0x..." },
  // bscTestnet: { ... },
};

export function contractsFor(chainKey: string): DeployedContracts {
  return CONTRACTS[chainKey] ?? {};
}

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

export const TOKEN_FACTORY_ABI = [
  {
    name: "createToken",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "totalSupply", type: "uint256" },
      { name: "metadataURI", type: "string" },
    ],
    outputs: [{ name: "token", type: "address" }],
  },
  {
    name: "TokenCreated",
    type: "event",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "totalSupply", type: "uint256", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
      { name: "launchFeePaid", type: "uint256", indexed: false },
    ],
  },
] as const;

export const LAUNCHPAD_ABI = [
  {
    name: "createLaunch",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "metadataURI", type: "string" },
    ],
    outputs: [{ name: "token", type: "address" }],
  },
  {
    name: "buy",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "token", type: "address" },
      { name: "minTokensOut", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "sell",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "tokensIn", type: "uint256" },
      { name: "minNativeOut", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "quoteBuy",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "nativeIn", type: "uint256" },
    ],
    outputs: [{ name: "tokensOut", type: "uint256" }],
  },
  {
    name: "graduationProgressBps",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const LIQUIDITY_ZAP_ABI = [
  {
    name: "addLiquidity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "router", type: "address" },
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "usedA", type: "uint256" },
      { name: "usedB", type: "uint256" },
      { name: "liquidity", type: "uint256" },
    ],
  },
  {
    name: "removeLiquidity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "router", type: "address" },
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "liquidity", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "outA", type: "uint256" },
      { name: "outB", type: "uint256" },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

/**
 * XAUConnect — on-chain addresses for DeFiLlama adapters.
 * Sync with packages/utils/src/protocol-wallets.ts and production ROUTER_/FEE_COLLECTOR_ env.
 *
 * When you deploy AggregatorRouter + FeeCollector on a new chain, add entries here
 * and in defillama/fees/xauconnect.ts before opening the dimension-adapters PR.
 */

/** Same EVM address on all six EVM chains (protocol mnemonic path 0). */
export const INTEGRATOR_FEE_WALLET_EVM =
  "0xC0624F22BAd798Bd9236EF0c95E35404614079B6" as const;

export const SOLANA_FEE_WALLET = "ENobDuF4iGAmF1Y211aLj6gXCNpdHBfnNkUyLDdbUabb" as const;

export type EvmChainDeploy = {
  /** UUPS FeeCollector proxy — emits FeeReceived on notifyFee. */
  feeCollector?: `0x${string}`;
  /** AggregatorRouter — emits SwapExecuted for volume adapter. */
  aggregatorRouter?: `0x${string}`;
  /** ISO date (YYYY-MM-DD) when swaps/fees first went live on this chain. */
  start: string;
};

/** Per-chain mainnet deployments. Empty feeCollector = integrator-wallet fees only until router deploy. */
export const EVM_DEPLOYS: Record<string, EvmChainDeploy> = {
  polygon: {
    feeCollector: "0xa5e0A97385278Dae82f4BdFD59Ad8939917D0ec0",
    aggregatorRouter: "0xA24313e01f02369fdD55516618e8Ce5120a2A223",
    start: "2025-03-01",
  },
  ethereum: { start: "2025-06-01" },
  bsc: { start: "2025-06-01" },
  arbitrum: { start: "2025-06-01" },
  base: { start: "2025-06-01" },
  avalanche: { start: "2025-06-01" },
};

export const FEE_RECEIVED_ABI =
  "event FeeReceived(uint8 indexed kind, address indexed token, uint256 amount, address payer)";

export const SWAP_EXECUTED_ABI =
  "event SwapExecuted(bytes32 indexed adapterId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 protocolFee, uint256 amountOut)";

/** FeeKind enum in IFeeCollector — for breakdown docs. */
export const FEE_KIND_LABELS = [
  "SWAP",
  "LP",
  "LAUNCH",
  "LISTING",
  "CURVE",
  "GRADUATION",
] as const;

export const METHODOLOGY = {
  Fees: "Swap, LP, launchpad, and listing fees accrued via on-chain FeeCollector.notifyFee (FeeReceived events) plus integrator partner fees (1inch/0x/Jupiter) received at the published protocol fee wallet.",
  Revenue: "100% of collected fees are protocol revenue (no supply-side share to LPs from the platform fee component).",
  ProtocolRevenue: "Same as revenue — fees are not routed to token holders via a separate treasury split in the adapter.",
  Volume: "Notional amountIn from AggregatorRouter SwapExecuted events where our router is deployed; integrator-only routes (direct 1inch/0x calldata) are not visible on our router and are excluded.",
} as const;

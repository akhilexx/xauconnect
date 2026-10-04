/**
 * DeFiLlama dimension-adapters — DEX volume adapter (optional second PR)
 *
 * COPY to: DefiLlama/dimension-adapters/dexs/xauconnect.ts
 *
 * Tracks swap volume only for routes executed through XAUConnect's AggregatorRouter.
 * Integrator-only builds (calldata targeting 1inch/0x directly) are invisible here —
 * use fees adapter + off-chain record API for full picture.
 */
import { FetchOptions, SimpleAdapter } from "../adapters/types";
import { CHAIN } from "../helpers/chains";

const SWAP_EXECUTED =
  "event SwapExecuted(bytes32 indexed adapterId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 protocolFee, uint256 amountOut)";

type ChainCfg = {
  aggregatorRouter?: string;
  start: string;
};

const chainConfig: Record<string, ChainCfg> = {
  [CHAIN.POLYGON]: {
    aggregatorRouter: "0xA24313e01f02369fdD55516618e8Ce5120a2A223",
    start: "2025-03-01",
  },
  // Add other chains when ROUTER_ADDRESS_* is set in production
};

const fetch = async (options: FetchOptions) => {
  const config = chainConfig[options.chain];
  if (!config?.aggregatorRouter) {
    return { dailyVolume: options.createBalances() };
  }

  const dailyVolume = options.createBalances();
  const logs = await options.getLogs({
    target: config.aggregatorRouter,
    eventAbi: SWAP_EXECUTED,
    onlyArgs: true,
  });

  for (const log of logs) {
    dailyVolume.add(log.tokenIn as string, log.amountIn as bigint);
  }

  return { dailyVolume };
};

const adapter: SimpleAdapter = {
  version: 2,
  pullHourly: true,
  fetch,
  adapter: Object.fromEntries(
    Object.entries(chainConfig)
      .filter(([, cfg]) => cfg.aggregatorRouter)
      .map(([chain, cfg]) => [chain, { fetch, start: cfg.start }]),
  ),
  methodology: {
    Volume:
      "Token amountIn from SwapExecuted events on XAUConnect AggregatorRouter per chain.",
  },
};

export default adapter;

/**
 * DeFiLlama dimension-adapters — fees adapter for XAUConnect
 *
 * COPY this file to: DefiLlama/dimension-adapters/fees/xauconnect.ts
 * Then register in dimension-adapters/fees/index.ts (maintainers often do this on merge).
 *
 * Adapter type: Fees / Revenue (DEX aggregator — not TVL)
 * Docs: https://docs.llama.fi/list-your-project/other-dashboards
 */
import { FetchOptions, SimpleAdapter } from "../adapters/types";
import { CHAIN } from "../helpers/chains";
import { METRIC } from "../helpers/metrics";
import { addTokensReceived, getETHReceived } from "../helpers/token";

const INTEGRATOR_FEE_WALLET = "0xC0624F22BAd798Bd9236EF0c95E35404614079B6";

const FEE_RECEIVED =
  "event FeeReceived(uint8 indexed kind, address indexed token, uint256 amount, address payer)";

type ChainCfg = {
  feeCollector?: string;
  start: string;
};

const chainConfig: Record<string, ChainCfg> = {
  [CHAIN.POLYGON]: {
    feeCollector: "0xa5e0A97385278Dae82f4BdFD59Ad8939917D0ec0",
    start: "2025-03-01",
  },
  [CHAIN.ETHEREUM]: { start: "2025-06-01" },
  [CHAIN.BSC]: { start: "2025-06-01" },
  [CHAIN.ARBITRUM]: { start: "2025-06-01" },
  [CHAIN.BASE]: { start: "2025-06-01" },
  [CHAIN.AVAX]: { start: "2025-06-01" },
};

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

const fetch = async (options: FetchOptions) => {
  const config = chainConfig[options.chain];
  if (!config) throw new Error(`XAUConnect: unsupported chain ${options.chain}`);

  const dailyFees = options.createBalances();

  // On-chain vault: FeeCollector.notifyFee → FeeReceived
  if (config.feeCollector) {
    const logs = await options.getLogs({
      target: config.feeCollector,
      eventAbi: FEE_RECEIVED,
      onlyArgs: true,
    });

    for (const log of logs) {
      const token = log.token as string;
      const amount = log.amount as bigint;
      if (token.toLowerCase() === NULL_ADDRESS) {
        dailyFees.addGasToken(amount);
      } else {
        dailyFees.add(token, amount);
      }
    }
  }

  // Integrator path (1inch / 0x partner fee → hot wallet). Exclude inflows FROM
  // FeeCollector to avoid double-counting withdrawn vault balance.
  const skipFrom = config.feeCollector ? [config.feeCollector] : undefined;
  await addTokensReceived({
    options,
    target: INTEGRATOR_FEE_WALLET,
    balances: dailyFees,
    blacklist_fromAddresses: skipFrom,
  });
  await getETHReceived({
    options,
    target: INTEGRATOR_FEE_WALLET,
    balances: dailyFees,
    notFromSenders: skipFrom ?? [],
  });

  return {
    dailyFees,
    dailyRevenue: dailyFees,
    dailyProtocolRevenue: dailyFees,
  };
};

const methodology = {
  Fees: "Trading and launchpad fees: FeeReceived on FeeCollector contracts plus ERC20/native inflows to the published integrator fee wallet (1inch/0x partner fees). Withdrawals from FeeCollector to the hot wallet are excluded from wallet tracking.",
  Revenue: "All collected fees are retained by the protocol.",
  ProtocolRevenue: "Same as revenue.",
};

const breakdownMethodology = {
  Fees: {
    [METRIC.TRADING_FEES]:
      "Swap skim via AggregatorRouter→FeeCollector and aggregator integrator partner fees",
  },
};

const adapter: SimpleAdapter = {
  version: 2,
  pullHourly: true,
  fetch,
  adapter: Object.fromEntries(
    Object.entries(chainConfig).map(([chain, cfg]) => [chain, { fetch, start: cfg.start }]),
  ),
  methodology,
  breakdownMethodology,
};

export default adapter;

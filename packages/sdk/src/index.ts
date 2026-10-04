/**
 * @xauconnect/sdk — typed client SDK for the XAUConnect platform.
 *
 *   const api = new XauApiClient({ baseUrl: "http://localhost:4000" });
 *   const quote = await api.quote({ chainKey: "bsc", tokenIn, tokenOut, amountIn });
 *
 * Re-exports the shared utils so frontends only need one import surface.
 */
export {
  XauApiClient,
  XauApiError,
  type XauClientOptions,
  type UserSocialProfile,
  type LimitOrder,
  type GoldCurveView,
  type GoldCurveFeePool,
} from "./client.js";
export { XauWsClient } from "./ws.js";
export {
  CONTRACTS,
  contractsFor,
  AGGREGATOR_ROUTER_ABI,
  TOKEN_FACTORY_ABI,
  LAUNCHPAD_ABI,
  LIQUIDITY_ZAP_ABI,
  ERC20_ABI,
  type DeployedContracts,
} from "./contracts.js";
export * from "@xauconnect/utils";

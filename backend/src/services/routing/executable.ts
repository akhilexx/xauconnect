/**
 * Which swap routes can actually be built and signed today.
 * EVM meta (1inch / 0x): always via integrator APIs.
 * EVM direct: own AggregatorRouter when deployed; build falls back to 1inch / 0x on failure.
 */
import { isAddress } from "viem";
import type { RouteQuote } from "@xauconnect/utils";
import { chainByKeyStrict } from "./evm.js";

export function routerAddressFor(chainKey: string): `0x${string}` | null {
  const value = process.env[`ROUTER_ADDRESS_${chainKey.toUpperCase()}`];
  return value && isAddress(value) ? (value as `0x${string}`) : null;
}

export function isMetaEvmRoute(route: RouteQuote): boolean {
  return (
    route.protocol === "meta" &&
    (route.dexId.startsWith("1inch-") || route.dexId.startsWith("0x-"))
  );
}

export function isRouteExecutable(chainKey: string, route: RouteQuote): boolean {
  const chain = chainByKeyStrict(chainKey);
  if (chain.kind === "solana") {
    return (
      (route.protocol === "meta" && route.dexId.includes("jupiter")) ||
      route.dexId.includes("meteora-dbc")
    );
  }
  if (isMetaEvmRoute(route)) {
    // 1inch /build intermittently fails on Arbitrum — 0x path is reliable.
    if (chainKey === "arbitrum" && route.dexId.startsWith("1inch-")) return false;
    return true;
  }
  return routerAddressFor(chainKey) != null && route.protocol !== "meta";
}

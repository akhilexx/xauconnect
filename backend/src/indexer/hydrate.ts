/**
 * Auto-hydrate IndexedPool from a known pool address (e.g. GeckoTerminal top pool).
 */
import type { Address } from "viem";
import { CHAINS } from "@xauconnect/utils";
import { chainByKeyStrict, evmClient, withTimeout } from "../services/routing/evm.js";
import { PAIR_ABI } from "./onchain/abis.js";
import { findPoolForToken, pickBaseToken, upsertIndexedPool } from "./db/pools.js";

export async function hydratePoolFromAddress(
  chainKey: string,
  tokenAddress: string,
  poolAddress: string,
  dexKey = "unknown-v2",
): Promise<boolean> {
  const existing = await findPoolForToken(chainKey, tokenAddress);
  if (existing) return true;

  const chain = CHAINS.find((c) => c.key === chainKey);
  if (!chain || chain.kind !== "evm") return false;

  try {
    chainByKeyStrict(chainKey);
    const client = evmClient(chain);
    const [token0, token1] = await withTimeout(
      Promise.all([
        client.readContract({ address: poolAddress as Address, abi: PAIR_ABI, functionName: "token0" }),
        client.readContract({ address: poolAddress as Address, abi: PAIR_ABI, functionName: "token1" }),
      ]),
      5_000,
    );

    const t0 = (token0 as string).toLowerCase();
    const t1 = (token1 as string).toLowerCase();
    const base = pickBaseToken(chainKey, t0, t1, chain);

    await upsertIndexedPool({
      chainKey,
      dexKey,
      poolAddress: poolAddress.toLowerCase(),
      token0Address: t0,
      token1Address: t1,
      baseTokenAddress: base,
    });
    return true;
  } catch {
    return false;
  }
}

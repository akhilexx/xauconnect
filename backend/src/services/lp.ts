/**
 * LP aggregation service — quotes add/remove liquidity across every
 * LP-capable venue on a chain, with the protocol LP fee applied
 * (mirrors LiquidityZap.sol semantics).
 */
import { type Address } from "viem";
import {
  applyFeeBps,
  getLpDexesForChain,
  isNativeToken,
  type LpQuote,
  type LpQuoteRequest,
} from "@xauconnect/utils";
import { env } from "../config.js";
import { db } from "../db/client.js";
import { chainByKeyStrict, evmClient, withTimeout } from "./routing/evm.js";

const PAIR_ABI = [
  {
    name: "getReserves",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" },
    ],
  },
  { name: "token0", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const FACTORY_ABI = [
  {
    name: "getPair",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "address" }, { type: "address" }],
    outputs: [{ type: "address" }],
  },
] as const;

async function lpFeeBpsFor(chainKey: string): Promise<number> {
  if (db) {
    try {
      const config = await db.feeConfig.findUnique({ where: { chainKey } });
      if (config?.enabled) return config.lpFeeBps;
    } catch {
      /* fall through */
    }
  }
  return env.LP_FEE_BPS;
}

export async function quoteLp(req: LpQuoteRequest): Promise<LpQuote[]> {
  const chain = chainByKeyStrict(req.chainKey);
  const venues = getLpDexesForChain(req.chainKey).filter(
    (d) => !req.dexId || d.id === req.dexId,
  );
  const feeBps = await lpFeeBpsFor(req.chainKey);
  const amount = BigInt(req.amount);
  const { fee, net } = applyFeeBps(amount, feeBps);

  const results: LpQuote[] = [];

  for (const dex of venues) {
    // ── Live pair ratio (EVM V2-style venues only) ────────────────────────
    if (chain.kind === "evm" && dex.factory && chain.wrappedNative) {
      try {
        const client = evmClient(chain);
        const tokenA = (isNativeToken(chain, req.tokenA) ? chain.wrappedNative : req.tokenA) as Address;
        const tokenB = (isNativeToken(chain, req.tokenB) ? chain.wrappedNative : req.tokenB) as Address;
        const pair = await withTimeout(
          client.readContract({
            address: dex.factory as Address,
            abi: FACTORY_ABI,
            functionName: "getPair",
            args: [tokenA, tokenB],
          }),
          4_000,
        );
        if (pair !== "0x0000000000000000000000000000000000000000") {
          const [reserves, token0, totalSupply] = await withTimeout(
            Promise.all([
              client.readContract({ address: pair, abi: PAIR_ABI, functionName: "getReserves" }),
              client.readContract({ address: pair, abi: PAIR_ABI, functionName: "token0" }),
              client.readContract({ address: pair, abi: PAIR_ABI, functionName: "totalSupply" }),
            ]),
            4_500,
          );
          const aIsToken0 = token0.toLowerCase() === tokenA.toLowerCase();
          const reserveA = BigInt(aIsToken0 ? reserves[0] : reserves[1]);
          const reserveB = BigInt(aIsToken0 ? reserves[1] : reserves[0]);
          if (reserveA > 0n && reserveB > 0n) {
            const amountB = (net * reserveB) / reserveA;
            const lpTokens = (net * totalSupply) / reserveA;
            results.push({
              dexId: dex.id,
              dexName: dex.name,
              pairAddress: pair,
              amountA: net.toString(),
              amountB: amountB.toString(),
              expectedLpTokens: lpTokens.toString(),
              shareOfPoolBps: Number((net * 10_000n) / (reserveA + net)),
              lpFeeBps: feeBps,
              lpFeeAmount: fee.toString(),
              simulated: false,
            });
            continue;
          }
        }
      } catch {
        /* venue unavailable — omit from results */
      }
    }
  }

  return results;
}

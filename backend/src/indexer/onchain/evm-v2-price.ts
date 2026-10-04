/**
 * Uniswap V2-style pool price from on-chain reserves.
 */
import type { Address } from "viem";
import { chainByKeyStrict, evmClient, withTimeout } from "../../services/routing/evm.js";
import { ERC20_ABI, PAIR_ABI } from "./abis.js";
import { quoteTokenUsd } from "./native-usd.js";

export interface V2PriceInput {
  chainKey: string;
  poolAddress: string;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  baseIsToken0?: boolean;
}

export interface V2PriceResult {
  priceUsd: number;
  liquidityUsd: number;
  reserve0: bigint;
  reserve1: bigint;
  blockNumber: bigint;
}

async function tokenDecimals(chainKey: string, address: string): Promise<number> {
  const chain = chainByKeyStrict(chainKey);
  const client = evmClient(chain);
  try {
    const d = await withTimeout(
      client.readContract({
        address: address as Address,
        abi: ERC20_ABI,
        functionName: "decimals",
      }),
      4_000,
    );
    return Number(d);
  } catch {
    return 18;
  }
}

function humanAmount(raw: bigint, decimals: number): number {
  return Number(raw) / 10 ** decimals;
}

export async function readV2ReservesPrice(input: V2PriceInput): Promise<V2PriceResult> {
  const chain = chainByKeyStrict(input.chainKey);
  const client = evmClient(chain);

  const [reserves, token0, blockNumber] = await withTimeout(
    Promise.all([
      client.readContract({
        address: input.poolAddress as Address,
        abi: PAIR_ABI,
        functionName: "getReserves",
      }),
      input.baseIsToken0 === undefined
        ? client.readContract({
            address: input.poolAddress as Address,
            abi: PAIR_ABI,
            functionName: "token0",
          })
        : Promise.resolve(
            input.baseIsToken0 ? input.baseTokenAddress : input.quoteTokenAddress,
          ),
      client.getBlockNumber(),
    ]),
    6_000,
  );

  const baseIsToken0 =
    input.baseIsToken0 ??
    (token0 as string).toLowerCase() === input.baseTokenAddress.toLowerCase();

  const reserve0 = BigInt(reserves[0]);
  const reserve1 = BigInt(reserves[1]);
  const baseReserve = baseIsToken0 ? reserve0 : reserve1;
  const quoteReserve = baseIsToken0 ? reserve1 : reserve0;

  if (baseReserve === 0n || quoteReserve === 0n) {
    return { priceUsd: 0, liquidityUsd: 0, reserve0, reserve1, blockNumber };
  }

  const [baseDecimals, quoteDecimals, quoteUsd] = await Promise.all([
    tokenDecimals(input.chainKey, input.baseTokenAddress),
    tokenDecimals(input.chainKey, input.quoteTokenAddress),
    quoteTokenUsd(input.chainKey, input.quoteTokenAddress),
  ]);

  const baseHuman = humanAmount(baseReserve, baseDecimals);
  const quoteHuman = humanAmount(quoteReserve, quoteDecimals);
  const priceInQuote = quoteHuman / baseHuman;
  const priceUsd = priceInQuote * quoteUsd;
  const liquidityUsd = baseHuman * priceUsd + quoteHuman * quoteUsd;

  return { priceUsd, liquidityUsd, reserve0, reserve1, blockNumber };
}

export async function readV2PoolPrice(
  chainKey: string,
  pool: {
    poolAddress: string;
    baseTokenAddress: string;
    token0Address: string;
    token1Address: string;
  },
): Promise<V2PriceResult> {
  const quoteAddress =
    pool.baseTokenAddress.toLowerCase() === pool.token0Address.toLowerCase()
      ? pool.token1Address
      : pool.token0Address;
  const baseIsToken0 =
    pool.baseTokenAddress.toLowerCase() === pool.token0Address.toLowerCase();

  return readV2ReservesPrice({
    chainKey,
    poolAddress: pool.poolAddress,
    baseTokenAddress: pool.baseTokenAddress,
    quoteTokenAddress: quoteAddress,
    baseIsToken0,
  });
}

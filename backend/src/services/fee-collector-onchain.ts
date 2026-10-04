/**
 * On-chain FeeCollector per EVM chain — admin sync + readback.
 * Addresses from FEE_COLLECTOR_ADDRESS_<CHAIN> env; writes use FEE_MANAGER_PRIVATE_KEY.
 */
import {
  createWalletClient,
  http,
  isAddress,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, bsc, polygon, arbitrum, base, avalanche } from "viem/chains";
import { clampSwapFeeBps, CHAIN_KEYS } from "@xauconnect/utils";
import { rpcUrl } from "../config.js";
import { logger } from "../logger.js";
import { chainByKeyStrict, evmClient } from "./routing/evm.js";

const VIEM_CHAINS = {
  ethereum: mainnet,
  bsc,
  polygon,
  arbitrum,
  base,
  avalanche,
} as const;

const FEE_COLLECTOR_ABI = [
  {
    type: "function",
    name: "swapFeeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint16" }],
  },
  {
    type: "function",
    name: "setSwapFeeBps",
    stateMutability: "nonpayable",
    inputs: [{ name: "bps", type: "uint16" }],
    outputs: [],
  },
] as const;

export function feeCollectorAddressFor(chainKey: string): Address | null {
  const envKey = `FEE_COLLECTOR_ADDRESS_${chainKey.toUpperCase()}`;
  const value = process.env[envKey]?.trim();
  return value && isAddress(value) ? (value as Address) : null;
}

export function deployedFeeCollectorChains(): string[] {
  return CHAIN_KEYS.filter((k) => k !== "solana" && feeCollectorAddressFor(k) != null);
}

export async function readOnChainSwapFeeBps(chainKey: string): Promise<number | null> {
  const addr = feeCollectorAddressFor(chainKey);
  if (!addr) return null;
  try {
    const bps = await evmClient(chainByKeyStrict(chainKey)).readContract({
      address: addr,
      abi: FEE_COLLECTOR_ABI,
      functionName: "swapFeeBps",
    });
    return Number(bps);
  } catch (err) {
    logger.debug({ chainKey, err: (err as Error).message }, "read on-chain swapFeeBps failed");
    return null;
  }
}

export interface OnChainFeeSyncResult {
  chainKey: string;
  ok: boolean;
  txHash?: string;
  onChainSwapFeeBps?: number;
  error?: string;
}

function feeManagerKey(): Hex | null {
  const raw =
    process.env.FEE_MANAGER_PRIVATE_KEY?.trim() ||
    process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (!raw) return null;
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
}

/** Push admin swapFeeBps to the on-chain FeeCollector proxy for one chain. */
export async function syncOnChainSwapFeeBps(
  chainKey: string,
  swapFeeBps: number,
): Promise<OnChainFeeSyncResult> {
  const collector = feeCollectorAddressFor(chainKey);
  if (!collector) {
    return { chainKey, ok: false, error: "FEE_COLLECTOR_ADDRESS not configured" };
  }

  const pk = feeManagerKey();
  if (!pk) {
    return { chainKey, ok: false, error: "FEE_MANAGER_PRIVATE_KEY not configured" };
  }

  const chain = chainByKeyStrict(chainKey);
  const viemChain = VIEM_CHAINS[chainKey as keyof typeof VIEM_CHAINS];
  if (!viemChain) {
    return { chainKey, ok: false, error: "unsupported EVM chain" };
  }
  const bps = clampSwapFeeBps(swapFeeBps);
  const account = privateKeyToAccount(pk);
  const transport = http(rpcUrl(chainKey, chain.defaultRpc));
  const publicClient = evmClient(chain);
  const wallet = createWalletClient({ account, chain: viemChain, transport });

  try {
    const current = await publicClient.readContract({
      address: collector,
      abi: FEE_COLLECTOR_ABI,
      functionName: "swapFeeBps",
    });
    if (Number(current) === bps) {
      return { chainKey, ok: true, onChainSwapFeeBps: bps };
    }

    const hash = await wallet.writeContract({
      address: collector,
      abi: FEE_COLLECTOR_ABI,
      functionName: "setSwapFeeBps",
      args: [bps],
      chain: viemChain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return { chainKey, ok: true, txHash: hash, onChainSwapFeeBps: bps };
  } catch (err) {
    const message = (err as Error).message.split("\n")[0] ?? "sync failed";
    logger.warn({ chainKey, err: message }, "on-chain fee sync failed");
    return { chainKey, ok: false, error: message };
  }
}

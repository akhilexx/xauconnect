/**
 * Multi-chain wallet balance reads — catalog tokens via multicall + Solana SPL scan.
 */
import {
  erc20Abi,
  formatUnits as viemFormatUnits,
  getAddress,
  type Address,
} from "viem";
import {
  CHAINS,
  catalogTokenKey,
  getSwapTokenCatalog,
  getChainByKey,
  isNativeToken,
  type SwapCatalogToken,
} from "@xauconnect/utils";
import { fetchSolanaWalletBalances } from "./solana-balances.js";
import { chainByKeyStrict, evmClient, withTimeout } from "./routing/evm.js";
import { tokenUsdPrice } from "./token-price.js";
import { logger } from "../logger.js";

export interface WalletBalance {
  chainKey: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  balanceFormatted: string;
  usdValue: number;
  simulated: boolean;
}

export interface WalletBalanceSnapshot {
  balances: WalletBalance[];
  portfolioUsd: number;
  nativeBalance?: string;
  nativeSymbol?: string;
}

export type BalanceMap = Record<string, { balance: string; balanceFormatted: string }>;

const MULTICALL_CHUNK = 50;
const MAX_CATALOG_PER_CHAIN = 120;

function balanceKey(chainKey: string, address: string): string {
  return catalogTokenKey(chainKey, address);
}

export async function evmChainBalancesMulticall(
  chainKey: string,
  owner: Address,
  tokenFilter?: Set<string>,
): Promise<WalletBalance[]> {
  const chain = chainByKeyStrict(chainKey);
  const client = evmClient(chain);
  let catalog = getSwapTokenCatalog(chainKey).slice(0, MAX_CATALOG_PER_CHAIN);

  if (tokenFilter?.size) {
    catalog = catalog.filter((t) => tokenFilter.has(balanceKey(chainKey, t.address)));
    for (const key of tokenFilter) {
      if (!key.startsWith(`${chainKey}:`)) continue;
      const addr = key.slice(chainKey.length + 1);
      if (catalog.some((t) => t.address.toLowerCase() === addr.toLowerCase())) continue;
      catalog.push({
        chainKey,
        address: addr,
        symbol: addr.slice(0, 6),
        name: "Token",
        decimals: 18,
      });
    }
  }

  const out: WalletBalance[] = [];

  for (let i = 0; i < catalog.length; i += MULTICALL_CHUNK) {
    const chunk = catalog.slice(i, i + MULTICALL_CHUNK);
    const contracts = chunk
      .filter((t) => !isNativeToken(chain, t.address))
      .map((t) => ({
        address: getAddress(t.address) as Address,
        abi: erc20Abi,
        functionName: "balanceOf" as const,
        args: [owner] as const,
      }));

    let results: { result?: bigint; status: string }[] = [];
    if (contracts.length) {
      try {
        results = await withTimeout(
          client.multicall({ contracts, allowFailure: true }),
          8_000,
        );
      } catch (err) {
        logger.debug({ chainKey, err: (err as Error).message }, "multicall chunk failed");
      }
    }

    let ercIdx = 0;
    for (const token of chunk) {
      try {
        let raw: bigint;
        if (isNativeToken(chain, token.address)) {
          raw = await withTimeout(client.getBalance({ address: owner }), 4_000);
        } else {
          const r = results[ercIdx++];
          raw = r?.status === "success" && r.result !== undefined ? r.result : 0n;
        }
        if (raw === 0n) continue;
        const formatted = viemFormatUnits(raw, token.decimals);
        const price = await tokenUsdPrice(token);
        out.push({
          chainKey,
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          balance: raw.toString(),
          balanceFormatted: formatted,
          usdValue: Number(formatted) * price,
          simulated: false,
        });
      } catch (err) {
        logger.debug({ token: token.symbol, err: (err as Error).message }, "balance read failed");
      }
    }
  }

  return out;
}

export async function fetchEvmWalletBalances(owner: string): Promise<WalletBalanceSnapshot> {
  if (!owner.startsWith("0x") || owner.length !== 42) {
    return { balances: [], portfolioUsd: 0 };
  }

  const evmChains = CHAINS.filter((c) => c.kind === "evm");
  const settled = await Promise.allSettled(
    evmChains.map((c) => evmChainBalancesMulticall(c.key, owner as Address)),
  );
  const balances = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  const portfolioUsd = balances.reduce((sum, b) => sum + b.usdValue, 0);

  const primaryChainKey = balances[0]?.chainKey;
  const chain = primaryChainKey ? getChainByKey(primaryChainKey) : undefined;
  const native = balances.find(
    (b) => chain && isNativeToken(chain, b.address) && b.chainKey === primaryChainKey,
  );

  return {
    balances,
    portfolioUsd,
    nativeBalance: native?.balanceFormatted,
    nativeSymbol: native?.symbol ?? chain?.nativeSymbol,
  };
}

/** Fetch balances for specific catalog tokens — used by swap token picker. */
export async function fetchTokenBalanceMap(
  owner: string,
  tokens: SwapCatalogToken[],
): Promise<BalanceMap> {
  const map: BalanceMap = {};
  if (!owner || tokens.length === 0) return map;

  if (owner.startsWith("0x") && owner.length === 42) {
    const byChain = new Map<string, SwapCatalogToken[]>();
    for (const t of tokens) {
      const list = byChain.get(t.chainKey) ?? [];
      list.push(t);
      byChain.set(t.chainKey, list);
    }
    for (const [chainKey] of byChain) {
      const filter = new Set(
        (byChain.get(chainKey) ?? []).map((t) => balanceKey(chainKey, t.address)),
      );
      const bals = await evmChainBalancesMulticall(chainKey, owner as Address, filter);
      for (const b of bals) {
        map[balanceKey(b.chainKey, b.address)] = {
          balance: b.balance,
          balanceFormatted: b.balanceFormatted,
        };
      }
    }
    return map;
  }

  if (!owner.startsWith("0x")) {
    const snap = await fetchSolanaWalletBalances(owner);
    for (const b of snap.balances) {
      map[balanceKey(b.chainKey, b.address)] = {
        balance: b.balance,
        balanceFormatted: b.balanceFormatted,
      };
    }
  }

  return map;
}

export async function fetchWalletBalances(
  owner: string,
  chainKind: "evm" | "solana",
): Promise<WalletBalanceSnapshot> {
  if (chainKind === "solana") return fetchSolanaWalletBalances(owner);
  return fetchEvmWalletBalances(owner);
}

export interface ChainBalanceSummary {
  lastSeenAt: string;
  chainId?: number;
  portfolioUsd: number;
  nativeBalance?: string;
  nativeSymbol?: string;
  assetCount: number;
}

export function summarizeBalancesByChain(
  balances: WalletBalance[],
  activeChainKey?: string,
  activeChainId?: number,
): Record<string, ChainBalanceSummary> {
  const out: Record<string, ChainBalanceSummary> = {};
  const now = new Date().toISOString();

  for (const b of balances) {
    if (!out[b.chainKey]) {
      const chain = getChainByKey(b.chainKey);
      out[b.chainKey] = {
        lastSeenAt: now,
        chainId: typeof chain?.id === "number" ? chain.id : undefined,
        portfolioUsd: 0,
        nativeSymbol: chain?.nativeSymbol,
        assetCount: 0,
      };
    }
    const row = out[b.chainKey]!;
    row.portfolioUsd += b.usdValue;
    row.assetCount += 1;
    const chain = getChainByKey(b.chainKey);
    if (chain && isNativeToken(chain, b.address)) {
      row.nativeBalance = b.balanceFormatted;
      row.nativeSymbol = b.symbol;
    }
  }

  if (activeChainKey && out[activeChainKey]) {
    out[activeChainKey]!.lastSeenAt = now;
    if (activeChainId) out[activeChainKey]!.chainId = activeChainId;
  }

  return out;
}

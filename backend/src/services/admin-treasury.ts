/**
 * Protocol treasury balance rollup for admin metrics.
 */
import { CHAIN_KEYS, DEFAULT_TOKENS, getChainByKey, isNativeToken } from "@xauconnect/utils";
import { cached } from "../cache.js";
import { demoUsdPrice } from "../demo/data.js";
import { listAdminWallets } from "./admin-wallets.js";

export interface TreasuryChainBalance {
  chainKey: string;
  nativeSymbol: string;
  nativeBalance: number;
  nativePriceUsd: number;
  balanceUsd: number;
  /** SPL / extra token USD on Solana fee collectors (e.g. swap fees in USDT). */
  tokenBalanceUsd: number;
  walletCount: number;
}

export interface TreasurySummary {
  totalUsd: number;
  walletRows: number;
  byChain: TreasuryChainBalance[];
}

const TREASURY_CACHE_SEC = 300;

async function nativePriceUsd(chainKey: string): Promise<number> {
  const chain = getChainByKey(chainKey);
  if (!chain) return 0;

  if (chainKey === "solana") {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
        { signal: AbortSignal.timeout(3_000) },
      );
      if (res.ok) {
        const data = (await res.json()) as { solana?: { usd?: number } };
        const usd = data.solana?.usd;
        if (usd != null && usd > 0) return usd;
      }
    } catch {
      // fall through
    }
  }

  const nativeToken = DEFAULT_TOKENS.find(
    (t) => t.chainKey === chainKey && isNativeToken(chain, t.address),
  );
  return demoUsdPrice(nativeToken?.coingeckoId, chainKey);
}

export async function adminTreasurySummary(): Promise<TreasurySummary> {
  return cached("admin:treasury", TREASURY_CACHE_SEC, async () => {
    const wallets = await listAdminWallets(true);
    const byChain = new Map<
      string,
      { nativeBalance: number; balanceUsd: number; tokenBalanceUsd: number; walletCount: number; nativeSymbol: string }
    >();

    for (const w of wallets) {
      const chain = getChainByKey(w.chainKey);
      if (!chain) continue;

      const nativeBal = w.nativeBalance != null ? Number(w.nativeBalance) : 0;
      if (!Number.isFinite(nativeBal) && (w.portfolioUsd ?? 0) <= 0) continue;

      const tokenUsd =
        w.tokenBalances?.reduce((sum, t) => sum + t.usdValue, 0) ?? 0;
      const totalUsd = w.portfolioUsd ?? 0;

      const entry = byChain.get(w.chainKey) ?? {
        nativeBalance: 0,
        balanceUsd: 0,
        tokenBalanceUsd: 0,
        walletCount: 0,
        nativeSymbol: chain.nativeSymbol,
      };
      entry.nativeBalance += Number.isFinite(nativeBal) ? nativeBal : 0;
      entry.balanceUsd += totalUsd;
      entry.tokenBalanceUsd += tokenUsd;
      entry.walletCount += 1;
      byChain.set(w.chainKey, entry);
    }

    const chainsWithBalance = CHAIN_KEYS.filter((chainKey) => {
      const agg = byChain.get(chainKey);
      return agg && (agg.nativeBalance > 0 || agg.balanceUsd > 0 || agg.tokenBalanceUsd > 0);
    });

    const priceEntries = await Promise.all(
      chainsWithBalance.map(async (chainKey) => {
        const agg = byChain.get(chainKey)!;
        const priceUsd = await nativePriceUsd(chainKey);
        const nativeUsd = agg.nativeBalance * priceUsd;
        const balanceUsd =
          agg.balanceUsd > nativeUsd ? agg.balanceUsd : nativeUsd + agg.tokenBalanceUsd;
        return {
          chainKey,
          nativeSymbol: agg.nativeSymbol,
          nativeBalance: agg.nativeBalance,
          nativePriceUsd: priceUsd,
          balanceUsd,
          tokenBalanceUsd: agg.tokenBalanceUsd,
          walletCount: agg.walletCount,
        } satisfies TreasuryChainBalance;
      }),
    );

    priceEntries.sort((a, b) => b.balanceUsd - a.balanceUsd);

    return {
      totalUsd: priceEntries.reduce((sum, c) => sum + c.balanceUsd, 0),
      walletRows: wallets.length,
      byChain: priceEntries,
    };
  });
}

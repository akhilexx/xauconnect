/**
 * Admin wallet registry — treasury / fee-collector addresses per chain.
 * Optional on-chain native balance lookup for the operations console.
 */
import { getChainByKey } from "@xauconnect/utils";
import { formatEther } from "viem";
import { db } from "../db/client.js";
import { env } from "../config.js";
import { cached } from "../cache.js";
import { fetchSolanaNativeBalance, fetchSolanaWalletBalances } from "./solana-balances.js";
import { evmChainBalancesMulticall } from "./wallet-balances.js";
import { chainByKeyStrict, evmClient, withTimeout } from "./routing/evm.js";

const BALANCE_TIMEOUT_MS = 4_000;
const BALANCE_CACHE_SEC = 300;

export interface AdminWalletTokenBalance {
  symbol: string;
  balanceFormatted: string;
  usdValue: number;
}

export interface AdminWalletView {
  id: string;
  chainKey: string;
  address: string;
  label: string | null;
  purpose: string;
  keyRef: string | null;
  derivationPath: string | null;
  walletGroup: string | null;
  notes: string | null;
  createdAt: string;
  nativeBalance?: string;
  nativeSymbol?: string;
  /** Full on-chain USD (native + SPL on Solana). */
  portfolioUsd?: number;
  /** Non-native holdings — Jupiter fees land here as USDC/USDT on Solana. */
  tokenBalances?: AdminWalletTokenBalance[];
}

async function fetchNativeBalanceLive(
  chainKey: string,
  address: string,
): Promise<string | undefined> {
  const chain = getChainByKey(chainKey);
  if (!chain) return undefined;
  try {
    if (chain.kind === "evm") {
      const client = evmClient(chainByKeyStrict(chainKey));
      const bal = await withTimeout(
        client.getBalance({ address: address as `0x${string}` }),
        BALANCE_TIMEOUT_MS,
      );
      return formatEther(bal);
    }
    if (chain.kind === "solana") {
      return fetchSolanaNativeBalance(address);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function balanceCacheKey(chainKey: string, address: string): string {
  const addr = chainKey === "solana" ? address : address.toLowerCase();
  return `admin:native-bal:${chainKey}:${addr}`;
}

function solanaPortfolioCacheKey(address: string): string {
  return `admin:sol-portfolio:${address}`;
}

async function fetchEvmVaultPortfolio(
  chainKey: string,
  address: string,
): Promise<{
  nativeBalance?: string;
  portfolioUsd: number;
  tokenBalances: AdminWalletTokenBalance[];
}> {
  return cached(`admin:evm-vault:${chainKey}:${address.toLowerCase()}`, BALANCE_CACHE_SEC, async () => {
    const chain = chainByKeyStrict(chainKey);
    const bals = await evmChainBalancesMulticall(chainKey, address as `0x${string}`);
    const portfolioUsd = bals.reduce((sum, b) => sum + b.usdValue, 0);
    const native = bals.find((b) => b.symbol === chain.nativeSymbol);
    const tokenBalances = bals
      .filter((b) => b.symbol !== chain.nativeSymbol && b.usdValue > 0)
      .map((b) => ({
        symbol: b.symbol,
        balanceFormatted: b.balanceFormatted,
        usdValue: b.usdValue,
      }));
    return {
      nativeBalance: native?.balanceFormatted,
      portfolioUsd,
      tokenBalances,
    };
  });
}

async function fetchSolanaPortfolio(address: string): Promise<{
  nativeBalance?: string;
  portfolioUsd: number;
  tokenBalances: AdminWalletTokenBalance[];
}> {
  return cached(solanaPortfolioCacheKey(address), BALANCE_CACHE_SEC, async () => {
    const snap = await fetchSolanaWalletBalances(address);
    return {
      nativeBalance: snap.nativeBalance,
      portfolioUsd: snap.portfolioUsd,
      tokenBalances: snap.balances.map((b) => ({
        symbol: b.symbol,
        balanceFormatted: b.balanceFormatted,
        usdValue: b.usdValue,
      })),
    };
  });
}

async function fetchNativeBalance(
  chainKey: string,
  address: string,
): Promise<string | undefined> {
  try {
    return await cached(balanceCacheKey(chainKey, address), BALANCE_CACHE_SEC, async () => {
      const live = await fetchNativeBalanceLive(chainKey, address);
      return live ?? "0";
    });
  } catch {
    return undefined;
  }
}

export async function listAdminWallets(withBalances = true): Promise<AdminWalletView[]> {
  if (!db) return [];
  const rows = await db.adminWallet.findMany({ orderBy: { createdAt: "desc" } });
  const views: AdminWalletView[] = rows.map((row) => {
    const chain = getChainByKey(row.chainKey);
    return {
      id: row.id,
      chainKey: row.chainKey,
      address: row.address,
      label: row.label,
      purpose: row.purpose,
      keyRef: row.keyRef,
      derivationPath: row.derivationPath,
      walletGroup: row.walletGroup,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      nativeSymbol: chain?.nativeSymbol,
    };
  });

  if (withBalances) {
    await Promise.all(
      views.map(async (view, i) => {
        if (view.chainKey === "solana") {
          const portfolio = await fetchSolanaPortfolio(view.address).catch(() => null);
          if (portfolio) {
            views[i]!.nativeBalance = portfolio.nativeBalance;
            views[i]!.portfolioUsd = portfolio.portfolioUsd;
            views[i]!.tokenBalances = portfolio.tokenBalances.filter(
              (t) => t.symbol !== view.nativeSymbol,
            );
          }
          return;
        }
        if (view.purpose === "on_chain_vault" && view.address.startsWith("0x")) {
          const portfolio = await fetchEvmVaultPortfolio(view.chainKey, view.address).catch(
            () => null,
          );
          if (portfolio) {
            views[i]!.nativeBalance = portfolio.nativeBalance;
            views[i]!.portfolioUsd = portfolio.portfolioUsd;
            views[i]!.tokenBalances = portfolio.tokenBalances;
          }
          return;
        }
        const bal = await fetchNativeBalance(view.chainKey, view.address);
        if (bal != null) views[i]!.nativeBalance = bal;
      }),
    );
  }

  return views;
}

export async function addAdminWallet(
  input: { chainKey: string; address: string; label?: string; purpose: string },
  createdBy?: string,
) {
  if (!db) throw new Error("Database required");
  const chain = getChainByKey(input.chainKey);
  if (!chain) throw new Error("Unknown chain");
  const address =
    chain.kind === "evm" ? input.address.toLowerCase() : input.address;
  return db.adminWallet.create({
    data: {
      chainKey: input.chainKey,
      address,
      label: input.label ?? null,
      purpose: input.purpose,
      createdBy: createdBy ?? null,
    },
  });
}

export async function removeAdminWallet(id: string) {
  if (!db) throw new Error("Database required");
  return db.adminWallet.delete({ where: { id } });
}

/** Seed ADMIN_ADDRESSES into the wallet registry on first connect. */
export async function seedAdminWalletsFromEnv(): Promise<void> {
  if (!db || !env.ADMIN_ADDRESSES) return;
  const addrs = env.ADMIN_ADDRESSES.split(",").map((a) => a.trim()).filter(Boolean);
  for (const addr of addrs) {
    await db.adminWallet.upsert({
      where: { chainKey_address: { chainKey: "ethereum", address: addr.toLowerCase() } },
      update: {},
      create: {
        chainKey: "ethereum",
        address: addr.toLowerCase(),
        label: "Admin allowlist",
        purpose: "operations",
      },
    });
  }
}


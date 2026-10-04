/**
 * Connected wallet registry — every app wallet connect (EVM + Solana).
 */
import type { WalletConnectRegisterInput } from "@xauconnect/utils";
import type { Prisma } from "@prisma/client";
import { getChainByKey } from "@xauconnect/utils";
import { adminAddresses } from "../config.js";
import { db } from "../db/client.js";
import {
  fetchWalletBalances,
  summarizeBalancesByChain,
  type ChainBalanceSummary,
  type WalletBalanceSnapshot,
} from "./wallet-balances.js";

function normalizeAddress(address: string, chainKind: "evm" | "solana"): string {
  return chainKind === "evm" ? address.toLowerCase() : address;
}

function clientIp(req: { ip?: string; headers: Record<string, unknown> }): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim();
  }
  return req.ip;
}

function mergeChainActivity(
  existing: Prisma.JsonValue | null | undefined,
  patch: Record<string, ChainBalanceSummary>,
): Prisma.InputJsonValue {
  const prev =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as unknown as Record<string, ChainBalanceSummary>)
      : {};
  return { ...prev, ...patch } as unknown as Prisma.InputJsonValue;
}

function chainSnapshot(
  snapshot: WalletBalanceSnapshot,
  chainKey?: string,
  chainId?: number,
): Record<string, ChainBalanceSummary> {
  return summarizeBalancesByChain(snapshot.balances, chainKey, chainId);
}

export interface ConnectedWalletView {
  id: string;
  address: string;
  chainKind: string;
  lastChainKey: string | null;
  lastChainId: number | null;
  connectorId: string | null;
  connectorName: string | null;
  walletApp: string | null;
  connectMethod: string | null;
  userAgent: string | null;
  lastIp: string | null;
  pagePath: string | null;
  referrer: string | null;
  portfolioUsd: number;
  nativeBalance: string | null;
  nativeSymbol: string | null;
  balancesJson: unknown;
  chainActivityJson: unknown;
  connectCount: number;
  firstConnectedAt: string;
  lastConnectedAt: string;
  userId: string | null;
  profile: {
    displayName: string | null;
    twitter: string | null;
    telegram: string | null;
    discord: string | null;
    website: string | null;
  } | null;
}

export interface ConnectedWalletFilters {
  page?: number;
  refreshBalances?: boolean;
  q?: string;
  chainKind?: string;
  lastChainKey?: string;
  walletApp?: string;
}

const USER_PROFILE_SELECT = {
  displayName: true,
  twitter: true,
  telegram: true,
  discord: true,
  website: true,
} as const;

function buildConnectedWalletWhere(filters: ConnectedWalletFilters): import("@prisma/client").Prisma.ConnectedWalletWhereInput {
  const where: import("@prisma/client").Prisma.ConnectedWalletWhereInput = {};
  if (filters.chainKind) where.chainKind = filters.chainKind;
  if (filters.lastChainKey) where.lastChainKey = filters.lastChainKey;
  if (filters.walletApp) {
    where.walletApp = { contains: filters.walletApp, mode: "insensitive" };
  }
  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { address: { contains: q, mode: "insensitive" } },
      { walletApp: { contains: q, mode: "insensitive" } },
      { connectorName: { contains: q, mode: "insensitive" } },
      { connectorId: { contains: q, mode: "insensitive" } },
      { connectMethod: { contains: q, mode: "insensitive" } },
      { lastIp: { contains: q } },
      { pagePath: { contains: q, mode: "insensitive" } },
      { userAgent: { contains: q, mode: "insensitive" } },
      {
        user: {
          is: {
            OR: [
              { displayName: { contains: q, mode: "insensitive" } },
              { twitter: { contains: q, mode: "insensitive" } },
              { telegram: { contains: q, mode: "insensitive" } },
              { discord: { contains: q, mode: "insensitive" } },
              { website: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }
  return where;
}

export async function deleteConnectedWallet(id: string): Promise<{ id: string; address: string }> {
  if (!db) throw new Error("NO_DB");
  const row = await db.connectedWallet.delete({ where: { id } });
  return { id: row.id, address: row.address };
}

export async function registerWalletConnection(
  input: WalletConnectRegisterInput,
  req: { ip?: string; headers: Record<string, unknown> },
): Promise<{ ok: boolean; demo?: boolean }> {
  if (!db) return { ok: true, demo: true };

  const chainKind = input.chainKind ?? "evm";
  const address = normalizeAddress(input.address, chainKind);
  const ip = clientIp(req);
  const userAgent =
    typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;
  const visitOnly = Boolean(input.chainVisitOnly);

  const snapshot = await fetchWalletBalances(address, chainKind).catch(
    (): WalletBalanceSnapshot => ({ balances: [], portfolioUsd: 0 }),
  );

  const activityPatch = chainSnapshot(snapshot, input.chainKey, input.chainId);
  const activeChain = input.chainKey ? getChainByKey(input.chainKey) : undefined;
  const chainNative = input.chainKey
    ? snapshot.balances.find(
        (b) =>
          b.chainKey === input.chainKey &&
          activeChain &&
          b.symbol === activeChain.nativeSymbol,
      )
    : undefined;

  const role = chainKind === "evm" && adminAddresses.has(address) ? "ADMIN" : "USER";
  const user = await db.user.upsert({
    where: { address },
    update: { lastSeenAt: new Date(), role },
    create: { address, role, chainKind },
  });

  const existing = await db.connectedWallet.findUnique({
    where: { address_chainKind: { address, chainKind } },
  });

  const mergedActivity = mergeChainActivity(existing?.chainActivityJson, activityPatch);

  if (visitOnly && existing) {
    await db.connectedWallet.update({
      where: { id: existing.id },
      data: {
        userId: user.id,
        lastChainKey: input.chainKey ?? existing.lastChainKey,
        lastChainId: input.chainId ?? existing.lastChainId,
        pagePath: input.pagePath ?? existing.pagePath,
        portfolioUsd: snapshot.portfolioUsd,
        nativeBalance: chainNative?.balanceFormatted ?? existing.nativeBalance,
        nativeSymbol: chainNative?.symbol ?? activeChain?.nativeSymbol ?? existing.nativeSymbol,
        balancesJson: snapshot.balances as unknown as Prisma.InputJsonValue,
        chainActivityJson: mergedActivity,
        lastConnectedAt: new Date(),
      },
    });
    return { ok: true };
  }

  await db.connectedWallet.upsert({
    where: { address_chainKind: { address, chainKind } },
    create: {
      userId: user.id,
      address,
      chainKind,
      lastChainKey: input.chainKey ?? null,
      lastChainId: input.chainId ?? null,
      connectorId: input.connectorId ?? null,
      connectorName: input.connectorName ?? null,
      walletApp: input.walletApp ?? null,
      connectMethod: input.connectMethod ?? null,
      userAgent: userAgent ?? null,
      lastIp: ip ?? null,
      pagePath: input.pagePath ?? null,
      referrer: input.referrer ?? null,
      portfolioUsd: snapshot.portfolioUsd,
      nativeBalance: chainNative?.balanceFormatted ?? snapshot.nativeBalance ?? null,
      nativeSymbol: chainNative?.symbol ?? snapshot.nativeSymbol ?? null,
      balancesJson: snapshot.balances as unknown as Prisma.InputJsonValue,
      chainActivityJson: mergedActivity,
      connectCount: 1,
    },
    update: {
      userId: user.id,
      lastChainKey: input.chainKey ?? existing?.lastChainKey ?? null,
      lastChainId: input.chainId ?? existing?.lastChainId ?? null,
      connectorId: input.connectorId ?? existing?.connectorId ?? null,
      connectorName: input.connectorName ?? existing?.connectorName ?? null,
      walletApp: input.walletApp ?? existing?.walletApp ?? null,
      connectMethod: input.connectMethod ?? existing?.connectMethod ?? null,
      userAgent: userAgent ?? existing?.userAgent ?? null,
      lastIp: ip ?? existing?.lastIp ?? null,
      pagePath: input.pagePath ?? existing?.pagePath ?? null,
      referrer: input.referrer ?? existing?.referrer ?? null,
      portfolioUsd: snapshot.portfolioUsd,
      nativeBalance: chainNative?.balanceFormatted ?? snapshot.nativeBalance ?? null,
      nativeSymbol: chainNative?.symbol ?? snapshot.nativeSymbol ?? null,
      balancesJson: snapshot.balances as unknown as Prisma.InputJsonValue,
      chainActivityJson: mergedActivity,
      connectCount: (existing?.connectCount ?? 0) + 1,
      lastConnectedAt: new Date(),
    },
  });

  return { ok: true };
}

export async function listConnectedWallets(
  filters: ConnectedWalletFilters = {},
): Promise<{ wallets: ConnectedWalletView[]; total: number; page: number }> {
  if (!db) return { wallets: [], total: 0, page: filters.page ?? 1 };

  const page = Math.max(1, filters.page ?? 1);
  const refreshBalances = Boolean(filters.refreshBalances);
  const take = 50;
  const skip = (page - 1) * take;
  const where = buildConnectedWalletWhere(filters);

  const [rows, total] = await Promise.all([
    db.connectedWallet.findMany({
      where,
      orderBy: { lastConnectedAt: "desc" },
      take,
      skip,
      include: {
        user: { select: USER_PROFILE_SELECT },
      },
    }),
    db.connectedWallet.count({ where }),
  ]);

  const wallets: ConnectedWalletView[] = [];
  for (const row of rows) {
    let portfolioUsd = row.portfolioUsd;
    let nativeBalance = row.nativeBalance;
    let nativeSymbol = row.nativeSymbol;
    let balancesJson = row.balancesJson;
    let chainActivityJson = row.chainActivityJson;

    if (refreshBalances) {
      const snapshot = await fetchWalletBalances(
        row.address,
        row.chainKind as "evm" | "solana",
      ).catch(() => null);
      if (snapshot) {
        portfolioUsd = snapshot.portfolioUsd;
        nativeBalance = snapshot.nativeBalance ?? null;
        nativeSymbol = snapshot.nativeSymbol ?? null;
        balancesJson = snapshot.balances as unknown as Prisma.JsonValue;
        chainActivityJson = summarizeBalancesByChain(
          snapshot.balances,
        ) as unknown as Prisma.JsonValue;
        void db.connectedWallet
          .update({
            where: { id: row.id },
            data: {
              portfolioUsd,
              nativeBalance,
              nativeSymbol,
              balancesJson: snapshot.balances as unknown as Prisma.InputJsonValue,
              chainActivityJson: chainActivityJson as unknown as Prisma.InputJsonValue,
            },
          })
          .catch(() => {});
      }
    }

    wallets.push({
      id: row.id,
      address: row.address,
      chainKind: row.chainKind,
      lastChainKey: row.lastChainKey,
      lastChainId: row.lastChainId,
      connectorId: row.connectorId,
      connectorName: row.connectorName,
      walletApp: row.walletApp,
      connectMethod: row.connectMethod,
      userAgent: row.userAgent,
      lastIp: row.lastIp,
      pagePath: row.pagePath,
      referrer: row.referrer,
      portfolioUsd,
      nativeBalance,
      nativeSymbol,
      balancesJson,
      chainActivityJson,
      connectCount: row.connectCount,
      firstConnectedAt: row.firstConnectedAt.toISOString(),
      lastConnectedAt: row.lastConnectedAt.toISOString(),
      userId: row.userId,
      profile: row.user ?? null,
    });
  }

  return { wallets, total, page };
}

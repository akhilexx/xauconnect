/**
 * Admin swap transaction log — enriched rows from the Swap table.
 */
import {
  DEFAULT_TOKENS,
  brandedRouteName,
  formatUnits,
  getChainByKey,
  tokenAddressEq,
  type TokenInfo,
} from "@xauconnect/utils";
import { db } from "../db/client.js";

export interface AdminSwapRow {
  id: string;
  chainKey: string;
  chainName: string;
  dexId: string;
  dexLabel: string;
  status: string;
  takerAddress: string | null;
  userDisplayName: string | null;
  tokenIn: string;
  tokenOut: string;
  tokenInSymbol: string;
  tokenOutSymbol: string;
  amountIn: string;
  amountOut: string;
  amountInFormatted: string;
  amountOutFormatted: string;
  protocolFee: string;
  protocolFeeFormatted: string;
  feeBps: number;
  volumeUsd: number;
  feeUsd: number;
  txHash: string | null;
  explorerUrl: string | null;
  failureReason: string | null;
  createdAt: string;
  clientSource: string | null;
  clientId: string | null;
  clientName: string | null;
}

export interface AdminSwapSummary {
  total: number;
  confirmed: number;
  failed: number;
  pending: number;
  volumeUsd: number;
  feesUsd: number;
}

export interface AdminSwapFilters {
  page?: number;
  chainKey?: string;
  status?: string;
  source?: string;
  clientId?: string;
  q?: string;
}

function findToken(chainKey: string, address: string): TokenInfo | undefined {
  return DEFAULT_TOKENS.find(
    (t) => t.chainKey === chainKey && tokenAddressEq(chainKey, t.address, address),
  );
}

function formatAmount(base: string, token?: TokenInfo): string {
  if (!token) return base;
  try {
    return formatUnits(BigInt(base), token.decimals, 8);
  } catch {
    return base;
  }
}

function explorerTxUrl(chainKey: string, txHash: string | null): string | null {
  if (!txHash) return null;
  const chain = getChainByKey(chainKey);
  if (!chain?.explorerUrl) return null;
  return `${chain.explorerUrl.replace(/\/$/, "")}/tx/${txHash}`;
}

function enrichSwap(row: {
  id: string;
  chainKey: string;
  dexId: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: { toString(): string };
  amountOut: { toString(): string };
  protocolFee: { toString(): string };
  feeBps: number;
  volumeUsd: number;
  feeUsd: number;
  txHash: string | null;
  takerAddress: string | null;
  failureReason: string | null;
  status: string;
  createdAt: Date;
  clientSource: string | null;
  clientId: string | null;
  clientName: string | null;
  user: { displayName: string | null; address: string } | null;
}): AdminSwapRow {
  const tokenInMeta = findToken(row.chainKey, row.tokenIn);
  const tokenOutMeta = findToken(row.chainKey, row.tokenOut);
  const feeToken = tokenOutMeta ?? tokenInMeta;
  const chain = getChainByKey(row.chainKey);

  return {
    id: row.id,
    chainKey: row.chainKey,
    chainName: chain?.name ?? row.chainKey,
    dexId: row.dexId,
    dexLabel: brandedRouteName(row.dexId),
    status: row.status,
    takerAddress: row.takerAddress ?? row.user?.address ?? null,
    userDisplayName: row.user?.displayName ?? null,
    tokenIn: row.tokenIn,
    tokenOut: row.tokenOut,
    tokenInSymbol: tokenInMeta?.symbol ?? row.tokenIn.slice(0, 8),
    tokenOutSymbol: tokenOutMeta?.symbol ?? row.tokenOut.slice(0, 8),
    amountIn: row.amountIn.toString(),
    amountOut: row.amountOut.toString(),
    amountInFormatted: formatAmount(row.amountIn.toString(), tokenInMeta),
    amountOutFormatted: formatAmount(row.amountOut.toString(), tokenOutMeta),
    protocolFee: row.protocolFee.toString(),
    protocolFeeFormatted: formatAmount(row.protocolFee.toString(), feeToken),
    feeBps: row.feeBps,
    volumeUsd: row.volumeUsd,
    feeUsd: row.feeUsd,
    txHash: row.txHash,
    explorerUrl: explorerTxUrl(row.chainKey, row.txHash),
    failureReason: row.failureReason,
    createdAt: row.createdAt.toISOString(),
    clientSource: row.clientSource,
    clientId: row.clientId,
    clientName: row.clientName,
  };
}

export async function listAdminSwaps(
  filters: AdminSwapFilters = {},
): Promise<{ swaps: AdminSwapRow[]; total: number; page: number; summary: AdminSwapSummary }> {
  if (!db) {
    return {
      swaps: [],
      total: 0,
      page: 1,
      summary: { total: 0, confirmed: 0, failed: 0, pending: 0, volumeUsd: 0, feesUsd: 0 },
    };
  }

  const page = Math.max(1, filters.page ?? 1);
  const take = 50;
  const skip = (page - 1) * take;
  const q = filters.q?.trim();

  const where: import("@prisma/client").Prisma.SwapWhereInput = {};
  if (filters.chainKey) where.chainKey = filters.chainKey;
  if (filters.status) where.status = filters.status;
  if (filters.source) where.clientSource = filters.source;
  if (filters.clientId) where.clientId = filters.clientId;
  if (q) {
    where.OR = [
      { txHash: { contains: q, mode: "insensitive" } },
      { takerAddress: { contains: q, mode: "insensitive" } },
      { tokenIn: { contains: q, mode: "insensitive" } },
      { tokenOut: { contains: q, mode: "insensitive" } },
      { dexId: { contains: q, mode: "insensitive" } },
      { failureReason: { contains: q, mode: "insensitive" } },
      { user: { is: { address: { contains: q, mode: "insensitive" } } } },
      { user: { is: { displayName: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [rows, total, confirmed, failed, pending, aggregates] = await Promise.all([
    db.swap.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: { user: { select: { displayName: true, address: true } } },
    }),
    db.swap.count({ where }),
    db.swap.count({ where: { ...where, status: "confirmed" } }),
    db.swap.count({ where: { ...where, status: "failed" } }),
    db.swap.count({
      where: {
        ...where,
        status: { in: ["quoted", "submitted"] },
      },
    }),
    db.swap.aggregate({
      where: { ...where, status: "confirmed" },
      _sum: { volumeUsd: true, feeUsd: true },
    }),
  ]);

  return {
    swaps: rows.map(enrichSwap),
    total,
    page,
    summary: {
      total,
      confirmed,
      failed,
      pending,
      volumeUsd: aggregates._sum.volumeUsd ?? 0,
      feesUsd: aggregates._sum.feeUsd ?? 0,
    },
  };
}

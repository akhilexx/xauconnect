/**
 * Admin API usage analytics — request logs and aggregate stats for agent/API traffic.
 */
import { db } from "../db/client.js";

export interface ApiUsageSummary {
  requests24h: number;
  requests7d: number;
  quotes24h: number;
  builds24h: number;
  records24h: number;
  confirmedSwapsBySource: { web: number; agent: number; api: number; unknown: number };
  uniqueTakers24h: number;
  topClients: { clientId: string | null; clientName: string | null; count: number }[];
}

export interface ApiRequestRow {
  id: string;
  endpoint: string;
  method: string;
  chainKey: string | null;
  takerAddress: string | null;
  clientSource: string;
  clientId: string | null;
  clientName: string | null;
  clientIp: string | null;
  statusCode: number;
  requestId: string | null;
  createdAt: string;
}

export interface ApiUsageFilters {
  page?: number;
  endpoint?: string;
  clientId?: string;
  chainKey?: string;
  clientSource?: string;
  /** Free-text search across client id/name, taker, request id, endpoint */
  q?: string;
  statusMin?: number;
  statusMax?: number;
}

function sinceHours(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

export function buildApiRequestLogWhere(
  filters: ApiUsageFilters = {},
): import("@prisma/client").Prisma.ApiRequestLogWhereInput {
  const where: import("@prisma/client").Prisma.ApiRequestLogWhereInput = {};
  if (filters.endpoint) where.endpoint = { contains: filters.endpoint };
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.chainKey) where.chainKey = filters.chainKey;
  if (filters.clientSource) where.clientSource = filters.clientSource;
  if (filters.statusMin != null || filters.statusMax != null) {
    where.statusCode = {
      ...(filters.statusMin != null ? { gte: filters.statusMin } : {}),
      ...(filters.statusMax != null ? { lte: filters.statusMax } : {}),
    };
  }
  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { clientId: { contains: q, mode: "insensitive" } },
      { clientName: { contains: q, mode: "insensitive" } },
      { takerAddress: { contains: q, mode: "insensitive" } },
      { requestId: { contains: q, mode: "insensitive" } },
      { endpoint: { contains: q, mode: "insensitive" } },
      { clientIp: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
}

const MAX_FILTER_MUTATION = 10_000;

export async function getApiUsageSummary(): Promise<ApiUsageSummary> {
  if (!db) {
    return {
      requests24h: 0,
      requests7d: 0,
      quotes24h: 0,
      builds24h: 0,
      records24h: 0,
      confirmedSwapsBySource: { web: 0, agent: 0, api: 0, unknown: 0 },
      uniqueTakers24h: 0,
      topClients: [],
    };
  }

  const d24 = sinceHours(24);
  const d7 = sinceHours(24 * 7);

  const [requests24h, requests7d, quotes24h, builds24h, records24h, swapSources, takers, topRaw] =
    await Promise.all([
      db.apiRequestLog.count({ where: { createdAt: { gte: d24 } } }),
      db.apiRequestLog.count({ where: { createdAt: { gte: d7 } } }),
      db.apiRequestLog.count({
        where: { createdAt: { gte: d24 }, endpoint: { contains: "/quote" } },
      }),
      db.apiRequestLog.count({
        where: { createdAt: { gte: d24 }, endpoint: { contains: "/build" } },
      }),
      db.apiRequestLog.count({
        where: { createdAt: { gte: d24 }, endpoint: { endsWith: "/record" } },
      }),
      db.swap.groupBy({
        by: ["clientSource"],
        where: { status: "confirmed", createdAt: { gte: d7 } },
        _count: { _all: true },
      }),
      db.apiRequestLog.findMany({
        where: { createdAt: { gte: d24 }, takerAddress: { not: null } },
        distinct: ["takerAddress"],
        select: { takerAddress: true },
      }),
      db.apiRequestLog.groupBy({
        by: ["clientId", "clientName"],
        where: { createdAt: { gte: d7 }, clientId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { clientId: "desc" } },
        take: 10,
      }),
    ]);

  const bySource = { web: 0, agent: 0, api: 0, unknown: 0 };
  for (const row of swapSources) {
    const key = row.clientSource ?? "unknown";
    if (key === "web" || key === "agent" || key === "api") {
      bySource[key] = row._count._all;
    } else {
      bySource.unknown += row._count._all;
    }
  }

  return {
    requests24h,
    requests7d,
    quotes24h,
    builds24h,
    records24h,
    confirmedSwapsBySource: bySource,
    uniqueTakers24h: takers.length,
    topClients: topRaw.map((r) => ({
      clientId: r.clientId,
      clientName: r.clientName,
      count: r._count._all,
    })),
  };
}

export async function listApiRequestLogs(
  filters: ApiUsageFilters = {},
): Promise<{ requests: ApiRequestRow[]; total: number; page: number }> {
  if (!db) return { requests: [], total: 0, page: 1 };

  const page = Math.max(1, filters.page ?? 1);
  const take = 50;
  const skip = (page - 1) * take;

  const where = buildApiRequestLogWhere(filters);

  const [rows, total] = await Promise.all([
    db.apiRequestLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    db.apiRequestLog.count({ where }),
  ]);

  return {
    requests: rows.map((r) => ({
      id: r.id,
      endpoint: r.endpoint,
      method: r.method,
      chainKey: r.chainKey,
      takerAddress: r.takerAddress,
      clientSource: r.clientSource,
      clientId: r.clientId,
      clientName: r.clientName,
      clientIp: r.clientIp,
      statusCode: r.statusCode,
      requestId: r.requestId,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
  };
}

export async function listApiClients(): Promise<
  {
    id: string;
    name: string;
    description: string | null;
    contactEmail: string | null;
    enabled: boolean;
    createdAt: string;
    requestCount: number;
  }[]
> {
  if (!db) return [];
  const clients = await db.apiClient.findMany({ orderBy: { createdAt: "desc" } });
  const counts = await Promise.all(
    clients.map((c) => db!.apiRequestLog.count({ where: { clientId: c.id } })),
  );
  return clients.map((c, i) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    contactEmail: c.contactEmail,
    enabled: c.enabled,
    createdAt: c.createdAt.toISOString(),
    requestCount: counts[i] ?? 0,
  }));
}

export async function deleteApiRequestLogs(ids: string[]): Promise<{ deleted: number }> {
  if (!db || ids.length === 0) return { deleted: 0 };
  const unique = [...new Set(ids)].slice(0, 500);
  const result = await db.apiRequestLog.deleteMany({ where: { id: { in: unique } } });
  return { deleted: result.count };
}

export async function deleteApiRequestLogsByFilter(
  filters: ApiUsageFilters,
): Promise<{ deleted: number }> {
  if (!db) return { deleted: 0 };
  const where = buildApiRequestLogWhere(filters);
  const count = await db.apiRequestLog.count({ where });
  if (count > MAX_FILTER_MUTATION) {
    throw new Error(`Too many matching requests (${count}). Narrow your filters first.`);
  }
  const result = await db.apiRequestLog.deleteMany({ where });
  return { deleted: result.count };
}

export interface ApiRequestBulkPatch {
  clientSource?: string;
  clientName?: string | null;
  clientId?: string | null;
}

export async function bulkUpdateApiRequestLogs(
  ids: string[],
  patch: ApiRequestBulkPatch,
): Promise<{ updated: number }> {
  if (!db || ids.length === 0) return { updated: 0 };

  const data: import("@prisma/client").Prisma.ApiRequestLogUpdateManyMutationInput = {};
  if (patch.clientSource !== undefined) data.clientSource = patch.clientSource;
  if (patch.clientName !== undefined) data.clientName = patch.clientName;
  if (patch.clientId !== undefined) data.clientId = patch.clientId;
  if (Object.keys(data).length === 0) return { updated: 0 };

  const unique = [...new Set(ids)].slice(0, 500);
  const result = await db.apiRequestLog.updateMany({
    where: { id: { in: unique } },
    data,
  });
  return { updated: result.count };
}

export async function bulkUpdateApiRequestLogsByFilter(
  filters: ApiUsageFilters,
  patch: ApiRequestBulkPatch,
): Promise<{ updated: number }> {
  if (!db) return { updated: 0 };

  const data: import("@prisma/client").Prisma.ApiRequestLogUpdateManyMutationInput = {};
  if (patch.clientSource !== undefined) data.clientSource = patch.clientSource;
  if (patch.clientName !== undefined) data.clientName = patch.clientName;
  if (patch.clientId !== undefined) data.clientId = patch.clientId;
  if (Object.keys(data).length === 0) return { updated: 0 };

  const where = buildApiRequestLogWhere(filters);
  const count = await db.apiRequestLog.count({ where });
  if (count > MAX_FILTER_MUTATION) {
    throw new Error(`Too many matching requests (${count}). Narrow your filters first.`);
  }
  const result = await db.apiRequestLog.updateMany({ where, data });
  return { updated: result.count };
}

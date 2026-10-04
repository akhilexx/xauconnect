/**
 * Admin routes — metrics, fee configuration, listing approval queue,
 * user management, audit log. Every endpoint requires the ADMIN role and
 * every mutation is written to the audit trail.
 */
import { Router } from "express";
import { z } from "zod";
import { CHAIN_KEYS, AdminWalletSchema, FeeConfigSchema } from "@xauconnect/utils";
import { db } from "../db/client.js";
import { asyncHandler, validate, ApiError } from "../middleware/error.js";
import { requireAdmin } from "../middleware/auth.js";
import { adminLimiter } from "../middleware/rate-limit.js";
import { addAdminWallet, listAdminWallets, removeAdminWallet } from "../services/admin-wallets.js";
import { listConnectedWallets, deleteConnectedWallet } from "../services/connected-wallets.js";
import { adminMetrics } from "../services/metrics.js";
import { adminTreasurySummary } from "../services/admin-treasury.js";
import { listAdminSwaps } from "../services/admin-swaps.js";
import { isOnrampEnabled } from "../services/onramp/index.js";
import {
  bulkUpdateApiRequestLogs,
  bulkUpdateApiRequestLogsByFilter,
  deleteApiRequestLogs,
  deleteApiRequestLogsByFilter,
  getApiUsageSummary,
  listApiClients,
  listApiRequestLogs,
  type ApiUsageFilters,
} from "../services/admin-api-usage.js";
import {
  deployedFeeCollectorChains,
  readOnChainSwapFeeBps,
  syncOnChainSwapFeeBps,
} from "../services/fee-collector-onchain.js";

export const adminRouter = Router();
adminRouter.use(adminLimiter, requireAdmin);

async function audit(req: { session?: { address: string } }, action: string, resource?: string, detail?: unknown) {
  if (!db) return;
  const actor = req.session
    ? await db.user.findUnique({ where: { address: req.session.address } })
    : null;
  await db.auditLog
    .create({
      data: { actorId: actor?.id, action, resource, detail: detail as object | undefined },
    })
    .catch(() => {});
}

// ── Metrics ──────────────────────────────────────────────────────────────

adminRouter.get(
  "/metrics",
  asyncHandler(async (_req, res) => {
    res.json(await adminMetrics());
  }),
);

adminRouter.get(
  "/treasury",
  asyncHandler(async (_req, res) => {
    res.json(await adminTreasurySummary());
  }),
);

adminRouter.get(
  "/swaps",
  asyncHandler(async (req, res) => {
    if (!db) {
      res.json({
        swaps: [],
        total: 0,
        page: 1,
        summary: { total: 0, confirmed: 0, failed: 0, pending: 0, volumeUsd: 0, feesUsd: 0 },
      });
      return;
    }
    res.json(
      await listAdminSwaps({
        page: Math.max(1, Number(req.query.page ?? 1)),
        chainKey: typeof req.query.chainKey === "string" ? req.query.chainKey : undefined,
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        source: typeof req.query.source === "string" ? req.query.source : undefined,
        clientId: typeof req.query.clientId === "string" ? req.query.clientId : undefined,
        q: typeof req.query.q === "string" ? req.query.q : undefined,
      }),
    );
  }),
);

adminRouter.get(
  "/api-usage/summary",
  asyncHandler(async (_req, res) => {
    res.json(await getApiUsageSummary());
  }),
);

const apiUsageFilterSchema = z.object({
  endpoint: z.string().optional(),
  clientId: z.string().optional(),
  chainKey: z.string().optional(),
  clientSource: z.string().optional(),
  q: z.string().optional(),
  status: z.enum(["ok", "error"]).optional(),
});

function parseApiUsageFiltersFromQuery(query: Record<string, unknown>): ApiUsageFilters {
  const statusFilter = typeof query.status === "string" ? query.status : undefined;
  let statusMin: number | undefined;
  let statusMax: number | undefined;
  if (statusFilter === "ok") {
    statusMax = 399;
  } else if (statusFilter === "error") {
    statusMin = 400;
  }
  return {
    page: Math.max(1, Number(query.page ?? 1)),
    endpoint: typeof query.endpoint === "string" ? query.endpoint : undefined,
    clientId: typeof query.clientId === "string" ? query.clientId : undefined,
    chainKey: typeof query.chainKey === "string" ? query.chainKey : undefined,
    clientSource: typeof query.clientSource === "string" ? query.clientSource : undefined,
    q: typeof query.q === "string" ? query.q : undefined,
    statusMin,
    statusMax,
  };
}

function parseApiUsageFiltersFromBody(filters: z.infer<typeof apiUsageFilterSchema>): ApiUsageFilters {
  let statusMin: number | undefined;
  let statusMax: number | undefined;
  if (filters.status === "ok") {
    statusMax = 399;
  } else if (filters.status === "error") {
    statusMin = 400;
  }
  return {
    endpoint: filters.endpoint,
    clientId: filters.clientId,
    chainKey: filters.chainKey,
    clientSource: filters.clientSource,
    q: filters.q,
    statusMin,
    statusMax,
  };
}

adminRouter.get(
  "/api-usage/requests",
  asyncHandler(async (req, res) => {
    res.json(await listApiRequestLogs(parseApiUsageFiltersFromQuery(req.query as Record<string, unknown>)));
  }),
);

adminRouter.post(
  "/api-usage/requests/delete",
  asyncHandler(async (req, res) => {
    const body = validate(
      z.union([
        z.object({ ids: z.array(z.string().min(1)).min(1).max(500) }),
        z.object({ selectAll: z.literal(true), filters: apiUsageFilterSchema.optional() }),
      ]),
      req.body,
    );
    if ("selectAll" in body) {
      try {
        const result = await deleteApiRequestLogsByFilter(parseApiUsageFiltersFromBody(body.filters ?? {}));
        res.json(result);
      } catch (err) {
        throw new ApiError(400, err instanceof Error ? err.message : "Delete failed", "DELETE_FAILED");
      }
      return;
    }
    const result = await deleteApiRequestLogs(body.ids);
    res.json(result);
  }),
);

adminRouter.patch(
  "/api-usage/requests/bulk",
  asyncHandler(async (req, res) => {
    const patchSchema = z.object({
      clientSource: z.enum(["web", "agent", "api"]).optional(),
      clientName: z.string().max(128).nullable().optional(),
      clientId: z.string().max(128).nullable().optional(),
    });
    const body = validate(
      z.union([
        patchSchema.extend({ ids: z.array(z.string().min(1)).min(1).max(500) }),
        patchSchema.extend({
          selectAll: z.literal(true),
          filters: apiUsageFilterSchema.optional(),
        }),
      ]),
      req.body,
    );
    const { clientSource, clientName, clientId } = body;
    const patch = { clientSource, clientName, clientId };
    if ("selectAll" in body) {
      try {
        const result = await bulkUpdateApiRequestLogsByFilter(
          parseApiUsageFiltersFromBody(body.filters ?? {}),
          patch,
        );
        res.json(result);
      } catch (err) {
        throw new ApiError(400, err instanceof Error ? err.message : "Bulk update failed", "BULK_FAILED");
      }
      return;
    }
    const result = await bulkUpdateApiRequestLogs(body.ids, patch);
    res.json(result);
  }),
);

adminRouter.get(
  "/api-clients",
  asyncHandler(async (_req, res) => {
    res.json({ clients: await listApiClients() });
  }),
);

adminRouter.post(
  "/api-clients",
  asyncHandler(async (req, res) => {
    if (!db) throw new ApiError(503, "Database required", "NO_DB");
    const body = validate(
      z.object({
        name: z.string().min(1).max(128),
        description: z.string().max(500).optional(),
        contactEmail: z.string().email().optional(),
      }),
      req.body,
    );
    const client = await db.apiClient.create({
      data: {
        name: body.name,
        description: body.description,
        contactEmail: body.contactEmail,
      },
    });
    await audit(req, "api_client.create", client.id, body);
    res.status(201).json({ client: { id: client.id, name: client.name, createdAt: client.createdAt } });
  }),
);

// ── Fee configuration ────────────────────────────────────────────────────

adminRouter.get(
  "/fees",
  asyncHandler(async (_req, res) => {
    const fromDb = db ? await db.feeConfig.findMany() : [];
    const byChain = new Map(fromDb.map((f) => [f.chainKey, f]));
    // Always return every chain, defaults filled in.
    const configs = await Promise.all(
      CHAIN_KEYS.map(async (chainKey) => {
        const existing = byChain.get(chainKey);
        const defaultOnrampFeeBps = chainKey === "solana" ? 500 : 300;
        const base = existing
          ? {
              chainKey,
              swapFeeBps: existing.swapFeeBps,
              defaultSlippageBps: existing.defaultSlippageBps,
              lpFeeBps: existing.lpFeeBps,
              onrampFeeBps:
                (existing as { onrampFeeBps?: number }).onrampFeeBps ?? defaultOnrampFeeBps,
              launchFeeNative: existing.launchFeeNative.toString(),
              listingFeeUsd: existing.listingFeeUsd,
              enabled: existing.enabled,
            }
          : {
              chainKey,
              swapFeeBps: 30,
              defaultSlippageBps: 50,
              lpFeeBps: 10,
              onrampFeeBps: defaultOnrampFeeBps,
              launchFeeNative: "10000000000000000",
              listingFeeUsd: 99,
              enabled: true,
            };
        const onChainSwapFeeBps = await readOnChainSwapFeeBps(chainKey);
        return {
          ...base,
          onChainSwapFeeBps,
          onChainFeeCollectorDeployed: onChainSwapFeeBps != null,
        };
      }),
    );
    res.json({ configs, persisted: Boolean(db), deployedChains: deployedFeeCollectorChains() });
  }),
);

adminRouter.put(
  "/fees/:chainKey",
  asyncHandler(async (req, res) => {
    const config = validate(FeeConfigSchema, { ...req.body, chainKey: req.params.chainKey });
    if (!db) throw new ApiError(503, "Fee persistence requires the database", "NO_DB");
    const saved = await db.feeConfig.upsert({
      where: { chainKey: config.chainKey },
      update: {
        swapFeeBps: config.swapFeeBps,
        defaultSlippageBps: config.defaultSlippageBps,
        lpFeeBps: config.lpFeeBps,
        onrampFeeBps: config.onrampFeeBps,
        launchFeeNative: config.launchFeeNative,
        listingFeeUsd: config.listingFeeUsd,
        enabled: config.enabled,
      },
      create: {
        chainKey: config.chainKey,
        swapFeeBps: config.swapFeeBps,
        defaultSlippageBps: config.defaultSlippageBps,
        lpFeeBps: config.lpFeeBps,
        onrampFeeBps: config.onrampFeeBps,
        launchFeeNative: config.launchFeeNative,
        listingFeeUsd: config.listingFeeUsd,
        enabled: config.enabled,
      },
    });
    await audit(req, "fees.update", config.chainKey, config);

    let onChainSync: Awaited<ReturnType<typeof syncOnChainSwapFeeBps>> | undefined;
    if (config.enabled && config.chainKey !== "solana") {
      onChainSync = await syncOnChainSwapFeeBps(config.chainKey, config.swapFeeBps);
    }

    res.json({
      ok: true,
      config: { ...config, updatedAt: saved.updatedAt },
      onChainSync,
    });
  }),
);

// ── Fiat on-ramp / off-ramp (Buy & Sell crypto) ──────────────────────────

adminRouter.get(
  "/fiat-transactions",
  asyncHandler(async (req, res) => {
    const enabled = isOnrampEnabled();
    if (!db) {
      res.json({
        transactions: [],
        total: 0,
        page: 1,
        summary: { total: 0, completed: 0, pending: 0, failed: 0, feeUsd: 0, volumeUsd: 0 },
        enabled,
      });
      return;
    }
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = 50;
    const where: Record<string, unknown> = {};
    if (req.query.type) where.type = String(req.query.type);
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.q) {
      const q = String(req.query.q);
      where.OR = [
        { walletAddress: { contains: q, mode: "insensitive" } },
        { provider: { contains: q, mode: "insensitive" } },
        { cryptoAsset: { contains: q, mode: "insensitive" } },
        { providerTxId: { contains: q, mode: "insensitive" } },
      ];
    }
    const [rows, total, all] = await Promise.all([
      db.fiatTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.fiatTransaction.count({ where }),
      db.fiatTransaction.findMany({ select: { status: true, fiatAmount: true, partnerFeeFiat: true } }),
    ]);
    const summary = all.reduce(
      (acc, t) => {
        acc.total += 1;
        if (t.status === "completed") acc.completed += 1;
        else if (t.status === "failed" || t.status === "expired") acc.failed += 1;
        else acc.pending += 1;
        acc.volumeUsd += t.fiatAmount ?? 0;
        acc.feeUsd += t.partnerFeeFiat ?? 0;
        return acc;
      },
      { total: 0, completed: 0, pending: 0, failed: 0, feeUsd: 0, volumeUsd: 0 },
    );
    res.json({
      transactions: rows.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
      total,
      page,
      summary,
      enabled,
    });
  }),
);

// ── Listing approval queue ───────────────────────────────────────────────

adminRouter.get(
  "/listings",
  asyncHandler(async (_req, res) => {
    if (!db) {
      res.json({ queue: [] });
      return;
    }
    const queue = await db.token.findMany({
      where: { listingStatus: "PENDING" },
      orderBy: { createdAt: "asc" },
    });
    res.json({ queue });
  }),
);

const DecisionSchema = z.object({ decision: z.enum(["approve", "reject"]) });

adminRouter.post(
  "/listings/:tokenId",
  asyncHandler(async (req, res) => {
    const { decision } = validate(DecisionSchema, req.body);
    if (!db) throw new ApiError(503, "Listing queue requires the database", "NO_DB");
    const token = await db.token.update({
      where: { id: req.params.tokenId },
      data: { listingStatus: decision === "approve" ? "APPROVED" : "REJECTED" },
    });
    await audit(req, `listing.${decision}`, token.id, { symbol: token.symbol });
    res.json({ ok: true, token });
  }),
);

// ── User management ──────────────────────────────────────────────────────

adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    if (!db) {
      res.json({ users: [], total: 0, page: 1 });
      return;
    }
    const page = Math.max(1, Number(req.query.page ?? 1));
    const take = 50;
    const skip = (page - 1) * take;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const role = typeof req.query.role === "string" ? req.query.role : undefined;
    const kycStatus = typeof req.query.kycStatus === "string" ? req.query.kycStatus : undefined;
    const chainKind = typeof req.query.chainKind === "string" ? req.query.chainKind : undefined;

    const where: import("@prisma/client").Prisma.UserWhereInput = {};
    if (role === "ADMIN" || role === "USER") where.role = role;
    if (kycStatus) where.kycStatus = kycStatus as "NONE" | "PENDING" | "APPROVED" | "REJECTED";
    if (chainKind) where.chainKind = chainKind;
    if (q) {
      where.OR = [
        { address: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
        { twitter: { contains: q, mode: "insensitive" } },
        { telegram: { contains: q, mode: "insensitive" } },
        { discord: { contains: q, mode: "insensitive" } },
        { website: { contains: q, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          address: true,
          chainKind: true,
          role: true,
          kycStatus: true,
          createdAt: true,
          lastSeenAt: true,
          displayName: true,
          twitter: true,
          telegram: true,
          discord: true,
          website: true,
        },
      }),
      db.user.count({ where }),
    ]);
    res.json({
      users: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        lastSeenAt: u.lastSeenAt.toISOString(),
      })),
      total,
      page,
    });
  }),
);

const KycSchema = z.object({
  kycStatus: z.enum(["NONE", "PENDING", "APPROVED", "REJECTED"]),
  reason: z.string().optional(),
});

adminRouter.put(
  "/users/:id/kyc",
  asyncHandler(async (req, res) => {
    const { kycStatus, reason } = validate(KycSchema, req.body);
    if (!db) throw new ApiError(503, "User management requires the database", "NO_DB");
    const user = await db.user.update({
      where: { id: req.params.id },
      data: { kycStatus, kycFlaggedReason: reason },
    });
    await audit(req, "user.kyc", user.id, { kycStatus, reason });
    res.json({ ok: true, user });
  }),
);

adminRouter.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    if (!db) throw new ApiError(503, "User management requires the database", "NO_DB");
    const id = req.params.id;
    if (!id) throw new ApiError(400, "User id required", "BAD_REQUEST");

    const existing = await db.user.findUnique({
      where: { id },
      include: { _count: { select: { launches: true } } },
    });
    if (!existing) throw new ApiError(404, "User not found", "NOT_FOUND");
    if (existing.role === "ADMIN") {
      throw new ApiError(403, "Cannot delete admin users", "FORBIDDEN");
    }
    if (existing._count.launches > 0) {
      throw new ApiError(
        409,
        "User has token launches on record — delete or reassign launches first",
        "CONFLICT",
      );
    }

    await db.$transaction([
      db.swap.updateMany({ where: { userId: id }, data: { userId: null } }),
      db.auditLog.updateMany({ where: { actorId: id }, data: { actorId: null } }),
      db.user.delete({ where: { id } }),
    ]);
    await audit(req, "user.delete", id, { address: existing.address });
    res.json({ ok: true });
  }),
);

// ── Treasury wallets ─────────────────────────────────────────────────────

adminRouter.get(
  "/connected-wallets",
  asyncHandler(async (req, res) => {
    if (!db) {
      res.json({ wallets: [], total: 0, page: 1 });
      return;
    }
    const result = await listConnectedWallets({
      page: Math.max(1, Number(req.query.page ?? 1)),
      refreshBalances: req.query.refresh === "true",
      q: typeof req.query.q === "string" ? req.query.q : undefined,
      chainKind: typeof req.query.chainKind === "string" ? req.query.chainKind : undefined,
      lastChainKey: typeof req.query.lastChainKey === "string" ? req.query.lastChainKey : undefined,
      walletApp: typeof req.query.walletApp === "string" ? req.query.walletApp : undefined,
    });
    res.json(result);
  }),
);

adminRouter.delete(
  "/connected-wallets/:id",
  asyncHandler(async (req, res) => {
    if (!db) throw new ApiError(503, "Wallet registry requires the database", "NO_DB");
    const id = req.params.id;
    if (!id) throw new ApiError(400, "Connected wallet id required", "BAD_REQUEST");
    const removed = await deleteConnectedWallet(id);
    await audit(req, "connected_wallet.delete", removed.id, { address: removed.address });
    res.json({ ok: true });
  }),
);

adminRouter.get(
  "/wallets",
  asyncHandler(async (req, res) => {
    if (!db) throw new ApiError(503, "Wallet registry requires the database", "NO_DB");
    const withBalances = req.query.balances !== "false";
    const wallets = await listAdminWallets(withBalances);
    res.json({ wallets });
  }),
);

adminRouter.post(
  "/wallets",
  asyncHandler(async (req, res) => {
    const input = validate(AdminWalletSchema, req.body);
    if (!db) throw new ApiError(503, "Wallet registry requires the database", "NO_DB");
    const wallet = await addAdminWallet(input, req.session?.address);
    await audit(req, "wallet.add", wallet.id, input);
    res.json({ ok: true, wallet });
  }),
);

adminRouter.delete(
  "/wallets/:id",
  asyncHandler(async (req, res) => {
    if (!db) throw new ApiError(503, "Wallet registry requires the database", "NO_DB");
    const id = req.params.id;
    if (!id) throw new ApiError(400, "Wallet id required", "BAD_REQUEST");
    const wallet = await removeAdminWallet(id);
    await audit(req, "wallet.remove", wallet.id, { address: wallet.address });
    res.json({ ok: true });
  }),
);

// ── Audit log ────────────────────────────────────────────────────────────

adminRouter.get(
  "/audit",
  asyncHandler(async (_req, res) => {
    if (!db) {
      res.json({ logs: [] });
      return;
    }
    const logs = await db.auditLog.findMany({
      include: { actor: { select: { address: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ logs });
  }),
);

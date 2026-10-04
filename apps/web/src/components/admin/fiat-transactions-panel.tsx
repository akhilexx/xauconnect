"use client";

/**
 * FiatTransactionsPanel — admin view of fiat on-ramp / off-ramp (Buy & Sell)
 * activity routed through the Onramper aggregator. Surfaces lifecycle status,
 * provider, amounts, and our captured partner fee for reconciliation.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge, GlassCard } from "@xauconnect/ui";
import { api } from "@/lib/api";
import { useAdminReady } from "@/lib/session";
import { AdminQueryShell } from "./admin-query-shell";

const STATUS_TONE: Record<string, "success" | "gold" | "danger" | "neutral"> = {
  completed: "success",
  pending: "gold",
  created: "neutral",
  failed: "danger",
  expired: "danger",
};

export function FiatTransactionsPanel() {
  const adminReady = useAdminReady();
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  const query = useQuery({
    queryKey: ["admin-fiat-tx", type, status],
    enabled: adminReady,
    retry: 1,
    queryFn: () => api.adminFiatTransactions({ type: type || undefined, status: status || undefined }),
  });

  return (
    <AdminQueryShell query={query} skeletonClass="h-96 w-full">
      {(data) => (
        <div className="flex flex-col gap-3">
          {!data.enabled && (
            <p className="rounded-xl bg-gold/10 p-3 text-xs text-ink-soft ring-1 ring-gold/25">
              Fiat buy/sell is not live yet — set <code className="rounded bg-white/60 px-1">ONRAMPER_API_KEY</code>{" "}
              on the backend to activate. Transactions will appear here once users start buying or selling.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Total", value: data.summary.total },
              { label: "Completed", value: data.summary.completed },
              { label: "Pending", value: data.summary.pending },
              { label: "Failed", value: data.summary.failed },
            ].map((s) => (
              <GlassCard key={s.label} padding="sm" className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-ink-muted">{s.label}</p>
                <p className="font-display text-xl font-bold text-ink">{s.value}</p>
              </GlassCard>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <GlassCard padding="sm" className="text-center sm:col-span-2">
              <p className="text-[10px] uppercase tracking-wider text-ink-muted">Fiat volume</p>
              <p className="font-display text-lg font-bold text-ink">
                ${data.summary.volumeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </GlassCard>
            <GlassCard padding="sm" className="text-center sm:col-span-2">
              <p className="text-[10px] uppercase tracking-wider text-ink-muted">Partner fees earned</p>
              <p className="gold-text font-display text-lg font-bold">
                ${data.summary.feeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </GlassCard>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="glass-field rounded-xl px-3 py-1.5 text-xs text-ink"
            >
              <option value="">All types</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="glass-field rounded-xl px-3 py-1.5 text-xs text-ink"
            >
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="created">Created</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <GlassCard variant="strong" padding="sm" className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-white/60 text-left text-[11px] uppercase tracking-wider text-ink-muted">
                  <th className="px-3 py-2.5 font-semibold">When</th>
                  <th className="px-3 py-2.5 font-semibold">Type</th>
                  <th className="px-3 py-2.5 font-semibold">Provider</th>
                  <th className="px-3 py-2.5 font-semibold">Fiat</th>
                  <th className="px-3 py-2.5 font-semibold">Crypto</th>
                  <th className="px-3 py-2.5 font-semibold">Our fee</th>
                  <th className="px-3 py-2.5 font-semibold">Country</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-ink-muted">
                      No fiat transactions yet.
                    </td>
                  </tr>
                ) : (
                  data.transactions.map((t) => (
                    <tr key={t.id} className="border-b border-white/40 last:border-0">
                      <td className="px-3 py-2.5 text-xs text-ink-muted">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 font-semibold capitalize">{t.type}</td>
                      <td className="px-3 py-2.5 capitalize">{t.provider ?? "—"}</td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {t.fiatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {t.fiatCurrency}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {t.cryptoAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
                        {t.cryptoAsset.toUpperCase()}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-gold-deep">
                        {t.partnerFeeFiat.toLocaleString(undefined, { maximumFractionDigits: 2 })} {t.fiatCurrency}
                        <span className="ml-1 text-[10px] text-ink-faint">({t.partnerFeePct}%)</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{t.country ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={STATUS_TONE[t.status] ?? "neutral"}>{t.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </GlassCard>
        </div>
      )}
    </AdminQueryShell>
  );
}

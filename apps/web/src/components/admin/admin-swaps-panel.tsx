"use client";

/**
 * AdminSwapsPanel — full swap transaction log with status, fees, and chain detail.
 */
import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import {
  CHAINS,
  formatBps,
  formatUsd,
  getChainByKey,
  getChainLogoUrl,
  timeAgo,
  BRAND_NAV_ICONS,
} from "@xauconnect/utils";
import { Badge, ChainIcon, GlassCard, Skeleton, StatCard, cn } from "@xauconnect/ui";
import { api } from "@/lib/api";
import { useAdminReady } from "@/lib/session";
import { AdminQueryShell } from "./admin-query-shell";
import { AdminFilterBar } from "./admin-filter-bar";
import { BrandGlyph } from "@/components/brand-glyph";

type SwapRow = Awaited<ReturnType<typeof api.adminSwaps>>["swaps"][number];

const STATUS_TONE: Record<string, "success" | "danger" | "gold" | "neutral"> = {
  confirmed: "success",
  failed: "danger",
  submitted: "gold",
  quoted: "neutral",
};

function SwapDetailRow({ swap }: { swap: SwapRow }) {
  const [open, setOpen] = useState(false);
  const chain = getChainByKey(swap.chainKey);

  return (
    <>
      <tr className="border-b border-white/40 last:border-0">
        <td className="px-3 py-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-start gap-1 text-left"
            aria-expanded={open}
          >
            {open ? (
              <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
            ) : (
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
            )}
            <span className="text-xs text-ink-muted">{timeAgo(swap.createdAt)}</span>
          </button>
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            {chain ? (
              <ChainIcon name={chain.name} src={getChainLogoUrl(chain.key)} size={18} />
            ) : null}
            <span className="text-sm font-semibold">{swap.chainName}</span>
          </div>
        </td>
        <td className="px-3 py-3 text-sm">
          <span className="font-semibold">{swap.amountInFormatted}</span>{" "}
          <span className="text-ink-muted">{swap.tokenInSymbol}</span>
          <span className="mx-1 text-ink-muted">→</span>
          <span className="font-semibold">{swap.amountOutFormatted}</span>{" "}
          <span className="text-ink-muted">{swap.tokenOutSymbol}</span>
        </td>
        <td className="px-3 py-3">
          <Badge tone={STATUS_TONE[swap.status] ?? "neutral"}>{swap.status}</Badge>
        </td>
        <td className="px-3 py-3 text-right text-sm tabular-nums">{formatUsd(swap.volumeUsd)}</td>
        <td className="px-3 py-3 text-right text-sm tabular-nums text-gold-deep">
          {formatUsd(swap.feeUsd)}
        </td>
        <td className="px-3 py-3 text-sm text-ink-muted">{swap.dexLabel}</td>
        <td className="px-3 py-3">
          <Badge tone={swap.clientSource === "agent" ? "gold" : "neutral"}>
            {swap.clientSource ?? "—"}
          </Badge>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-white/30 bg-white/20">
          <td colSpan={8} className="px-4 py-3">
            <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">Swap id</dt>
                <dd className="mt-0.5 break-all font-mono">{swap.id}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">Wallet</dt>
                <dd className="mt-0.5 break-all font-mono">{swap.takerAddress ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">User</dt>
                <dd className="mt-0.5">{swap.userDisplayName ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">Route / DEX</dt>
                <dd className="mt-0.5">
                  {swap.dexLabel}{" "}
                  <span className="font-mono text-ink-muted">({swap.dexId})</span>
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">Protocol fee</dt>
                <dd className="mt-0.5">
                  {swap.protocolFeeFormatted} ({formatBps(swap.feeBps)})
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">Fee USD</dt>
                <dd className="mt-0.5 font-semibold text-gold-deep">{formatUsd(swap.feeUsd)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">Token in</dt>
                <dd className="mt-0.5 break-all font-mono">
                  {swap.tokenInSymbol} · {swap.tokenIn}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">Token out</dt>
                <dd className="mt-0.5 break-all font-mono">
                  {swap.tokenOutSymbol} · {swap.tokenOut}
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">Amount in (base)</dt>
                <dd className="mt-0.5 font-mono">{swap.amountIn}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">Amount out (base)</dt>
                <dd className="mt-0.5 font-mono">{swap.amountOut}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">Protocol fee (base)</dt>
                <dd className="mt-0.5 font-mono">{swap.protocolFee}</dd>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">Transaction</dt>
                <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                  {swap.txHash ? (
                    <>
                      <span className="break-all font-mono">{swap.txHash}</span>
                      {swap.explorerUrl ? (
                        <a
                          href={swap.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-gold-deep hover:underline"
                        >
                          Explorer <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              {swap.failureReason ? (
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="font-semibold uppercase tracking-wide text-danger">Failure reason</dt>
                  <dd className="mt-0.5 text-danger">{swap.failureReason}</dd>
                </div>
              ) : null}
              <div>
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">Recorded at</dt>
                <dd className="mt-0.5">{new Date(swap.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
          </td>
        </tr>
      )}
    </>
  );
}

export function AdminSwapsPanel() {
  const adminReady = useAdminReady();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [chainKey, setChainKey] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const deferredSearch = useDeferredValue(search.trim());

  const filters = {
    page,
    q: deferredSearch || undefined,
    chainKey: chainKey || undefined,
    status: status || undefined,
    source: source || undefined,
  };

  const query = useQuery({
    queryKey: ["admin-swaps", filters],
    enabled: adminReady,
    retry: 1,
    queryFn: () => api.adminSwaps(filters),
  });

  const clearFilters = () => {
    setSearch("");
    setChainKey("");
    setStatus("");
    setSource("");
    setPage(1);
  };

  if (!adminReady) {
    return <Skeleton className="h-72 w-full" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">
        Every swap attempt recorded from the app — confirmed and failed — with route, fees, and
        on-chain tx links.
      </p>

      <AdminQueryShell query={query} skeletonClass="h-72 w-full">
        {(data) => {
          const summary = data.summary;
          const swaps = data.swaps ?? [];
          const total = data.total ?? 0;

          return (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Confirmed"
                  value={summary.confirmed}
                  format={(n) => Math.round(n).toLocaleString()}
                />
                <StatCard
                  label="Failed"
                  value={summary.failed}
                  format={(n) => Math.round(n).toLocaleString()}
                />
                <StatCard label="Volume (confirmed)" value={summary.volumeUsd} format={formatUsd} />
                <StatCard label="Fees collected" value={summary.feesUsd} format={formatUsd} />
              </div>

              <AdminFilterBar
                search={search}
                onSearchChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                onClear={clearFilters}
                placeholder="Tx hash, wallet, token, DEX, failure reason…"
              >
                <select
                  value={chainKey}
                  onChange={(e) => {
                    setChainKey(e.target.value);
                    setPage(1);
                  }}
                  className="glass h-9 rounded-xl px-3 text-xs font-semibold text-ink"
                  aria-label="Filter by chain"
                >
                  <option value="">All chains</option>
                  {CHAINS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="glass h-9 rounded-xl px-3 text-xs font-semibold text-ink"
                  aria-label="Filter by status"
                >
                  <option value="">All statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="failed">Failed</option>
                  <option value="submitted">Submitted</option>
                  <option value="quoted">Quoted</option>
                </select>
                <select
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    setPage(1);
                  }}
                  className="glass h-9 rounded-xl px-3 text-xs font-semibold text-ink"
                  aria-label="Filter by source"
                >
                  <option value="">All sources</option>
                  <option value="web">Web</option>
                  <option value="agent">Agent</option>
                  <option value="api">API</option>
                </select>
              </AdminFilterBar>

              {swaps.length === 0 ? (
                <GlassCard className="flex items-center gap-3 py-10 text-sm text-ink-muted">
                  <BrandGlyph src={BRAND_NAV_ICONS.swap} size={20} />
                  No swap records yet — they appear here after users swap on the app.
                </GlassCard>
              ) : (
                <GlassCard variant="strong" padding="sm" className="overflow-x-auto">
                  <table className="w-full min-w-[880px] text-sm">
                    <thead>
                      <tr className="border-b border-white/60 text-left text-[11px] uppercase tracking-wider text-ink-muted">
                        <th className="px-3 py-2.5 font-semibold">Time</th>
                        <th className="px-3 py-2.5 font-semibold">Chain</th>
                        <th className="px-3 py-2.5 font-semibold">Pair</th>
                        <th className="px-3 py-2.5 font-semibold">Status</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Volume</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Fee</th>
                        <th className="px-3 py-2.5 font-semibold">Route</th>
                        <th className="px-3 py-2.5 font-semibold">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {swaps.map((swap) => (
                        <SwapDetailRow key={swap.id} swap={swap} />
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-xs text-ink-muted">{total.toLocaleString()} swap records</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-semibold",
                          page === 1 ? "text-ink-muted/50" : "text-ink hover:bg-white/50",
                        )}
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={page * 50 >= total}
                        onClick={() => setPage((p) => p + 1)}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-semibold",
                          page * 50 >= total ? "text-ink-muted/50" : "text-ink hover:bg-white/50",
                        )}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </GlassCard>
              )}
            </>
          );
        }}
      </AdminQueryShell>
    </div>
  );
}

"use client";

/**
 * AdminApiAgentsPanel — API request logs, agent stats, search, bulk edit, and delete.
 */
import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { CHAINS, timeAgo, BRAND_NAV_ICONS } from "@xauconnect/utils";
import { Badge, GlassButton, GlassCard, GlassInput, Skeleton, StatCard, cn } from "@xauconnect/ui";
import { api } from "@/lib/api";
import { useAdminReady } from "@/lib/session";
import { AdminQueryShell } from "./admin-query-shell";
import { AdminFilterBar } from "./admin-filter-bar";
import { BrandGlyph } from "@/components/brand-glyph";

type Tab = "overview" | "requests";

export function AdminApiAgentsPanel() {
  const adminReady = useAdminReady();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [chainKey, setChainKey] = useState("");
  const [clientSource, setClientSource] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "ok" | "error">("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAllFiltered, setSelectAllFiltered] = useState(false);
  const [bulkSource, setBulkSource] = useState("");
  const [bulkName, setBulkName] = useState("");
  const [bulkClientId, setBulkClientId] = useState("");
  const deferredSearch = useDeferredValue(search.trim());

  const summaryQuery = useQuery({
    queryKey: ["admin-api-usage-summary"],
    enabled: adminReady,
    queryFn: () => api.adminApiUsageSummary(),
  });

  const requestsQuery = useQuery({
    queryKey: [
      "admin-api-usage-requests",
      page,
      deferredSearch,
      chainKey,
      clientSource,
      endpoint,
      statusFilter,
    ],
    enabled: adminReady && tab === "requests",
    queryFn: () =>
      api.adminApiUsageRequests({
        page,
        q: deferredSearch || undefined,
        chainKey: chainKey || undefined,
        clientSource: clientSource || undefined,
        endpoint: endpoint || undefined,
        status: statusFilter || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.adminApiUsageDeleteRequests>[0]) =>
      api.adminApiUsageDeleteRequests(payload),
    onSuccess: () => {
      setSelected(new Set());
      setSelectAllFiltered(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-api-usage-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-api-usage-summary"] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.adminApiUsageBulkUpdateRequests>[0]) =>
      api.adminApiUsageBulkUpdateRequests(payload),
    onSuccess: () => {
      setSelected(new Set());
      setSelectAllFiltered(false);
      setBulkSource("");
      setBulkName("");
      setBulkClientId("");
      void queryClient.invalidateQueries({ queryKey: ["admin-api-usage-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-api-usage-summary"] });
    },
  });

  const activeFilters = useMemo(
    () => ({
      endpoint: endpoint || undefined,
      chainKey: chainKey || undefined,
      clientSource: clientSource || undefined,
      q: deferredSearch || undefined,
      status: statusFilter || undefined,
    }),
    [endpoint, chainKey, clientSource, deferredSearch, statusFilter],
  );

  const pageIds = useMemo(
    () => requestsQuery.data?.requests.map((r) => r.id) ?? [],
    [requestsQuery.data?.requests],
  );
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const filteredTotal = requestsQuery.data?.total ?? 0;
  const selectedCount = selectAllFiltered ? filteredTotal : selected.size;
  const busy = deleteMutation.isPending || bulkMutation.isPending;
  const canSelectAllFiltered =
    allOnPageSelected && !selectAllFiltered && filteredTotal > pageIds.length;

  function clearSelection() {
    setSelected(new Set());
    setSelectAllFiltered(false);
  }

  function toggleRow(id: string) {
    if (selectAllFiltered) {
      setSelectAllFiltered(false);
      setSelected(new Set(pageIds.filter((rowId) => rowId !== id)));
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    if (selectAllFiltered) {
      clearSelection();
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }

  function handleDeleteSelected() {
    if (selectedCount === 0) return;
    const label = selectAllFiltered
      ? `all ${filteredTotal} matching API request logs`
      : `${selected.size} API request log(s)`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    if (selectAllFiltered) {
      deleteMutation.mutate({ selectAll: true, filters: activeFilters });
      return;
    }
    deleteMutation.mutate({ ids: [...selected] });
  }

  function handleBulkApply() {
    if (selectedCount === 0) return;
    const patch: {
      clientSource?: "web" | "agent" | "api";
      clientName?: string | null;
      clientId?: string | null;
    } = {};
    if (bulkSource) patch.clientSource = bulkSource as "web" | "agent" | "api";
    if (bulkName.trim()) patch.clientName = bulkName.trim();
    else if (bulkName === " ") patch.clientName = null;
    if (bulkClientId.trim()) patch.clientId = bulkClientId.trim();
    else if (bulkClientId === " ") patch.clientId = null;
    if (Object.keys(patch).length === 0) return;
    if (selectAllFiltered) {
      bulkMutation.mutate({ selectAll: true, filters: activeFilters, ...patch });
      return;
    }
    bulkMutation.mutate({ ids: [...selected], ...patch });
  }

  if (!adminReady) {
    return <Skeleton className="h-72 w-full" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">
        Swap API traffic from agents and integrations — quotes, builds, and recorded swaps. Agents
        should send <code className="text-xs">X-Client-Id</code> and call{" "}
        <code className="text-xs">POST /swap/record</code> after execution.
      </p>

      <div className="flex gap-1">
        {(["overview", "requests"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-sm font-semibold capitalize transition-all",
              tab === t ? "bg-gold-gradient text-ink shadow-gold-glow" : "text-ink-muted hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <AdminQueryShell query={summaryQuery} skeletonClass="h-48 w-full">
          {(data) => (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="API requests (24h)" value={data.requests24h} />
                <StatCard label="API requests (7d)" value={data.requests7d} />
                <StatCard label="Quotes (24h)" value={data.quotes24h} />
                <StatCard label="Builds (24h)" value={data.builds24h} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Records (24h)" value={data.records24h} />
                <StatCard label="Unique takers (24h)" value={data.uniqueTakers24h} />
                <StatCard
                  label="Confirmed swaps (web, 7d)"
                  value={data.confirmedSwapsBySource.web}
                />
                <StatCard
                  label="Confirmed swaps (agent, 7d)"
                  value={data.confirmedSwapsBySource.agent}
                />
              </div>
              {data.topClients.length > 0 ? (
                <GlassCard className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold">
                    <BrandGlyph src={BRAND_NAV_ICONS.agents} size={18} /> Top clients (7d)
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {data.topClients.map((c, i) => (
                      <li key={`${c.clientId}-${i}`} className="flex justify-between gap-2">
                        <span>
                          <span className="font-semibold">{c.clientName ?? c.clientId ?? "—"}</span>
                          {c.clientId ? (
                            <span className="ml-2 font-mono text-xs text-ink-muted">{c.clientId}</span>
                          ) : null}
                        </span>
                        <span className="tabular-nums text-ink-muted">{c.count} req</span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              ) : null}
            </>
          )}
        </AdminQueryShell>
      )}

      {tab === "requests" && (
        <>
          <AdminFilterBar
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
              clearSelection();
            }}
            onClear={() => {
              setSearch("");
              setChainKey("");
              setClientSource("");
              setEndpoint("");
              setStatusFilter("");
              setPage(1);
              clearSelection();
            }}
            placeholder="Client id, name, taker, request id, IP…"
          >
            <select
              value={endpoint}
              onChange={(e) => {
                setEndpoint(e.target.value);
                setPage(1);
                clearSelection();
              }}
              className="glass h-9 rounded-xl px-3 text-xs font-semibold text-ink"
              aria-label="Filter by endpoint"
            >
              <option value="">All endpoints</option>
              <option value="/quote">Quote</option>
              <option value="/build">Build</option>
              <option value="/record">Record</option>
              <option value="/cross-chain">Cross-chain</option>
              <option value="/submit-solana">Solana submit</option>
            </select>
            <select
              value={chainKey}
              onChange={(e) => {
                setChainKey(e.target.value);
                setPage(1);
                clearSelection();
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
              value={clientSource}
              onChange={(e) => {
                setClientSource(e.target.value);
                setPage(1);
                clearSelection();
              }}
              className="glass h-9 rounded-xl px-3 text-xs font-semibold text-ink"
              aria-label="Filter by source"
            >
              <option value="">All sources</option>
              <option value="web">Web</option>
              <option value="agent">Agent</option>
              <option value="api">API</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "" | "ok" | "error");
                setPage(1);
                clearSelection();
              }}
              className="glass h-9 rounded-xl px-3 text-xs font-semibold text-ink"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="ok">2xx / 3xx</option>
              <option value="error">4xx / 5xx</option>
            </select>
          </AdminFilterBar>

          {selectedCount > 0 ? (
            <GlassCard className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">
                  {selectAllFiltered
                    ? `All ${filteredTotal} matching requests selected`
                    : `${selectedCount} selected`}
                </span>
                <div className="flex flex-wrap gap-2">
                  <GlassButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={clearSelection}
                  >
                    Clear selection
                  </GlassButton>
                  <GlassButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={handleDeleteSelected}
                    className="text-danger hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </GlassButton>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  value={bulkSource}
                  onChange={(e) => setBulkSource(e.target.value)}
                  className="glass h-9 rounded-xl px-3 text-xs font-semibold text-ink"
                  aria-label="Bulk edit source"
                >
                  <option value="">Source (no change)</option>
                  <option value="web">Web</option>
                  <option value="agent">Agent</option>
                  <option value="api">API</option>
                </select>
                <GlassInput
                  value={bulkName}
                  onChange={(e) => setBulkName(e.target.value)}
                  placeholder="Client name"
                  aria-label="Bulk edit client name"
                  className="text-xs"
                />
                <GlassInput
                  value={bulkClientId}
                  onChange={(e) => setBulkClientId(e.target.value)}
                  placeholder="Client id"
                  aria-label="Bulk edit client id"
                  className="text-xs font-mono"
                />
                <GlassButton
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={handleBulkApply}
                >
                  Apply to selected
                </GlassButton>
              </div>
            </GlassCard>
          ) : null}

          <AdminQueryShell query={requestsQuery} skeletonClass="h-72 w-full">
            {(data) => {
              const totalPages = Math.max(1, Math.ceil(data.total / 50));
              return (
                <>
                  {canSelectAllFiltered ? (
                    <GlassCard className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                      <span className="text-ink-soft">
                        All {pageIds.length} requests on this page are selected.
                      </span>
                      <button
                        type="button"
                        className="font-semibold text-gold-deep underline-offset-2 hover:underline"
                        onClick={() => setSelectAllFiltered(true)}
                      >
                        Select all {filteredTotal} matching requests
                      </button>
                    </GlassCard>
                  ) : null}
                  <GlassCard className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/40 text-xs uppercase tracking-wide text-ink-muted">
                        <th className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectAllFiltered || allOnPageSelected}
                            ref={(el) => {
                              if (el) {
                                el.indeterminate =
                                  !selectAllFiltered && allOnPageSelected && filteredTotal > pageIds.length;
                              }
                            }}
                            onChange={togglePage}
                            aria-label="Select all on page"
                            className="rounded border-white/60"
                          />
                        </th>
                        <th className="px-3 py-2">Time</th>
                        <th className="px-3 py-2">Endpoint</th>
                        <th className="px-3 py-2">Source</th>
                        <th className="px-3 py-2">Client</th>
                        <th className="px-3 py-2">Taker</th>
                        <th className="px-3 py-2">Request id</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.requests.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-8 text-center text-ink-muted">
                            No API requests match your filters.
                          </td>
                        </tr>
                      ) : (
                        data.requests.map((r) => (
                          <tr
                            key={r.id}
                            className={cn(
                              "border-b border-white/30 last:border-0",
                              (selectAllFiltered || selected.has(r.id)) && "bg-gold/[0.06]",
                            )}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectAllFiltered || selected.has(r.id)}
                                onChange={() => toggleRow(r.id)}
                                aria-label={`Select request ${r.id}`}
                                className="rounded border-white/60"
                              />
                            </td>
                            <td className="px-3 py-2 text-xs text-ink-muted">{timeAgo(r.createdAt)}</td>
                            <td className="px-3 py-2 font-mono text-xs">{r.endpoint.replace("/swap", "")}</td>
                            <td className="px-3 py-2">
                              <Badge tone={r.clientSource === "agent" ? "gold" : "neutral"}>
                                {r.clientSource}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-xs">
                              <div className="font-semibold">{r.clientName ?? "—"}</div>
                              {r.clientId ? (
                                <div className="font-mono text-ink-muted">{r.clientId}</div>
                              ) : null}
                            </td>
                            <td className="max-w-[120px] truncate px-3 py-2 font-mono text-xs">
                              {r.takerAddress ?? "—"}
                            </td>
                            <td className="max-w-[100px] truncate px-3 py-2 font-mono text-xs text-ink-muted">
                              {r.requestId ?? "—"}
                            </td>
                            <td className="px-3 py-2">
                              <Badge tone={r.statusCode < 400 ? "success" : "danger"}>
                                {r.statusCode}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {data.total > 50 ? (
                    <div className="flex items-center justify-between border-t border-white/40 px-3 py-2">
                      <span className="text-xs text-ink-muted">
                        Page {data.page} of {totalPages} ({data.total} total)
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => {
                            setPage((p) => p - 1);
                            if (!selectAllFiltered) clearSelection();
                          }}
                          className="rounded-lg p-1 disabled:opacity-40"
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={page >= totalPages}
                          onClick={() => {
                            setPage((p) => p + 1);
                            if (!selectAllFiltered) clearSelection();
                          }}
                          className="rounded-lg p-1 disabled:opacity-40"
                          aria-label="Next page"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </GlassCard>
                </>
              );
            }}
          </AdminQueryShell>
        </>
      )}
    </div>
  );
}

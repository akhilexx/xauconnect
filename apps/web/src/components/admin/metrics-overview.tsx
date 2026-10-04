"use client";

/**
 * MetricsOverview — KPI tiles + Recharts dashboards:
 *   - 30-day volume & fees area chart
 *   - per-chain volume breakdown bar chart
 */
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BRAND_NAV_ICONS, formatUsd, getChainByKey, getChainLogoUrl } from "@xauconnect/utils";
import { Badge, ChainIcon, GlassCard, Skeleton, StatCard } from "@xauconnect/ui";
import { api } from "@/lib/api";
import { useAdminReady } from "@/lib/session";
import { AdminQueryShell } from "./admin-query-shell";
import { BrandGlyph } from "@/components/brand-glyph";

const glassTooltip = {
  contentStyle: {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(255,215,0,0.35)",
    borderRadius: 16,
    backdropFilter: "blur(12px)",
    fontSize: 12,
  },
};

export function MetricsOverview() {
  const adminReady = useAdminReady();
  const query = useQuery({
    queryKey: ["admin-metrics"],
    enabled: adminReady,
    refetchInterval: 30_000,
    retry: 1,
    queryFn: () => api.adminMetrics(),
  });
  const treasuryQuery = useQuery({
    queryKey: ["admin-treasury"],
    enabled: adminReady,
    staleTime: 120_000,
    retry: 1,
    queryFn: () => api.adminTreasury(),
  });

  const treasury = treasuryQuery.data;

  return (
    <AdminQueryShell query={query} skeletonClass="h-72 w-full">
      {(m) => (
        <div className="flex flex-col gap-5">
          {!m.persisted && (
            <Badge tone="neutral" className="w-fit">
              Database not connected — set DATABASE_URL on the server
            </Badge>
          )}
          {m.persisted && !m.hasData && (
            <Badge tone="neutral" className="w-fit">
              No recorded activity yet — metrics update as swaps and launches are persisted
            </Badge>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
            <StatCard label="Total volume" value={m.totalVolumeUsd} format={formatUsd} icon={<BrandGlyph src={BRAND_NAV_ICONS.swap} size={18} />} />
            <StatCard label="Fees earned" value={m.feesEarnedUsd} format={formatUsd} icon={<BrandGlyph src={BRAND_NAV_ICONS.fees} size={18} />} />
            <StatCard label="TVL" value={m.tvlUsd} format={formatUsd} icon={<BrandGlyph src={BRAND_NAV_ICONS.liquidity} size={18} />} />
            <StatCard
              label="Treasury balance"
              value={treasury?.totalUsd ?? 0}
              format={formatUsd}
              icon={<BrandGlyph src={BRAND_NAV_ICONS.wallet} size={18} />}
              delta={
                treasuryQuery.isLoading
                  ? "Loading balances…"
                  : treasury?.walletRows
                    ? `${treasury.walletRows} wallet rows`
                    : undefined
              }
              deltaTone="neutral"
            />
            <StatCard label="Swaps" value={m.swapCount} format={(n) => Math.round(n).toLocaleString()} icon={<BrandGlyph src={BRAND_NAV_ICONS.swap} size={18} />} />
            <StatCard label="Total users" value={m.totalUsers} format={(n) => Math.round(n).toLocaleString()} icon={<BrandGlyph src={BRAND_NAV_ICONS.users} size={18} />} delta={`${m.activeUsers24h.toLocaleString()} active 24h`} deltaTone="success" />
            <StatCard label="Tokens launched" value={m.tokensLaunched} format={(n) => Math.round(n).toLocaleString()} icon={<BrandGlyph src={BRAND_NAV_ICONS.launchpad} size={18} />} />
          </div>

          {treasuryQuery.isLoading && (
            <GlassCard variant="strong">
              <Skeleton className="mb-4 h-6 w-48" />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            </GlassCard>
          )}

          {treasury && treasury.byChain.length > 0 && (
            <GlassCard variant="strong">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-bold">Protocol treasury — all chains</h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    Combined on-chain balances (native + collected swap fees) across{" "}
                    {treasury.walletRows} registered protocol wallet rows.
                  </p>
                </div>
                <p className="font-display text-2xl font-bold text-ink">{formatUsd(treasury.totalUsd)}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {treasury.byChain.map((row) => {
                  const chain = getChainByKey(row.chainKey);
                  return (
                    <div
                      key={row.chainKey}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/40 bg-white/25 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <ChainIcon
                          name={chain?.name ?? row.chainKey}
                          src={getChainLogoUrl(row.chainKey)}
                          color={chain?.color}
                          size={20}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {chain?.name ?? row.chainKey}
                          </p>
                          <p className="font-mono text-[11px] text-ink-muted">
                            {row.nativeBalance.toFixed(4)} {row.nativeSymbol}
                            {(row.tokenBalanceUsd ?? 0) > 0 ? (
                              <span className="text-gold-deep">
                                {" "}
                                + {formatUsd(row.tokenBalanceUsd ?? 0)} fees
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-ink">{formatUsd(row.balanceUsd)}</p>
                        <p className="text-[10px] text-ink-faint">{row.walletCount} wallet{row.walletCount === 1 ? "" : "s"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          <GlassCard variant="strong">
            <h2 className="mb-4 font-display text-lg font-bold">Volume & fees — last 30 days</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <AreaChart data={m.volumeSeries} margin={{ left: 8, right: 8, top: 4 }}>
                  <defs>
                    <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFD700" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#FFD700" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="pinkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF69B4" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#FF69B4" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis tickFormatter={(v: number) => formatUsd(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                  <Tooltip {...glassTooltip} formatter={(value) => formatUsd(Number(value))} />
                  <Area type="monotone" dataKey="volumeUsd" name="Volume" stroke="#FFAA00" strokeWidth={2} fill="url(#goldFill)" />
                  <Area type="monotone" dataKey="feesUsd" name="Fees" stroke="#FF69B4" strokeWidth={2} fill="url(#pinkFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard variant="strong">
            <h2 className="mb-4 font-display text-lg font-bold">Volume by chain</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={m.chainBreakdown} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
                  <XAxis
                    dataKey="chainKey"
                    tickFormatter={(k: string) => getChainByKey(k)?.name ?? k}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tickFormatter={(v: number) => formatUsd(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                  <Tooltip {...glassTooltip} formatter={(value) => formatUsd(Number(value))} />
                  <Bar dataKey="volumeUsd" name="Volume" fill="#FFD700" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="feesUsd" name="Fees" fill="#FF69B4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>
      )}
    </AdminQueryShell>
  );
}

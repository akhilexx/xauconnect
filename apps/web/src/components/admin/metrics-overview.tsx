"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  CheckCheck,
  CircleDollarSign,
  Layers3,
  RefreshCw,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { getChainByKey } from "@xauconnect/utils";
import { api } from "@/lib/api";
import { useAdminReady } from "@/lib/session";
import { AdminQueryShell } from "./admin-query-shell";

const money = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: n !== 0 && Math.abs(n) < 1 ? 6 : 2,
  });
const dateLabel = (s: string) =>
  new Date(s + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
export function MetricsOverview() {
  const ready = useAdminReady(),
    [days, setDays] = useState(365),
    [series, setSeries] = useState<"volumeUsd" | "feesUsd">("volumeUsd");
  const query = useQuery({
    queryKey: ["admin-metrics"],
    enabled: ready,
    queryFn: () => api.adminMetrics(),
    refetchInterval: 30_000,
    retry: 1,
  });
  return (
    <AdminQueryShell query={query}>
      {(m) => {
        const points = days === 365 ? m.monthSeries : m.volumeSeries.slice(-days),
          sum = points.reduce((a, d) => a + d[series], 0);
        const chains = [...m.chainBreakdown].sort(
          (a, b) => b.volumeUsd - a.volumeUsd || b.swaps - a.swaps,
        );
        const cards = [
          {
            label: "Settled volume",
            value: money(m.totalVolumeUsd),
            sub: "Gross input · USD estimate",
            icon: Waves,
          },
          {
            label: "Fees collected",
            value: money(m.feesEarnedUsd),
            sub: "Received by the protocol",
            icon: CircleDollarSign,
          },
          {
            label: "Verified swaps",
            value: m.swapCount.toLocaleString(),
            sub: "Distinct transactions",
            icon: CheckCheck,
          },
          {
            label: "Active networks",
            value: String(chains.filter((c) => c.swaps > 0).length),
            sub: "With a verified settlement",
            icon: Layers3,
          },
        ];
        return (
          <div className="ops-overview">
            <div className="ops-strip">
              <span>
                <i />
                Settlement ledger
              </span>
              <button
                aria-label="Refresh metrics"
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                <RefreshCw size={13} className={query.isFetching ? "ops-spin" : ""} />
                {query.isFetching
                  ? "Refreshing…"
                  : "Updated " +
                    new Date(query.dataUpdatedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
              </button>
            </div>
            <div className="ops-kpis">
              {cards.map((c) => (
                <article key={c.label}>
                  <div>
                    <c.icon size={18} />
                    <span>All time</span>
                  </div>
                  <p>{c.label}</p>
                  <strong>{c.value}</strong>
                  <small>{c.sub}</small>
                </article>
              ))}
            </div>
            <div className="ops-charts">
              <article className="ops-card">
                <div className="ops-cardhead">
                  <div>
                    <small>{days === 365 ? "Monthly" : "Daily"} settlements</small>
                    <h2>Trading activity</h2>
                  </div>
                  <div className="ops-segment" aria-label="Chart period">
                    {[7, 30, 365].map((n) => (
                      <button key={n} aria-pressed={days === n} onClick={() => setDays(n)}>
                        {n === 365 ? "1Y" : n + "D"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ops-plotmeta">
                  <strong>{money(sum)}</strong>
                  <select
                    aria-label="Chart metric"
                    value={series}
                    onChange={(e) => setSeries(e.target.value as typeof series)}
                  >
                    <option value="volumeUsd">Volume</option>
                    <option value="feesUsd">Fees</option>
                  </select>
                </div>
                {sum > 0 ? (
                  <div
                    className="ops-plot"
                    role="img"
                    aria-label={
                      days +
                      " day " +
                      (series === "feesUsd" ? "fees" : "volume") +
                      " total " +
                      money(sum)
                    }
                  >
                    <ResponsiveContainer>
                      <AreaChart data={points} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
                        <defs>
                          <linearGradient id="ops-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop stopColor="#c89d46" stopOpacity={0.48} />
                            <stop offset="1" stopColor="#c89d46" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#e5e8e3" strokeDasharray="3 5" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={dateLabel}
                          minTickGap={28}
                          tick={{ fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          width={52}
                          tickFormatter={(n: number) =>
                            Intl.NumberFormat("en", {
                              notation: "compact",
                              maximumFractionDigits: 2,
                            }).format(n)
                          }
                          tick={{ fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          labelFormatter={(s) => dateLabel(String(s))}
                          formatter={(n) => [
                            money(Number(n)),
                            series === "feesUsd" ? "Fees" : "Volume",
                          ]}
                        />
                        <Area
                          type="linear"
                          dataKey={series}
                          stroke="#956724"
                          fill="url(#ops-fill)"
                          strokeWidth={2.4}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="ops-empty">
                    <Waves size={24} />
                    <b>No priced {series === "feesUsd" ? "fees" : "volume"} in this period</b>
                    <span>Verified activity appears on its settlement date.</span>
                  </div>
                )}
                <footer>
                  {days === 365 ? "Monthly" : "Daily"} totals in UTC{" "}
                  <span>{days === 365 ? "12 month window" : days + " day window"}</span>
                </footer>
              </article>
              <article className="ops-card">
                <div className="ops-cardhead">
                  <div>
                    <small>Network distribution</small>
                    <h2>Volume by chain</h2>
                  </div>
                </div>
                <div className="ops-bars">
                  {chains.map((c) => (
                    <div key={c.chainKey}>
                      <div>
                        <span>{getChainByKey(c.chainKey)?.name ?? c.chainKey}</span>
                        <b>{money(c.volumeUsd)}</b>
                      </div>
                      <div className="ops-track">
                        <i
                          style={{
                            width:
                              (m.totalVolumeUsd ? (100 * c.volumeUsd) / m.totalVolumeUsd : 0) + "%",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
            <div className="ops-charts">
              <article className="ops-card">
                <div className="ops-cardhead">
                  <div>
                    <small>Accounting coverage</small>
                    <h2>Verification status</h2>
                  </div>
                  <ShieldCheck size={21} />
                </div>
                <dl className="ops-list">
                  {[
                    ["Awaiting finality", m.pendingCount],
                    ["Requires review", m.reviewCount],
                    ["Settlements missing a USD price", m.unpricedCount],
                    ["Historical reports excluded", m.legacyCount],
                  ].map(([s, v]) => (
                    <div key={s}>
                      <dt>{s}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <footer>
                  <span>USD totals include priced amounts only.</span>
                  <a href="#swaps">
                    Inspect ledger <ArrowUpRight size={13} />
                  </a>
                </footer>
              </article>
              <article className="ops-card">
                <div className="ops-cardhead">
                  <div>
                    <small>Platform</small>
                    <h2>Workspace activity</h2>
                  </div>
                </div>
                <dl className="ops-list">
                  {[
                    ["Registered users", m.totalUsers],
                    ["Users active in 24h", m.activeUsers24h],
                    ["Recorded launches", m.tokensLaunched],
                  ].map(([s, v]) => (
                    <div key={s}>
                      <dt>{s}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <footer>
                  <a href="#wallets">
                    Treasury & wallets <ArrowUpRight size={13} />
                  </a>
                </footer>
              </article>
            </div>
          </div>
        );
      }}
    </AdminQueryShell>
  );
}

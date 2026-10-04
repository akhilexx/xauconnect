"use client";

/**
 * DiscoveryBoard — Trending / New / Gainers / Volume tabs with chain filter.
 * Live rows come from DexScreener via the backend; the WebSocket "trending"
 * and "launches" channels push instantaneous metric updates and new tokens
 * straight into the table without a refetch.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, Sparkles, TrendingUp, BarChart3, ShieldCheck, Rocket } from "lucide-react";
import {
  CHAINS,
  formatPercent,
  formatUsd,
  getChainLogoUrl,
  timeAgo,
  type DiscoveryTab,
  type MarketToken,
} from "@xauconnect/utils";
import { Badge, ChainIcon, GlassCard, Skeleton, TokenIcon, cn } from "@xauconnect/ui";
import { api, getWs } from "@/lib/api";

const TABS: Array<{ id: DiscoveryTab; label: string; icon: typeof Flame }> = [
  { id: "trending", label: "Trending", icon: Flame },
  { id: "new", label: "New", icon: Sparkles },
  { id: "gainers", label: "Gainers", icon: TrendingUp },
  { id: "volume", label: "Volume", icon: BarChart3 },
];

export function DiscoveryBoard() {
  const [tab, setTab] = useState<DiscoveryTab>("trending");
  const [chainFilter, setChainFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["discovery", tab, chainFilter],
    refetchInterval: 8_000,
    staleTime: 6_000,
    queryFn: () => api.discovery(tab, chainFilter === "all" ? undefined : chainFilter),
  });

  // Real-time pushes: live metric snapshots replace the trending cache, and
  // every new launch is prepended to the "new" tab — no refetch round-trip.
  useEffect(() => {
    const ws = getWs();
    const unsubTrending = ws.subscribe("trending", (payload) => {
      const live = payload as MarketToken[];
      if (!Array.isArray(live) || live.length === 0) return;
      queryClient.setQueryData(["discovery", "trending", "all"], { tokens: live });
      for (const chain of CHAINS) {
        const filtered = live.filter((t) => t.chainKey === chain.key);
        if (filtered.length > 0) {
          queryClient.setQueryData(["discovery", "trending", chain.key], { tokens: filtered });
        }
      }
    });
    const unsubLaunches = ws.subscribe("launches", (payload) => {
      if (Array.isArray(payload)) return;
      const token = payload as MarketToken;
      if (!token?.address) return;
      for (const key of ["all", token.chainKey]) {
        queryClient.setQueryData(
          ["discovery", "new", key],
          (prev: { tokens: MarketToken[] } | undefined) =>
            prev ? { tokens: [token, ...prev.tokens].slice(0, 50) } : { tokens: [token] },
        );
      }
    });
    return () => {
      unsubTrending();
      unsubLaunches();
    };
  }, [queryClient]);

  const tokens: MarketToken[] = query.data?.tokens ?? [];

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Tab + chain filters */}
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <div className="scroll-x-tabs glass flex w-full items-center gap-1 overflow-x-auto rounded-2xl p-1 sm:w-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "relative flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors sm:min-h-0 sm:px-4",
                tab === id ? "text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {tab === id && (
                <motion.span
                  layoutId="discover-tab"
                  className="absolute inset-0 rounded-xl bg-gold-gradient shadow-gold-glow"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>

        <select
          value={chainFilter}
          onChange={(e) => setChainFilter(e.target.value)}
          className="glass min-h-11 w-full rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft focus:outline-none focus:ring-2 focus:ring-gold/50 sm:min-h-0 sm:w-auto"
          aria-label="Filter by chain"
        >
          <option value="all">All chains</option>
          {CHAINS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {query.isLoading &&
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[4.5rem] w-full" />)}
        {tokens.map((token, i) => (
          <TokenMobileRow key={`${token.chainKey}-${token.address}`} token={token} rank={i + 1} />
        ))}
        {!query.isLoading && tokens.length === 0 && (
          <GlassCard className="py-10 text-center text-sm text-ink-muted">
            No tokens found for this filter.
          </GlassCard>
        )}
      </div>

      {/* Desktop table */}
      <GlassCard padding="sm" className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/60 text-left text-[11px] uppercase tracking-wider text-ink-muted">
              <th className="px-3 py-2.5 font-semibold">#</th>
              <th className="px-3 py-2.5 font-semibold">Token</th>
              <th className="px-3 py-2.5 text-right font-semibold">Price</th>
              <th className="px-3 py-2.5 text-right font-semibold">24h</th>
              <th className="px-3 py-2.5 text-right font-semibold">Volume 24h</th>
              <th className="px-3 py-2.5 text-right font-semibold">Liquidity</th>
              <th className="hidden px-3 py-2.5 text-right font-semibold lg:table-cell">Age</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-white/40 last:border-0">
                  <td colSpan={7} className="px-3 py-2">
                    <Skeleton className="h-10 w-full" />
                  </td>
                </tr>
              ))}
            {tokens.map((token, i) => {
              const chain = CHAINS.find((c) => c.key === token.chainKey);
              return (
                <tr
                  key={`${token.chainKey}-${token.address}`}
                  className="border-b border-white/40 transition-colors last:border-0 hover:bg-white/50"
                >
                  <td className="px-3 py-3 text-ink-faint">{i + 1}</td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/token/${token.chainKey}/${token.address}`}
                      className="flex items-center gap-3"
                    >
                      <TokenIcon symbol={token.symbol} src={token.logoURI} size={34} />
                      <span className="flex flex-col">
                        <span className="flex items-center gap-1.5 font-bold">
                          {token.symbol}
                          {token.xauLaunch && (
                            <Badge tone="gold">
                              <Rocket className="mr-0.5 inline h-2.5 w-2.5" />
                              XAU
                            </Badge>
                          )}
                          {token.auditBadge === "verified" && (
                            <ShieldCheck className="h-3.5 w-3.5 text-success" aria-label="Audited" />
                          )}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                          {token.name}
                          {chain && (
                            <span className="inline-flex items-center gap-1">
                              <ChainIcon
                                name={chain.name}
                                src={getChainLogoUrl(chain.key)}
                                color={chain.color}
                                size={13}
                              />
                              <span style={{ color: chain.color }}>{chain.name}</span>
                            </span>
                          )}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-semibold">
                    {formatUsd(token.priceUsd)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 text-right font-semibold",
                      token.change24hPct >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {formatPercent(token.change24hPct)}
                  </td>
                  <td className="px-3 py-3 text-right text-ink-soft">
                    {formatUsd(token.volume24hUsd)}
                  </td>
                  <td className="px-3 py-3 text-right text-ink-soft">
                    {formatUsd(token.liquidityUsd)}
                  </td>
                  <td className="hidden px-3 py-3 text-right text-ink-muted lg:table-cell">
                    {token.createdAt ? timeAgo(token.createdAt) : "—"}
                  </td>
                </tr>
              );
            })}
            {!query.isLoading && tokens.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-ink-muted">
                  No tokens found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}

function TokenMobileRow({ token, rank }: { token: MarketToken; rank: number }) {
  const chain = CHAINS.find((c) => c.key === token.chainKey);
  return (
    <Link
      href={`/token/${token.chainKey}/${token.address}`}
      className="glass flex min-h-[4.5rem] items-center gap-3 rounded-2xl px-3 py-2.5"
    >
      <span className="w-5 shrink-0 text-center text-xs tabular-nums text-ink-faint">{rank}</span>
      <TokenIcon symbol={token.symbol} src={token.logoURI} size={36} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-bold leading-tight">
          <span className="truncate">{token.symbol}</span>
          {token.xauLaunch && (
            <Badge tone="gold">
              <Rocket className="mr-0.5 inline h-2.5 w-2.5" />
              XAU
            </Badge>
          )}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-ink-muted">
          {chain && (
            <ChainIcon
              name={chain.name}
              src={getChainLogoUrl(chain.key)}
              color={chain.color}
              size={12}
            />
          )}
          <span className="truncate">{token.name}</span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-sm font-semibold tabular-nums">{formatUsd(token.priceUsd)}</span>
        <span
          className={cn(
            "block text-xs font-semibold tabular-nums",
            token.change24hPct >= 0 ? "text-success" : "text-danger",
          )}
        >
          {formatPercent(token.change24hPct)}
        </span>
      </span>
    </Link>
  );
}

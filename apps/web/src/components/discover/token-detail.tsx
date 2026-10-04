"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Copy,
  Crosshair,
  ExternalLink,
  ShieldCheck,
  ShieldQuestion,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import {
  formatPercent,
  formatUsd,
  getChainByKey,
  getChainLogoUrl,
  shortenAddress,
  timeAgo,
} from "@xauconnect/utils";
import {
  Badge,
  ChainIcon,
  GlassButton,
  GlassCard,
  Skeleton,
  StatCard,
  TokenIcon,
  toast,
  cn,
} from "@xauconnect/ui";
import { api } from "@/lib/api";
import { GoldCurvePanel } from "./gold-curve-panel";

const CandleChart = dynamic(() => import("./candle-chart").then((m) => m.CandleChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[380px] w-full" />,
});

const INTERVALS = ["5m", "15m", "30m", "1h", "4h", "1d"] as const;

function riskTone(score: number): "success" | "gold" | "danger" {
  if (score >= 60) return "danger";
  if (score >= 30) return "gold";
  return "success";
}

export function TokenDetail({ chainKey, address }: { chainKey: string; address: string }) {
  const [interval, setInterval] = useState<(typeof INTERVALS)[number]>("1h");
  const chain = getChainByKey(chainKey);

  const tokenQuery = useQuery({
    queryKey: ["token", chainKey, address],
    refetchInterval: 8_000,
    queryFn: () => api.tokenDetail(chainKey, address),
    retry: 2,
    placeholderData: keepPreviousData,
  });
  const intelQuery = useQuery({
    queryKey: ["token-intel", chainKey, address],
    refetchInterval: 15_000,
    queryFn: () => api.tokenIntel(chainKey, address),
    retry: 1,
  });
  const candlesQuery = useQuery({
    queryKey: ["candles", chainKey, address, interval],
    refetchInterval: 15_000,
    staleTime: 10_000,
    queryFn: () => api.candles(chainKey, address, interval),
  });

  const token = tokenQuery.data?.token;
  const intel = intelQuery.data;
  const extra = token as { fdvUsd?: number; totalSupply?: string; topPoolAddress?: string } | undefined;
  const candles = candlesQuery.data?.candles ?? [];
  const tradeHref = `/swap?chainKey=${encodeURIComponent(chainKey)}&tokenOut=${encodeURIComponent(address)}`;

  if (tokenQuery.isLoading && !token) {
    return (
      <div className="mx-auto flex w-full flex-col gap-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[260px] w-full sm:h-[420px]" />
      </div>
    );
  }

  if (!token && tokenQuery.isFetched) {
    return (
      <GlassCard className="mx-auto max-w-xl text-center">
        <p className="font-semibold">Token not found</p>
        <p className="mt-1 text-sm text-ink-muted">
          We couldn’t load data for this token on {chain?.name ?? chainKey}.
        </p>
        <Link href="/discover" className="mt-4 inline-block">
          <GlassButton variant="glass">Back to Discover</GlassButton>
        </Link>
      </GlassCard>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto flex w-full flex-col gap-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[260px] w-full sm:h-[420px]" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full min-w-0 flex-col gap-4 sm:gap-5">
      <GlassCard variant="strong" className="flex flex-col gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <TokenIcon symbol={token.symbol} src={token.logoURI} size={48} className="shrink-0 sm:hidden" />
          <TokenIcon symbol={token.symbol} src={token.logoURI} size={52} className="hidden shrink-0 sm:block" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-extrabold leading-tight sm:text-2xl">
              <span className="block truncate">{token.name}</span>
              <span className="text-base font-semibold text-ink-muted">({token.symbol})</span>
            </h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {token.auditBadge === "verified" ? (
                <Badge tone="success">
                  <ShieldCheck className="mr-0.5 inline h-3 w-3" /> Audited
                </Badge>
              ) : (
                <Badge tone="neutral">
                  <ShieldQuestion className="mr-0.5 inline h-3 w-3" /> Audit pending
                </Badge>
              )}
              {token.xauLaunch && <Badge tone="gold">XAU launch</Badge>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
              {chain && (
                <span className="inline-flex items-center gap-1" style={{ color: chain.color }}>
                  <ChainIcon
                    name={chain.name}
                    src={getChainLogoUrl(chain.key)}
                    color={chain.color}
                    size={14}
                  />
                  {chain.name}
                </span>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(token.address);
                  toast.success("Address copied");
                }}
                className="flex items-center gap-1 hover:text-ink"
              >
                {shortenAddress(token.address, 6)} <Copy className="h-3 w-3" />
              </button>
              {chain && (
                <a
                  href={`${chain.explorerUrl}/token/${token.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-ink"
                >
                  Explorer <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {token.createdAt && <span>Launched {timeAgo(token.createdAt)}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-white/50 pt-3 sm:justify-end sm:border-0 sm:pt-0">
          <div className="text-left sm:text-right">
            <span className="font-display text-2xl font-extrabold tabular-nums sm:text-3xl">
              {formatUsd(token.priceUsd)}
            </span>
            <span
              className={cn(
                "mt-0.5 block text-sm font-bold tabular-nums",
                token.change24hPct >= 0 ? "text-success" : "text-danger",
              )}
            >
              {formatPercent(token.change24hPct)} 24h
            </span>
          </div>
        </div>

        <Link href={tradeHref} className="w-full">
          <GlassButton className="w-full">
            <ArrowLeftRight className="h-4 w-4" /> Trade {token.symbol}
          </GlassButton>
        </Link>
      </GlassCard>

      <GoldCurvePanel chainKey={chainKey} address={address} />

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
        <StatCard
          label="Market cap"
          value={token.marketCapUsd ?? 0}
          format={(n) => (n ? formatUsd(n) : "—")}
          className="p-3 sm:p-5 [&_.font-display]:text-lg sm:[&_.font-display]:text-2xl"
        />
        <StatCard
          label="FDV"
          value={extra?.fdvUsd ?? token.marketCapUsd ?? 0}
          format={(n) => (n ? formatUsd(n) : "—")}
          className="p-3 sm:p-5 [&_.font-display]:text-lg sm:[&_.font-display]:text-2xl"
        />
        <StatCard
          label="Liquidity"
          value={token.liquidityUsd}
          format={formatUsd}
          className="p-3 sm:p-5 [&_.font-display]:text-lg sm:[&_.font-display]:text-2xl"
        />
        <StatCard
          label="Volume 24h"
          value={token.volume24hUsd}
          format={formatUsd}
          className="p-3 sm:p-5 [&_.font-display]:text-lg sm:[&_.font-display]:text-2xl"
        />
        <StatCard
          label="1h change"
          value={token.change1hPct ?? 0}
          format={(n) => formatPercent(n)}
          className="p-3 sm:p-5 [&_.font-display]:text-lg sm:[&_.font-display]:text-2xl"
        />
        <StatCard
          label="Holders"
          value={token.holders ?? 0}
          format={(n) => (n ? Math.round(n).toLocaleString() : "—")}
          className="p-3 sm:p-5 [&_.font-display]:text-lg sm:[&_.font-display]:text-2xl"
        />
      </div>

      <GlassCard variant="strong" padding="sm" className="min-w-0">
        <div className="flex min-w-0 flex-col gap-2 px-2 pb-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold">Price chart</p>
          <div className="scroll-x-tabs glass flex w-full gap-0.5 overflow-x-auto rounded-xl p-0.5 sm:w-auto">
            {INTERVALS.map((iv) => (
              <button
                key={iv}
                onClick={() => setInterval(iv)}
                className={cn(
                  "min-h-9 shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  interval === iv ? "bg-gold-gradient text-ink shadow-gold-glow" : "text-ink-muted",
                )}
              >
                {iv}
              </button>
            ))}
          </div>
        </div>
        {candlesQuery.isLoading ? (
          <Skeleton className="h-[260px] w-full sm:h-[380px]" />
        ) : (
          <CandleChart candles={candles} />
        )}
      </GlassCard>

      <div className="grid gap-3 md:grid-cols-2">
        <GlassCard padding="sm">
          <div className="mb-3 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-gold-deep" />
            <p className="text-sm font-bold">Dev wallet tracking</p>
            {intel?.devWallet.tracked ? (
              <Badge tone="success">Live</Badge>
            ) : (
              <Badge tone="neutral">No creator</Badge>
            )}
          </div>
          {intelQuery.isLoading && <Skeleton className="h-24 w-full" />}
          {intel?.devWallet.creatorAddress && (
            <p className="mb-2 font-mono text-xs text-ink-muted">
              Creator: {shortenAddress(intel.devWallet.creatorAddress, 6)}
            </p>
          )}
          {intel?.devWallet.alerts.map((a, i) => (
            <div
              key={i}
              className="mb-2 flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {a.message}
            </div>
          ))}
          <ul className="divide-y divide-white/50 text-xs">
            {(intel?.devWallet.events ?? []).map((ev) => (
              <li key={ev.hash} className="flex justify-between py-2">
                <span className="capitalize text-ink-muted">
                  {ev.kind} · {ev.amount} {ev.symbol}
                </span>
                <span className="text-ink-faint">{timeAgo(ev.timestamp)}</span>
              </li>
            ))}
            {!intelQuery.isLoading && (intel?.devWallet.events.length ?? 0) === 0 && (
              <li className="py-4 text-center text-ink-muted">No creator activity indexed yet.</li>
            )}
          </ul>
        </GlassCard>

        <GlassCard padding="sm">
          <div className="mb-3 flex items-center gap-2">
            <Crosshair className="h-5 w-5 text-gold-deep" />
            <p className="text-sm font-bold">Snipers detection</p>
            {intel && (
              <Badge tone={riskTone(intel.snipers.riskScore)}>
                Risk {intel.snipers.riskScore}/100
              </Badge>
            )}
          </div>
          {intelQuery.isLoading && <Skeleton className="h-24 w-full" />}
          {intel && (
            <p className="mb-3 text-xs text-ink-muted">
              {intel.snipers.earlyBuyerCount} early buyers in first 5 blocks ·{" "}
              {intel.snipers.bundleCount} bundled txs ·{" "}
              {formatUsd(intel.snipers.totalEarlyVolumeUsd)} volume
            </p>
          )}
          <ul className="divide-y divide-white/50 text-xs">
            {(intel?.snipers.snipers ?? []).slice(0, 8).map((s) => (
              <li key={s.address} className="flex items-center justify-between py-2">
                <span className="font-mono">{shortenAddress(s.address, 5)}</span>
                <span className="text-ink-muted">
                  block +{s.blockOffset}
                  {s.bundled ? " · bundle" : ""} · {formatUsd(s.volumeUsd)}
                </span>
              </li>
            ))}
            {!intelQuery.isLoading && (intel?.snipers.snipers.length ?? 0) === 0 && (
              <li className="py-4 text-center text-ink-muted">
                No indexed pool swaps in launch window yet.
              </li>
            )}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}

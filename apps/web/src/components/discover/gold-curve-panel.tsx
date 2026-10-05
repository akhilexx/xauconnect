"use client";

import { useQuery } from "@tanstack/react-query";
import type { GoldCurveView } from "@xauconnect/sdk";
import { GlassCard } from "@xauconnect/ui";
import { api } from "@/lib/api";

function feeLabel(bps: number): string {
  const pct = bps / 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(2)}%`;
}

function countdown(endsAt: number | null): string | null {
  if (!endsAt) return null;
  const left = endsAt * 1000 - Date.now();
  if (left <= 0) return "Fee is at its final rate";
  const minutes = Math.floor(left / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  return `Falls to the final fee in ${minutes}m ${seconds}s`;
}

export function GoldCurvePanel({ chainKey, address }: { chainKey: string; address: string }) {
  const query = useQuery({
    queryKey: ["gold-curve", address],
    enabled: chainKey === "solana",
    retry: false,
    refetchInterval: 8_000,
    queryFn: () => api.goldCurve(address),
  });
  const curve = query.data?.curve;
  if (!curve) return null;
  return <GoldCurveCard curve={curve} />;
}

function GoldCurveCard({ curve }: { curve: GoldCurveView }) {
  const pct = Math.max(0, Math.min(100, curve.progress * 100));
  const clock = countdown(curve.feeEndsAt);
  return (
    <GlassCard variant="gradient" padding="lg" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Gold Curve</p>
          <p className="font-display text-xl font-extrabold">
            {curve.preset === "external" ? "Meteora curve" : curve.preset[0]?.toUpperCase() + curve.preset.slice(1)}
            <span className="ml-2 text-base font-semibold text-ink-muted">{curve.segment}</span>
          </p>
        </div>
        <p className="text-right text-sm font-bold tabular-nums">
          {curve.raised} / {curve.threshold} {curve.quoteSymbol}
          <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            In the curve
          </span>
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/40">
        <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-ink-muted">
        {curve.migrated
          ? "Graduated. Trading continues on the locked DAMM v2 pool through Jupiter."
          : `${pct.toFixed(1)}% of the way to ${curve.threshold} ${curve.quoteSymbol}. That amount is what is sitting in the curve now. Volume counts every buy and sell. Meteora keepers migrate the pool at the threshold.`}
      </p>
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <div className="glass rounded-2xl p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Fee now</p>
          <p className="mt-1 font-bold">{feeLabel(curve.feeBpsNow)}</p>
          <p className="text-xs text-ink-faint">Final {feeLabel(curve.feeBpsFinal)}</p>
        </div>
        <div className="glass rounded-2xl p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Phase</p>
          <p className="mt-1 font-bold">
            {curve.segmentIndex + 1} / {curve.segmentCount}
          </p>
          <p className="text-xs text-ink-faint">{clock ?? "Fixed fee for the whole curve"}</p>
        </div>
        <div className="glass rounded-2xl p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Creator fees</p>
          <p className="mt-1 font-bold">{curve.creatorTradingFeePercentage}%</p>
          <p className="text-xs text-ink-faint">Claim from Profile</p>
        </div>
      </div>
      <p className="text-xs text-ink-soft">{curve.lockedLp}</p>
      <p className="text-xs text-ink-faint">
        Locked split: {curve.creatorLockedPct}% creator, {curve.partnerLockedPct}% XAUConnect. Leftover base after
        graduation goes to {curve.leftoverReceiver.slice(0, 4)}…{curve.leftoverReceiver.slice(-4)}.
      </p>
      <div className="flex flex-wrap gap-3 text-xs font-semibold">
        <a className="text-gold-deep underline" href={`https://solscan.io/account/${curve.config}`} target="_blank" rel="noreferrer">
          Config
        </a>
        <a className="text-gold-deep underline" href={`https://solscan.io/account/${curve.pool}`} target="_blank" rel="noreferrer">
          Curve pool
        </a>
        {curve.dammPool && (
          <a className="text-gold-deep underline" href={`https://solscan.io/account/${curve.dammPool}`} target="_blank" rel="noreferrer">
            DAMM v2 pool
          </a>
        )}
      </div>
    </GlassCard>
  );
}

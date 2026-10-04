"use client";

/**
 * LiveTicker — thin marquee under the navbar streaming WS price ticks.
 * Merges updates in-place by token address so the scroll animation never resets.
 */
import { useEffect, useRef, useState } from "react";
import { formatPercent, formatUsd } from "@xauconnect/utils";
import { cn } from "@xauconnect/ui";
import { getWs } from "@/lib/api";

interface Tick {
  chainKey: string;
  address: string;
  symbol: string;
  priceUsd: number;
  change24hPct: number;
}

function tickKey(t: Tick): string {
  return `${t.chainKey}:${t.address.toLowerCase()}`;
}

/** WS sends a full snapshot (≤12 tokens). Mirror it — never accumulate stale rows. */
function applyTickSnapshot(incoming: Tick[]): Tick[] {
  return incoming.map((t) => ({ ...t }));
}

const TICKER_PX_PER_SEC = 48;

export function LiveTicker() {
  const [ticks, setTicks] = useState<Tick[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const [durationSec, setDurationSec] = useState(45);

  useEffect(() => {
    const unsubscribe = getWs().subscribe("prices", (payload) => {
      if (!Array.isArray(payload)) return;
      setTicks(applyTickSnapshot(payload as Tick[]));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || ticks.length === 0) return;

    const syncDuration = () => {
      const halfWidth = track.scrollWidth / 2;
      if (halfWidth <= 0) return;
      setDurationSec(Math.max(halfWidth / TICKER_PX_PER_SEC, 24));
    };

    syncDuration();
    const observer = new ResizeObserver(syncDuration);
    observer.observe(track);
    return () => observer.disconnect();
  }, [ticks]);

  if (ticks.length === 0) return null;

  const row = [...ticks, ...ticks];

  return (
    <div className="overflow-hidden border-b border-white/50 bg-white/35 py-1.5 backdrop-blur-glass">
      <div
        ref={trackRef}
        className="flex w-max gap-8 px-4 will-change-transform animate-ticker"
        style={{ animationDuration: `${durationSec}s` }}
      >
        {row.map((t, i) => (
          <span
            key={`${tickKey(t)}-${i < ticks.length ? "a" : "b"}`}
            className="flex shrink-0 items-center gap-1.5 text-xs font-medium"
          >
            <span className="text-ink-soft">{t.symbol}</span>
            <span className="font-semibold text-ink tabular-nums">{formatUsd(t.priceUsd)}</span>
            <span
              className={cn(
                "tabular-nums",
                t.change24hPct >= 0 ? "text-success" : "text-danger",
              )}
            >
              {formatPercent(t.change24hPct)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

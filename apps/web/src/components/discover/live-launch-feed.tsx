"use client";

/**
 * LiveLaunchFeed — real-time launch rail (2s REST + WS snapshots).
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Radio, Rocket, ShieldCheck } from "lucide-react";
import {
  formatUsd,
  getChainByKey,
  getChainLogoUrl,
  timeAgo,
  type MarketToken,
} from "@xauconnect/utils";
import { Badge, ChainIcon, GlassPanel, TokenIcon } from "@xauconnect/ui";
import { api, getWs } from "@/lib/api";

const MAX_CARDS = 10;
const POLL_MS = 2_000;

function launchKey(t: MarketToken): string {
  return `${t.chainKey}:${t.address}`;
}

function sortLaunches(tokens: MarketToken[]): MarketToken[] {
  return [...tokens]
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, MAX_CARDS);
}

export function LiveLaunchFeed() {
  const [launches, setLaunches] = useState<MarketToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [clock, setClock] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setClock((c) => c + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  const applySnapshot = useCallback((tokens: MarketToken[]) => {
    if (tokens.length === 0) return;
    setLaunches(sortLaunches(tokens));
    setLastSync(Date.now());
    setLoading(false);
    setError(null);
  }, []);

  const applySingle = useCallback((token: MarketToken) => {
    if (!token?.address) return;
    setLaunches((prev) =>
      sortLaunches([
        token,
        ...prev.filter((t) => launchKey(t) !== launchKey(token)),
      ]),
    );
    setLastSync(Date.now());
    setLoading(false);
    setError(null);
  }, []);

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await api.liveLaunches();
      applySnapshot(res.launches);
      if (res.syncedAt) setLastSync(res.syncedAt);
    } catch (err) {
      setError((err as Error).message || "Could not load launches");
      setLoading(false);
    }
  }, [applySnapshot]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchSnapshot();

    const poll = setInterval(() => {
      if (!cancelled) void fetchSnapshot();
    }, POLL_MS);

    const unsubscribe = getWs().subscribe("launches", (payload) => {
      if (cancelled) return;
      if (Array.isArray(payload)) {
        applySnapshot(payload as MarketToken[]);
        return;
      }
      applySingle(payload as MarketToken);
    });

    return () => {
      cancelled = true;
      clearInterval(poll);
      unsubscribe();
    };
  }, [applySnapshot, applySingle, fetchSnapshot]);

  void clock;

  return (
    <GlassPanel className="relative overflow-hidden p-4 sm:p-5">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-gold/15 blur-3xl"
        aria-hidden
      />

      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          Launching now
        </h2>
        <div className="flex items-center gap-2">
          {lastSync && (
            <span className="text-[10px] text-ink-faint">synced {timeAgo(lastSync)}</span>
          )}
          <Badge tone="gold">
            <Radio className="mr-0.5 inline h-3 w-3" /> LIVE
          </Badge>
        </div>
      </div>

      <div className="scroll-x-tabs -mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-2 sm:mt-4 sm:py-3">
        {launches.map((token) => {
          const chain = getChainByKey(token.chainKey);
          return (
            <div key={launchKey(token)} className="snap-start shrink-0">
              <Link
                href={`/token/${token.chainKey}/${token.address}`}
                className="block w-44 rounded-2xl bg-white/55 p-3 ring-1 ring-white/70 transition-shadow hover:shadow-gold-glow sm:w-52 sm:p-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <TokenIcon symbol={token.symbol} src={token.logoURI} size={34} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 text-sm font-bold">
                      <span className="truncate">{token.symbol}</span>
                      {token.xauLaunch && (
                        <Rocket className="h-3 w-3 shrink-0 text-gold-deep" aria-label="XAU launch" />
                      )}
                      {token.auditBadge === "verified" && (
                        <ShieldCheck className="h-3 w-3 shrink-0 text-success" aria-label="Audited" />
                      )}
                    </span>
                    <span className="block truncate text-[11px] text-ink-muted">
                      {token.name}
                    </span>
                  </span>
                </div>
                <dl className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                  <dt className="text-ink-faint">Price</dt>
                  <dd className="text-right font-mono font-semibold tabular-nums">
                    {formatUsd(token.priceUsd)}
                  </dd>
                  <dt className="text-ink-faint">Liquidity</dt>
                  <dd className="text-right font-semibold tabular-nums">
                    {formatUsd(token.liquidityUsd)}
                  </dd>
                  <dt className="text-ink-faint">24h Vol</dt>
                  <dd className="text-right font-semibold tabular-nums">
                    {formatUsd(token.volume24hUsd)}
                  </dd>
                </dl>
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-ink-faint">
                  <span className="inline-flex items-center gap-1">
                    <ChainIcon
                      name={chain?.name ?? token.chainKey}
                      src={getChainLogoUrl(token.chainKey)}
                      color={chain?.color}
                      size={12}
                    />
                    {chain?.name ?? token.chainKey}
                  </span>
                  <span>
                    Listed {token.createdAt ? timeAgo(token.createdAt) : "just now"}
                  </span>
                </div>
              </Link>
            </div>
          );
        })}
        {loading && launches.length === 0 && (
          <p className="py-6 text-sm text-ink-muted">Loading live launches…</p>
        )}
        {!loading && error && launches.length === 0 && (
          <p className="py-6 text-sm text-danger">{error}</p>
        )}
        {!loading && !error && launches.length === 0 && (
          <p className="py-6 text-sm text-ink-muted">No recent launches — check back soon.</p>
        )}
      </div>
    </GlassPanel>
  );
}

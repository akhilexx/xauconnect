"use client";

/**
 * RecentLaunches — feed of tokens launched through XAUConnect.
 * Empty (with a friendly hint) until the database records the first launch.
 */
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge, GlassCard, Skeleton, TokenIcon } from "@xauconnect/ui";
import { BRAND_NAV_ICONS } from "@xauconnect/utils";
import { api } from "@/lib/api";
import { BrandGlyph } from "@/components/brand-glyph";

export function RecentLaunches({ placement = "grid" }: { placement?: "grid" | "aside" }) {
  const query = useQuery({
    queryKey: ["launches"],
    refetchInterval: 30_000,
    queryFn: () => api.launches(),
  });

  const launches = query.data?.launches ?? [];

  return (
    <section className={placement === "aside" ? "xl:sticky xl:top-6" : undefined}>
      <h2 className="mb-3 font-display text-xl font-bold">Recent XAU launches</h2>
      {query.isLoading && (
        <div className={placement === "aside" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}
      {!query.isLoading && launches.length === 0 && (
        <GlassCard className="flex items-center gap-3 text-sm text-ink-muted">
          <BrandGlyph src={BRAND_NAV_ICONS.launchpad} size={20} />
          No launches yet — be the first. Tokens deployed here are auto-listed on Discover.
        </GlassCard>
      )}
      <div className={placement === "aside" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
        {launches.map((launch) => (
          <Link
            key={launch.id}
            href={`/token/${launch.token.chainKey}/${launch.token.address}`}
          >
            <GlassCard hover className="flex items-center gap-3">
              <TokenIcon symbol={launch.token.symbol} src={launch.token.logoURI ?? undefined} size={40} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-bold">
                  {launch.token.symbol}
                  <Badge tone={launch.type === "BONDING_CURVE" ? "pink" : "gold"}>
                    {launch.type === "BONDING_CURVE" ? "curve" : "standard"}
                  </Badge>
                </span>
                <span className="block truncate text-xs text-ink-muted">{launch.token.name}</span>
              </span>
              <Badge tone={launch.status === "GRADUATED" ? "success" : "neutral"}>
                {launch.status.toLowerCase()}
              </Badge>
            </GlassCard>
          </Link>
        ))}
      </div>
    </section>
  );
}

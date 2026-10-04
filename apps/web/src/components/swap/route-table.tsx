"use client";

/**
 * RouteTable — XAU routing engine comparison: every available route with the
 * best one highlighted. Liquidity sources are surfaced as branded XAU routes.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Crown } from "lucide-react";
import {
  brandRouteNames,
  formatBps,
  formatUnits,
  type AggregatedQuote,
  type RouteQuote,
  type TokenInfo,
} from "@xauconnect/utils";
import { Badge, cn } from "@xauconnect/ui";

export interface RouteTableProps {
  quote: AggregatedQuote;
  tokenOut: TokenInfo;
  selectedDexId?: string;
  onSelect: (route: RouteQuote) => void;
}

export function RouteTable({ quote, tokenOut, selectedDexId, onSelect }: RouteTableProps) {
  const routes = useMemo(
    () => quote.quotes.filter((q) => q.executable !== false),
    [quote.quotes],
  );
  const bestId = quote.best?.dexId;
  const names = useMemo(
    () => brandRouteNames(routes.map((q) => q.dexId)),
    [routes],
  );

  if (routes.length === 0) return null;

  return (
    <div className="glass overflow-hidden rounded-glass">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/60 text-left text-[11px] uppercase tracking-wider text-ink-muted">
            <th className="px-4 py-2.5 font-semibold">Quote</th>
            <th className="px-4 py-2.5 text-right font-semibold">You receive</th>
            <th className="hidden px-4 py-2.5 text-right font-semibold md:table-cell">Impact</th>
          </tr>
        </thead>
        <tbody>
          {routes.map((route, index) => {
            const isBest = route.dexId === bestId;
            const isSelected = route.dexId === (selectedDexId ?? bestId);
            return (
              <motion.tr
                key={route.dexId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  "border-b border-white/40 last:border-0",
                  isSelected ? "bg-gold/15" : "",
                )}
              >
                <td colSpan={3} className="p-0">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelect(route)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-white/50 active:bg-white/60",
                      "touch-manipulation",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                        isSelected ? "border-gold-deep bg-gold/30" : "border-ink-faint/40",
                      )}
                      aria-hidden
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 text-gold-deep" strokeWidth={3} />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2 font-semibold">
                      {isBest && (
                        <Crown className="h-3.5 w-3.5 text-gold-deep" aria-label="Best quote" />
                      )}
                      {names.get(route.dexId) ?? "Best quote"}
                      {isBest && <Badge tone="gold">best</Badge>}
                    </span>
                    <span className="shrink-0 font-mono font-semibold">
                      {formatUnits(BigInt(route.amountOutAfterFee), tokenOut.decimals)}{" "}
                      <span className="text-ink-muted">{tokenOut.symbol}</span>
                    </span>
                    <span
                      className={cn(
                        "hidden shrink-0 md:inline",
                        route.priceImpactBps > 300 ? "text-danger" : "text-ink-muted",
                      )}
                    >
                      {formatBps(route.priceImpactBps)}
                    </span>
                  </button>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
      {routes.length > 1 && (
        <p className="border-t border-white/60 px-4 py-2 text-[11px] text-ink-faint">
          Tap a route to select · refreshes every 12s
        </p>
      )}
    </div>
  );
}

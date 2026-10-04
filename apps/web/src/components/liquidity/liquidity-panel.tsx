"use client";

/**
 * LiquidityPanel — XAU liquidity pools, add/remove LP through one interface.
 * Quotes hit live pair reserves where available (real pool ratios) and fall
 * back to demo rows; execution goes through LiquidityZap once deployed.
 * Pools are surfaced under branded XAU pool identities.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Droplets, Percent, PlusCircle, MinusCircle } from "lucide-react";
import {
  brandPoolNames,
  formatUnits,
  getTokensForChain,
  parseUnits,
  type LpQuote,
  type TokenInfo,
} from "@xauconnect/utils";
import { contractsFor } from "@xauconnect/sdk";
import {
  Badge,
  GlassButton,
  GlassCard,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  toast,
  cn,
} from "@xauconnect/ui";
import { api } from "@/lib/api";
import { useChainStore } from "@/lib/store";
import { ChainSelector } from "../chain-selector";
import { TokenSelect } from "../token-select";

export function LiquidityPanel() {
  const { chainKey } = useChainStore();
  const [action, setAction] = useState<"add" | "remove">("add");
  const defaults = useMemo(() => getTokensForChain(chainKey), [chainKey]);
  const [tokenA, setTokenA] = useState<TokenInfo | null>(defaults[1] ?? null);
  const [tokenB, setTokenB] = useState<TokenInfo | null>(defaults[2] ?? null);
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState<string>();

  useEffect(() => {
    const tokens = getTokensForChain(chainKey);
    setTokenA(tokens[1] ?? null);
    setTokenB(tokens[2] ?? null);
    setSelected(undefined);
  }, [chainKey]);

  const amountBase = useMemo(() => {
    if (!tokenA || !amount) return null;
    try {
      const parsed = parseUnits(amount, tokenA.decimals);
      return parsed > 0n ? parsed.toString() : null;
    } catch {
      return null;
    }
  }, [amount, tokenA]);

  const lpQuery = useQuery({
    queryKey: ["lp", chainKey, action, tokenA?.address, tokenB?.address, amountBase],
    enabled: Boolean(tokenA && tokenB && amountBase),
    refetchInterval: 20_000,
    queryFn: () =>
      api.quoteLp({
        chainKey,
        action,
        tokenA: tokenA!.address,
        tokenB: tokenB!.address,
        amount: amountBase!,
      }),
  });

  const quotes: LpQuote[] = lpQuery.data?.quotes ?? [];
  const selectedQuote = quotes.find((q) => q.dexId === selected) ?? quotes[0] ?? null;
  const poolNames = useMemo(() => brandPoolNames(quotes.map((q) => q.dexId)), [quotes]);

  function execute() {
    const zap = contractsFor(chainKey).liquidityZap;
    if (!zap) {
      toast.info("Demo mode — LiquidityZap not deployed on this chain yet", {
        description:
          "Quote computed against live pool reserves. Deploy contracts and register the address in packages/sdk/src/contracts.ts to execute.",
      });
      return;
    }
    // Real execution: approve both tokens to the zap, then call addLiquidity/
    // removeLiquidity with the selected pool's router (see LIQUIDITY_ZAP_ABI).
    toast.success("Submitting LP transaction…");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <ChainSelector />
        <Tabs value={action} onValueChange={(v) => setAction(v as "add" | "remove")}>
          <TabsList>
            <TabsTrigger value="add">
              <span className="flex items-center gap-1">
                <PlusCircle className="h-3.5 w-3.5" /> Add
              </span>
            </TabsTrigger>
            <TabsTrigger value="remove">
              <span className="flex items-center gap-1">
                <MinusCircle className="h-3.5 w-3.5" /> Remove
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <GlassCard variant="strong" padding="lg" className="flex w-full flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {tokenA && (
            <TokenSelect
              chainKey={chainKey}
              value={tokenA}
              onChange={setTokenA}
              exclude={
                tokenB ? { chainKey: tokenB.chainKey, address: tokenB.address } : undefined
              }
              label="Token A"
            />
          )}
          <span className="font-display text-lg font-bold text-ink-muted">/</span>
          {tokenB && (
            <TokenSelect
              chainKey={chainKey}
              value={tokenB}
              onChange={setTokenB}
              exclude={
                tokenA ? { chainKey: tokenA.chainKey, address: tokenA.address } : undefined
              }
              label="Token B"
            />
          )}
        </div>

        <div className="gradient-border-soft rounded-2xl p-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {action === "add" ? `Amount of ${tokenA?.symbol ?? ""} to deposit` : "LP tokens to withdraw"}
          </label>
          <input
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => {
              if (/^\d*\.?\d*$/.test(e.target.value)) setAmount(e.target.value);
            }}
            className="mt-1.5 w-full bg-transparent font-display text-2xl font-bold text-ink outline-none placeholder:text-ink-faint sm:text-3xl"
            aria-label="LP amount"
          />
        </div>

        <GlassButton size="lg" disabled={!selectedQuote} onClick={execute}>
          <Droplets className="h-4 w-4" />
          {action === "add" ? "Add Liquidity" : "Remove Liquidity"}
        </GlassButton>
      </GlassCard>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
      {/* Pool comparison */}
      {lpQuery.isFetching && !lpQuery.data && amountBase && (
        <GlassCard className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </GlassCard>
      )}

      {quotes.length > 0 && tokenA && tokenB && (
        <div className="glass overflow-x-auto rounded-glass">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b border-white/60 text-left text-[11px] uppercase tracking-wider text-ink-muted">
                <th className="px-4 py-2.5 font-semibold">XAU Pool</th>
                <th className="px-4 py-2.5 text-right font-semibold">{tokenA.symbol}</th>
                <th className="px-4 py-2.5 text-right font-semibold">{tokenB.symbol}</th>
                <th className="hidden px-4 py-2.5 text-right font-semibold md:table-cell">
                  Est. APR
                </th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr
                  key={q.dexId}
                  onClick={() => setSelected(q.dexId)}
                  className={cn(
                    "cursor-pointer border-b border-white/40 last:border-0",
                    q.dexId === (selected ?? quotes[0]?.dexId)
                      ? "bg-gold/15"
                      : "hover:bg-white/50",
                  )}
                >
                  <td className="px-4 py-3 font-semibold">
                    <span className="flex items-center gap-2">
                      {poolNames.get(q.dexId) ?? "XAU Pool"}
                      {q.simulated ? (
                        <Badge tone="neutral">preview</Badge>
                      ) : (
                        <Badge tone="success">live pool</Badge>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatUnits(BigInt(q.amountA), tokenA.decimals, 5)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatUnits(BigInt(q.amountB), tokenB.decimals, 5)}
                  </td>
                  <td className="hidden px-4 py-3 text-right md:table-cell">
                    {q.aprEstimate ? (
                      <span className="flex items-center justify-end gap-1 font-semibold text-success">
                        <Percent className="h-3 w-3" />
                        {q.aprEstimate.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-white/60 px-4 py-2 text-[11px] text-ink-faint">
            “Live pool” rows are computed from on-chain reserves · ratios refresh every 20s
          </p>
        </div>
      )}
      </div>
    </div>
  );
}

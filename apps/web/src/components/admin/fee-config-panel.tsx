"use client";

/**
 * FeeConfigPanel — per-chain protocol fee editor (persisted in PostgreSQL).
 * Swap fee range: 0–10_000 bps (0–100%).
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { formatBps, formatUnits, getChainByKey, type FeeConfig } from "@xauconnect/utils";
import { Badge, GlassButton, GlassCard, toast } from "@xauconnect/ui";
import { api } from "@/lib/api";
import { useAdminReady } from "@/lib/session";
import { AdminQueryShell } from "./admin-query-shell";

type Row = FeeConfig & {
  launchFeeNative: string;
  onChainSwapFeeBps?: number | null;
  onChainFeeCollectorDeployed?: boolean;
};

export function FeeConfigPanel() {
  const adminReady = useAdminReady();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-fees"],
    enabled: adminReady,
    retry: 1,
    queryFn: () => api.adminFees(),
  });
  const [edits, setEdits] = useState<Record<string, Partial<Row>>>({});

  const save = useMutation({
    mutationFn: async (row: Row) => {
      const { chainKey, ...config } = row;
      return api.adminUpdateFees(chainKey, config);
    },
    onSuccess: (data, row) => {
      const sync = (data as { onChainSync?: { ok: boolean; error?: string; txHash?: string } })
        .onChainSync;
      if (sync?.ok && sync.txHash) {
        toast.success(`Fees updated for ${getChainByKey(row.chainKey)?.name ?? row.chainKey}`, {
          description: `On-chain FeeCollector synced (${formatBps(row.swapFeeBps)}).`,
        });
      } else if (sync && !sync.ok && row.chainKey !== "solana") {
        toast.warning(`Saved in dashboard; on-chain sync pending`, {
          description: sync.error ?? "Configure FEE_COLLECTOR_ADDRESS and FEE_MANAGER_PRIVATE_KEY.",
        });
      } else {
        toast.success(`Fees updated for ${getChainByKey(row.chainKey)?.name ?? row.chainKey}`);
      }
      setEdits((e) => ({ ...e, [row.chainKey]: {} }));
      void queryClient.invalidateQueries({ queryKey: ["admin-fees"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
    },
    onError: (err) => toast.error("Update failed", { description: (err as Error).message }),
  });

  return (
    <AdminQueryShell query={query} skeletonClass="h-96 w-full">
      {(data) => {
        const configs = data.configs ?? [];
        return (
    <GlassCard variant="strong" padding="sm" className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-white/60 text-left text-[11px] uppercase tracking-wider text-ink-muted">
            <th className="px-3 py-2.5 font-semibold">Chain</th>
            <th className="px-3 py-2.5 font-semibold">Swap levy (0–100%)</th>
            <th className="px-3 py-2.5 font-semibold">Buy/Sell fee</th>
            <th className="px-3 py-2.5 font-semibold">Default slippage</th>
            <th className="px-3 py-2.5 font-semibold">LP fee (bps)</th>
            <th className="px-3 py-2.5 font-semibold">Launch fee (native)</th>
            <th className="px-3 py-2.5 font-semibold">Listing fee (USD)</th>
            <th className="px-3 py-2.5 font-semibold">On-chain</th>
            <th className="px-3 py-2.5 font-semibold">Enabled</th>
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {configs.map((cfg) => {
            const edit = edits[cfg.chainKey] ?? {};
            const row: Row = { ...cfg, ...edit };
            const dirty = Object.keys(edit).length > 0;
            const chain = getChainByKey(cfg.chainKey);
            const patch = (p: Partial<Row>) =>
              setEdits((e) => ({ ...e, [cfg.chainKey]: { ...e[cfg.chainKey], ...p } }));
            return (
              <tr key={cfg.chainKey} className="border-b border-white/40 last:border-0">
                <td className="px-3 py-3 font-semibold" style={{ color: chain?.color }}>
                  {chain?.name ?? cfg.chainKey}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={10_000}
                      step={1}
                      value={row.swapFeeBps}
                      onChange={(e) => patch({ swapFeeBps: Number(e.target.value) })}
                      className="w-32 accent-gold-dark"
                    />
                    <input
                      type="number"
                      min={0}
                      max={10_000}
                      value={row.swapFeeBps}
                      onChange={(e) =>
                        patch({ swapFeeBps: Math.min(10_000, Math.max(0, Number(e.target.value))) })
                      }
                      className="glass-field w-20 rounded-xl px-2 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                    <Badge tone="gold">{formatBps(row.swapFeeBps)}</Badge>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={row.onrampFeeBps ?? (cfg.chainKey === "solana" ? 500 : 300)}
                      onChange={(e) =>
                        patch({ onrampFeeBps: Math.min(500, Math.max(0, Number(e.target.value))) })
                      }
                      className="glass-field w-20 rounded-xl px-2 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                    <Badge tone="gold">
                      {formatBps(row.onrampFeeBps ?? (cfg.chainKey === "solana" ? 500 : 300))}
                    </Badge>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={5000}
                      value={row.defaultSlippageBps ?? 50}
                      onChange={(e) =>
                        patch({
                          defaultSlippageBps: Math.min(5000, Math.max(1, Number(e.target.value))),
                        })
                      }
                      className="glass-field w-20 rounded-xl px-2 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                    <Badge tone="neutral">{formatBps(row.defaultSlippageBps ?? 50)}</Badge>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={row.lpFeeBps}
                    onChange={(e) => patch({ lpFeeBps: Number(e.target.value) })}
                    className="glass-field w-20 rounded-xl px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </td>
                <td className="px-3 py-3">
                  <span className="font-mono text-xs">
                    {formatUnits(BigInt(row.launchFeeNative), 18)} {chain?.nativeSymbol}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    min={0}
                    value={row.listingFeeUsd}
                    onChange={(e) => patch({ listingFeeUsd: Number(e.target.value) })}
                    className="glass-field w-24 rounded-xl px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </td>
                <td className="px-3 py-3">
                  {cfg.chainKey === "solana" ? (
                    <span className="text-xs text-ink-muted">Jupiter API</span>
                  ) : row.onChainFeeCollectorDeployed ? (
                    <div className="flex flex-col gap-0.5">
                      <Badge tone={row.onChainSwapFeeBps === row.swapFeeBps ? "success" : "neutral"}>
                        {row.onChainSwapFeeBps != null
                          ? formatBps(row.onChainSwapFeeBps)
                          : "—"}
                      </Badge>
                      <span className="text-[10px] text-ink-faint">FeeCollector contract</span>
                    </div>
                  ) : (
                    <span className="text-xs text-ink-muted">Not deployed</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => patch({ enabled: e.target.checked })}
                    className="h-4 w-4 accent-gold-dark"
                  />
                </td>
                <td className="px-3 py-3 text-right">
                  <GlassButton
                    size="sm"
                    variant={dirty ? "gold" : "ghost"}
                    disabled={!dirty || save.isPending}
                    onClick={() => save.mutate(row)}
                  >
                    <Save className="h-3.5 w-3.5" /> Save
                  </GlassButton>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[11px] text-ink-faint">
        Swap levy applies to quotes immediately. On deployed chains, Save also pushes swapFeeBps to
        the on-chain FeeCollector contract (see Protocol treasury → on-chain vault). Integrator routes
        (1inch / 0x / Jupiter) use the same admin % via API params. Hot wallet{" "}
        <code className="rounded bg-white/60 px-1">0xC062…</code> receives API fees and vault
        withdrawals.
      </p>
    </GlassCard>
        );
      }}
    </AdminQueryShell>
  );
}

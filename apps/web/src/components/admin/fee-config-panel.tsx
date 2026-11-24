"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import {
  formatBps,
  formatUnits,
  getChainByKey,
  getChainLogoUrl,
  type FeeConfig,
} from "@xauconnect/utils";
import { Badge, ChainIcon, GlassButton, GlassCard, toast } from "@xauconnect/ui";
import { api } from "@/lib/api";
import { useAdminReady } from "@/lib/session";
import { AdminQueryShell } from "./admin-query-shell";

type Row = FeeConfig & { onChainSwapFeeBps?: number | null; onChainFeeCollectorDeployed?: boolean };
const fields = [
  { key: "swapFeeBps", label: "Swap fee", min: 0, max: 10000, unit: "bps" },
  { key: "defaultSlippageBps", label: "Default slippage", min: 1, max: 5000, unit: "bps" },
  { key: "lpFeeBps", label: "Liquidity fee", min: 0, max: 100, unit: "bps" },
  { key: "onrampFeeBps", label: "Buy / sell fee", min: 0, max: 500, unit: "bps" },
  { key: "listingFeeUsd", label: "Listing fee", min: 0, unit: "USD" },
] as const;
type Field = (typeof fields)[number];
type Draft = Partial<Record<Field["key"], string>> & { enabled?: boolean };

export function FeeConfigPanel() {
  const ready = useAdminReady(),
    client = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-fees"],
    enabled: ready,
    retry: 1,
    queryFn: () => api.adminFees(),
  });
  const [selected, setSelected] = useState(""),
    [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const discard = (key: string) =>
    setDrafts((old) => {
      const next = { ...old };
      delete next[key];
      return next;
    });
  const save = useMutation({
    mutationFn: async ({
      chainKey,
      config,
    }: {
      chainKey: string;
      config: Omit<FeeConfig, "chainKey">;
    }) => api.adminUpdateFees(chainKey, config),
    onSuccess: async (result, { chainKey }) => {
      const sync = (result as { onChainSync?: { ok: boolean; error?: string; txHash?: string } })
        .onChainSync;
      if (sync && !sync.ok && chainKey !== "solana")
        toast.warning("Fee settings saved; on-chain sync pending");
      else toast.success("Fee settings saved for " + (getChainByKey(chainKey)?.name ?? chainKey));
      await client.invalidateQueries({ queryKey: ["admin-fees"] });
      discard(chainKey);
      void client.invalidateQueries({ queryKey: ["admin-wallets"] });
    },
    onError: (e) => toast.error("Could not save fee settings", { description: e.message }),
  });
  return (
    <AdminQueryShell query={query}>
      {({ configs }) => {
        const cfg: Row | undefined = configs.find((c) => c.chainKey === selected) ?? configs[0];
        if (!cfg) return <GlassCard>No networks have fee settings yet.</GlassCard>;
        const chain = getChainByKey(cfg.chainKey),
          draft = drafts[cfg.chainKey] ?? {};
        const update = (p: Draft) =>
          setDrafts((old) => ({ ...old, [cfg.chainKey]: { ...old[cfg.chainKey], ...p } }));
        const value = (f: Field) => draft[f.key] ?? String(cfg[f.key]);
        const valid = (f: Field) => {
          const raw = value(f),
            n = Number(raw);
          return (
            raw.trim() !== "" &&
            Number.isFinite(n) &&
            n >= f.min &&
            (!("max" in f) || n <= f.max) &&
            (f.unit !== "bps" || Number.isInteger(n))
          );
        };
        const enabled = draft.enabled ?? cfg.enabled;
        const dirty =
          fields.some(
            (f) => draft[f.key] !== undefined && (!valid(f) || Number(value(f)) !== cfg[f.key]),
          ) || enabled !== cfg.enabled;
        const input = (f: Field) => (
          <label key={f.key} className="admin-field">
            <span className="admin-field-label">
              {f.label} <span className="font-normal">({f.unit})</span>
            </span>
            <input
              type="number"
              className="admin-control glass-field tabular-nums"
              min={f.min}
              max={"max" in f ? f.max : undefined}
              step={f.unit === "bps" ? 1 : "any"}
              required
              aria-invalid={!valid(f)}
              aria-describedby={"fee-hint-" + f.key}
              value={value(f)}
              onChange={(e) => update({ [f.key]: e.target.value })}
            />
            <span
              id={"fee-hint-" + f.key}
              className={"text-xs " + (valid(f) ? "text-ink-muted" : "text-danger")}
            >
              {valid(f)
                ? f.unit === "bps"
                  ? formatBps(Number(value(f)))
                  : "US dollars"
                : "Enter " +
                  ("max" in f
                    ? "a whole number from " + f.min + " to " + f.max
                    : "a nonnegative amount")}
            </span>
          </label>
        );
        return (
          <div className="grid min-w-0 gap-4">
            <GlassCard className="grid items-end gap-3 sm:grid-cols-[minmax(12rem,20rem)_1fr]">
              <label className="admin-field">
                <span className="admin-field-label">Network to configure</span>
                <select
                  className="admin-control glass-field"
                  value={cfg.chainKey}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {configs.map((c) => (
                    <option key={c.chainKey} value={c.chainKey}>
                      {getChainByKey(c.chainKey)?.name ?? c.chainKey}
                      {Object.keys(drafts[c.chainKey] ?? {}).length ? " · edited" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-ink-muted sm:pb-3">
                Changes apply to the selected network.
              </p>
            </GlassCard>
            <GlassCard variant="strong">
              <form
                aria-label="Network fee settings"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!dirty || save.isPending || !fields.every(valid)) return;
                  const config: FeeConfig = { ...cfg, enabled };
                  for (const f of fields) config[f.key] = Number(value(f));
                  const {
                    chainKey,
                    swapFeeBps,
                    defaultSlippageBps,
                    lpFeeBps,
                    onrampFeeBps,
                    listingFeeUsd,
                    launchFeeNative,
                  } = config;
                  save.mutate({
                    chainKey,
                    config: {
                      enabled,
                      swapFeeBps,
                      defaultSlippageBps,
                      lpFeeBps,
                      onrampFeeBps,
                      listingFeeUsd,
                      launchFeeNative,
                    },
                  });
                }}
              >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <ChainIcon
                      name={chain?.name ?? cfg.chainKey}
                      size={28}
                      src={getChainLogoUrl(cfg.chainKey)}
                      color={chain?.color}
                    />
                    <h2 className="admin-title">{chain?.name ?? cfg.chainKey} fees</h2>
                  </div>
                  <Badge tone={dirty ? "gold" : "neutral"}>
                    {dirty ? "Unsaved changes" : "Saved settings"}
                  </Badge>
                </div>
                <fieldset disabled={save.isPending} className="min-w-0 space-y-5">
                  <fieldset className="min-w-0 border-t border-ink/5 pt-3">
                    <legend className="pr-2 text-sm font-bold text-ink">Trading</legend>
                    <div className="grid gap-3 sm:grid-cols-3">{fields.slice(0, 3).map(input)}</div>
                  </fieldset>
                  <fieldset className="min-w-0 border-t border-ink/5 pt-3">
                    <legend className="pr-2 text-sm font-bold text-ink">Fiat and listings</legend>
                    <div className="grid gap-3 sm:grid-cols-2">{fields.slice(3).map(input)}</div>
                  </fieldset>
                  <div className="grid gap-4 rounded-2xl bg-white/55 p-4 ring-1 ring-ink/5 sm:grid-cols-2">
                    <div>
                      <p className="admin-field-label">Launch fee</p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatUnits(BigInt(cfg.launchFeeNative), chain?.nativeDecimals ?? 18)}{" "}
                        {chain?.nativeSymbol}
                      </p>
                    </div>
                    <div>
                      <p className="admin-field-label">On-chain swap fee</p>
                      <p className="mt-1 text-sm font-semibold">
                        {cfg.chainKey === "solana"
                          ? "Set at execution"
                          : cfg.onChainFeeCollectorDeployed
                            ? cfg.onChainSwapFeeBps != null
                              ? formatBps(cfg.onChainSwapFeeBps)
                              : "Reading unavailable"
                            : "No collector deployed"}
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => update({ enabled: e.target.checked })}
                      className="h-4 w-4 accent-gold-dark"
                    />
                    Enable this fee configuration
                  </label>
                </fieldset>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink/5 pt-4">
                  <p className="max-w-sm text-xs text-ink-muted">
                    Saving updates quotes and syncs the swap fee where a collector is deployed.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <GlassButton
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!dirty || save.isPending}
                      onClick={() => discard(cfg.chainKey)}
                    >
                      Discard edits
                    </GlassButton>
                    <GlassButton
                      type="submit"
                      size="sm"
                      disabled={!dirty || !fields.every(valid) || save.isPending}
                      loading={save.isPending}
                    >
                      <Save size={15} /> Save fees
                    </GlassButton>
                  </div>
                </div>
              </form>
            </GlassCard>
          </div>
        );
      }}
    </AdminQueryShell>
  );
}

"use client";

/**
 * AdminWalletsPanel — protocol treasury / fee-collector / operations registry.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Plus, Trash2, Wallet } from "lucide-react";
import { CHAINS, getChainByKey, getChainLogoUrl, shortenAddress, formatUsd } from "@xauconnect/utils";
import { Badge, ChainIcon, GlassButton, GlassCard, GlassDialog, Skeleton, toast } from "@xauconnect/ui";
import { api } from "@/lib/api";
import { useAdminReady } from "@/lib/session";
import { AdminInlineError } from "./admin-query-shell";

const PURPOSES = ["treasury", "fee_collector", "operations", "on_chain_vault"] as const;

type WalletRow = Awaited<ReturnType<typeof api.adminWallets>>["wallets"][number];

function WalletBalances({
  w,
  balancesLoading,
}: {
  w: WalletRow;
  balancesLoading?: boolean;
}) {
  if (balancesLoading && w.nativeBalance == null) {
    return <span className="text-ink-muted">…</span>;
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      {w.nativeBalance != null ? (
        <span className="font-mono text-xs font-semibold text-ink">
          {Number(w.nativeBalance).toFixed(4)} {w.nativeSymbol ?? ""}
        </span>
      ) : (
        <span className="text-ink-muted">—</span>
      )}
      {w.tokenBalances?.map((t) => (
        <span key={t.symbol} className="font-mono text-[11px] text-gold-deep">
          {Number(t.balanceFormatted).toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
          {t.symbol}
          <span className="text-ink-muted"> ({formatUsd(t.usdValue)})</span>
        </span>
      ))}
      {w.portfolioUsd != null && (w.tokenBalances?.length ?? 0) > 0 ? (
        <span className="text-[10px] font-semibold text-ink-muted">
          Total {formatUsd(w.portfolioUsd)}
        </span>
      ) : null}
    </div>
  );
}

function purposeTone(purpose: string): "gold" | "success" | "neutral" {
  if (purpose === "on_chain_vault") return "gold";
  if (purpose === "fee_collector") return "gold";
  if (purpose === "treasury") return "success";
  return "neutral";
}

function groupWallets(wallets: WalletRow[]) {
  const map = new Map<string, WalletRow[]>();
  for (const w of wallets) {
    const key = w.keyRef ?? `${w.walletGroup ?? "misc"}-${w.purpose}-${w.address}`;
    const list = map.get(key) ?? [];
    list.push(w);
    map.set(key, list);
  }
  return [...map.entries()].sort((a, b) => {
    const pa = a[1][0]?.purpose ?? "";
    const pb = b[1][0]?.purpose ?? "";
    return pa.localeCompare(pb);
  });
}

function WalletRowCard({
  w,
  onRemove,
  balancesLoading,
}: {
  w: WalletRow;
  onRemove: (id: string) => void;
  balancesLoading?: boolean;
}) {
  const chain = getChainByKey(w.chainKey);
  return (
    <div className="rounded-xl border border-white/40 bg-white/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ChainIcon
            name={chain?.name ?? w.chainKey}
            src={getChainLogoUrl(w.chainKey)}
            color={chain?.color}
            size={18}
          />
          <span className="truncate font-medium text-sm" style={{ color: chain?.color }}>
            {chain?.name ?? w.chainKey}
          </span>
        </div>
        <button
          onClick={() => onRemove(w.id)}
          className="shrink-0 rounded-lg p-1.5 text-ink-muted hover:bg-danger/10 hover:text-danger"
          aria-label="Remove wallet row"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <span className="font-mono text-[11px] text-ink-muted">{shortenAddress(w.address)}</span>
        <WalletBalances w={w} balancesLoading={balancesLoading} />
      </div>
    </div>
  );
}

function WalletGroup({
  groupKey,
  rows,
  onRemove,
  balancesLoading,
}: {
  groupKey: string;
  rows: WalletRow[];
  onRemove: (id: string) => void;
  balancesLoading?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const head = rows[0];
  if (!head) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        {open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{head.label ?? groupKey}</span>
            <Badge tone={purposeTone(head.purpose)}>{head.purpose.replace("_", " ")}</Badge>
            {head.walletGroup && (
              <Badge tone="neutral">{head.walletGroup.toUpperCase()}</Badge>
            )}
          </div>
          <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-ink-muted sm:text-xs">
            {head.address}
          </p>
          <dl className="mt-2 grid gap-1 text-xs text-ink-muted sm:grid-cols-2">
            {head.keyRef && (
              <div>
                <dt className="inline font-semibold text-ink">Key ref: </dt>
                <dd className="inline font-mono">{head.keyRef}</dd>
              </div>
            )}
            {head.derivationPath && (
              <div>
                <dt className="inline font-semibold text-ink">Derivation: </dt>
                <dd className="inline font-mono">{head.derivationPath}</dd>
              </div>
            )}
          </dl>
          {head.notes && <p className="mt-1.5 text-xs text-ink-faint">{head.notes}</p>}
        </div>
      </button>

      {open && (
        <div className="border-t border-white/40 px-3 pb-3 sm:px-4">
          <div className="mt-2 flex flex-col gap-2 md:hidden">
            {rows.map((w) => (
              <WalletRowCard key={w.id} w={w} onRemove={onRemove} balancesLoading={balancesLoading} />
            ))}
          </div>

          <div className="mt-2 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-ink-muted">
                  <th className="pb-2 pr-2 font-semibold">Chain</th>
                  <th className="pb-2 pr-2 font-semibold">Address</th>
                  <th className="pb-2 pr-2 font-semibold">Balance</th>
                  <th className="pb-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => {
                  const chain = getChainByKey(w.chainKey);
                  return (
                    <tr key={w.id} className="border-t border-white/30">
                      <td className="py-2 pr-2">
                        <span className="flex items-center gap-1.5 font-medium" style={{ color: chain?.color }}>
                          <ChainIcon
                            name={chain?.name ?? w.chainKey}
                            src={getChainLogoUrl(w.chainKey)}
                            color={chain?.color}
                            size={16}
                          />
                          {chain?.name ?? w.chainKey}
                        </span>
                      </td>
                      <td className="py-2 pr-2 font-mono text-xs">{shortenAddress(w.address)}</td>
                      <td className="py-2 pr-2">
                        <WalletBalances w={w} balancesLoading={balancesLoading} />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => onRemove(w.id)}
                          className="rounded-lg p-1.5 text-ink-muted hover:bg-danger/10 hover:text-danger"
                          aria-label="Remove wallet row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminWalletsPanel() {
  const adminReady = useAdminReady();
  const queryClient = useQueryClient();
  const metaQuery = useQuery({
    queryKey: ["admin-wallets"],
    enabled: adminReady,
    queryFn: () => api.adminWallets(false),
    retry: 1,
    staleTime: 60_000,
  });
  const balanceQuery = useQuery({
    queryKey: ["admin-wallets", "balances"],
    enabled: adminReady && metaQuery.isSuccess,
    queryFn: () => api.adminWallets(true),
    retry: 1,
    staleTime: 120_000,
  });

  const wallets = useMemo(() => {
    const meta = metaQuery.data?.wallets ?? [];
    const withBal = balanceQuery.data?.wallets;
    if (!withBal) return meta;
    const balById = new Map(withBal.map((w) => [w.id, w]));
    return meta.map((w) => ({ ...w, ...balById.get(w.id) }));
  }, [metaQuery.data?.wallets, balanceQuery.data?.wallets]);

  const query = {
    isLoading: metaQuery.isLoading,
    isError: metaQuery.isError,
    error: metaQuery.error,
    refetch: () => Promise.all([metaQuery.refetch(), balanceQuery.refetch()]),
  };
  const [open, setOpen] = useState(false);
  const [chainKey, setChainKey] = useState("ethereum");
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState<(typeof PURPOSES)[number]>("treasury");

  const add = useMutation({
    mutationFn: () => api.adminAddWallet({ chainKey, address: address.trim(), label: label || undefined, purpose }),
    onSuccess: () => {
      toast.success("Wallet added");
      setOpen(false);
      setAddress("");
      setLabel("");
      void queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
    },
    onError: (err) => toast.error("Failed to add wallet", { description: (err as Error).message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.adminRemoveWallet(id),
    onSuccess: () => {
      toast.success("Wallet removed");
      void queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
    },
    onError: (err) => toast.error("Remove failed", { description: (err as Error).message }),
  });

  const groups = useMemo(() => groupWallets(wallets), [wallets]);
  const balancesLoading = balanceQuery.isLoading && !balanceQuery.data;

  if (!adminReady || query.isLoading) return <Skeleton className="h-64 w-full" />;

  if (query.isError) {
    return (
      <AdminInlineError
        error={query.error as Error}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-muted">
            Protocol wallets for treasury, fee collection, and operations — grouped by key across chains.
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            Private keys and mnemonics are stored only in{" "}
            <code className="rounded bg-white/60 px-1 py-0.5">.local/protocol-wallets-SECRETS.txt</code> on the
            operator machine — never in this dashboard.
          </p>
        </div>
        <GlassButton size="sm" className="w-full shrink-0 sm:w-auto" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add wallet
        </GlassButton>
      </div>

      {groups.length === 0 ? (
        <GlassCard variant="strong" padding="lg" className="text-center text-ink-muted">
          No protocol wallets registered. Run{" "}
          <code className="text-ink">pnpm protocol:wallets:generate</code> then{" "}
          <code className="text-ink">pnpm protocol:wallets:seed</code>, or add manually.
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(([key, rows]) => (
            <WalletGroup
              key={key}
              groupKey={key}
              rows={rows}
              onRemove={(id) => remove.mutate(id)}
              balancesLoading={balancesLoading}
            />
          ))}
        </div>
      )}

      <GlassDialog open={open} onClose={() => setOpen(false)} title="Add protocol wallet">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Chain
            <select
              value={chainKey}
              onChange={(e) => setChainKey(e.target.value)}
              className="glass-field rounded-2xl px-3 py-2.5 text-sm capitalize text-ink focus:outline-none focus:ring-2 focus:ring-gold/50"
            >
              {CHAINS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Wallet address
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x… or Solana base58"
              className="glass-field rounded-2xl px-3 py-2.5 font-mono text-sm text-ink focus:outline-none focus:ring-2 focus:ring-gold/50"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Label (optional)
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Main treasury"
              className="glass-field rounded-2xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-gold/50"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Purpose
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as (typeof PURPOSES)[number])}
              className="glass-field rounded-2xl px-3 py-2.5 text-sm capitalize text-ink focus:outline-none focus:ring-2 focus:ring-gold/50"
            >
              {PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {p.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <GlassButton
            className="w-full"
            loading={add.isPending}
            disabled={!address.trim()}
            onClick={() => add.mutate()}
          >
            <Wallet className="h-4 w-4" /> Register wallet
          </GlassButton>
        </div>
      </GlassDialog>
    </div>
  );
}

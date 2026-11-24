"use client";

/**
 * ConnectedWalletsPanel — search, filter, delete, profile + socials.
 */
import { useDeferredValue, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, RefreshCw, Trash2 } from "lucide-react";
import { CHAINS, formatUsd, getChainByKey, timeAgo, BRAND_NAV_ICONS } from "@xauconnect/utils";
import { Badge, GlassButton, GlassCard, toast } from "@xauconnect/ui";
import { api } from "@/lib/api";
import { useAdminReady } from "@/lib/session";
import { AdminQueryShell } from "./admin-query-shell";
import { AdminFilter, AdminFilterBar } from "./admin-filter-bar";
import { AdminUserIdentity, AdminSocialLinks } from "./admin-user-identity";
import { BrandGlyph } from "@/components/brand-glyph";

interface TokenBalance {
  chainKey: string;
  symbol: string;
  balanceFormatted: string;
  usdValue: number;
}

interface ChainActivityRow {
  lastSeenAt?: string;
  portfolioUsd?: number;
  nativeBalance?: string;
  nativeSymbol?: string;
  assetCount?: number;
}

function parseChainActivity(raw: unknown): Array<{ chainKey: string } & ChainActivityRow> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, ChainActivityRow>)
    .map(([chainKey, row]) => ({ chainKey, ...row }))
    .sort((a, b) => (b.portfolioUsd ?? 0) - (a.portfolioUsd ?? 0));
}

function groupBalancesByChain(balances: TokenBalance[]): Map<string, TokenBalance[]> {
  const map = new Map<string, TokenBalance[]>();
  for (const b of balances) {
    const list = map.get(b.chainKey) ?? [];
    list.push(b);
    map.set(b.chainKey, list);
  }
  return map;
}

function parseBalances(raw: unknown): TokenBalance[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((b): b is TokenBalance => Boolean(b && typeof b === "object" && "symbol" in b));
}

function mergeChainViews(
  chainActivity: Array<{ chainKey: string } & ChainActivityRow>,
  balancesByChain: Map<string, TokenBalance[]>,
): Array<{
  chainKey: string;
  chainUsd: number;
  balances: TokenBalance[];
  activity?: ChainActivityRow;
}> {
  const keys = new Set<string>([
    ...chainActivity.map((r) => r.chainKey),
    ...balancesByChain.keys(),
  ]);
  return [...keys]
    .map((chainKey) => {
      const activity = chainActivity.find((r) => r.chainKey === chainKey);
      const chainBalances = balancesByChain.get(chainKey) ?? [];
      const chainUsd =
        chainBalances.length > 0
          ? chainBalances.reduce((s, b) => s + b.usdValue, 0)
          : (activity?.portfolioUsd ?? 0);
      return { chainKey, chainUsd, balances: chainBalances, activity };
    })
    .sort((a, b) => b.chainUsd - a.chainUsd);
}

type WalletRow = Awaited<ReturnType<typeof api.adminConnectedWallets>>["wallets"][number];

function WalletRow({
  wallet,
  onDelete,
  deleting,
}: {
  wallet: WalletRow;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const balances = parseBalances(wallet.balancesJson);
  const chainActivity = parseChainActivity(wallet.chainActivityJson);
  const balancesByChain = groupBalancesByChain(balances);
  const chainHoldings = mergeChainViews(chainActivity, balancesByChain);
  const chain = wallet.lastChainKey ? getChainByKey(wallet.lastChainKey) : undefined;
  const chainsSeen = chainHoldings.length;

  return (
    <>
      <tr className="border-b border-white/40 last:border-0">
        <td data-wide="title" data-label="Wallet">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={(open ? "Hide" : "Show") + " wallet details"}
            className="inline-flex min-h-10 items-center gap-2 text-left"
          >
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <AdminUserIdentity address={wallet.address} profile={wallet.profile} />
          </button>
          <AdminSocialLinks profile={wallet.profile} />
        </td>
        <td data-label="Connection">
          <span className="text-sm font-semibold">
            {wallet.walletApp ?? wallet.connectorName ?? "Unknown wallet app"}
          </span>
          <span className="mt-1 block text-xs text-ink-muted">
            {chain?.name ?? wallet.lastChainKey ?? wallet.chainKind.toUpperCase()}
            {chainsSeen > 1 ? ` · +${chainsSeen - 1} networks` : ""}
          </span>
        </td>
        <td data-label="Holdings">
          <strong className="tabular-nums">{formatUsd(wallet.portfolioUsd)}</strong>
          <span className="mt-1 block text-xs text-ink-muted">
            {wallet.nativeBalance
              ? `${Number(wallet.nativeBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${wallet.nativeSymbol ?? ""}`
              : "—"}
          </span>
        </td>
        <td data-label="Activity">
          <span className="text-sm">{wallet.connectCount} sessions</span>
          <span className="mt-1 block text-xs text-ink-muted">
            {timeAgo(wallet.lastConnectedAt)}
          </span>
        </td>
        <td data-label="Actions">
          <GlassButton
            size="sm"
            variant="ghost"
            disabled={deleting}
            aria-label="Remove connected wallet record"
            onClick={() => {
              if (
                window.confirm(
                  `Remove tracking record for ${wallet.address}? This does not disconnect their wallet.`,
                )
              ) {
                onDelete(wallet.id);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-danger" />
            Remove
          </GlassButton>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-white/30 bg-white/20">
          <td colSpan={5} className="px-4 py-3">
            <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">
                  Full address
                </dt>
                <dd className="mt-0.5 break-all font-mono">{wallet.address}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">
                  Display name
                </dt>
                <dd className="mt-0.5">{wallet.profile?.displayName ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">Connector</dt>
                <dd className="mt-0.5">
                  {wallet.connectorName ?? "—"}
                  {wallet.connectorId ? ` (${wallet.connectorId})` : ""}
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">IP</dt>
                <dd className="mt-0.5 font-mono">{wallet.lastIp ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">Page</dt>
                <dd className="mt-0.5 break-all">{wallet.pagePath ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="font-semibold uppercase tracking-wide text-ink-muted">User agent</dt>
                <dd className="mt-0.5 break-all text-ink-muted">{wallet.userAgent ?? "—"}</dd>
              </div>
            </dl>
            {chainHoldings.length > 0 && (
              <div className="mt-3 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Holdings by chain
                </p>
                {chainHoldings.map(
                  ({ chainKey: ck, chainUsd, balances: chainBalances, activity }) => {
                    const c = getChainByKey(ck);
                    return (
                      <div key={ck}>
                        <p className="text-xs font-semibold text-ink">
                          {c?.name ?? ck}{" "}
                          <span className="font-normal text-ink-muted">
                            ({formatUsd(chainUsd)})
                          </span>
                          {activity?.nativeBalance ? (
                            <span className="ml-2 font-normal text-ink-muted">
                              ·{" "}
                              {Number(activity.nativeBalance).toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                              })}{" "}
                              {activity.nativeSymbol ?? c?.nativeSymbol ?? ""}
                            </span>
                          ) : null}
                        </p>
                        {chainBalances.length > 0 ? (
                          <ul className="mt-1 flex flex-wrap gap-2">
                            {chainBalances.slice(0, 8).map((b) => (
                              <li
                                key={`${ck}-${b.symbol}-${b.balanceFormatted}`}
                                className="rounded-lg bg-white/60 px-2.5 py-1 text-xs ring-1 ring-black/5"
                              >
                                <span className="font-semibold">{b.symbol}</span>{" "}
                                <span className="text-ink-muted">{b.balanceFormatted}</span>{" "}
                                <span className="text-gold-deep">({formatUsd(b.usdValue)})</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-xs text-ink-muted">No tracked token balances</p>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function ConnectedWalletsPanel() {
  const adminReady = useAdminReady();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [chainKind, setChainKind] = useState("");
  const [lastChainKey, setLastChainKey] = useState("");
  const [walletApp, setWalletApp] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const refreshRef = useRef(false);
  const deferredSearch = useDeferredValue(search.trim());

  const filters = {
    page,
    q: deferredSearch || undefined,
    chainKind: chainKind || undefined,
    lastChainKey: lastChainKey || undefined,
    walletApp: walletApp.trim() || undefined,
    refresh: refreshRef.current,
  };

  const query = useQuery({
    queryKey: ["admin-connected-wallets", filters],
    enabled: adminReady,
    retry: 1,
    queryFn: () => api.adminConnectedWallets(filters),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.adminDeleteConnectedWallet(id),
    onSuccess: () => {
      toast.success("Connected wallet record removed");
      void queryClient.invalidateQueries({ queryKey: ["admin-connected-wallets"] });
    },
    onError: (err) => toast.error("Delete failed", { description: (err as Error).message }),
  });

  const clearFilters = () => {
    setSearch("");
    setChainKind("");
    setLastChainKey("");
    setWalletApp("");
    setPage(1);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    refreshRef.current = true;
    void query.refetch().finally(() => {
      refreshRef.current = false;
      setRefreshing(false);
    });
  };

  const evmChains = CHAINS.filter((c) => c.kind === "evm");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">
          Search and filter every connected wallet — profile, socials, balances, IP, sessions.
        </p>
        <GlassButton size="sm" variant="ghost" loading={refreshing} onClick={handleRefresh}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh balances
        </GlassButton>
      </div>

      <AdminFilterBar
        active={Boolean(search || chainKind || lastChainKey || walletApp)}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onClear={clearFilters}
        placeholder="Address, name, wallet app, IP, Twitter, Telegram…"
      >
        <AdminFilter label="Wallet type">
          <select
            value={chainKind}
            onChange={(e) => {
              setChainKind(e.target.value);
              setPage(1);
            }}
            className="admin-control glass-field"
            aria-label="Filter by type"
          >
            <option value="">All types</option>
            <option value="evm">EVM</option>
            <option value="solana">Solana</option>
          </select>
        </AdminFilter>
        <AdminFilter label="Last network">
          <select
            value={lastChainKey}
            onChange={(e) => {
              setLastChainKey(e.target.value);
              setPage(1);
            }}
            className="admin-control glass-field"
            aria-label="Filter by chain"
          >
            <option value="">All chains</option>
            {evmChains.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
            <option value="solana">Solana</option>
          </select>
        </AdminFilter>
        <AdminFilter label="Wallet app">
          <input
            value={walletApp}
            onChange={(e) => {
              setWalletApp(e.target.value);
              setPage(1);
            }}
            placeholder="Wallet app"
            className="admin-control glass-field"
            aria-label="Filter by wallet app"
          />
        </AdminFilter>
      </AdminFilterBar>

      <AdminQueryShell query={query} skeletonClass="h-72 w-full">
        {(data) => {
          const wallets = data.wallets ?? [];
          const total = data.total ?? 0;

          if (wallets.length === 0) {
            return (
              <GlassCard className="flex items-center gap-3 py-10 text-sm text-ink-muted">
                <BrandGlyph src={BRAND_NAV_ICONS.wallet} size={20} />
                No connected wallets match your filters.
              </GlassCard>
            );
          }

          return (
            <GlassCard variant="strong" padding="sm" className="overflow-x-auto">
              <h2 className="admin-title px-3 pb-3">Wallet directory</h2>
              <table className="admin-records" aria-label="Wallet directory">
                <thead>
                  <tr>
                    {["Wallet", "Connection", "Holdings", "Activity", "Actions"].map((label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((wallet) => (
                    <WalletRow
                      key={wallet.id}
                      wallet={wallet}
                      deleting={remove.isPending}
                      onDelete={(id) => remove.mutate(id)}
                    />
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-xs text-ink-muted">{total.toLocaleString()} connected wallets</p>
                <div className="flex gap-2">
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Prev
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    disabled={page * 50 >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          );
        }}
      </AdminQueryShell>
    </div>
  );
}

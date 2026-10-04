"use client";

/**
 * WalletDashboard — portfolio balances + history for connected and watched addresses.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  KeyRound,
  Repeat,
  Rocket,
  Search,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import {
  formatUsd,
  getChainByKey,
  getChainLogoUrl,
  getTokenLogoUrl,
  shortenAddress,
  timeAgo,
} from "@xauconnect/utils";
import {
  Badge,
  ChainIcon,
  GlassCard,
  GlassInput,
  Skeleton,
  StatCard,
  TokenIcon,
  cn,
} from "@xauconnect/ui";
import { api } from "@/lib/api";
import { BrandMark } from "@/components/brand-logo";
import { ChainSelector } from "@/components/chain-selector";
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button";
import { MobileWalletBanner } from "@/components/wallet/mobile-wallet-banner";
import { SolanaConnectHint } from "@/components/wallet/solana-connect-hint";
import { useChainStore } from "@/lib/store";
import { isWatchableAddress, addressKind } from "@/lib/wallet-address";

export function WalletDashboard() {
  const chainKey = useChainStore((s) => s.chainKey);
  const { address: evmConnected } = useAccount();
  const solana = useSolanaWallet();
  const solConnected = solana.publicKey?.toBase58();

  const [watchInput, setWatchInput] = useState("");
  const [watchAddress, setWatchAddress] = useState<string | null>(null);
  const [watchError, setWatchError] = useState<string | null>(null);

  const address = watchAddress ?? evmConnected ?? solConnected ?? null;
  const addressSource = watchAddress ? "watch" : evmConnected ? "wallet" : solConnected ? "solana" : null;

  const balancesQuery = useQuery({
    queryKey: ["balances", address],
    enabled: Boolean(address),
    refetchInterval: 30_000,
    queryFn: () => api.walletBalances(address!),
  });
  const historyQuery = useQuery({
    queryKey: ["history", address],
    enabled: Boolean(address),
    queryFn: () => api.walletHistory(address!),
  });

  const balances = balancesQuery.data?.balances ?? [];
  const history = historyQuery.data?.history ?? [];
  const computedTotalUsd = useMemo(
    () => balances.reduce((sum, b) => sum + b.usdValue, 0),
    [balances],
  );
  const totalUsd = balancesQuery.data?.portfolioUsd ?? computedTotalUsd;
  const chainsWithBalance = useMemo(
    () => new Set(balances.filter((b) => BigInt(b.balance) > 0n).map((b) => b.chainKey)).size,
    [balances],
  );
  const balancesByChain = useMemo(() => {
    const map = new Map<string, typeof balances>();
    for (const b of balances) {
      const list = map.get(b.chainKey) ?? [];
      list.push(b);
      map.set(b.chainKey, list);
    }
    return [...map.entries()].sort(
      (a, b) =>
        b[1].reduce((s, t) => s + t.usdValue, 0) - a[1].reduce((s, t) => s + t.usdValue, 0),
    );
  }, [balances]);

  if (!address) {
    return (
      <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
        <MobileWalletBanner />
        <GlassCard variant="strong" padding="lg" className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 py-6 text-center sm:gap-5 sm:py-10">
          <BrandMark size={48} className="rounded-xl sm:h-14 sm:w-14" />
          <div className="min-w-0 px-1">
            <p className="font-display text-base font-bold sm:text-lg">Connect a wallet to see your portfolio</p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-ink-muted sm:text-sm">
              One connect covers Ethereum, Polygon, BSC, Base, and more. Solana uses a separate
              connect (Phantom, Solflare, Trust) — you can hold both in the same app.
            </p>
          </div>
          <div className="w-full min-w-0 max-w-md space-y-3 px-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted sm:text-xs">
              Connect once — all networks + Solana
            </p>
            <ChainSelector layout="wrap" />
            <SolanaConnectHint chainKey={chainKey} />
            <WalletConnectButton className="w-full justify-center" />
          </div>
          <form
            className="flex w-full min-w-0 max-w-md flex-col gap-2 px-1 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              const v = watchInput.trim();
              if (!isWatchableAddress(v)) {
                setWatchError("Enter a valid 0x… or Solana base58 address.");
                return;
              }
              setWatchError(null);
              setWatchAddress(v);
            }}
          >
            <GlassInput
              placeholder="0x… or Solana address"
              value={watchInput}
              onChange={(e) => {
                setWatchInput(e.target.value);
                setWatchError(null);
              }}
              aria-invalid={Boolean(watchError)}
              className="min-w-0"
            />
            <button
              type="submit"
              className="glass flex shrink-0 items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-semibold text-ink-soft hover:shadow-glass-lg sm:w-auto"
            >
              <Search className="h-4 w-4" /> Watch
            </button>
          </form>
          {watchError ? <p className="px-1 text-xs text-danger sm:text-sm">{watchError}</p> : null}
        </GlassCard>
      </div>
    );
  }

  const kind = addressKind(address);

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
      <MobileWalletBanner />

      <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge tone="gold">
            {addressSource === "watch" ? (
              <>
                <Eye className="mr-1 inline h-3 w-3" /> watching
              </>
            ) : addressSource === "solana" ? (
              "Solana connected"
            ) : (
              "Wallet connected"
            )}
          </Badge>
          <span className="font-mono text-xs font-semibold sm:text-sm">{shortenAddress(address, 6)}</span>
          {kind === "solana" && (
            <span className="w-full text-[11px] text-ink-muted sm:w-auto sm:text-xs">
              Solana · balances via RPC / indexer
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2 sm:ml-auto">
          {watchAddress && (
            <button
              type="button"
              onClick={() => setWatchAddress(null)}
              className="text-xs font-semibold text-ink-muted underline-offset-2 hover:underline"
            >
              stop watching
            </button>
          )}
          {!watchAddress && <WalletConnectButton compact className="max-w-full" />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatCard
          label="Portfolio value"
          value={totalUsd}
          format={formatUsd}
          icon={<Wallet className="h-4 w-4" />}
          className="col-span-2 sm:col-span-1"
        />
        <StatCard label="Chains" value={chainsWithBalance} />
        <StatCard label="Assets" value={balances.length} />
      </div>

      <section className="min-w-0">
        <h2 className="mb-2 font-display text-base font-bold sm:mb-3 sm:text-lg">Balances</h2>
        {balancesQuery.isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full sm:h-20" />
            ))}
          </div>
        ) : balances.length === 0 ? (
          <GlassCard className="py-6 text-center text-xs text-ink-muted sm:py-8 sm:text-sm">
            {kind === "solana"
              ? "No cross-chain token balances indexed for this Solana address — activity may still appear below."
              : "No balances returned for this address yet."}
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-4 sm:gap-5">
            {balancesByChain.map(([chainKey, chainBalances]) => {
              const chain = getChainByKey(chainKey);
              const chainUsd = chainBalances.reduce((s, b) => s + b.usdValue, 0);
              return (
                <div key={chainKey} className="min-w-0">
                  <div className="mb-2 flex min-w-0 items-center gap-2">
                    <ChainIcon
                      name={chain?.name ?? chainKey}
                      src={getChainLogoUrl(chainKey)}
                      color={chain?.color}
                      size={18}
                    />
                    <h3 className="truncate font-display text-sm font-bold sm:text-base">
                      {chain?.name ?? chainKey}
                    </h3>
                    <span className="ml-auto shrink-0 text-xs text-ink-muted sm:text-sm">
                      {formatUsd(chainUsd)}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                    {chainBalances.map((b) => (
                      <GlassCard
                        key={`${b.chainKey}-${b.address}`}
                        hover
                        className="flex min-w-0 items-center gap-2.5 p-3 sm:gap-3 sm:p-4"
                      >
                        <TokenIcon
                          symbol={b.symbol}
                          src={getTokenLogoUrl({ chainKey: b.chainKey, address: b.address })}
                          size={36}
                          className="shrink-0 sm:h-10 sm:w-10"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold sm:text-base">{b.symbol}</span>
                          <span className="block truncate text-[11px] text-ink-muted sm:text-xs">{b.name}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-mono text-xs font-semibold sm:text-sm">
                            {b.balanceFormatted}
                          </span>
                          <span className="block text-[11px] text-ink-muted sm:text-xs">
                            {formatUsd(b.usdValue)}
                          </span>
                        </span>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="min-w-0">
        <h2 className="mb-2 font-display text-base font-bold sm:mb-3 sm:text-lg">Activity</h2>
        <GlassCard padding="sm" className="min-w-0 overflow-hidden">
          {historyQuery.isLoading && <Skeleton className="h-32 w-full sm:h-40" />}
          <ul className="divide-y divide-white/50">
            {history.map((tx) => {
              const chain = getChainByKey(tx.chainKey);
              const Icon =
                tx.kind === "swap"
                  ? Repeat
                  : tx.kind === "launch"
                    ? Rocket
                    : tx.kind === "receive"
                      ? ArrowDownLeft
                      : ArrowUpRight;
              return (
                <li key={tx.id} className="flex min-w-0 items-center gap-2.5 px-2 py-2.5 sm:gap-3 sm:px-2 sm:py-3">
                  <span className="glass flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9">
                    <Icon className="h-3.5 w-3.5 text-gold-deep sm:h-4 sm:w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold capitalize sm:text-sm">
                      {tx.kind}
                    </span>
                    <span className="block truncate text-[11px] text-ink-muted sm:text-xs">
                      {chain?.name ?? tx.chainKey} · {timeAgo(tx.timestamp)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={cn(
                        "block font-mono text-xs font-semibold sm:text-sm",
                        tx.kind === "receive" ? "text-success" : "text-ink",
                      )}
                    >
                      {tx.amount} {tx.symbol}
                    </span>
                    <span className="block text-[11px] text-ink-muted sm:text-xs">{formatUsd(tx.usdValue)}</span>
                  </span>
                </li>
              );
            })}
            {!historyQuery.isLoading && history.length === 0 && (
              <li className="px-2 py-6 text-center text-xs text-ink-muted sm:py-8 sm:text-sm">
                No activity yet.
              </li>
            )}
          </ul>
        </GlassCard>
      </section>

      <GlassCard variant="gradient" className="flex min-w-0 flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gold-gradient shadow-gold-glow sm:h-11 sm:w-11">
          <KeyRound className="h-4 w-4 text-ink sm:h-5 sm:w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-xs font-bold sm:text-sm">
            Embedded XAU Wallet <Badge tone="gold">coming soon</Badge>
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted sm:text-xs">
            Self-custodial multi-chain wallet inside XAUConnect — seed phrase generation and one-tap
            signing. Audit-gated before release.
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-ink-muted sm:text-xs">
          <ShieldAlert className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> audit-gated
        </span>
      </GlassCard>
    </div>
  );
}

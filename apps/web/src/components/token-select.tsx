"use client";

/**
 * TokenSelect — catalog-backed picker with chain tabs, balances, and search.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2, Search } from "lucide-react";
import {
  CHAINS,
  catalogTokenKey,
  getChainByKey,
  getChainLogoUrl,
  getTokenLogoUrl,
  looksLikeTokenAddress,
  shortenAddress,
  tokenAddressEq,
  type TokenInfo,
} from "@xauconnect/utils";
import { ChainIcon, GlassDialog, TokenIcon, cn } from "@xauconnect/ui";
import { api } from "@/lib/api";

const PAGE_SIZE = 50;
const ALL_CHAINS = "all";

export interface TokenSelectProps {
  chainKey?: string;
  allowAllChains?: boolean;
  value: TokenInfo | null;
  onChange: (token: TokenInfo) => void;
  exclude?: { chainKey: string; address: string };
  walletAddress?: string;
  showBalances?: boolean;
  label?: string;
}

function useDebounced(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function TokenSelect({
  chainKey: defaultChainKey,
  allowAllChains = false,
  value,
  onChange,
  exclude,
  walletAddress,
  showBalances = true,
  label,
}: TokenSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filterChain, setFilterChain] = useState(
    allowAllChains ? ALL_CHAINS : (defaultChainKey ?? ALL_CHAINS),
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounced(query, 300);

  useEffect(() => {
    if (allowAllChains) return;
    if (defaultChainKey) setFilterChain(defaultChainKey);
  }, [defaultChainKey, allowAllChains]);

  useEffect(() => {
    if (open && allowAllChains) setFilterChain(ALL_CHAINS);
  }, [open, allowAllChains]);

  useEffect(() => {
    if (!open) return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (finePointer) searchRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const apiChainKey =
    filterChain === ALL_CHAINS ? "all" : filterChain;

  const tokensQuery = useInfiniteQuery({
    queryKey: ["swap-tokens", apiChainKey, debouncedQuery.trim()],
    queryFn: ({ pageParam = 0 }) =>
      api.searchTokens({
        chainKey: apiChainKey === "all" ? undefined : apiChainKey,
        search: debouncedQuery.trim() || undefined,
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.hasMore ? pages.length * PAGE_SIZE : undefined,
    staleTime: 120_000,
    enabled: open,
  });

  const flatTokens = useMemo(() => {
    const map = new Map<string, TokenInfo>();
    for (const page of tokensQuery.data?.pages ?? []) {
      for (const token of page.tokens) {
        if (
          exclude &&
          token.chainKey === exclude.chainKey &&
          tokenAddressEq(token.chainKey, token.address, exclude.address)
        ) {
          continue;
        }
        map.set(catalogTokenKey(token.chainKey, token.address), token);
      }
    }
    return [...map.values()];
  }, [tokensQuery.data, exclude]);

  /** Full portfolio scan — all non-zero balances across chains (not limited to catalog page). */
  const portfolioQuery = useQuery({
    queryKey: ["token-select-portfolio", walletAddress],
    queryFn: () => api.walletBalances(walletAddress!),
    enabled: open && showBalances && Boolean(walletAddress),
    staleTime: 20_000,
  });

  const balancesQuery = useQuery({
    queryKey: [
      "token-select-balances",
      walletAddress,
      filterChain,
      flatTokens.map((t) => catalogTokenKey(t.chainKey, t.address)).join(","),
    ],
    queryFn: () =>
      api.walletTokenBalances(
        walletAddress!,
        flatTokens.map((t) => t.address),
        filterChain === ALL_CHAINS ? "all" : filterChain,
      ),
    enabled:
      open &&
      showBalances &&
      Boolean(walletAddress) &&
      flatTokens.length > 0 &&
      filterChain !== ALL_CHAINS,
    staleTime: 20_000,
  });

  const balanceMap = useMemo(() => {
    const map: Record<string, { balance: string; balanceFormatted: string }> = {};
    for (const b of portfolioQuery.data?.balances ?? []) {
      map[catalogTokenKey(b.chainKey, b.address)] = {
        balance: b.balance,
        balanceFormatted: b.balanceFormatted,
      };
    }
    for (const [key, row] of Object.entries(balancesQuery.data?.balances ?? {})) {
      map[key] ??= row;
    }
    return map;
  }, [portfolioQuery.data?.balances, balancesQuery.data?.balances]);

  const walletTokens = useMemo(() => {
    if (!walletAddress || !portfolioQuery.data) return [];
    return portfolioQuery.data.balances
      .filter((b) => {
        if (BigInt(b.balance) <= 0n) return false;
        if (filterChain !== ALL_CHAINS && b.chainKey !== filterChain) return false;
        if (
          exclude &&
          b.chainKey === exclude.chainKey &&
          tokenAddressEq(b.chainKey, b.address, exclude.address)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.usdValue - a.usdValue)
      .map(
        (b): TokenInfo => ({
          chainKey: b.chainKey,
          address: b.address,
          symbol: b.symbol,
          name: b.name,
          decimals: b.decimals,
        }),
      );
  }, [walletAddress, portfolioQuery.data, filterChain, exclude]);

  const popularTokens = useMemo(() => {
    const walletSet = new Set(walletTokens.map((t) => catalogTokenKey(t.chainKey, t.address)));
    return flatTokens
      .filter((t) => !walletSet.has(catalogTokenKey(t.chainKey, t.address)))
      .sort((a, b) => {
        const aBtc = a.tags?.includes("btc") ? 0 : 1;
        const bBtc = b.tags?.includes("btc") ? 0 : 1;
        if (aBtc !== bBtc) return aBtc - bBtc;
        return (a.marketCapRank ?? 999_999) - (b.marketCapRank ?? 999_999);
      })
      .slice(0, 20);
  }, [flatTokens, walletTokens]);

  const groupedByChain = useMemo(() => {
    if (filterChain !== ALL_CHAINS) return null;
    const groups = new Map<string, TokenInfo[]>();
    for (const t of flatTokens) {
      const list = groups.get(t.chainKey) ?? [];
      list.push(t);
      groups.set(t.chainKey, list);
    }
    return groups;
  }, [flatTokens, filterChain]);

  const addressCandidate =
    defaultChainKey && looksLikeTokenAddress(defaultChainKey, debouncedQuery.trim())
      ? debouncedQuery.trim()
      : filterChain !== ALL_CHAINS && looksLikeTokenAddress(filterChain, debouncedQuery.trim())
        ? debouncedQuery.trim()
        : "";

  const resolveQuery = useQuery({
    queryKey: ["token-select-resolve", filterChain, addressCandidate],
    queryFn: () => {
      const ck = filterChain === ALL_CHAINS ? (defaultChainKey ?? "ethereum") : filterChain;
      return api.tokenDetail(ck, addressCandidate).then((r) => ({
        ...r.token,
        chainKey: ck,
        decimals: ck === "solana" ? 6 : 18,
      }));
    },
    enabled: open && addressCandidate.length > 0 && flatTokens.length === 0,
    retry: 1,
  });

  function renderRow(token: TokenInfo) {
    const bKey = catalogTokenKey(token.chainKey, token.address);
    const bal = balanceMap[bKey]?.balanceFormatted;
    const chain = getChainByKey(token.chainKey);

    return (
      <li key={bKey}>
        <button
          type="button"
          onClick={() => {
            onChange(token);
            setOpen(false);
            setQuery("");
          }}
          className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-gold/10 active:bg-gold/15 sm:min-h-0 sm:py-2.5"
        >
          <span className="relative shrink-0">
            <TokenIcon symbol={token.symbol} src={getTokenLogoUrl(token)} size={32} />
            {chain && (
              <span className="absolute -bottom-0.5 -right-0.5">
                <ChainIcon
                  badge
                  name={chain.name}
                  src={getChainLogoUrl(chain.key)}
                  color={chain.color}
                  size={14}
                />
              </span>
            )}
          </span>
          <span className="min-w-0 flex flex-1 flex-col">
            <span className="flex items-center gap-1.5">
              <span className="text-sm font-bold">{token.symbol}</span>
              {chain && filterChain === ALL_CHAINS && (
                <span className="text-[10px] font-medium text-ink-muted">{chain.name}</span>
              )}
            </span>
            <span className="truncate text-xs text-ink-muted">{token.name}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-0.5">
            {showBalances && walletAddress && bal && (
              <span className="text-xs font-semibold tabular-nums text-ink">{bal}</span>
            )}
            <span className="hidden text-[10px] text-ink-faint sm:inline">
              {shortenAddress(token.address)}
            </span>
          </span>
        </button>
      </li>
    );
  }

  function renderSection(title: string, tokens: TokenInfo[]) {
    if (!tokens.length) return null;
    return (
      <>
        <li className="sticky top-0 z-10 bg-white/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted backdrop-blur-sm">
          {title}
        </li>
        {tokens.map(renderRow)}
      </>
    );
  }

  const valueChain = value ? getChainByKey(value.chainKey) : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl px-2.5 py-2 transition-all sm:min-h-0 sm:gap-2 sm:px-3",
          "glass hover:shadow-glass-lg",
        )}
        aria-label={label ?? "Select token"}
      >
        {value ? (
          <>
            <span className="relative shrink-0">
              <TokenIcon symbol={value.symbol} src={getTokenLogoUrl(value)} size={24} />
              {valueChain && (
                <span className="absolute -bottom-0.5 -right-0.5">
                  <ChainIcon
                    badge
                    name={valueChain.name}
                    src={getChainLogoUrl(valueChain.key)}
                    color={valueChain.color}
                    size={12}
                  />
                </span>
              )}
            </span>
            <span className="max-w-[4.5rem] truncate text-sm font-bold sm:max-w-none">{value.symbol}</span>
          </>
        ) : (
          <span className="text-sm font-semibold text-ink-muted">Select token</span>
        )}
        <ChevronDown className="h-4 w-4 text-ink-muted" />
      </button>

      <GlassDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Select a token"
        scrollBody={false}
        className="min-h-[min(70dvh,520px)] sm:min-h-0"
      >
        <div className="thin-scroll flex shrink-0 gap-1 overflow-x-auto pb-1">
          {allowAllChains && (
            <button
              type="button"
              onClick={() => setFilterChain(ALL_CHAINS)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition",
                filterChain === ALL_CHAINS ? "bg-gold text-white" : "bg-white/60 text-ink-muted hover:bg-gold/15",
              )}
            >
              All chains
            </button>
          )}
          {CHAINS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilterChain(c.key)}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition",
                filterChain === c.key ? "bg-gold text-white" : "bg-white/60 text-ink-muted hover:bg-gold/15",
              )}
            >
              <ChainIcon
                name={c.name}
                src={getChainLogoUrl(c.key)}
                color={c.color}
                size={14}
              />
              <span className="hidden sm:inline">{c.name}</span>
            </button>
          ))}
        </div>

        <div className="relative mt-2 shrink-0">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            ref={searchRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, symbol, or paste address"
            className="glass-field h-11 w-full rounded-2xl pl-10 pr-4 text-base text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-gold/50 sm:text-sm"
          />
        </div>

        <ul
          className="thin-scroll mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain sm:max-h-80"
          role="listbox"
        >
          {tokensQuery.isLoading && (
            <li className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading tokens…
            </li>
          )}

          {portfolioQuery.isLoading && walletAddress && showBalances && (
            <li className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading wallet balances…
            </li>
          )}

          {renderSection(
            filterChain === ALL_CHAINS ? "Your tokens · all chains" : "Your tokens",
            walletTokens,
          )}
          {renderSection("Popular", popularTokens)}

          {groupedByChain
            ? CHAINS.map((c) => {
                const list = groupedByChain.get(c.key) ?? [];
                const filtered = list.filter(
                  (t) =>
                    !walletTokens.some(
                      (w) => catalogTokenKey(w.chainKey, w.address) === catalogTokenKey(t.chainKey, t.address),
                    ) &&
                    !popularTokens.some(
                      (p) => catalogTokenKey(p.chainKey, p.address) === catalogTokenKey(t.chainKey, t.address),
                    ),
                );
                return renderSection(c.name, filtered);
              })
            : flatTokens
                .filter(
                  (t) =>
                    !walletTokens.some(
                      (w) => catalogTokenKey(w.chainKey, w.address) === catalogTokenKey(t.chainKey, t.address),
                    ) &&
                    !popularTokens.some(
                      (p) => catalogTokenKey(p.chainKey, p.address) === catalogTokenKey(t.chainKey, t.address),
                    ),
                )
                .map(renderRow)}

          {tokensQuery.hasNextPage && (
            <li className="py-2 text-center">
              <button
                type="button"
                onClick={() => void tokensQuery.fetchNextPage()}
                disabled={tokensQuery.isFetchingNextPage}
                className="text-xs font-semibold text-gold hover:underline disabled:opacity-50"
              >
                {tokensQuery.isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            </li>
          )}

          {resolveQuery.isFetching && (
            <li className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Looking up token…
            </li>
          )}

          {!tokensQuery.isLoading && flatTokens.length === 0 && !resolveQuery.isFetching && (
            <li className="px-3 py-6 text-center text-sm text-ink-muted">No tokens found</li>
          )}

          {resolveQuery.data && flatTokens.length === 0 && (
            <li>{renderRow(resolveQuery.data as TokenInfo)}</li>
          )}
        </ul>
      </GlassDialog>
    </>
  );
}

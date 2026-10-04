"use client";

/**
 * BuySellPanel — fiat on-ramp / off-ramp (Buy & Sell crypto).
 *
 * Our own Liquid-Glass quote experience (auto country + currency, live rates,
 * payment-method selection, transparent fees incl. our partner markup) that
 * hands off to the Onramper aggregator's PCI-compliant hosted checkout for the
 * actual card / Apple Pay / Google Pay / bank payment + KYC. XAUConnect never
 * touches card data or custodies fiat.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownUp, CreditCard, Info, Landmark, ShieldCheck, Wallet } from "lucide-react";
import {
  ONRAMP_NETWORK_BY_CHAIN,
  BRAND_NAV_ICONS,
  type OnrampAsset,
  type OnrampType,
} from "@xauconnect/utils";
import { GlassButton, GlassCard, GlassDialog, Skeleton, toast, cn } from "@xauconnect/ui";
import { api } from "@/lib/api";
import { userFacingError } from "@/lib/user-errors";
import { useWalletConnections } from "@/hooks/use-active-wallet";
import { useRequestWalletConnect } from "@/components/wallet/wallet-connect-button";

const POPULAR_FIATS = ["USD", "EUR", "GBP", "INR", "AUD", "CAD", "SGD", "AED", "BRL", "NGN", "JPY", "ZAR"];
const POPULAR_CRYPTO_IDS = ["btc", "eth", "usdt", "usdc", "sol", "bnb", "matic", "pol", "avax", "xrp"];

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function fmtFiat(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function fmtCrypto(amount: number): string {
  if (!Number.isFinite(amount)) return "0";
  if (amount >= 1) return amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return amount.toLocaleString(undefined, { maximumSignificantDigits: 6 });
}

function paymentIcon(id: string) {
  if (id.includes("apple")) return "";
  if (id.includes("bank") || id.includes("sepa") || id.includes("ach") || id.includes("pix"))
    return <Landmark className="h-3.5 w-3.5" />;
  return <CreditCard className="h-3.5 w-3.5" />;
}

function paymentLabel(id: string, name?: string): string {
  if (name) return name;
  const map: Record<string, string> = {
    creditcard: "Credit card",
    debitcard: "Debit card",
    applepay: "Apple Pay",
    googlepay: "Google Pay",
    sepabanktransfer: "SEPA transfer",
    sepainstant: "SEPA Instant",
    banktransfer: "Bank transfer",
    ach: "ACH",
    pix: "Pix",
  };
  return map[id] ?? id;
}

export interface BuySellPanelProps {
  /** "buy" | "sell" initial tab. */
  initialType?: OnrampType;
  /** Preselect a crypto (Onramper id, e.g. "eth"). */
  presetCrypto?: string;
  /** Preselect a fiat code (e.g. "USD"). */
  presetFiat?: string;
}

export function BuySellPanel({ initialType = "buy", presetCrypto, presetFiat }: BuySellPanelProps) {
  const { evmAddress, solAddress } = useWalletConnections();
  const requestConnect = useRequestWalletConnect();

  const [type, setType] = useState<OnrampType>(initialType);
  const [fiat, setFiat] = useState(presetFiat?.toUpperCase() ?? "USD");
  const [crypto, setCrypto] = useState(presetCrypto ?? "eth");
  const [amount, setAmount] = useState("100");
  const [country, setCountry] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>(undefined);
  const [walletAddress, setWalletAddress] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [checkout, setCheckout] = useState<{ url: string; redirectType: string } | null>(null);
  const [starting, setStarting] = useState(false);

  // Feature availability.
  const configQuery = useQuery({ queryKey: ["onramp-config"], queryFn: () => api.onrampConfig() });
  const enabled = configQuery.data?.enabled ?? false;

  // Geo → country + currency.
  const geoQuery = useQuery({ queryKey: ["onramp-geo"], queryFn: () => api.onrampGeo() });
  useEffect(() => {
    if (geoQuery.data?.country) setCountry((c) => c ?? geoQuery.data!.country);
    if (!presetFiat && geoQuery.data?.currency) setFiat((f) => (f === "USD" ? geoQuery.data!.currency! : f));
  }, [geoQuery.data, presetFiat]);

  // Country-aware defaults (recommended crypto/amount/method).
  const defaultsQuery = useQuery({
    queryKey: ["onramp-defaults", type, country],
    enabled: enabled,
    queryFn: () => api.onrampDefaults(type, country ?? undefined),
  });
  useEffect(() => {
    const d = defaultsQuery.data;
    if (!d) return;
    if (!presetCrypto) setCrypto((c) => (c === "eth" ? d.crypto : c));
    if (!paymentMethod) setPaymentMethod(d.paymentMethod);
    setAmount((a) => (a === "100" ? String(d.amount) : a));
  }, [defaultsQuery.data, presetCrypto, paymentMethod]);

  // Supported crypto assets (for the picker).
  const assetsQuery = useQuery({
    queryKey: ["onramp-assets", type, fiat, country],
    enabled: enabled,
    staleTime: 5 * 60_000,
    queryFn: () => api.onrampAssets({ type, source: fiat.toLowerCase(), country: country ?? undefined }),
  });
  const cryptoAssets = assetsQuery.data?.crypto ?? [];
  const fiatOptions = useMemo(() => {
    const fromApi = (assetsQuery.data?.fiat ?? []).map((f) => f.code);
    return Array.from(new Set([...POPULAR_FIATS, fiat, ...fromApi])).filter(Boolean);
  }, [assetsQuery.data?.fiat, fiat]);

  const selectedAsset: OnrampAsset | undefined = useMemo(
    () => cryptoAssets.find((a) => a.id === crypto),
    [cryptoAssets, crypto],
  );

  // Prefill destination wallet from the connected wallet on the right chain.
  useEffect(() => {
    if (walletAddress) return;
    const chainKey = selectedAsset?.chainKey;
    const addr = chainKey === "solana" ? solAddress : evmAddress;
    if (addr) setWalletAddress(addr);
  }, [selectedAsset?.chainKey, evmAddress, solAddress, walletAddress]);

  const numericAmount = Number(amount);
  const debouncedAmount = useDebounced(numericAmount, 450);

  const quoteQuery = useQuery({
    queryKey: ["onramp-quote", type, fiat, crypto, debouncedAmount, paymentMethod, country, walletAddress],
    enabled: enabled && debouncedAmount > 0 && Boolean(fiat && crypto),
    refetchInterval: (q) => (q.state.error ? false : 20_000),
    retry: false,
    queryFn: () =>
      api.onrampQuote({
        type,
        fiat,
        crypto,
        amount: debouncedAmount,
        paymentMethod,
        country: country ?? undefined,
        walletAddress: walletAddress || undefined,
      }),
  });
  const best = quoteQuery.data?.best ?? null;
  const paymentMethods = best?.availablePaymentMethods ?? [];

  useEffect(() => {
    if (!paymentMethod && paymentMethods[0]) setPaymentMethod(paymentMethods[0].id);
  }, [paymentMethods, paymentMethod]);

  function flip() {
    setType((t) => (t === "buy" ? "sell" : "buy"));
    setPaymentMethod(undefined);
  }

  async function startCheckout() {
    if (!best) return;
    const chainKey = selectedAsset?.chainKey;
    const needsWallet = type === "buy";
    if (needsWallet && !walletAddress) {
      toast.error("Add a wallet address", {
        description: "Connect a wallet or paste the address that should receive your crypto.",
      });
      requestConnect();
      return;
    }
    setStarting(true);
    try {
      const res = await api.onrampCheckout({
        type,
        provider: best.provider,
        fiat,
        crypto,
        amount: debouncedAmount,
        paymentMethod: paymentMethod ?? best.paymentMethod,
        walletAddress: walletAddress || undefined,
        network: chainKey ? ONRAMP_NETWORK_BY_CHAIN[chainKey] : undefined,
        country: country ?? undefined,
      });
      if (res.redirectType === "iframe") {
        setCheckout({ url: res.url, redirectType: res.redirectType });
      } else {
        window.open(res.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      toast.error("Couldn't start checkout", { description: userFacingError(err) });
    } finally {
      setStarting(false);
    }
  }

  // ── Disabled (not configured) state ──────────────────────────────────────
  if (configQuery.isSuccess && !enabled) {
    return (
      <GlassCard variant="strong" padding="lg" className="flex flex-col items-center gap-4 text-center">
        <img
          src={BRAND_NAV_ICONS.buySell}
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 object-contain drop-shadow-[0_6px_14px_rgba(255,170,0,0.22)]"
        />
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Buy &amp; Sell crypto — launching soon</h2>
          <p className="mt-1.5 text-sm text-ink-muted">
            Card, Apple&nbsp;Pay, Google&nbsp;Pay and bank transfers across 190+ countries are being
            switched on. You&apos;ll be able to buy and cash out crypto directly inside XAUConnect.
          </p>
        </div>
        <GlassButton size="lg" variant="gold" onClick={() => (window.location.href = "/swap")}>
          Swap crypto instead
        </GlassButton>
      </GlassCard>
    );
  }

  const sourceLabel = type === "buy" ? "You pay" : "You sell";
  const destLabel = type === "buy" ? "You receive" : "You receive";

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <GlassCard variant="strong" padding="lg" className="flex min-w-0 flex-col gap-2">
        {/* Buy / Sell toggle */}
        <div className="mb-1 flex rounded-xl bg-white/60 p-1 ring-1 ring-white/70">
          {(["buy", "sell"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setPaymentMethod(undefined);
              }}
              className={cn(
                "flex-1 min-h-11 rounded-lg px-3 py-2.5 text-sm font-semibold capitalize transition-all sm:min-h-0 sm:py-1.5",
                type === t ? "bg-gold-gradient text-ink shadow-gold-glow" : "text-ink-muted hover:text-ink",
              )}
            >
              {t} crypto
            </button>
          ))}
        </div>

        {/* Source: fiat (buy) or crypto (sell) */}
        <div className="gradient-border-soft rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {sourceLabel}
            </label>
            {country && (
              <span className="text-[11px] text-ink-faint">
                Country:{" "}
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="bg-transparent font-semibold text-ink-soft outline-none"
                  aria-label="Country"
                >
                  {[country, "US", "GB", "IN", "AU", "CA", "SG", "AE", "BR", "NG", "ZA", "DE", "FR"]
                    .filter((c, i, arr) => arr.indexOf(c) === i)
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </span>
            )}
          </div>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <input
              inputMode="decimal"
              placeholder="0.0"
              value={amount}
              onChange={(e) => {
                if (/^\d*\.?\d*$/.test(e.target.value)) setAmount(e.target.value);
              }}
              className="min-w-0 flex-1 bg-transparent font-display text-2xl font-bold text-ink outline-none placeholder:text-ink-faint sm:text-3xl"
              aria-label="Amount"
            />
            {type === "buy" ? (
              <select
                value={fiat}
                onChange={(e) => setFiat(e.target.value)}
                className="glass-field shrink-0 rounded-xl px-3 py-2 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-gold/50"
                aria-label="Fiat currency"
              >
                {fiatOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            ) : (
              <CryptoTrigger asset={selectedAsset} code={crypto} onClick={() => setPickerOpen(true)} />
            )}
          </div>
        </div>

        {/* Flip */}
        <div className="relative z-10 -my-4 flex justify-center">
          <button
            onClick={flip}
            className="glass-strong rounded-2xl p-2.5 shadow-glass transition-transform hover:rotate-180 hover:shadow-gold-glow"
            aria-label="Switch buy/sell"
          >
            <ArrowDownUp className="h-4 w-4 text-gold-deep" />
          </button>
        </div>

        {/* Destination */}
        <div className="gradient-border-soft rounded-2xl p-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {destLabel}
          </label>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1 truncate font-display text-2xl font-bold tabular-nums text-ink sm:text-3xl">
              {quoteQuery.isFetching && !best ? (
                <Skeleton className="h-8 w-36 sm:h-9" />
              ) : best ? (
                type === "buy" ? (
                  fmtCrypto(best.cryptoAmount)
                ) : (
                  fmtFiat(best.fiatAmount, fiat)
                )
              ) : (
                <span className="text-ink-faint">0.0</span>
              )}
            </div>
            {type === "buy" ? (
              <CryptoTrigger asset={selectedAsset} code={crypto} onClick={() => setPickerOpen(true)} />
            ) : (
              <select
                value={fiat}
                onChange={(e) => setFiat(e.target.value)}
                className="glass-field shrink-0 rounded-xl px-3 py-2 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-gold/50"
                aria-label="Fiat currency"
              >
                {fiatOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Payment methods */}
        {paymentMethods.length > 0 && (
          <div className="mt-1 flex min-w-0 flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Payment method
            </p>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMethod(pm.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition-colors",
                    paymentMethod === pm.id
                      ? "bg-gold/20 text-ink ring-gold/50"
                      : "glass text-ink-muted ring-white/70 hover:text-ink",
                  )}
                >
                  {paymentIcon(pm.id)}
                  {paymentLabel(pm.id, pm.name)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Destination wallet (buy only) */}
        {type === "buy" && (
          <div className="mt-1 flex flex-col gap-1.5">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              <Wallet className="h-3 w-3" /> Receiving wallet ({selectedAsset?.code ?? crypto.toUpperCase()}
              {selectedAsset?.chainKey ? ` · ${selectedAsset.chainKey}` : ""})
            </p>
            <input
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value.trim())}
              placeholder="Paste your wallet address"
              className="glass-field w-full rounded-xl px-3 py-2.5 font-mono text-xs text-ink outline-none focus:ring-2 focus:ring-gold/50"
              aria-label="Receiving wallet address"
            />
          </div>
        )}

        {/* Fee + rate breakdown */}
        {best && (
          <dl className="mt-2 flex flex-col gap-1.5 rounded-2xl bg-white/45 p-4 text-xs ring-1 ring-white/70">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Rate</dt>
              <dd className="font-semibold">
                1 {best.crypto.toUpperCase()} ≈ {fmtFiat(best.rate ? 1 / best.rate : 0, fiat)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Provider</dt>
              <dd className="font-semibold capitalize">{best.provider}</dd>
            </div>
            {best.partnerFeePct > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-muted">XAUConnect fee ({best.partnerFeePct}%)</dt>
                <dd className="font-semibold">{fmtFiat(best.partnerFeeFiat, fiat)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-muted">Network + processing</dt>
              <dd className="font-semibold">
                {fmtFiat((best.networkFee ?? 0) + (best.transactionFee ?? 0), fiat)}
              </dd>
            </div>
          </dl>
        )}

        {quoteQuery.isError && debouncedAmount > 0 && (
          <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-danger/10 p-3 text-xs text-danger">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {userFacingError(
              quoteQuery.error,
              "No quote for this pair/amount right now. Try a different amount, asset, or payment method.",
            )}
          </p>
        )}

        <GlassButton
          size="lg"
          className="mt-2 w-full"
          variant="gold"
          disabled={starting || !best}
          loading={starting}
          onClick={startCheckout}
        >
          <ShieldCheck className="h-4 w-4" />
          {!best
            ? "Enter an amount"
            : type === "buy"
              ? `Buy ${selectedAsset?.code ?? crypto.toUpperCase()}`
              : `Sell ${selectedAsset?.code ?? crypto.toUpperCase()}`}
        </GlassButton>

        <p className="mt-1 text-center text-[10px] leading-relaxed text-ink-faint">
          Payments, KYC and settlement are processed by regulated payment providers. XAUConnect is
          non-custodial and never stores your card details.
        </p>
      </GlassCard>

      {/* Crypto picker */}
      <GlassDialog open={pickerOpen} onClose={() => setPickerOpen(false)} title={`Select crypto to ${type}`}>
        <CryptoPicker
          assets={cryptoAssets}
          loading={assetsQuery.isLoading}
          onSelect={(a) => {
            setCrypto(a.id);
            setWalletAddress("");
            setPickerOpen(false);
          }}
        />
      </GlassDialog>

      {/* Hosted checkout (iframe hand-off) */}
      <GlassDialog
        open={Boolean(checkout)}
        onClose={() => setCheckout(null)}
        title={type === "buy" ? "Complete your purchase" : "Complete your sale"}
      >
        {checkout && (
          <iframe
            title="Secure checkout"
            src={checkout.url}
            className="h-[640px] max-h-[78vh] w-full rounded-2xl border-0 bg-white"
            allow="accelerometer; autoplay; camera; gyroscope; payment"
          />
        )}
      </GlassDialog>
    </div>
  );
}

function CryptoTrigger({
  asset,
  code,
  onClick,
}: {
  asset?: OnrampAsset;
  code: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-field flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-ink transition-colors hover:bg-gold/10"
    >
      {asset?.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.icon} alt="" className="h-5 w-5 rounded-full" />
      ) : (
        <span className="grid h-5 w-5 place-items-center rounded-full bg-gold/20 text-[10px]">
          {(asset?.code ?? code).slice(0, 1)}
        </span>
      )}
      {asset?.code ?? code.toUpperCase()}
    </button>
  );
}

function CryptoPicker({
  assets,
  loading,
  onSelect,
}: {
  assets: OnrampAsset[];
  loading: boolean;
  onSelect: (a: OnrampAsset) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? assets.filter(
          (a) =>
            a.code.toLowerCase().includes(q) ||
            a.name.toLowerCase().includes(q) ||
            a.id.toLowerCase().includes(q),
        )
      : assets;
    // Popular first, then the rest.
    return [...list].sort((a, b) => {
      const ai = POPULAR_CRYPTO_IDS.indexOf(a.id);
      const bi = POPULAR_CRYPTO_IDS.indexOf(b.id);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [assets, search]);

  return (
    <div className="flex flex-col gap-3">
      <input
        autoFocus
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or symbol"
        className="glass-field w-full rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-gold/50"
      />
      <div className="max-h-[50vh] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">No assets found.</p>
        ) : (
          <ul className="glass divide-y divide-white/60 rounded-glass">
            {filtered.slice(0, 200).map((a) => (
              <li key={`${a.id}-${a.network ?? ""}`}>
                <button
                  type="button"
                  onClick={() => onSelect(a)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gold/10"
                >
                  {a.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.icon} alt="" className="h-7 w-7 rounded-full" />
                  ) : (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-gold/20 text-xs font-bold">
                      {a.code.slice(0, 1)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{a.name}</span>
                    <span className="block truncate text-xs text-ink-muted">
                      {a.code}
                      {a.chainKey ? ` · ${a.chainKey}` : a.network ? ` · ${a.network}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

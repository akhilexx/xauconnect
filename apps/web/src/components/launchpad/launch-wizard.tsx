"use client";

/**
 * LaunchWizard — 4-step token deployer:
 *   1. Launch type + chain     (standard ERC-20 vs bonding-curve fair launch)
 *   2. Token details + logo    (name/symbol/supply/socials, IPFS logo)
 *   3. Liquidity & fees        (auto LP, lock duration, fee currency)
 *   4. Review & deploy         (metadata pin -> wallet call -> record)
 *
 * Deployment is executed by the creator's wallet against TokenFactory /
 * Launchpad. When contracts aren't deployed on the selected chain yet the
 * wizard completes in demo mode (metadata still pinned, nothing on-chain).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Coins,
  FlaskConical,
  ImagePlus,
  Lock,
  Rocket,
  Sparkles,
} from "lucide-react";
import { EVM_CHAINS, getChainByKey, getChainLogoUrl, type TokenLaunchRequest } from "@xauconnect/utils";
import { contractsFor, LAUNCHPAD_ABI, TOKEN_FACTORY_ABI } from "@xauconnect/sdk";
import { Badge, ChainIcon, GlassButton, GlassCard, GlassInput, toast, cn } from "@xauconnect/ui";
import { api } from "@/lib/api";
import { useChainStore } from "@/lib/store";
import { GoldCurveGuide } from "@/components/launchpad/gold-curve-guide";

const STEPS = ["Type", "Details", "Liquidity & Fees", "Review"] as const;
const GOLD_STEPS = ["Network", "Token", "Curve", "Sign"] as const;

/** Default launch fee (native) — mirrors packages/contracts/scripts/deploy.ts. */
const DEFAULT_LAUNCH_FEE_WEI = 10_000_000_000_000_000n; // 0.01 native

interface DraftState {
  launchType: "standard" | "bonding-curve";
  name: string;
  symbol: string;
  totalSupply: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
  logoIpfsCid: string;
  logoPreview: string | null;
  createLiquidityPool: boolean;
  lockLiquidity: boolean;
  lockDurationDays: number;
  feeCurrency: "native" | "usdc" | "xau";
  curvePreset: "fair" | "shield" | "distribute";
  quote: "sol" | "usdc";
  firstBuyAmount: string;
}

const INITIAL: DraftState = {
  launchType: "bonding-curve",
  name: "",
  symbol: "",
  totalSupply: "1000000000",
  description: "",
  website: "",
  twitter: "",
  telegram: "",
  logoIpfsCid: "",
  logoPreview: null,
  createLiquidityPool: true,
  lockLiquidity: true,
  lockDurationDays: 180,
  feeCurrency: "native",
  curvePreset: "fair",
  quote: "sol",
  firstBuyAmount: "",
};

export function LaunchWizard() {
  const { chainKey, setChain } = useChainStore();
  const { address } = useAccount();
  const solanaWallet = useWallet();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftState>(INITIAL);
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<{ metadataURI: string; tokenAddress?: string; demo: boolean } | null>(null);
  /** Meteora is the default create path until the creator picks another chain. */
  const [meteoraFirst, setMeteoraFirst] = useState(true);
  const meteoraFirstRef = useRef(true);

  useEffect(() => {
    if (meteoraFirstRef.current) setChain("solana");
  }, [setChain]);

  function chooseMeteora() {
    meteoraFirstRef.current = true;
    setMeteoraFirst(true);
    setChain("solana");
    patch({ launchType: "bonding-curve", totalSupply: "1000000000" });
  }

  function chooseEvm(key: string) {
    meteoraFirstRef.current = false;
    setMeteoraFirst(false);
    setChain(key);
  }

  const isSolana = meteoraFirst || chainKey === "solana";
  const evmChainKey = useMemo(
    () => (EVM_CHAINS.some((c) => c.key === chainKey) ? chainKey : "bsc"),
    [chainKey],
  );
  const chainName = isSolana ? "Solana" : (EVM_CHAINS.find((c) => c.key === evmChainKey)?.name ?? evmChainKey);

  function patch(p: Partial<DraftState>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  const detailsValid =
    draft.name.trim().length > 0 &&
    draft.name.trim().length <= (isSolana ? 32 : 64) &&
    (isSolana ? /^[A-Z0-9]{1,10}$/ : /^[A-Z0-9]{1,12}$/).test(draft.symbol) &&
    /^\d+$/.test(draft.totalSupply) &&
    BigInt(draft.totalSupply || "0") > 0n;

  function onLogoFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Logo must be under 1 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch({ logoPreview: reader.result as string });
    reader.readAsDataURL(file);
    // Image bytes are pinned alongside the metadata JSON when a
    // WEB3_STORAGE_TOKEN is configured server-side; the CID lands in
    // logoIpfsCid. Until then the preview is local-only.
  }

  async function deploy() {
    if (!detailsValid) return;
    setDeploying(true);
    try {
      if (isSolana) {
        const creator = solanaWallet.publicKey?.toBase58();
        if (!creator || !solanaWallet.signTransaction) {
          toast.error("Connect a Solana wallet to launch a Gold Curve");
          return;
        }
        const launch: TokenLaunchRequest = {
          chainKey: "solana",
          name: draft.name.trim(),
          symbol: draft.symbol,
          totalSupply: "1000000000",
          description: draft.description,
          logoIpfsCid: draft.logoIpfsCid || undefined,
          website: draft.website || "",
          twitter: draft.twitter,
          telegram: draft.telegram,
          launchType: "bonding-curve",
          createLiquidityPool: false,
          lockLiquidity: true,
          lockDurationDays: 0,
          feeCurrency: draft.quote === "usdc" ? "usdc" : "native",
          creator,
          curvePreset: draft.curvePreset,
          quote: draft.quote,
          firstBuyAmount: draft.firstBuyAmount.trim() || undefined,
        };
        const prepared = await api.prepareLaunch(launch);
        if (!prepared.solanaTransaction || !prepared.mint) {
          throw new Error("The server did not return a Gold Curve transaction");
        }
        const raw = Uint8Array.from(atob(prepared.solanaTransaction), (c) => c.charCodeAt(0));
        const tx = VersionedTransaction.deserialize(raw);
        const signed = await solanaWallet.signTransaction(tx);
        const signedBytes = signed.serialize();
        let binary = "";
        for (const byte of signedBytes) binary += String.fromCharCode(byte);
        const { signature } = await api.submitSolanaSwap(btoa(binary));
        await api.recordLaunch({
          launch,
          tokenAddress: prepared.mint,
          deployTxHash: signature,
          metadataURI: prepared.metadataURI,
        });
        setResult({ metadataURI: prepared.metadataURI, tokenAddress: prepared.mint, demo: false });
        toast.success(`${launch.symbol} is live on its Gold Curve`, { description: prepared.mint });
        return;
      }

      const launch: TokenLaunchRequest = {
        chainKey: evmChainKey,
        name: draft.name.trim(),
        symbol: draft.symbol,
        totalSupply: draft.totalSupply,
        description: draft.description,
        logoIpfsCid: draft.logoIpfsCid || undefined,
        website: draft.website || "",
        twitter: draft.twitter,
        telegram: draft.telegram,
        launchType: draft.launchType,
        createLiquidityPool: draft.createLiquidityPool,
        lockLiquidity: draft.lockLiquidity,
        lockDurationDays: draft.lockDurationDays,
        feeCurrency: draft.feeCurrency,
        creator: address ?? "0x0000000000000000000000000000000000000001",
      };

      // Step A — pin metadata + get the contract call from the backend.
      const prepared = await api.prepareLaunch(launch);

      const deployed = contractsFor(evmChainKey);
      const target =
        draft.launchType === "bonding-curve" ? deployed.launchpad : deployed.tokenFactory;

      // Step B — execute on-chain (or finish in demo mode).
      if (!target || !address) {
        setResult({ metadataURI: prepared.metadataURI, demo: true });
        toast.info(
          !address
            ? "Demo launch prepared — connect a wallet to deploy on-chain"
            : "Demo launch prepared — contracts not deployed on this chain yet",
          { description: `Metadata pinned: ${prepared.metadataURI.slice(0, 60)}…` },
        );
        return;
      }

      const hash =
        draft.launchType === "bonding-curve"
          ? await writeContractAsync({
              address: target,
              abi: LAUNCHPAD_ABI,
              functionName: "createLaunch",
              args: [launch.name, launch.symbol, prepared.metadataURI],
              value: DEFAULT_LAUNCH_FEE_WEI,
            })
          : await writeContractAsync({
              address: target,
              abi: TOKEN_FACTORY_ABI,
              functionName: "createToken",
              args: [
                launch.name,
                launch.symbol,
                BigInt(launch.totalSupply) * 10n ** 18n,
                prepared.metadataURI,
              ],
              value: DEFAULT_LAUNCH_FEE_WEI,
            });

      toast.success("Deployment submitted", { description: hash });

      // Step C — wait for the receipt and record the launch (auto-listing).
      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      const tokenAddress = receipt?.logs[0]?.address ?? "";
      if (tokenAddress) {
        await api.recordLaunch({
          launch,
          tokenAddress,
          deployTxHash: hash,
          metadataURI: prepared.metadataURI,
        });
      }
      setResult({ metadataURI: prepared.metadataURI, tokenAddress, demo: false });
      toast.success(`${launch.symbol} deployed`, { description: tokenAddress });
    } catch (err) {
      toast.error("Launch failed", { description: (err as Error).message.slice(0, 140) });
    } finally {
      setDeploying(false);
    }
  }

  if (result) {
    return (
      <GlassCard variant="gradient" padding="lg" className="text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-gradient shadow-gold-glow">
            <Rocket className="h-7 w-7 text-ink" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-extrabold">
            {result.demo ? "Launch prepared (demo mode)" : `${draft.symbol} is live!`}
          </h2>
          <p className="mx-auto mt-2 max-w-md break-all text-sm text-ink-muted">
            {isSolana
              ? "People can buy it now. The token page shows the curve, the fee, and the path to 10 SOL or 750 USDC. After that, Meteora locks the liquidity."
              : `Metadata: ${result.metadataURI.slice(0, 80)}…`}
            {result.tokenAddress && (
              <>
                <br />
                Token: {result.tokenAddress}
              </>
            )}
          </p>
          {result.demo && (
            <p className="mx-auto mt-2 max-w-md text-xs text-ink-faint">
              Deploy the contract suite (pnpm --filter @xauconnect/contracts deploy:&lt;network&gt;)
              and register addresses in packages/sdk/src/contracts.ts, then launch for real.
            </p>
          )}
          <div className="mt-5 flex justify-center gap-3">
            {result.tokenAddress && (
              <Link href={`/token/${isSolana ? "solana" : evmChainKey}/${result.tokenAddress}`}>
                <GlassButton>Open token</GlassButton>
              </Link>
            )}
            <GlassButton
              variant="glass"
              onClick={() => {
                setResult(null);
                setDraft(INITIAL);
                setStep(0);
              }}
            >
              Launch another
            </GlassButton>
          </div>
        </motion.div>
      </GlassCard>
    );
  }

  const stepLabels = isSolana ? GOLD_STEPS : STEPS;

  return (
    <GlassCard variant="strong" padding="lg">
      {isSolana && <GoldCurveGuide step={step} preset={draft.curvePreset} quote={draft.quote} />}
      {/* Stepper */}
      <p className="mb-3 text-center text-sm font-semibold sm:hidden">{stepLabels[step]}</p>
      <ol className="mb-6 flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all",
                i < step
                  ? "bg-success text-white"
                  : i === step
                    ? "bg-gold-gradient text-ink shadow-gold-glow"
                    : "glass text-ink-muted",
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-xs font-semibold sm:block",
                i === step ? "text-ink" : "text-ink-muted",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-white/60" />}
          </li>
        ))}
      </ol>

      <div>
          {/* ── Step 1: type + chain ── */}
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={chooseMeteora}
                  className={cn(
                    "rounded-glass p-5 text-left transition-all",
                    isSolana
                      ? "gradient-border bg-gold/10 shadow-gold-glow"
                      : "glass hover:shadow-glass-lg",
                  )}
                >
                  <FlaskConical className="h-6 w-6 text-pink-hot" />
                  <p className="mt-2 flex items-center gap-2 font-bold">
                    Meteora Gold Curve <Badge tone="pink">create here</Badge>
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Fair, Shield, or Distribute on Solana. Traders buy immediately. At 10 SOL or
                    750 USDC the pool graduates into a locked DAMM v2 market.
                  </p>
                </button>
                <button
                  onClick={() => {
                    if (isSolana) {
                      toast.info("Solana launches use a Meteora Gold Curve. Pick an EVM chain for a standard token.");
                      return;
                    }
                    patch({ launchType: "standard" });
                  }}
                  className={cn(
                    "rounded-glass p-5 text-left transition-all",
                    !isSolana && draft.launchType === "standard"
                      ? "gradient-border bg-gold/10 shadow-gold-glow"
                      : "glass hover:shadow-glass-lg",
                    isSolana && "opacity-50",
                  )}
                >
                  <Coins className="h-6 w-6 text-gold-deep" />
                  <p className="mt-2 font-bold">Standard token</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Fixed-supply ERC-20 on an EVM chain, minted to you. Optionally seed a locked LP.
                  </p>
                </button>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Deploy on
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={chooseMeteora}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all",
                      isSolana
                        ? "bg-gold-gradient text-ink shadow-gold-glow"
                        : "glass text-ink-muted hover:text-ink",
                    )}
                  >
                    <ChainIcon
                      name="Meteora on Solana"
                      src={getChainLogoUrl("solana")}
                      color={getChainByKey("solana")?.color ?? "#9945FF"}
                      size={16}
                    />
                    Meteora
                  </button>
                  {EVM_CHAINS.map((chain) => (
                    <button
                      key={chain.key}
                      onClick={() => chooseEvm(chain.key)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all",
                        !isSolana && evmChainKey === chain.key
                          ? "bg-gold-gradient text-ink shadow-gold-glow"
                          : "glass text-ink-muted hover:text-ink",
                      )}
                    >
                      <ChainIcon
                        name={chain.name}
                        src={getChainLogoUrl(chain.key)}
                        color={chain.color}
                        size={16}
                      />
                      {chain.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: details ── */}
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <GlassInput
                label="Token name"
                placeholder="Golden Doge"
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
              <GlassInput
                label="Symbol"
                placeholder="GDOGE"
                value={draft.symbol}
                error={
                  draft.symbol && !(isSolana ? /^[A-Z0-9]{1,10}$/ : /^[A-Z0-9]{1,12}$/).test(draft.symbol)
                    ? isSolana
                      ? "Uppercase letters & numbers, max 10"
                      : "Uppercase letters & numbers, max 12"
                    : undefined
                }
                onChange={(e) => patch({ symbol: e.target.value.toUpperCase().slice(0, isSolana ? 10 : 12) })}
              />
              <GlassInput
                label={isSolana ? "Total supply (fixed by the Gold Curve)" : "Total supply (whole tokens)"}
                placeholder="1000000000"
                value={isSolana ? "1000000000" : draft.totalSupply}
                onChange={(e) => {
                  if (isSolana) return;
                  if (/^\d*$/.test(e.target.value)) patch({ totalSupply: e.target.value });
                }}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Logo (IPFS)
                </label>
                <label className="glass flex h-11 cursor-pointer items-center gap-2 rounded-2xl px-4 text-sm font-semibold text-ink-muted hover:text-ink">
                  {draft.logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.logoPreview} alt="logo" className="h-7 w-7 rounded-full" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {draft.logoPreview ? "Change logo" : "Upload image (≤1 MB)"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onLogoFile(e.target.files?.[0])}
                  />
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Description
                </label>
                <textarea
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value.slice(0, 2000) })}
                  placeholder="The most liquid gold-standard meme coin…"
                  rows={3}
                  className="glass-field mt-1.5 w-full rounded-2xl p-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>
              <GlassInput
                label="Website (optional)"
                placeholder="https://"
                value={draft.website}
                onChange={(e) => patch({ website: e.target.value })}
              />
              <GlassInput
                label="Twitter / X (optional)"
                placeholder="@handle"
                value={draft.twitter}
                onChange={(e) => patch({ twitter: e.target.value })}
              />
              <GlassInput
                label="Telegram (optional)"
                placeholder="t.me/…"
                value={draft.telegram}
                onChange={(e) => patch({ telegram: e.target.value })}
              />
            </div>
          )}

          {/* ── Step 3: liquidity & fees ── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              {isSolana ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Gold Curve
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {(
                        [
                          ["fair", "Fair", "One even price path. Fixed 1% fee."],
                          ["shield", "Shield", "Fee starts at 50% and falls to 1% over 10 minutes."],
                          ["distribute", "Distribute", "Discovery, a deep middle, then a steep last mile. Fixed 1% fee."],
                        ] as const
                      ).map(([id, title, copy]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => patch({ curvePreset: id })}
                          className={cn(
                            "rounded-2xl p-3 text-left",
                            draft.curvePreset === id
                              ? "gradient-border bg-gold/10 shadow-gold-glow"
                              : "glass",
                          )}
                        >
                          <p className="font-bold">{title}</p>
                          <p className="mt-1 text-xs text-ink-muted">{copy}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Quote
                    </p>
                    <div className="flex gap-2">
                      {(["sol", "usdc"] as const).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => patch({ quote: q })}
                          className={cn(
                            "rounded-xl px-4 py-2 text-sm font-bold uppercase",
                            draft.quote === q ? "bg-gold-gradient text-ink shadow-gold-glow" : "glass text-ink-muted",
                          )}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-ink-faint">
                      Graduates at exactly {draft.quote === "sol" ? "10 SOL" : "750 USDC"} into a DAMM v2 pool.
                      {draft.quote === "usdc" && (
                        <>
                          {" "}
                          Buy USDC first on <Link href="/buy-crypto" className="text-gold-deep underline">buy crypto</Link>, then spend it here.
                        </>
                      )}
                    </p>
                  </div>
                  <GlassInput
                    label={`Optional first buy (${draft.quote.toUpperCase()})`}
                    placeholder="0"
                    value={draft.firstBuyAmount}
                    onChange={(e) => patch({ firstBuyAmount: e.target.value.replace(/[^0-9.]/g, "") })}
                  />
                  <div className="glass rounded-2xl p-4 text-xs text-ink-muted">
                    <p className="font-bold text-ink-soft">Same on every Gold Curve</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      <li>1,000,000,000 supply, 6 decimals, metadata frozen, no mint authority</li>
                      <li>Migrates to DAMM v2 at a 1% pool fee</li>
                      <li>100% of that liquidity stays permanently locked, half creator and half XAUConnect</li>
                      <li>Creator keeps 50% of bonding-curve trading fees and can claim them from Profile</li>
                      <li>Leftover base after graduation goes to the published XAUConnect fee wallet</li>
                    </ul>
                  </div>
                </div>
              ) : draft.launchType === "standard" ? (
                <>
                  <ToggleRow
                    icon={<Sparkles className="h-4 w-4 text-gold-deep" />}
                    title="Create liquidity pool"
                    subtitle="Seed an initial LP on the chain's primary DEX right after deployment."
                    checked={draft.createLiquidityPool}
                    onChange={(v) => patch({ createLiquidityPool: v })}
                  />
                  <ToggleRow
                    icon={<Lock className="h-4 w-4 text-gold-deep" />}
                    title="Lock liquidity"
                    subtitle="LP tokens are time-locked — the strongest rug-pull protection signal."
                    checked={draft.lockLiquidity}
                    onChange={(v) => patch({ lockLiquidity: v })}
                  />
                  {draft.lockLiquidity && (
                    <div className="glass rounded-2xl p-4">
                      <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                        Lock duration: {draft.lockDurationDays} days
                      </label>
                      <input
                        type="range"
                        min={30}
                        max={1095}
                        step={30}
                        value={draft.lockDurationDays}
                        onChange={(e) => patch({ lockDurationDays: Number(e.target.value) })}
                        className="mt-2 w-full accent-gold-dark"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="glass rounded-2xl p-4 text-sm text-ink-soft">
                  <p className="font-bold">Bonding curve mechanics</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-ink-muted">
                    <li>1B supply minted to the curve — no presale, no team allocation</li>
                    <li>Anyone can buy or sell on the curve from second one</li>
                    <li>At the graduation threshold, liquidity migrates to a permanent XAU pool and LP is burned</li>
                  </ul>
                </div>
              )}

              {!isSolana && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Pay launch fee in
                </p>
                <div className="flex gap-2">
                  {(["native", "usdc", "xau"] as const).map((cur) => (
                    <button
                      key={cur}
                      onClick={() => patch({ feeCurrency: cur })}
                      className={cn(
                        "rounded-xl px-4 py-2 text-sm font-bold uppercase transition-all",
                        draft.feeCurrency === cur
                          ? "bg-gold-gradient text-ink shadow-gold-glow"
                          : "glass text-ink-muted hover:text-ink",
                      )}
                    >
                      {cur === "native" ? "Native" : cur.toUpperCase()}
                      {cur === "xau" && <span className="ml-1 text-[10px]">-20%</span>}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-faint">
                  Launch fee: 0.01 native (default) · paying in XAU gets a 20% discount once the
                  XAU token is live on this chain.
                </p>
              </div>
              )}
            </div>
          )}

          {/* ── Step 4: review ── */}
          {step === 3 && (
            <dl className="grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
              <ReviewRow label="Type" value={isSolana ? `Gold Curve · ${draft.curvePreset}` : draft.launchType === "standard" ? "Standard token" : "Bonding curve fair launch"} />
              <ReviewRow label="Chain" value={chainName} />
              <ReviewRow label="Name" value={draft.name || "—"} />
              <ReviewRow label="Symbol" value={draft.symbol || "—"} />
              <ReviewRow label="Supply" value={Number((isSolana ? "1000000000" : draft.totalSupply) || 0).toLocaleString()} />
              {isSolana ? (
                <>
                  <ReviewRow label="Quote" value={draft.quote === "sol" ? "SOL · graduates at 10" : "USDC · graduates at 750"} />
                  <ReviewRow label="First buy" value={draft.firstBuyAmount.trim() || "None"} />
                  <ReviewRow label="Locked LP" value="100% permanent on DAMM v2" />
                </>
              ) : (
                <ReviewRow label="Fee currency" value={draft.feeCurrency.toUpperCase()} />
              )}
              {draft.launchType === "standard" && (
                <>
                  <ReviewRow label="Auto LP" value={draft.createLiquidityPool ? "Yes" : "No"} />
                  <ReviewRow
                    label="LP lock"
                    value={draft.lockLiquidity ? `${draft.lockDurationDays} days` : "No"}
                  />
                </>
              )}
              <div className="sm:col-span-2">
                <p className="mt-2 rounded-2xl bg-gold/10 p-3 text-xs text-ink-soft ring-1 ring-gold/30">
                  {isSolana
                    ? "Your wallet signs one Meteora create-pool transaction. The token is listed on Discover with the XAU launch badge as soon as it confirms."
                    : "Deploying pins your metadata to IPFS, charges the launch fee, and auto-lists your token on Discover with the XAU launch badge."}
                </p>
              </div>
            </dl>
          )}
        </div>

      {/* Navigation */}
      <div className="mt-6 flex gap-2">
        <GlassButton
          variant="ghost"
          className="flex-1 sm:flex-none"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </GlassButton>
        {step < STEPS.length - 1 ? (
          <GlassButton
            className="flex-1 sm:flex-none"
            disabled={step === 1 && !detailsValid}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue <ArrowRight className="h-4 w-4" />
          </GlassButton>
        ) : (
          <GlassButton
            size="lg"
            className="flex-1 sm:flex-none"
            loading={deploying}
            disabled={deploying || !detailsValid}
            onClick={deploy}
          >
            <Rocket className="h-4 w-4" /> {deploying ? "Deploying…" : "Deploy token"}
          </GlassButton>
        )}
      </div>
    </GlassCard>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all hover:shadow-glass-lg"
      role="switch"
      aria-checked={checked}
    >
      {icon}
      <span className="flex-1">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-xs text-ink-muted">{subtitle}</span>
      </span>
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          checked ? "bg-gold-gradient" : "bg-ink/10",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/50 pb-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

"use client";

/**
 * SwapPanel — the full XAU routing flow:
 *   amount in -> debounced multi-route quote -> route comparison table ->
 *   fee breakdown -> simulation -> approval (ERC20) -> execution.
 *
 * Execution paths:
 *   - EVM with deployed router: approve (if needed) + sendTransaction
 *   - Router not deployed / demo quote: guided demo toast (no funds moved)
 *   - Solana: XAU Solana route surfaced; native execution ships with the
 *     embedded Solana signer (structured placeholder)
 */
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import { useSendTransaction, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { ArrowDownUp, Info, Settings2, Zap } from "lucide-react";
import {
  brandRouteNames,
  catalogTokenKey,
  getChainByKey,
  getChainLogoUrl,
  getTokensForChain,
  NATIVE_TOKEN_ADDRESS,
  formatBps,
  formatUnits,
  isCatalogNative,
  parseUnits,
  minOutAfterSlippage,
  tokenAddressEq,
  type CrossChainBuild,
  type CrossChainQuote,
  type CrossChainQuoteRequest,
  type CrossChainStep,
  type QuoteRequest,
  type RouteQuote,
  type SwapTx,
  type TokenInfo,
} from "@xauconnect/utils";
import { ERC20_ABI } from "@xauconnect/sdk";
import {
  ChainIcon,
  GlassButton,
  GlassCard,
  GlassDialog,
  Skeleton,
  toast,
  cn,
} from "@xauconnect/ui";
import { api } from "@/lib/api";
import { userFacingError } from "@/lib/user-errors";
import { showSwapConfirmedToast } from "@/lib/swap-success";
import { wagmiConfig } from "@/lib/wagmi";
import { useChainStore, useSlippageStore } from "@/lib/store";
import { useRequestWalletConnect } from "@/components/wallet/wallet-connect-button";
import { MobileWalletBanner } from "@/components/wallet/mobile-wallet-banner";
import { SolanaConnectHint } from "@/components/wallet/solana-connect-hint";
import { SOLANA_CONNECT_TOAST } from "@/lib/wallet-messages";
import { useWalletConnections } from "@/hooks/use-active-wallet";
import { useEnsureEvmChain } from "@/hooks/use-ensure-evm-chain";
import { ChainSelector } from "../chain-selector";
import { TokenSelect } from "../token-select";
import { RouteTable } from "./route-table";
import { LimitOrdersPanel } from "./limit-orders-panel";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

type BalanceRow = { formatted: string; raw: string };

function coerceBalanceLabel(value: unknown): string {
  if (value == null) return "0";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "formatted" in value) {
    const formatted = (value as BalanceRow).formatted;
    return typeof formatted === "string" ? formatted : "0";
  }
  return String(value);
}

/** Compact human output — avoids overflowing the swap row on mobile. */
function formatSwapOutput(amountBase: bigint, decimals: number): string {
  const raw = formatUnits(amountBase, decimals, Math.min(decimals, 8));
  const num = Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(num)) return raw;
  if (num >= 1_000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return num.toLocaleString(undefined, { maximumSignificantDigits: 6 });
}

function formatBalanceLabel(formatted: unknown): string {
  const label = coerceBalanceLabel(formatted);
  const num = Number(label.replace(/,/g, ""));
  if (!Number.isFinite(num)) return label;
  if (num >= 1_000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (num === 0) return "0";
  return num.toLocaleString(undefined, { maximumSignificantDigits: 6 });
}

function markCrossChainStepsComplete(
  setSteps: Dispatch<SetStateAction<CrossChainStep[]>>,
  destinationTxHash?: string,
) {
  setSteps((steps) =>
    steps.map((s) =>
      s.id === "bridge" || s.id === "dest" || s.id === "swap-dest"
        ? { ...s, status: "complete" as const, txHash: s.id === "dest" ? destinationTxHash : s.txHash }
        : s.status === "pending"
          ? { ...s, status: "complete" as const }
          : s,
    ),
  );
}

type SwapMode = "same" | "cross";

/** Placeholder wallets for quote preview when no wallet is connected. */
const QUOTE_TAKER_EVM = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const QUOTE_TAKER_SOL = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

type CompositeQuoteRaw = {
  composite?: boolean;
  hop1?: { request: QuoteRequest; route: RouteQuote };
  hop2?: CrossChainQuote;
  hop2Request?: CrossChainQuoteRequest;
  hop3?: { request: QuoteRequest; route: RouteQuote };
};

export interface SwapPanelProps {
  /** Hero/embedded mode: hides the route table + limit-orders card. */
  compact?: boolean;
  /** SEO embed: preset chain without URL query params. */
  presetChainKey?: string;
  presetFromChainKey?: string;
  presetToChainKey?: string;
  presetTokenOut?: string;
  presetTokenIn?: string;
  presetSwapMode?: SwapMode;
}

export function SwapPanel({
  compact = false,
  presetChainKey,
  presetFromChainKey,
  presetToChainKey,
  presetTokenOut,
  presetTokenIn,
  presetSwapMode,
}: SwapPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { chainKey, setChain } = useChainStore();
  const { slippageBps, setSlippageBps } = useSlippageStore();
  const { evmAddress, solAddress, evmConnected, solanaConnected } = useWalletConnections();
  const ensureEvmChain = useEnsureEvmChain();
  const requestConnect = useRequestWalletConnect();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const solanaWallet = useSolanaWallet();

  const defaultTokens = useMemo(() => getTokensForChain(chainKey), [chainKey]);
  const [swapMode, setSwapMode] = useState<SwapMode>("same");
  const [tokenIn, setTokenIn] = useState<TokenInfo | null>(defaultTokens[0] ?? null);
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(defaultTokens[2] ?? null);
  const [amount, setAmount] = useState("");
  const [selectedDexId, setSelectedDexId] = useState<string>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [crossChainSteps, setCrossChainSteps] = useState<CrossChainStep[]>([]);

  const urlChain = presetChainKey ?? searchParams.get("chainKey");
  const urlFromChain = presetFromChainKey ?? searchParams.get("fromChain");
  const urlToChain = presetToChainKey ?? searchParams.get("toChain");
  const urlOut = presetTokenOut ?? searchParams.get("tokenOut");
  const urlIn = presetTokenIn ?? searchParams.get("tokenIn");
  const urlMode = presetSwapMode ?? searchParams.get("mode");
  const isCrossPreset =
    urlMode === "cross" ||
    Boolean(urlFromChain && urlToChain && urlFromChain !== urlToChain);
  const hasUrlPreset = Boolean(urlChain || urlFromChain || urlOut || urlIn);
  const hasRouterPreset = Boolean(
    presetChainKey || presetFromChainKey || presetToChainKey || presetTokenOut || presetTokenIn,
  );

  function resetToDefaultPair(activeChain = chainKey) {
    const tokens = getTokensForChain(activeChain);
    setTokenIn(tokens[0] ?? null);
    setTokenOut(tokens[2] ?? tokens[1] ?? null);
    setAmount("");
    setSelectedDexId(undefined);
    setCrossChainSteps([]);
  }

  function clearUrlPreset() {
    router.replace("/swap", { scroll: false });
    resetToDefaultPair();
  }

  function handleChainChange(nextChain: string) {
    setSwapMode("same");
    setCrossChainSteps([]);
    resetToDefaultPair(nextChain);
    if (hasUrlPreset && !hasRouterPreset) router.replace("/swap", { scroll: false });
  }

  function handleSwapModeChange(mode: SwapMode) {
    setSwapMode(mode);
    setSelectedDexId(undefined);
    setCrossChainSteps([]);
    if (mode === "same" && tokenIn && tokenOut && tokenIn.chainKey !== tokenOut.chainKey) {
      const tokens = getTokensForChain(tokenIn.chainKey);
      setChain(tokenIn.chainKey);
      setTokenOut(tokens.find((t) => t.symbol === tokenOut.symbol) ?? tokens[2] ?? tokens[1] ?? null);
    }
  }

  /** Same-chain mode: picking a token on another chain auto-enables cross-chain routing. */
  function applyTokenPick(side: "in" | "out", picked: TokenInfo) {
    const other = side === "in" ? tokenOut : tokenIn;
    const nextIn = side === "in" ? picked : tokenIn;
    const nextOut = side === "out" ? picked : tokenOut;

    if (side === "in") setTokenIn(picked);
    else setTokenOut(picked);
    setSelectedDexId(undefined);

    if (nextIn && nextOut && nextIn.chainKey !== nextOut.chainKey) {
      if (swapMode !== "cross") {
        setSwapMode("cross");
      }
      setCrossChainSteps([]);
      return;
    }

    setCrossChainSteps([]);
    if (nextIn && nextOut && nextIn.chainKey === nextOut.chainKey) {
      setSwapMode("same");
      if (side === "in") setChain(picked.chainKey);
    }
  }

  useEffect(() => {
    void api.swapSettings(chainKey).then((s) => {
      if (s && "defaultSlippageBps" in s) setSlippageBps(s.defaultSlippageBps);
    });
  }, [chainKey, setSlippageBps]);

  useEffect(() => {
    if (!urlChain && !urlFromChain && !urlOut && !urlIn) return;

    async function resolveToken(chain: string, address: string): Promise<TokenInfo | null> {
      const tokens = getTokensForChain(chain);
      const cached = tokens.find((t) => tokenAddressEq(chain, t.address, address));
      if (cached) return cached;
      try {
        const detail = await api.tokenDetail(chain, address);
        const t = detail.token;
        return {
          chainKey: chain,
          address: t.address,
          symbol: t.symbol,
          name: t.name,
          decimals: chain === "solana" ? 6 : 18,
          logoURI: t.logoURI,
        };
      } catch {
        return {
          chainKey: chain,
          address,
          symbol: address.slice(0, 6),
          name: "Token",
          decimals: chain === "solana" ? 6 : 18,
        };
      }
    }

    async function applyPresets() {
      if (isCrossPreset && urlFromChain && urlToChain) {
        setSwapMode("cross");
        setChain(urlFromChain);
        const [inn, out] = await Promise.all([
          urlIn ? resolveToken(urlFromChain, urlIn) : Promise.resolve(null),
          urlOut ? resolveToken(urlToChain, urlOut) : Promise.resolve(null),
        ]);
        if (inn) setTokenIn(inn);
        if (out) setTokenOut(out);
        setSelectedDexId(undefined);
        return;
      }

      if (urlChain) setChain(urlChain);

      const activeChain = urlChain ?? chainKey;
      const tokens = getTokensForChain(activeChain);
      const native = tokens[0] ?? null;

      let out =
        urlOut != null
          ? (tokens.find((t) => tokenAddressEq(activeChain, t.address, urlOut)) ?? null)
          : null;
      let inn =
        urlIn != null
          ? (tokens.find((t) => tokenAddressEq(activeChain, t.address, urlIn)) ?? native)
          : native;

      if (urlOut && !out) out = await resolveToken(activeChain, urlOut);
      if (urlIn && !inn) inn = await resolveToken(activeChain, urlIn);

      setTokenIn(inn);
      setTokenOut(out ?? tokens[2] ?? tokens[1] ?? null);
      setSelectedDexId(undefined);
    }

    void applyPresets();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply only when URL preset changes
  }, [urlChain, urlFromChain, urlToChain, urlOut, urlIn, urlMode, isCrossPreset, setChain]);

  const debouncedAmount = useDebounced(amount, 450);
  const amountInBase = useMemo(() => {
    if (!tokenIn || !debouncedAmount) return null;
    try {
      const parsed = parseUnits(debouncedAmount, tokenIn.decimals);
      return parsed > 0n ? parsed.toString() : null;
    } catch {
      return null;
    }
  }, [debouncedAmount, tokenIn]);

  const fromChainKey = tokenIn?.chainKey ?? chainKey;
  const toChainKey = tokenOut?.chainKey ?? chainKey;
  const fromChain = getChainByKey(fromChainKey);
  const toChain = getChainByKey(toChainKey);
  const isCrossChain =
    swapMode === "cross" && Boolean(tokenIn && tokenOut && fromChainKey !== toChainKey);

  useEffect(() => {
    if (!isCrossChain) setCrossChainSteps([]);
  }, [isCrossChain]);

  const sourceKind = fromChain?.kind === "solana" ? "solana" : "evm";
  const taker = sourceKind === "solana" ? solAddress : evmAddress;
  const destKind = toChain?.kind === "solana" ? "solana" : "evm";
  const takerDestination = destKind === "solana" ? solAddress : evmAddress;

  const quoteTaker =
    sourceKind === "solana" ? (solAddress ?? QUOTE_TAKER_SOL) : (evmAddress ?? QUOTE_TAKER_EVM);
  const quoteDest =
    destKind === "solana" ? (solAddress ?? QUOTE_TAKER_SOL) : (evmAddress ?? QUOTE_TAKER_EVM);

  const tokenInBalanceQuery = useQuery({
    queryKey: ["swap-panel-balance-in", taker, fromChainKey, tokenIn?.address],
    enabled: Boolean(taker && tokenIn),
    staleTime: 30_000,
    queryFn: async () => {
      const res = await api.walletTokenBalances(taker!, [tokenIn!.address], fromChainKey);
      const key = catalogTokenKey(fromChainKey, tokenIn!.address);
      const row = res.balances[key];
      return {
        formatted: row?.balanceFormatted ?? "0",
        raw: row?.balance ?? "0",
      };
    },
  });

  const nativeGasReserve = useMemo(() => {
    if (!fromChain || fromChain.kind !== "evm") return 0n;
    const reserve =
      fromChainKey === "polygon"
        ? "0.05"
        : fromChainKey === "bsc"
          ? "0.002"
          : "0.001";
    return parseUnits(reserve, fromChain.nativeDecimals);
  }, [fromChain, fromChainKey]);

  const nativeBalanceQuery = useQuery({
    queryKey: ["swap-native-balance", taker, fromChainKey],
    enabled: Boolean(taker && fromChain?.kind === "evm"),
    staleTime: 30_000,
    queryFn: async () => {
      const res = await api.walletTokenBalances(taker!, [NATIVE_TOKEN_ADDRESS], fromChainKey);
      const key = catalogTokenKey(fromChainKey, NATIVE_TOKEN_ADDRESS);
      return res.balances[key]?.balance ?? "0";
    },
  });

  const nativeGasLow = useMemo(() => {
    if (!nativeBalanceQuery.data || fromChain?.kind !== "evm") return false;
    try {
      return BigInt(nativeBalanceQuery.data) < nativeGasReserve;
    } catch {
      return false;
    }
  }, [nativeBalanceQuery.data, fromChain?.kind, nativeGasReserve]);

  const tokenOutBalanceQuery = useQuery({
    queryKey: ["swap-panel-balance-out", takerDestination, toChainKey, tokenOut?.address],
    enabled: Boolean(takerDestination && tokenOut),
    staleTime: 30_000,
    queryFn: async () => {
      const res = await api.walletTokenBalances(takerDestination!, [tokenOut!.address], toChainKey);
      const key = catalogTokenKey(toChainKey, tokenOut!.address);
      const row = res.balances[key];
      return {
        formatted: row?.balanceFormatted ?? "0",
        raw: row?.balance ?? "0",
      } satisfies BalanceRow;
    },
  });

  const crossChainRequest = useMemo(() => {
    if (!isCrossChain || !tokenIn || !tokenOut || !amountInBase) return null;
    return {
      fromChainKey,
      toChainKey,
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      amountIn: amountInBase,
      slippageBps,
      taker: quoteTaker,
      takerDestination: quoteDest,
    };
  }, [
    isCrossChain,
    fromChainKey,
    toChainKey,
    tokenIn,
    tokenOut,
    amountInBase,
    slippageBps,
    quoteTaker,
    quoteDest,
  ]);

  const quoteQuery = useQuery({
    queryKey: ["quote", chainKey, tokenIn?.address, tokenOut?.address, amountInBase, slippageBps, taker],
    enabled: Boolean(!isCrossChain && tokenIn && tokenOut && amountInBase && fromChainKey === toChainKey),
    refetchInterval: (query) => (query.state.error ? false : 12_000),
    retry: false,
    queryFn: () =>
      api.quote({
        chainKey: fromChainKey,
        tokenIn: tokenIn!.address,
        tokenOut: tokenOut!.address,
        amountIn: amountInBase!,
        slippageBps,
        taker,
      }),
  });

  const crossChainQuoteQuery = useQuery({
    queryKey: ["cross-chain-quote", crossChainRequest],
    enabled: Boolean(crossChainRequest),
    refetchInterval: (query) => (query.state.error ? false : 15_000),
    retry: false,
    queryFn: () => api.crossChainQuote(crossChainRequest!),
  });

  const tokenOutPriceQuery = useQuery({
    queryKey: ["token-price", toChainKey, tokenOut?.address],
    enabled: Boolean(tokenOut),
    staleTime: 15_000,
    queryFn: () => api.tokenDetail(toChainKey, tokenOut!.address),
  });

  const quote = quoteQuery.data;
  const crossChainQuote: CrossChainQuote | null = crossChainQuoteQuery.data?.quote ?? null;
  const executableQuotes = useMemo(
    () => quote?.quotes.filter((q) => q.executable !== false) ?? [],
    [quote?.quotes],
  );
  const routeNames = useMemo(
    () => brandRouteNames(executableQuotes.map((q) => q.dexId)),
    [executableQuotes],
  );
  const activeChain = getChainByKey(isCrossChain ? fromChainKey : chainKey);
  const selectedRoute: RouteQuote | null =
    quote?.quotes.find((q) => q.dexId === selectedDexId) ?? quote?.best ?? null;

  const receiveDisplay = isCrossChain
    ? crossChainQuote && tokenOut
      ? formatSwapOutput(BigInt(crossChainQuote.amountOut), tokenOut.decimals)
      : ""
    : selectedRoute && tokenOut
      ? formatSwapOutput(BigInt(selectedRoute.amountOutAfterFee), tokenOut.decimals)
      : "";

  function resolveExecutableAmountIn(baseAmount: string): string {
    let amount = BigInt(baseAmount);
    const balanceRaw = tokenInBalanceQuery.data?.raw;
    if (balanceRaw) {
      const bal = BigInt(balanceRaw);
      if (bal > 0n && amount > bal) amount = bal;
    }
    if (tokenIn && isCatalogNative(fromChainKey, tokenIn.address)) {
      const reserve =
        sourceKind === "solana"
          ? parseUnits("0.01", tokenIn.decimals)
          : parseUnits("0.001", tokenIn.decimals);
      if (amount > reserve) amount -= reserve;
      else amount = 0n;
    }
    if (amount <= 0n) throw new Error("INSUFFICIENT_FUNDS");
    return amount.toString();
  }

  function applyMaxAmount() {
    const balRaw = tokenInBalanceQuery.data?.raw;
    if (!balRaw || !tokenIn) return;
    let maxBase = BigInt(balRaw);
    if (maxBase <= 0n) return;
    if (isCatalogNative(fromChainKey, tokenIn.address)) {
      const reserve =
        sourceKind === "solana"
          ? parseUnits("0.01", tokenIn.decimals)
          : parseUnits("0.001", tokenIn.decimals);
      if (maxBase > reserve) maxBase -= reserve;
      else maxBase = 0n;
    }
    if (maxBase <= 0n) return;
    setAmount(formatUnits(maxBase, tokenIn.decimals, Math.min(tokenIn.decimals, 8)));
  }

  function flip() {
    const nextIn = tokenOut;
    const nextOut = tokenIn;
    setTokenIn(nextIn);
    setTokenOut(nextOut);
    setSelectedDexId(undefined);
    if (nextIn && nextOut && nextIn.chainKey !== nextOut.chainKey && swapMode === "same") {
      setSwapMode("cross");
      setCrossChainSteps([]);
    } else if (nextIn && nextOut && nextIn.chainKey === nextOut.chainKey) {
      setCrossChainSteps([]);
    }
  }

  async function submitEvmBuiltSwap(
    built: SwapTx,
    chainKey: string,
    tokenInAddress: string,
    amountInBase: string,
  ): Promise<string> {
    if (!built.evm?.to || built.evm.to === "0x0000000000000000000000000000000000000000") {
      throw new Error("SWAP_NOT_LIVE");
    }
    if (!evmConnected || !evmAddress) throw new Error("WALLET_REQUIRED");

    await ensureEvmChain(chainKey);

    const isNativeIn = isCatalogNative(chainKey, tokenInAddress);
    if (!isNativeIn) {
      const approvalHash = await writeContractAsync({
        address: tokenInAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [built.evm.to as `0x${string}`, BigInt(amountInBase)],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: approvalHash, confirmations: 1 });
    }

    const hash = await sendTransactionAsync({
      to: built.evm.to as `0x${string}`,
      data: built.evm.data as `0x${string}`,
      value: BigInt(built.evm.value ?? "0"),
    });
    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash, confirmations: 1 });
    if (receipt.status === "reverted") throw new Error("SWAP_REVERTED");
    return hash;
  }

  async function submitEvmCrossChainBuilt(
    built: CrossChainBuild,
    chainKey: string,
    tokenInAddress: string,
    amountInBase: string,
  ): Promise<string> {
    if (!built.evm?.to || !built.evm.data) throw new Error("SWAP_NOT_LIVE");
    if (!evmConnected || !evmAddress) throw new Error("WALLET_REQUIRED");

    await ensureEvmChain(chainKey);

    const isNativeIn = isCatalogNative(chainKey, tokenInAddress);
    if (!isNativeIn) {
      const approvalHash = await writeContractAsync({
        address: tokenInAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [built.evm.to as `0x${string}`, BigInt(amountInBase)],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: approvalHash, confirmations: 1 });
    }

    const hash = await sendTransactionAsync({
      to: built.evm.to as `0x${string}`,
      data: built.evm.data as `0x${string}`,
      value: BigInt(built.evm.value ?? "0"),
    });
    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash, confirmations: 1 });
    if (receipt.status === "reverted") throw new Error("SWAP_REVERTED");
    return hash;
  }

  async function executeCompositeCrossChain(
    raw: CompositeQuoteRaw,
    execRequest: CrossChainQuoteRequest,
    amountInFormatted: string,
    amountOutFormatted: string,
  ) {
    if (raw.hop1) {
      toast.info("Step 1: Swapping to USDC on source chain…", { duration: 5_000 });
      const minOut1 = minOutAfterSlippage(
        BigInt(raw.hop1.route.amountOutAfterFee),
        slippageBps,
      ).toString();
      const built1 = await api.buildSwap(
        { ...raw.hop1.request, taker: execRequest.taker },
        raw.hop1.route,
        minOut1,
      );
      if (!built1.simulation.success) throw new Error(built1.simulation.error ?? "Hop 1 failed");
      await submitEvmBuiltSwap(built1, execRequest.fromChainKey, raw.hop1.request.tokenIn, raw.hop1.request.amountIn);
    }

    if (!raw.hop2 || !raw.hop2Request) throw new Error("Missing bridge quote");

    toast.info("Step 2: Cross-chain bridge…", { duration: 5_000 });
    const bridgeReq = { ...raw.hop2Request, taker: execRequest.taker, takerDestination: execRequest.takerDestination };
    const built2 = await api.crossChainBuild(bridgeReq, raw.hop2);

    if (fromChain?.kind === "solana") {
      throw new Error("Composite Solana bridge not supported yet");
    }

    const bridgeHash = await submitEvmCrossChainBuilt(
      built2,
      execRequest.fromChainKey,
      raw.hop2Request.tokenIn,
      raw.hop2Request.amountIn,
    );
    if (raw.hop2.quoteId) {
      const bridged = await pollCrossChainStatus(
        raw.hop2.quoteId,
        execRequest.fromChainKey,
        bridgeHash,
        execRequest.toChainKey,
      );
      if (!bridged) markCrossChainStepsComplete(setCrossChainSteps);
    } else {
      markCrossChainStepsComplete(setCrossChainSteps);
    }

    if (raw.hop3) {
      toast.info("Step 3: Swapping to destination token…", { duration: 5_000 });
      await ensureEvmChain(execRequest.toChainKey);
      const minOut3 = minOutAfterSlippage(
        BigInt(raw.hop3.route.amountOutAfterFee),
        slippageBps,
      ).toString();
      const built3 = await api.buildSwap(
        { ...raw.hop3.request, taker: execRequest.takerDestination ?? execRequest.taker },
        raw.hop3.route,
        minOut3,
      );
      if (!built3.simulation.success) throw new Error(built3.simulation.error ?? "Hop 3 failed");
      await submitEvmBuiltSwap(
        built3,
        execRequest.toChainKey,
        raw.hop3.request.tokenIn,
        raw.hop3.request.amountIn,
      );
    }

    showSwapConfirmedToast({
      chainKey: execRequest.fromChainKey,
      tokenIn: tokenIn!,
      tokenOut: tokenOut!,
      amountInFormatted,
      amountOutFormatted,
      txHash: bridgeHash,
    });
    finishCrossChainSwap();
  }

  async function executeCrossChain() {
    if (!crossChainQuote || !crossChainRequest || !tokenIn || !tokenOut || !amountInBase) return;

    if (!taker) {
      toast.error("Connect your wallet to swap", {
        description: "Cross-chain swaps require a connected wallet on the source chain.",
      });
      requestConnect();
      return;
    }

    let effectiveAmountIn: string;
    try {
      effectiveAmountIn = resolveExecutableAmountIn(amountInBase);
    } catch {
      toast.error("Not enough balance", {
        description: "Try Max or a smaller amount.",
      });
      return;
    }

    const execRequest: CrossChainQuoteRequest = {
      ...crossChainRequest,
      taker,
      takerDestination: takerDestination ?? taker,
      amountIn: effectiveAmountIn,
    };

    setExecuting(true);
    setCrossChainSteps(crossChainQuote.steps.map((s) => ({ ...s, status: "pending" as const })));

    const amountInFormatted = formatSwapOutput(BigInt(effectiveAmountIn), tokenIn.decimals);
    const amountOutFormatted = receiveDisplay;

    const compositeRaw = crossChainQuote.raw as CompositeQuoteRaw | undefined;

    try {
      if (compositeRaw?.composite) {
        await executeCompositeCrossChain(compositeRaw, execRequest, amountInFormatted, amountOutFormatted);
        return;
      }

      const built = await api.crossChainBuild(execRequest, crossChainQuote);
      setCrossChainSteps((steps) =>
        steps.map((s) => (s.id === "approve" ? { ...s, status: "active" } : s)),
      );

      if (fromChain?.kind === "solana") {
        if (!solanaWallet.publicKey || !solanaWallet.signTransaction) {
          toast.error(SOLANA_CONNECT_TOAST.title, {
            description: SOLANA_CONNECT_TOAST.description,
          });
          requestConnect();
          return;
        }
        if (!built.solanaTransaction) {
          toast.error("Couldn't prepare this cross-chain swap");
          return;
        }
        const raw = Uint8Array.from(atob(built.solanaTransaction), (c) => c.charCodeAt(0));
        const tx = VersionedTransaction.deserialize(raw);
        const signed = await solanaWallet.signTransaction(tx);
        const bytes = signed.serialize();
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        }
        setCrossChainSteps((steps) =>
          steps.map((s) =>
            s.id === "origin" ? { ...s, status: "active" } : s.id === "approve" ? { ...s, status: "complete" } : s,
          ),
        );
        toast.info("Confirming on source chain…", { duration: 4_000 });
        const { signature: sig } = await api.submitSolanaSwap(btoa(binary));
        setCrossChainSteps((steps) =>
          steps.map((s) =>
            s.id === "origin"
              ? { ...s, status: "complete", txHash: sig }
              : s.id === "bridge"
                ? { ...s, status: "active" }
                : s,
          ),
        );
        if (built.quoteId) {
          const bridged = await pollCrossChainStatus(built.quoteId, fromChainKey, sig, toChainKey);
          if (!bridged) markCrossChainStepsComplete(setCrossChainSteps);
        } else {
          markCrossChainStepsComplete(setCrossChainSteps);
        }
        showSwapConfirmedToast({
          chainKey: fromChainKey,
          tokenIn,
          tokenOut,
          amountInFormatted,
          amountOutFormatted,
          txHash: sig,
        });
        finishCrossChainSwap();
        return;
      }

      if (!built.evm?.to || !built.evm.data) {
        toast.error("Couldn't prepare this cross-chain swap");
        return;
      }

      if (!evmConnected || !evmAddress) {
        toast.error("Connect your wallet to complete this swap");
        requestConnect();
        return;
      }

      try {
        await ensureEvmChain(fromChainKey);
      } catch {
        toast.error("Switch network in your wallet", {
          description: `Approve ${fromChain?.name ?? fromChainKey} in your wallet.`,
        });
        return;
      }

      const isNativeIn = isCatalogNative(fromChainKey, tokenIn.address);
      if (!isNativeIn) {
        setCrossChainSteps((steps) =>
          steps.map((s) => (s.id === "approve" ? { ...s, status: "active" } : s)),
        );
        const approvalHash = await writeContractAsync({
          address: tokenIn.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [built.evm.to as `0x${string}`, BigInt(effectiveAmountIn)],
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: approvalHash, confirmations: 1 });
      }

      setCrossChainSteps((steps) =>
        steps.map((s) =>
          s.id === "origin"
            ? { ...s, status: "active" }
            : s.id === "approve"
              ? { ...s, status: "complete" }
              : s,
        ),
      );

      const hash = await sendTransactionAsync({
        to: built.evm.to as `0x${string}`,
        data: built.evm.data as `0x${string}`,
        value: BigInt(built.evm.value ?? "0"),
      });

      toast.info("Bridge in progress…", { duration: 5_000 });
      setCrossChainSteps((steps) =>
        steps.map((s) =>
          s.id === "origin"
            ? { ...s, status: "complete", txHash: hash }
            : s.id === "bridge"
              ? { ...s, status: "active" }
              : s,
        ),
      );

      await waitForTransactionReceipt(wagmiConfig, { hash, confirmations: 1 });

      if (built.quoteId) {
        const bridged = await pollCrossChainStatus(built.quoteId, fromChainKey, hash, toChainKey);
        if (!bridged) markCrossChainStepsComplete(setCrossChainSteps);
      } else {
        markCrossChainStepsComplete(setCrossChainSteps);
      }

      showSwapConfirmedToast({
        chainKey: fromChainKey,
        tokenIn,
        tokenOut,
        amountInFormatted,
        amountOutFormatted,
        txHash: hash,
      });
      finishCrossChainSwap();
    } catch (err) {
      toast.error("Cross-chain swap failed", { description: userFacingError(err) });
    } finally {
      setExecuting(false);
    }
  }

  async function pollCrossChainStatus(
    quoteId: string,
    originChainKey: string,
    originTxHash: string,
    destinationChainKey: string,
  ): Promise<boolean> {
    for (let i = 0; i < 36; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 5_000));
      try {
        const status = await api.crossChainStatus(
          quoteId,
          originChainKey,
          originTxHash,
          destinationChainKey,
        );
        if (status.status === "completed") {
          markCrossChainStepsComplete(setCrossChainSteps, status.destinationTxHash);
          return true;
        }
        if (status.status === "failed") {
          setCrossChainSteps((steps) =>
            steps.map((s) => (s.id === "bridge" || s.id === "dest" ? { ...s, status: "failed" } : s)),
          );
          return false;
        }
      } catch {
        /* keep polling */
      }
    }
    return false;
  }

  function finishCrossChainSwap() {
    void queryClient.invalidateQueries({ queryKey: ["swap-panel-balance-in"] });
    void queryClient.invalidateQueries({ queryKey: ["swap-panel-balance-out"] });
    setAmount("");
    window.setTimeout(() => setCrossChainSteps([]), 4_000);
  }

  async function execute() {
    if (isCrossChain) {
      await executeCrossChain();
      return;
    }
    if (!quote || !selectedRoute || !tokenIn || !tokenOut || !amountInBase) return;
    setCrossChainSteps([]);
    if (selectedRoute.executable === false) {
      toast.error("This quote isn't available", {
        description: "Refresh the quote or try a different amount.",
      });
      return;
    }
    if (!taker) {
      if (sourceKind === "solana") {
        toast.error(SOLANA_CONNECT_TOAST.title, {
          description: SOLANA_CONNECT_TOAST.description,
        });
      } else {
        toast.error("Connect your wallet to complete this swap");
      }
      requestConnect();
      return;
    }
    setExecuting(true);

    try {
      const effectiveAmountIn = resolveExecutableAmountIn(amountInBase);
      const amountInFormatted =
        formatSwapOutput(BigInt(effectiveAmountIn), tokenIn.decimals);

      const routesToTry: RouteQuote[] = [];
      if (selectedRoute) routesToTry.push(selectedRoute);
      for (const route of executableQuotes) {
        if (!routesToTry.some((r) => r.dexId === route.dexId)) routesToTry.push(route);
      }

      let built: SwapTx | null = null;
      let activeRoute: RouteQuote | null = null;

      for (const route of routesToTry) {
        const minOut = minOutAfterSlippage(
          BigInt(route.amountOutAfterFee),
          slippageBps,
        ).toString();
        try {
          const attempt = await api.buildSwap(
            { ...quote.request, taker, amountIn: effectiveAmountIn },
            route,
            minOut,
          );
          if (attempt.simulation.success) {
            built = attempt;
            activeRoute = route;
            if (route.dexId !== selectedDexId) setSelectedDexId(route.dexId);
            break;
          }
        } catch {
          /* try next route */
        }
      }

      if (!built || !activeRoute) {
        toast.error("Couldn't complete this swap", {
          description: "Try a smaller amount or pick another route below.",
        });
        return;
      }

      const amountOutFormatted = formatSwapOutput(
        BigInt(activeRoute.amountOutAfterFee),
        tokenOut.decimals,
      );

      if (fromChainKey === "solana") {
        if (!solanaWallet.publicKey || !solanaWallet.signTransaction) {
          toast.error(SOLANA_CONNECT_TOAST.title, {
            description: SOLANA_CONNECT_TOAST.description,
          });
          requestConnect();
          return;
        }
        if (!built.solanaTransaction) {
          toast.error("Couldn't prepare this swap", {
            description: "Try refreshing the quote or changing the amount.",
          });
          return;
        }
        const raw = Uint8Array.from(atob(built.solanaTransaction), (c) => c.charCodeAt(0));
        const tx = VersionedTransaction.deserialize(raw);
        const signed = await solanaWallet.signTransaction(tx);
        const bytes = signed.serialize();
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        }
        toast.info("Confirming swap…", { duration: 4_000 });
        const { signature: sig } = await api.submitSolanaSwap(btoa(binary));
        showSwapConfirmedToast({
          chainKey: fromChainKey,
          tokenIn,
          tokenOut,
          amountInFormatted,
          amountOutFormatted,
          txHash: sig,
        });
        await api.recordSwap({
          chainKey: fromChainKey,
          dexId: activeRoute.dexId,
          tokenIn: tokenIn.address,
          tokenOut: tokenOut.address,
          amountIn: effectiveAmountIn,
          amountOut: activeRoute.amountOutAfterFee,
          protocolFee: activeRoute.protocolFee,
          feeBps: quote.protocolFeeBps,
          txHash: sig,
          address: solanaWallet.publicKey.toBase58(),
          status: "confirmed",
          source: "web",
        });
        void queryClient.invalidateQueries({ queryKey: ["swap-panel-balance-in"] });
        void queryClient.invalidateQueries({ queryKey: ["swap-panel-balance-out"] });
        setAmount("");
        return;
      }

      if (!built.evm || built.evm.to === "0x0000000000000000000000000000000000000000") {
        toast.error("Swaps on this network aren't live yet", {
          description: "Check back soon — we're rolling out more chains.",
        });
        return;
      }

      if (!evmConnected || !evmAddress) {
        toast.error("Connect your wallet to complete this swap");
        requestConnect();
        return;
      }

      try {
        await ensureEvmChain(fromChainKey);
      } catch {
        toast.error("Switch network in your wallet", {
          description: `Approve ${activeChain?.name ?? fromChainKey} in your wallet to swap on this chain.`,
        });
        return;
      }

      const isNativeIn = isCatalogNative(fromChainKey, tokenIn.address);
      if (!isNativeIn) {
        const approvalHash = await writeContractAsync({
          address: tokenIn.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [built.evm.to as `0x${string}`, BigInt(effectiveAmountIn)],
        });
        const approvalReceipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: approvalHash,
          confirmations: 1,
        });
        if (approvalReceipt.status === "reverted") {
          throw new Error("Approval reverted");
        }
      }

      const hash = await sendTransactionAsync({
        to: built.evm.to as `0x${string}`,
        data: built.evm.data as `0x${string}`,
        value: BigInt(built.evm.value ?? "0"),
      });

      toast.info("Confirming swap…", { duration: 4_000 });

      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash,
        confirmations: 1,
      });
      if (receipt.status === "reverted") {
        throw new Error("SWAP_REVERTED");
      }

      showSwapConfirmedToast({
        chainKey: fromChainKey,
        tokenIn,
        tokenOut,
        amountInFormatted,
        amountOutFormatted,
        txHash: hash,
      });

      await api.recordSwap({
        chainKey: fromChainKey,
        dexId: activeRoute.dexId,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: effectiveAmountIn,
        amountOut: activeRoute.amountOutAfterFee,
        protocolFee: activeRoute.protocolFee,
        feeBps: quote.protocolFeeBps,
        txHash: hash,
        address: evmAddress,
        status: "confirmed",
      });
      void queryClient.invalidateQueries({ queryKey: ["swap-panel-balance-in"] });
      void queryClient.invalidateQueries({ queryKey: ["swap-panel-balance-out"] });
      setAmount("");
    } catch (err) {
      toast.error("Swap failed", { description: userFacingError(err) });
      const failAddress =
        fromChainKey === "solana"
          ? solanaWallet.publicKey?.toBase58()
          : evmAddress;
      if (failAddress) {
        void api
          .recordSwap({
            chainKey: fromChainKey,
            dexId: selectedRoute.dexId,
            tokenIn: tokenIn.address,
            tokenOut: tokenOut.address,
            amountIn: amountInBase,
            amountOut: selectedRoute.amountOutAfterFee,
            protocolFee: selectedRoute.protocolFee,
            feeBps: quote.protocolFeeBps,
            address: failAddress,
            status: "failed",
            failureReason: userFacingError(err),
            source: "web",
          })
          .catch(() => {});
      }
    } finally {
      setExecuting(false);
    }
  }

  const sidePanels = (
    <>
      {!compact && !isCrossChain && quoteQuery.isFetching && !quote && amountInBase && (
        <GlassCard className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </GlassCard>
      )}
      {!compact && !isCrossChain && quote && tokenOut && executableQuotes.length > 1 && (
        <div className="hidden md:block">
          <RouteTable
            quote={quote}
            tokenOut={tokenOut}
            selectedDexId={selectedDexId}
            onSelect={(route) => setSelectedDexId(route.dexId)}
          />
        </div>
      )}

      {!compact && !isCrossChain && (
        <LimitOrdersPanel
          chainKey={fromChainKey}
          userAddress={taker}
          tokenIn={tokenIn}
          tokenOut={tokenOut}
          amountInBase={amountInBase}
          spotPriceUsd={tokenOutPriceQuery.data?.token.priceUsd}
          onExecuteTriggered={() => void execute()}
        />
      )}
    </>
  );

  return (
    <>
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-4">
      <MobileWalletBanner />
      <SolanaConnectHint chainKey={chainKey} />
      {!compact && hasUrlPreset && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gold/10 px-3 py-2 text-xs ring-1 ring-gold/25",
          )}
        >
          <span className="font-medium text-ink-soft">
            Swap preset from token link — change chain or tokens freely, or reset below.
          </span>
          <button
            type="button"
            onClick={clearUrlPreset}
            className="shrink-0 font-semibold text-gold-deep underline-offset-2 hover:underline"
          >
            Reset swap
          </button>
        </div>
      )}

      <GlassCard variant="strong" padding="lg" className="flex min-w-0 flex-col gap-2">
        <div className="mb-1 flex flex-col gap-2 border-b border-white/55 pb-3">
          <div className="flex rounded-xl bg-white/60 p-1 ring-1 ring-white/70">
            <button
              type="button"
              onClick={() => handleSwapModeChange("same")}
              className={cn(
                "flex-1 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all min-h-11 sm:min-h-0 sm:py-1.5",
                swapMode === "same"
                  ? "bg-gold-gradient text-ink shadow-gold-glow"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              Same chain
            </button>
            <button
              type="button"
              onClick={() => handleSwapModeChange("cross")}
              className={cn(
                "flex-1 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all min-h-11 sm:min-h-0 sm:py-1.5",
                swapMode === "cross"
                  ? "bg-gold-gradient text-ink shadow-gold-glow"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              Cross-chain
            </button>
          </div>

          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-white/90 px-2.5 py-1.5 ring-1 ring-white/90">
              {isCrossChain && fromChain && toChain ? (
                <>
                  <ChainIcon
                    name={fromChain.name}
                    src={getChainLogoUrl(fromChain.key)}
                    color={fromChain.color}
                    size={20}
                    className="shrink-0"
                  />
                  <span className="text-xs font-semibold text-ink-muted">→</span>
                  <ChainIcon
                    name={toChain.name}
                    src={getChainLogoUrl(toChain.key)}
                    color={toChain.color}
                    size={20}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                      XAU Route
                    </p>
                    <p className="truncate text-sm font-bold text-ink-soft">
                      {fromChain.name} → {toChain.name}
                    </p>
                  </div>
                </>
              ) : activeChain ? (
                <>
                  <ChainIcon
                    name={activeChain.name}
                    src={getChainLogoUrl(activeChain.key)}
                    color={activeChain.color}
                    size={22}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                      Trading on
                    </p>
                    <p
                      className="truncate text-sm font-bold text-ink-soft sm:text-base"
                      style={{ color: "var(--xau-ink)" }}
                    >
                      {activeChain.name}
                    </p>
                  </div>
                </>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="glass flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:shadow-glass-lg sm:gap-1.5 sm:px-3"
              aria-label="Slippage settings"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span className="tabular-nums">{formatBps(slippageBps)}</span>
            </button>
          </div>
        </div>

        {/* You pay */}
        <div className="gradient-border-soft rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              You pay
            </label>
            {taker && tokenIn && (
              <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                <span>
                  Balance:{" "}
                  <span className="font-semibold tabular-nums text-ink-soft">
                    {tokenInBalanceQuery.isLoading
                      ? "…"
                      : `${formatBalanceLabel(tokenInBalanceQuery.data?.formatted)} ${tokenIn.symbol}`}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={applyMaxAmount}
                  disabled={!tokenInBalanceQuery.data?.raw || tokenInBalanceQuery.data.raw === "0"}
                  className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-deep disabled:opacity-40"
                >
                  Max
                </button>
              </div>
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
              aria-label="Amount in"
            />
            {tokenIn && (
              <div className="shrink-0">
                <TokenSelect
                  chainKey={swapMode === "cross" ? fromChainKey : chainKey}
                  allowAllChains
                  value={tokenIn}
                  onChange={(t) => applyTokenPick("in", t)}
                  exclude={
                    tokenOut
                      ? { chainKey: tokenOut.chainKey, address: tokenOut.address }
                      : undefined
                  }
                  walletAddress={taker}
                  showBalances={Boolean(taker)}
                  label="Token in"
                />
              </div>
            )}
          </div>
        </div>

        {/* Flip */}
        <div className="relative z-10 -my-4 flex justify-center">
          <button
            onClick={flip}
            className="glass-strong rounded-2xl p-2.5 shadow-glass transition-transform hover:rotate-180 hover:shadow-gold-glow"
            aria-label="Flip tokens"
          >
            <ArrowDownUp className="h-4 w-4 text-gold-deep" />
          </button>
        </div>

        {/* You receive */}
        <div className="gradient-border-soft rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2">
            <label className="truncate text-xs font-semibold uppercase tracking-wider text-ink-muted">
              You receive
            </label>
            {takerDestination && tokenOut && (
              <span className="text-[11px] text-ink-faint">
                Balance:{" "}
                <span className="tabular-nums text-ink-muted">
                  {tokenOutBalanceQuery.isLoading
                    ? "…"
                    : `${formatBalanceLabel(tokenOutBalanceQuery.data?.formatted)} ${tokenOut.symbol}`}
                </span>
              </span>
            )}
          </div>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <div
              className="min-w-0 flex-1 truncate font-display text-2xl font-bold tabular-nums text-ink sm:text-3xl"
              title={receiveDisplay || undefined}
            >
              {(isCrossChain ? crossChainQuoteQuery.isFetching : quoteQuery.isFetching) &&
              !(isCrossChain ? crossChainQuote : quote) ? (
                <Skeleton className="h-8 w-36 sm:h-9" />
              ) : (
                receiveDisplay || <span className="text-ink-faint">0.0</span>
              )}
            </div>
            {tokenOut && (
              <div className="shrink-0">
                <TokenSelect
                  chainKey={swapMode === "cross" ? toChainKey : chainKey}
                  allowAllChains
                  value={tokenOut}
                  onChange={(t) => applyTokenPick("out", t)}
                  exclude={
                    tokenIn
                      ? { chainKey: tokenIn.chainKey, address: tokenIn.address }
                      : undefined
                  }
                  walletAddress={takerDestination}
                  showBalances={Boolean(takerDestination)}
                  label="Token out"
                />
              </div>
            )}
          </div>
        </div>

        {/* Route picker — 2-column grid on mobile so cards are never clipped */}
        {!isCrossChain && tokenOut && executableQuotes.length > 1 && (
          <div className="mt-2 flex min-w-0 flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Select route
            </p>
            <div className="grid min-w-0 grid-cols-2 gap-2">
              {executableQuotes.map((route) => {
                const isSelected = route.dexId === (selectedDexId ?? quote?.best?.dexId);
                return (
                  <button
                    key={route.dexId}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDexId(route.dexId)}
                    className={cn(
                      "min-w-0 rounded-xl px-3 py-2.5 text-left text-xs ring-1 transition-colors touch-manipulation",
                      isSelected
                        ? "bg-gold/20 ring-gold/50"
                        : "bg-white/50 ring-white/70 hover:bg-white/70 active:bg-white/80",
                    )}
                  >
                    <span className="block truncate font-semibold">
                      {routeNames.get(route.dexId) ?? route.dexName}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-ink-muted">
                      {formatUnits(BigInt(route.amountOutAfterFee), tokenOut.decimals)}{" "}
                      {tokenOut.symbol}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Trade details */}
        {isCrossChain && crossChainQuote && tokenOut && (
          <dl className="mt-2 flex flex-col gap-1.5 rounded-2xl bg-white/45 p-4 text-xs ring-1 ring-white/70">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Route</dt>
              <dd className="font-semibold">
                {fromChain?.name} → {toChain?.name}
              </dd>
            </div>
            {crossChainQuote.estimatedDurationSec != null && (
              <div className="flex justify-between">
                <dt className="text-ink-muted">Estimated time</dt>
                <dd className="font-semibold">
                  {crossChainQuote.estimatedDurationSec < 60
                    ? `~${crossChainQuote.estimatedDurationSec}s`
                    : `~${Math.ceil(crossChainQuote.estimatedDurationSec / 60)} min`}
                </dd>
              </div>
            )}
            {(crossChainQuote.raw as CompositeQuoteRaw | undefined)?.composite && (
              <div className="flex justify-between">
                <dt className="text-ink-muted">Route type</dt>
                <dd className="font-semibold">Swap → Bridge → Swap</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-muted">Minimum received ({formatBps(slippageBps)} slippage)</dt>
              <dd className="font-semibold">
                {formatUnits(BigInt(crossChainQuote.minAmountOut), tokenOut.decimals)} {tokenOut.symbol}
              </dd>
            </div>
          </dl>
        )}

        {!isCrossChain && quote && selectedRoute && tokenOut && (
          <dl className="mt-2 flex flex-col gap-1.5 rounded-2xl bg-white/45 p-4 text-xs ring-1 ring-white/70">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Price impact</dt>
              <dd className={selectedRoute.priceImpactBps > 300 ? "font-semibold text-danger" : "font-semibold"}>
                {formatBps(selectedRoute.priceImpactBps)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Minimum received ({formatBps(slippageBps)} slippage)</dt>
              <dd className="font-semibold">
                {formatUnits(
                  minOutAfterSlippage(BigInt(selectedRoute.amountOutAfterFee), slippageBps),
                  tokenOut.decimals,
                )}{" "}
                {tokenOut.symbol}
              </dd>
            </div>
          </dl>
        )}

        {isCrossChain && crossChainSteps.length > 0 && (
          <ol className="mt-2 flex flex-col gap-2 rounded-2xl bg-white/45 p-4 text-xs ring-1 ring-white/70">
            {crossChainSteps.map((step) => (
              <li key={step.id} className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">{step.label}</span>
                <span
                  className={cn(
                    "font-semibold capitalize",
                    step.status === "complete" && "text-success",
                    step.status === "active" && "text-gold-deep",
                    step.status === "failed" && "text-danger",
                  )}
                >
                  {step.status}
                </span>
              </li>
            ))}
          </ol>
        )}

        {!isCrossChain && quoteQuery.isError && amountInBase && (
          <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-danger/10 p-3 text-xs text-danger">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {userFacingError(
              quoteQuery.error,
              "Quotes aren't available for this pair right now. Try another token or chain.",
            )}
          </p>
        )}

        {isCrossChain && !taker && amountInBase && crossChainQuote && (
          <p className="mt-2 rounded-xl bg-gold/10 p-3 text-xs text-ink-soft">
            Quote preview — connect your wallet to execute this cross-chain swap.
          </p>
        )}

        {isCrossChain && crossChainQuoteQuery.isError && amountInBase && (
          <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-danger/10 p-3 text-xs text-danger">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {userFacingError(
              crossChainQuoteQuery.error,
              "Cross-chain quotes aren't available for this pair right now.",
            )}
          </p>
        )}

        {fromChain?.kind === "evm" &&
          taker &&
          amountInBase &&
          nativeGasLow &&
          tokenIn &&
          !isCatalogNative(fromChainKey, tokenIn.address) && (
            <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-gold/15 p-3 text-xs text-ink-soft">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-deep" />
              Swaps on {fromChain.name} need a little {fromChain.nativeSymbol} for network fees
              (approve + swap). Add a small amount to your wallet first — even when you&apos;re buying{" "}
              {fromChain.nativeSymbol}.
            </p>
          )}

        <GlassButton
          size="lg"
          className="mt-2 w-full"
          disabled={
            executing ||
            !amountInBase ||
            (isCrossChain ? !crossChainQuote : !selectedRoute)
          }
          loading={executing}
          onClick={execute}
        >
          <Zap className="h-4 w-4" />
          {!amountInBase
            ? "Enter an amount"
            : executing
              ? "Confirming…"
              : isCrossChain
                ? "Swap cross-chain"
                : "Swap"}
        </GlassButton>
      </GlassCard>

      {swapMode === "same" && (
        <div className="rounded-2xl bg-white/90 p-2.5 ring-1 ring-white/85 sm:p-3">
          <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Select network
          </p>
          <ChainSelector layout="wrap" onChange={handleChainChange} />
        </div>
      )}
      </div>

      {!compact && <div className="flex w-full min-w-0 flex-col gap-4">{sidePanels}</div>}
    </div>

      {/* Slippage settings */}
      <GlassDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Transaction settings">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Slippage tolerance
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {[10, 50, 100, 300, 500, 1000, 2500].map((bps) => (
            <button
              key={bps}
              onClick={() => setSlippageBps(bps)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                slippageBps === bps
                  ? "bg-gold-gradient text-ink shadow-gold-glow"
                  : "glass text-ink-muted hover:text-ink"
              }`}
            >
              {formatBps(bps)}
            </button>
          ))}
        </div>
      </GlassDialog>
    </>
  );
}

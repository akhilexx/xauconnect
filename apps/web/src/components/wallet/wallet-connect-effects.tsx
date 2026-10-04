"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { toast } from "@xauconnect/ui";
import { getChainByKey } from "@xauconnect/utils";
import { useWalletUiStore } from "@/lib/wallet-ui-store";
import { consumeWalletReturnPath, isMobileUserAgent, stashWalletReturnPath } from "@/lib/mobile-wallet";
import { hasInjectedEvmProvider } from "@/lib/mobile-wallet-deeplink";
import { useChainStore } from "@/lib/store";

/**
 * Global wallet side-effects:
 * - ?connect=1&wallet= opens auto-connect inside wallet in-app browsers
 * - restore path after mobile wallet handoff
 */
export function WalletConnectEffects() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const chainKey = useChainStore((s) => s.chainKey);
  const connectRequested = useWalletUiStore((s) => s.connectRequested);
  const clearConnectRequest = useWalletUiStore((s) => s.clearConnectRequest);
  const openEvmModal = useWalletUiStore((s) => s.openEvmModal);
  const evmHandoffMode = useWalletUiStore((s) => s.evmHandoffMode);
  const { setVisible: openSolanaModal } = useWalletModal();
  const handledConnectParam = useRef(false);
  const { isConnected } = useAccount();
  const isConnectedRef = useRef(isConnected);
  isConnectedRef.current = isConnected;
  const evmConnectPending = useWalletUiStore((s) => s.evmConnectPending);
  const abortEvmConnect = useWalletUiStore((s) => s.abortEvmConnect);

  // Clear stale handoff state when user returns to the mobile browser tab.
  useEffect(() => {
    if (!evmHandoffMode) return;
    const handler = () => {
      if (document.visibilityState !== "visible") return;
      window.setTimeout(() => {
        if (useWalletUiStore.getState().evmHandoffMode && !isConnectedRef.current) {
          useWalletUiStore.getState().setEvmHandoffMode(false);
          abortEvmConnect();
        }
      }, 1_000);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [evmHandoffMode, abortEvmConnect]);

  // User returned to mobile browser without completing WC connect (not during in-app handoff).
  useEffect(() => {
    if (!evmConnectPending || evmHandoffMode) return;

    let timer: number | undefined;
    const handler = () => {
      if (document.visibilityState !== "visible") return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!isConnectedRef.current && useWalletUiStore.getState().evmConnectPending) {
          abortEvmConnect();
          toast.error("Connection cancelled", {
            description: "Wallet was not connected. Tap Connect wallet to try again.",
          });
        }
      }, 2_500);
    };

    document.addEventListener("visibilitychange", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      if (timer) window.clearTimeout(timer);
    };
  }, [evmConnectPending, evmHandoffMode, abortEvmConnect]);

  useEffect(() => {
    const returnPath = consumeWalletReturnPath();
    if (returnPath && returnPath !== `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`) {
      router.replace(returnPath, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (handledConnectParam.current) return;
    if (searchParams.get("connect") !== "1") return;
    handledConnectParam.current = true;

    const walletId = searchParams.get("wallet");

    const params = new URLSearchParams(searchParams.toString());
    params.delete("connect");
    params.delete("wallet");
    const q = params.toString();
    router.replace(pathname + (q ? `?${q}` : ""), { scroll: false });

    if (walletId && hasInjectedEvmProvider()) {
      useWalletUiStore.getState().requestAutoConnect(walletId);
      return;
    }

    if (walletId && isMobileUserAgent() && !hasInjectedEvmProvider()) {
      toast.info("Open in wallet browser", {
        description: "Connect from inside your wallet app, or pick WalletConnect in Chrome.",
      });
      return;
    }

    useWalletUiStore.getState().requestConnect();
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!connectRequested) return;
    clearConnectRequest();

    const chain = getChainByKey(chainKey);
    stashWalletReturnPath(
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : pathname,
    );

    if (chain?.kind === "solana") {
      openSolanaModal(true);
    } else {
      openEvmModal();
    }
  }, [
    connectRequested,
    chainKey,
    clearConnectRequest,
    openEvmModal,
    openSolanaModal,
    pathname,
  ]);

  return null;
}

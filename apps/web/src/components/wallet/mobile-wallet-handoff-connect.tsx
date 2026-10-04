"use client";

/**
 * After a mobile deep-link handoff, auto-connect when the wallet injects its provider.
 */
import { useEffect, useRef } from "react";
import { useAccount, useConnect, useConnectors } from "wagmi";
import { toast } from "@xauconnect/ui";
import { EVM_WALLETS, pickEvmConnector } from "@/lib/evm-wallets";
import { hasInjectedEvmProvider } from "@/lib/mobile-wallet-deeplink";
import { useWalletUiStore } from "@/lib/wallet-ui-store";

const INJECT_POLL_MS = 250;
const INJECT_POLL_MAX = 40;

export function MobileWalletHandoffConnect() {
  const autoConnectWalletId = useWalletUiStore((s) => s.autoConnectWalletId);
  const clearAutoConnect = useWalletUiStore((s) => s.clearAutoConnect);
  const setEvmHandoffMode = useWalletUiStore((s) => s.setEvmHandoffMode);
  const abortEvmConnect = useWalletUiStore((s) => s.abortEvmConnect);
  const closeEvmModal = useWalletUiStore((s) => s.closeEvmModal);
  const connectors = useConnectors();
  const { connectAsync } = useConnect();
  const { isConnected } = useAccount();
  const busy = useRef(false);

  useEffect(() => {
    if (!autoConnectWalletId || busy.current || isConnected) return;

    const wallet = EVM_WALLETS.find((w) => w.id === autoConnectWalletId);
    if (!wallet) {
      clearAutoConnect();
      return;
    }

    let polls = 0;
    let pollTimer: number | undefined;

    const attempt = () => {
      if (busy.current || isConnected) return;

      if (!hasInjectedEvmProvider()) {
        polls += 1;
        if (polls < INJECT_POLL_MAX) {
          pollTimer = window.setTimeout(attempt, INJECT_POLL_MS);
        }
        return;
      }

      const connector = pickEvmConnector(wallet, connectors);
      if (!connector) {
        clearAutoConnect();
        return;
      }

      busy.current = true;
      useWalletUiStore.getState().setLastWalletApp(wallet.name);

      void connectAsync({ connector })
        .then(() => {
          clearAutoConnect();
          setEvmHandoffMode(false);
          abortEvmConnect();
          closeEvmModal();
          toast.success(`Connected with ${wallet.name}`);
        })
        .catch((err) => {
          busy.current = false;
          const msg = err instanceof Error ? err.message : "Connection failed";
          toast.error("Could not connect", { description: msg.slice(0, 120) });
          clearAutoConnect();
        });
    };

    attempt();

    return () => {
      if (pollTimer) window.clearTimeout(pollTimer);
    };
  }, [
    autoConnectWalletId,
    abortEvmConnect,
    clearAutoConnect,
    closeEvmModal,
    connectAsync,
    connectors,
    isConnected,
    setEvmHandoffMode,
  ]);

  return null;
}

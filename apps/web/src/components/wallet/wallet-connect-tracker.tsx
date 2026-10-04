"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAccount, useChainId } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { getChainByKey } from "@xauconnect/utils";
import { api } from "@/lib/api";
import { useChainStore } from "@/lib/store";
import { useWalletUiStore } from "@/lib/wallet-ui-store";

/**
 * Reports wallet sessions + per-chain visits to the backend.
 * One EVM connect covers all EVM chains — chain switches are visits, not new sessions.
 */
export function WalletConnectTracker() {
  const pathname = usePathname();
  const chainKey = useChainStore((s) => s.chainKey);
  const lastWalletApp = useWalletUiStore((s) => s.lastWalletApp);

  const { address: evmAddress, isConnected: evmConnected, connector } = useAccount();
  const chainId = useChainId();
  const sol = useWallet();

  const lastEvmSession = useRef<string | null>(null);
  const lastEvmChainVisit = useRef<string | null>(null);
  const lastSolSession = useRef<string | null>(null);

  // EVM session connect (once per address + connector)
  useEffect(() => {
    if (!evmConnected || !evmAddress) {
      lastEvmSession.current = null;
      lastEvmChainVisit.current = null;
      return;
    }

    const sessionKey = `${evmAddress.toLowerCase()}:${connector?.id ?? "unknown"}`;
    if (lastEvmSession.current === sessionKey) return;
    lastEvmSession.current = sessionKey;
    // Mark current chain as visited so the chain-visit effect doesn't re-register immediately.
    const chain = getChainByKey(chainKey);
    if (chain?.kind === "evm") {
      lastEvmChainVisit.current = `${evmAddress.toLowerCase()}:${chainKey}:${chainId}`;
    } else {
      lastEvmChainVisit.current = null;
    }

    void api
      .registerWalletConnect({
        address: evmAddress,
        chainKind: "evm",
        chainKey: chain?.kind === "evm" ? chainKey : undefined,
        chainId,
        connectorId: connector?.id,
        connectorName: connector?.name,
        walletApp: lastWalletApp ?? connector?.name,
        connectMethod: connector?.id,
        pagePath: pathname,
        referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      })
      .catch(() => {});
  }, [evmConnected, evmAddress, connector, chainId, chainKey, pathname, lastWalletApp]);

  // EVM chain visit (switching Ethereum → Polygon, etc.)
  useEffect(() => {
    if (!evmConnected || !evmAddress) return;
    const chain = getChainByKey(chainKey);
    if (chain?.kind !== "evm") return;

    const visitKey = `${evmAddress.toLowerCase()}:${chainKey}:${chainId}`;
    if (lastEvmChainVisit.current === visitKey) return;
    if (lastEvmSession.current === null) return;
    lastEvmChainVisit.current = visitKey;

    void api
      .registerWalletConnect({
        address: evmAddress,
        chainKind: "evm",
        chainKey,
        chainId,
        connectorId: connector?.id,
        connectorName: connector?.name,
        walletApp: lastWalletApp ?? connector?.name,
        pagePath: pathname,
        chainVisitOnly: true,
      })
      .catch(() => {});
  }, [
    evmConnected,
    evmAddress,
    chainKey,
    chainId,
    connector,
    pathname,
    lastWalletApp,
  ]);

  useEffect(() => {
    if (!sol.connected || !sol.publicKey) {
      lastSolSession.current = null;
      return;
    }

    const address = sol.publicKey.toBase58();
    const reportKey = `${address}:${sol.wallet?.adapter.name ?? "unknown"}`;
    if (lastSolSession.current === reportKey) return;
    lastSolSession.current = reportKey;

    void api
      .registerWalletConnect({
        address,
        chainKind: "solana",
        chainKey: "solana",
        connectorId: sol.wallet?.adapter.name,
        connectorName: sol.wallet?.adapter.name,
        walletApp: sol.wallet?.adapter.name,
        connectMethod: "solana-adapter",
        pagePath: pathname,
        referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      })
      .catch(() => {});
  }, [sol.connected, sol.publicKey, sol.wallet, pathname]);

  return null;
}

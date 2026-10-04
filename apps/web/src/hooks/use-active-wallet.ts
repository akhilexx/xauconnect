"use client";

import { useCallback } from "react";
import { useConnection, useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { useAccount, useDisconnect as useEvmDisconnect } from "wagmi";
import { getChainByKey } from "@xauconnect/utils";
import { useChainStore } from "@/lib/store";

export type ActiveWalletKind = "evm" | "solana";

/** Both wallet stacks — EVM is one session across all EVM chains (same address). */
export function useWalletConnections() {
  const { address: evmAddress, isConnected: evmConnected, chainId, connector } = useAccount();
  const { disconnect: evmDisconnect } = useEvmDisconnect();
  const solana = useSolanaWallet();
  const { connection } = useConnection();
  const solAddress = solana.publicKey?.toBase58();

  const disconnectEvm = useCallback(() => evmDisconnect(), [evmDisconnect]);
  const disconnectSolana = useCallback(async () => {
    await solana.disconnect();
  }, [solana]);

  return {
    evmAddress,
    evmConnected,
    evmChainId: chainId,
    evmConnector: connector,
    solAddress,
    solanaConnected: solana.connected,
    solanaWallet: solana,
    connection,
    disconnectEvm,
    disconnectSolana,
    anyConnected: evmConnected || solana.connected,
  };
}

export function useActiveWallet(chainKeyOverride?: string) {
  const storeChainKey = useChainStore((s) => s.chainKey);
  const chainKey = chainKeyOverride ?? storeChainKey;
  const chain = getChainByKey(chainKey) ?? getChainByKey("ethereum")!;

  const {
    evmAddress,
    evmConnected,
    evmChainId,
    evmConnector,
    solAddress,
    solanaConnected,
    solanaWallet,
    connection,
    disconnectEvm,
    disconnectSolana,
  } = useWalletConnections();

  const isSolana = chain.kind === "solana";
  const address = isSolana ? solAddress : evmAddress;
  const isConnected = isSolana ? solanaConnected : evmConnected;
  const kind: ActiveWalletKind = isSolana ? "solana" : "evm";

  const disconnect = useCallback(async () => {
    if (isSolana) await disconnectSolana();
    else disconnectEvm();
  }, [isSolana, disconnectSolana, disconnectEvm]);

  return {
    chainKey,
    chain,
    kind,
    address,
    isConnected,
    evmAddress,
    solAddress,
    evmConnected,
    solanaConnected,
    evmChainId,
    evmConnector,
    solanaWallet,
    connection,
    disconnect,
  };
}

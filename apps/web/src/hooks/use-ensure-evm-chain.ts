"use client";

import { useCallback } from "react";
import { useSwitchChain } from "wagmi";
import { getChainByKey } from "@xauconnect/utils";
import { useWalletConnections } from "@/hooks/use-active-wallet";

/**
 * Prompt the connected EVM wallet to switch to `chainKey` before signing.
 * One wallet address works on all EVM chains — only the network changes.
 */
export function useEnsureEvmChain() {
  const { evmConnected, evmChainId } = useWalletConnections();
  const { switchChainAsync } = useSwitchChain();

  return useCallback(
    async (chainKey: string) => {
      const chain = getChainByKey(chainKey);
      if (!chain || chain.kind !== "evm") return true;
      if (!evmConnected) return false;
      const targetId = chain.id;
      if (typeof targetId !== "number") return true;
      if (evmChainId === targetId) return true;
      await switchChainAsync({ chainId: targetId });
      return true;
    },
    [evmConnected, evmChainId, switchChainAsync],
  );
}

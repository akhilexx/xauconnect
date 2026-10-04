"use client";

import { Info } from "lucide-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { GlassButton } from "@xauconnect/ui";
import { useWalletConnections } from "@/hooks/use-active-wallet";
import {
  SOLANA_CONNECT_BODY,
  SOLANA_CONNECT_BODY_WALLET_ALREADY,
  SOLANA_CONNECT_TITLE,
} from "@/lib/wallet-messages";
import { stashWalletReturnPath } from "@/lib/mobile-wallet";

/** Shown on Solana swap when an Ethereum/BNB wallet is connected but Solana is not. */
export function SolanaConnectHint({ chainKey }: { chainKey: string }) {
  const { evmConnected, solanaConnected } = useWalletConnections();
  const { setVisible } = useWalletModal();

  if (chainKey !== "solana" || solanaConnected) return null;

  const openSolana = () => {
    stashWalletReturnPath(
      typeof window !== "undefined" ? window.location.pathname + window.location.search : "/swap",
    );
    setVisible(true);
  };

  return (
    <div
      role="status"
      className="flex flex-col gap-2.5 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 sm:flex-row sm:items-start sm:gap-3 sm:px-4"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{SOLANA_CONNECT_TITLE}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted sm:text-sm">
          {evmConnected ? SOLANA_CONNECT_BODY_WALLET_ALREADY : SOLANA_CONNECT_BODY}
        </p>
      </div>
      <GlassButton type="button" size="sm" variant="gold" className="shrink-0" onClick={openSolana}>
        Connect Solana
      </GlassButton>
    </div>
  );
}

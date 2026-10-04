"use client";

import { useCallback } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { LogOut } from "lucide-react";
import { shortenAddress, getChainByKey } from "@xauconnect/utils";
import { GlassButton, cn } from "@xauconnect/ui";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { useWalletConnections } from "@/hooks/use-active-wallet";
import { resolveWalletIconPath } from "@/lib/evm-wallets";
import { useChainStore } from "@/lib/store";
import { useWalletUiStore } from "@/lib/wallet-ui-store";
import { stashWalletReturnPath } from "@/lib/mobile-wallet";

export interface WalletConnectButtonProps {
  /** Override chain context (defaults to global chain store). */
  chainKey?: string;
  className?: string;
  /** @deprecated Always shows "Connect wallet" — kept for call-site compatibility. */
  compact?: boolean;
}

function WalletAvatar({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={18}
      height={18}
      className="h-[18px] w-[18px] shrink-0 rounded-md object-contain"
      decoding="async"
    />
  );
}

function ConnectedPill({
  iconSrc,
  iconAlt,
  label,
  onClick,
  title,
  className,
}: {
  iconSrc: string;
  iconAlt: string;
  label: string;
  onClick: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <GlassButton
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={title}
      className={cn(
        "max-w-[7.5rem] gap-1.5 truncate font-mono text-xs ring-1 ring-black/5 sm:max-w-none sm:text-sm",
        className,
      )}
    >
      <WalletAvatar src={iconSrc} alt={iconAlt} />
      {label}
    </GlassButton>
  );
}

function SolanaWalletButton({ className }: { className?: string }) {
  const { setVisible } = useWalletModal();
  const { publicKey, disconnect, connected, wallet } = useSolanaWallet();

  const open = useCallback(() => {
    stashWalletReturnPath(window.location.pathname + window.location.search);
    setVisible(true);
  }, [setVisible]);

  if (connected && publicKey) {
    const label = shortenAddress(publicKey.toBase58(), 4);
    const iconSrc = wallet?.adapter.icon ?? "/wallets/phantom.svg";
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <ConnectedPill
          iconSrc={typeof iconSrc === "string" ? iconSrc : "/wallets/phantom.svg"}
          iconAlt={wallet?.adapter.name ?? "Solana wallet"}
          label={label}
          onClick={open}
          title={wallet?.adapter.name ?? "Solana wallet"}
        />
        <button
          type="button"
          onClick={() => void disconnect()}
          className="rounded-lg p-1.5 text-ink-muted hover:bg-gold/10 hover:text-ink"
          aria-label="Disconnect Solana wallet"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <ConnectWalletButton onClick={open} className={className} />
  );
}

function EvmWalletButton({ className }: { className?: string }) {
  const openEvmModal = useWalletUiStore((s) => s.openEvmModal);
  const lastWalletApp = useWalletUiStore((s) => s.lastWalletApp);
  const { connector } = useAccount();

  const open = useCallback(() => {
    stashWalletReturnPath(window.location.pathname + window.location.search);
    openEvmModal();
  }, [openEvmModal]);

  const iconPath = resolveWalletIconPath(connector?.id, connector?.name, lastWalletApp);

  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal }) => {
        if (!mounted) {
          return (
            <ConnectWalletButton disabled className={className} />
          );
        }

        if (account) {
          return (
            <div className={cn("flex min-w-0 items-center gap-1", className)}>
              {chain?.unsupported ? (
                <GlassButton type="button" variant="glass" size="sm" onClick={openChainModal}>
                  Wrong network
                </GlassButton>
              ) : null}
              <ConnectedPill
                iconSrc={iconPath}
                iconAlt={lastWalletApp ?? connector?.name ?? "Connected wallet"}
                label={shortenAddress(account.address, 4)}
                onClick={openAccountModal}
                title={lastWalletApp ?? connector?.name ?? account.address}
              />
            </div>
          );
        }

          return <ConnectWalletButton onClick={open} className={className} />;
      }}
    </ConnectButton.Custom>
  );
}

/**
 * Unified connect control — shows persistent EVM/Solana sessions independent of
 * the swap chain selector (one EVM connect covers all EVM chains).
 */
export function WalletConnectButton({ chainKey, className }: WalletConnectButtonProps) {
  const storeChainKey = useChainStore((s) => s.chainKey);
  const targetChainKey = chainKey ?? storeChainKey;
  const targetKind = getChainByKey(targetChainKey)?.kind ?? "evm";

  // Match connect button to the active page/chain — don't show EVM address on Solana swap.
  if (targetKind === "solana") {
    return <SolanaWalletButton className={className} />;
  }
  return <EvmWalletButton className={className} />;
}

/** Imperative connect — used from swap execute when wallet missing. */
export function useRequestWalletConnect() {
  return useWalletUiStore((s) => s.requestConnect);
}

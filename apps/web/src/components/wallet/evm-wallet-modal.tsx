"use client";

import { useCallback, useEffect } from "react";
import { useConnect, useConnectors, useAccount } from "wagmi";
import { ExternalLink, Loader2 } from "lucide-react";
import { GlassDialog, toast } from "@xauconnect/ui";
import {
  getWalletConnectProjectId,
  isWalletConnectProjectIdValid,
  MORE_EVM_WALLETS,
  pickEvmConnector,
  POPULAR_EVM_WALLETS,
  type EvmWalletDef,
} from "@/lib/evm-wallets";
import { isMobileUserAgent } from "@/lib/mobile-wallet";
import {
  buildMobileWalletDeepLink,
  buildWalletHandoffUrl,
  getMobileConnectionStrategy,
  hasInjectedEvmProvider,
  openMobileWalletDeepLink,
  supportsMobileConnection,
} from "@/lib/mobile-wallet-deeplink";
import { connectMobileWalletViaWalletConnect } from "@/lib/mobile-wallet-connect";
import { useWalletUiStore } from "@/lib/wallet-ui-store";

const CONNECT_TIMEOUT_MS = 60_000;
const HANDOFF_WAIT_MS = 90_000;

function withConnectTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("Connection timed out — open your wallet app and approve, or try again."));
    }, ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

function WalletIcon({ wallet }: { wallet: EvmWalletDef }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={wallet.iconPath}
      alt=""
      width={32}
      height={32}
      className="h-8 w-8 object-contain"
      loading="lazy"
      decoding="async"
    />
  );
}

function WalletRow({
  wallet,
  busy,
  disabled,
  mobile,
  onPick,
}: {
  wallet: EvmWalletDef;
  busy: boolean;
  disabled: boolean;
  mobile: boolean;
  onPick: (wallet: EvmWalletDef) => void;
}) {
  const showExternal = mobile && supportsMobileConnection(wallet.id);

  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onPick(wallet)}
        className="flex w-full items-center gap-3 rounded-xl border border-white/60 bg-white/50 px-3 py-2.5 text-left transition hover:border-gold/40 hover:bg-gold/10 disabled:opacity-50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm ring-1 ring-black/5">
          <WalletIcon wallet={wallet} />
        </span>
        <span className="min-w-0 flex-1 font-medium text-ink">{wallet.name}</span>
        {busy ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gold" aria-hidden />
        ) : showExternal ? (
          <ExternalLink className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
        ) : null}
      </button>
    </li>
  );
}

export function EvmWalletModal() {
  const open = useWalletUiStore((s) => s.evmModalOpen);
  const closeEvmModal = useWalletUiStore((s) => s.closeEvmModal);
  const connectingId = useWalletUiStore((s) => s.evmConnectingWalletId);
  const setConnectingId = useWalletUiStore((s) => s.setEvmConnectingWalletId);
  const setConnectPending = useWalletUiStore((s) => s.setEvmConnectPending);
  const setEvmHandoffMode = useWalletUiStore((s) => s.setEvmHandoffMode);
  const abortEvmConnect = useWalletUiStore((s) => s.abortEvmConnect);
  const connectors = useConnectors();
  const { connectAsync, isPending } = useConnect();
  const { isConnected } = useAccount();
  const mobile = isMobileUserAgent();
  const wcProjectId = getWalletConnectProjectId();
  const wcConfigured = isWalletConnectProjectIdValid(wcProjectId);
  const injected = hasInjectedEvmProvider();

  const popularWallets = mobile && !wcConfigured
    ? POPULAR_EVM_WALLETS.filter((w) => w.id !== "walletconnect")
    : POPULAR_EVM_WALLETS;

  const finishConnect = useCallback(
    (opts?: { cancelled?: boolean; message?: string }) => {
      abortEvmConnect();
      if (opts?.cancelled) {
        toast.error("Connection cancelled", {
          description: opts.message ?? "Wallet was not connected. Please try again.",
        });
      }
    },
    [abortEvmConnect],
  );

  const startMobileHandoff = useCallback(
    (wallet: EvmWalletDef) => {
      const page =
        typeof window !== "undefined"
          ? window.location.href.split("#")[0] ?? window.location.origin
          : "https://xauconnect.com/swap";
      const handoffUrl = buildWalletHandoffUrl(page, wallet.id);
      const deepLink = buildMobileWalletDeepLink(wallet.id, handoffUrl);
      if (!deepLink) {
        finishConnect({
          cancelled: true,
          message: `${wallet.name} on mobile — use WalletConnect or open this site inside the wallet app.`,
        });
        return;
      }

      setConnectingId(wallet.id);
      setConnectPending(true);
      setEvmHandoffMode(true);
      useWalletUiStore.getState().setLastWalletApp(wallet.name);
      closeEvmModal();

      window.setTimeout(() => openMobileWalletDeepLink(deepLink), 0);

      window.setTimeout(() => {
        if (!useWalletUiStore.getState().evmHandoffMode) return;
        setEvmHandoffMode(false);
        abortEvmConnect();
        toast.error("Connection timed out", {
          description: `Approve the connection inside ${wallet.name}, or try WalletConnect.`,
        });
      }, HANDOFF_WAIT_MS);
    },
    [
      abortEvmConnect,
      closeEvmModal,
      finishConnect,
      setConnectPending,
      setConnectingId,
      setEvmHandoffMode,
    ],
  );

  const handleWalletClick = useCallback(
    async (wallet: EvmWalletDef) => {
      if (connectingId || isPending) return;

      if (!isWalletConnectProjectIdValid(wcProjectId) && wallet.id === "walletconnect") {
        toast.error("WalletConnect is not configured", {
          description: "Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID or pick a wallet with its own mobile app.",
        });
        return;
      }

      useWalletUiStore.getState().setLastWalletApp(wallet.name);

      // Mobile browser without injection: deep-link into the wallet app.
      if (mobile && !injected) {
        const strategy = getMobileConnectionStrategy(wallet.id);

        if (strategy === "dapp-handoff") {
          startMobileHandoff(wallet);
          return;
        }

        if (strategy === "walletconnect") {
          if (!isWalletConnectProjectIdValid(wcProjectId)) {
            toast.error("WalletConnect is not configured", {
              description: "Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to connect on mobile.",
            });
            return;
          }

          setConnectingId(wallet.id);
          setConnectPending(true);
          closeEvmModal();

          try {
            await withConnectTimeout(
              connectMobileWalletViaWalletConnect({
                wallet,
                connectors,
                connectAsync,
              }),
              CONNECT_TIMEOUT_MS,
            );
            setConnectPending(false);
            setConnectingId(null);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Connection failed";
            const userRejected = /reject|denied|cancel|closed|declined/i.test(msg);
            finishConnect({
              cancelled: true,
              message: userRejected
                ? "You declined the connection. Tap Connect wallet to try again."
                : msg.slice(0, 140),
            });
          }
          return;
        }

        if (wallet.id === "safe") {
          finishConnect({
            cancelled: true,
            message: `${wallet.name} connects inside the Safe app — open your Safe and use this site as a Safe App.`,
          });
          return;
        }

        openMobileWalletDeepLink(wallet.installUrl);
        return;
      }

      setConnectingId(wallet.id);
      setConnectPending(true);

      const connector = pickEvmConnector(wallet, connectors);
      if (!connector) {
        finishConnect({
          cancelled: true,
          message: `Install ${wallet.name} or use WalletConnect.`,
        });
        return;
      }

      try {
        await withConnectTimeout(connectAsync({ connector }), CONNECT_TIMEOUT_MS);
        setConnectPending(false);
        setConnectingId(null);
        closeEvmModal();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Connection failed";
        const userRejected = /reject|denied|cancel|closed|declined/i.test(msg);
        finishConnect({
          cancelled: true,
          message: userRejected
            ? "You declined the connection. Tap Connect wallet to try again."
            : msg.slice(0, 140),
        });
      }
    },
    [
      closeEvmModal,
      connectAsync,
      connectors,
      connectingId,
      finishConnect,
      injected,
      isPending,
      mobile,
      setConnectPending,
      setConnectingId,
      startMobileHandoff,
      wcProjectId,
    ],
  );

  useEffect(() => {
    if (isConnected && connectingId) {
      setConnectPending(false);
      setConnectingId(null);
      setEvmHandoffMode(false);
    }
  }, [isConnected, connectingId, setConnectPending, setConnectingId, setEvmHandoffMode]);

  return (
    <GlassDialog
      open={open}
      onClose={() => {
        if (connectingId) {
          finishConnect({
            cancelled: true,
            message: "Connection in progress was cancelled.",
          });
        }
        closeEvmModal();
      }}
      title="Connect a Wallet"
      scrollBody={false}
      className="max-w-md"
    >
      {mobile && !injected && (
        <p className="mb-3 rounded-xl bg-gold/10 px-3 py-2 text-xs text-ink-muted">
          Tap a wallet to open it directly — either{" "}
          <strong className="font-semibold text-ink">inside the wallet browser</strong> or via{" "}
          <strong className="font-semibold text-ink">WalletConnect</strong>. Approve the connection in the app when
          prompted.
        </p>
      )}

      {mobile && !injected && !wcConfigured && (
        <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
          WalletConnect is temporarily unavailable. Use <strong>MetaMask</strong>, <strong>Trust Wallet</strong>, or{" "}
          <strong>Coinbase Wallet</strong> — they open this site inside the wallet app.
        </p>
      )}

      <div className="flex max-h-[min(70dvh,32rem)] flex-col gap-4 overflow-y-auto overscroll-contain pr-1">
        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Popular</p>
          <ul className="flex flex-col gap-1.5">
            {popularWallets.map((wallet) => (
              <WalletRow
                key={wallet.id}
                wallet={wallet}
                busy={connectingId === wallet.id}
                disabled={!!connectingId && connectingId !== wallet.id}
                mobile={mobile}
                onPick={(w) => void handleWalletClick(w)}
              />
            ))}
          </ul>
        </section>

        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            More wallets ({MORE_EVM_WALLETS.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {MORE_EVM_WALLETS.map((wallet) => (
              <WalletRow
                key={wallet.id}
                wallet={wallet}
                busy={connectingId === wallet.id}
                disabled={!!connectingId && connectingId !== wallet.id}
                mobile={mobile}
                onPick={(w) => void handleWalletClick(w)}
              />
            ))}
          </ul>
        </section>
      </div>

      <p className="mt-4 shrink-0 text-center text-xs text-ink-muted">
        Each wallet opens in its own app browser. WalletConnect supports 300+ additional mobile wallets.{" "}
        <a
          href="https://ethereum.org/en/wallets/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gold hover:underline"
        >
          Learn more
        </a>
      </p>
    </GlassDialog>
  );
}

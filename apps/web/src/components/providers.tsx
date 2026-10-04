"use client";

/**
 * Global client providers:
 *   TanStack Query -> wagmi -> RainbowKit (EVM) -> Solana wallet adapter + modal.
 */
import { Suspense, useMemo, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  TrustWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { bootstrapSessionToken } from "@/lib/session";
import { registerAppQueryClient } from "@/lib/query-client";
import { createWagmiConfig } from "@/lib/wagmi";
import { resolveWalletConnectProjectId, WALLETCONNECT_PROJECT_ID } from "@/lib/public-runtime-config";
import { WalletConnectEffects } from "@/components/wallet/wallet-connect-effects";
import { WalletConnectTracker } from "@/components/wallet/wallet-connect-tracker";
import { MobileWalletHandoffConnect } from "@/components/wallet/mobile-wallet-handoff-connect";
import { EvmWalletModal } from "@/components/wallet/evm-wallet-modal";
import "@rainbow-me/rainbowkit/styles.css";
import "@solana/wallet-adapter-react-ui/styles.css";

if (typeof window !== "undefined") bootstrapSessionToken();

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 1 },
      },
    });
    registerAppQueryClient(client);
    return client;
  });

  const wagmiConfig = useMemo(() => {
    const projectId =
      resolveWalletConnectProjectId() || WALLETCONNECT_PROJECT_ID;
    return createWagmiConfig(projectId);
  }, []);

  const solanaEndpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://solana-rpc.publicnode.com";
  const solanaWallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TrustWalletAdapter(),
    ],
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: "#FFAA00",
            accentColorForeground: "#15171C",
            borderRadius: "large",
            fontStack: "system",
          })}
          modalSize="compact"
        >
          <ConnectionProvider endpoint={solanaEndpoint}>
            <WalletProvider wallets={solanaWallets} autoConnect>
              <WalletModalProvider>
                <Suspense fallback={null}>
                  <WalletConnectEffects />
                  <MobileWalletHandoffConnect />
                  <WalletConnectTracker />
                </Suspense>
                <EvmWalletModal />
                {children}
              </WalletModalProvider>
            </WalletProvider>
          </ConnectionProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

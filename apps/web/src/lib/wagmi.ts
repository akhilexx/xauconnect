/**
 * wagmi + RainbowKit — full EVM wallet roster for direct + WalletConnect connections.
 */
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  trustWallet,
  binanceWallet,
  okxWallet,
  coinbaseWallet,
  rainbowWallet,
  walletConnectWallet,
  phantomWallet,
  rabbyWallet,
  ledgerWallet,
  safepalWallet,
  tokenPocketWallet,
  bitgetWallet,
  zerionWallet,
  imTokenWallet,
  braveWallet,
  uniswapWallet,
  argentWallet,
  injectedWallet,
  backpackWallet,
  bybitWallet,
  frameWallet,
  frontierWallet,
  krakenWallet,
  oneKeyWallet,
  coreWallet,
  foxWallet,
  gateWallet,
  mewWallet,
  tahoWallet,
  roninWallet,
  enkryptWallet,
  talismanWallet,
  safeWallet,
  coin98Wallet,
  compassWallet,
  subWallet,
  oneInchWallet,
  ctrlWallet,
  xPortalWallet,
  oktoWallet,
  paraSwapWallet,
  wigwamWallet,
  zealWallet,
  geminiWallet,
  dawnWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { mainnet, bsc, polygon, arbitrum, base, avalanche } from "wagmi/chains";
import { http } from "wagmi";
import { resolveWalletConnectProjectId } from "./public-runtime-config";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xauconnect.com";

const walletConnectParameters = {
  metadata: {
    name: "XAUConnect",
    description: "The Gold-Standard Multi-Chain DEX & Token Launch Platform",
    url: appUrl,
    icons: [`${appUrl}/brand/logo-192.png`],
  },
};

export function createWagmiConfig(projectId: string) {
  return getDefaultConfig({
    appName: "XAUConnect",
    appDescription: "The Gold-Standard Multi-Chain DEX & Token Launch Platform",
    appIcon: `${appUrl}/brand/logo-192.png`,
    appUrl,
    projectId,
    walletConnectParameters,
  wallets: [
    {
      groupName: "Popular",
      wallets: [
        walletConnectWallet,
        metaMaskWallet,
        trustWallet,
        binanceWallet,
        okxWallet,
        coinbaseWallet,
        phantomWallet,
        rainbowWallet,
      ],
    },
    {
      groupName: "More wallets",
      wallets: [
        rabbyWallet,
        ledgerWallet,
        bitgetWallet,
        safepalWallet,
        tokenPocketWallet,
        zerionWallet,
        imTokenWallet,
        braveWallet,
        uniswapWallet,
        argentWallet,
        backpackWallet,
        bybitWallet,
        frameWallet,
        frontierWallet,
        krakenWallet,
        oneKeyWallet,
        coreWallet,
        foxWallet,
        gateWallet,
        mewWallet,
        tahoWallet,
        roninWallet,
        enkryptWallet,
        talismanWallet,
        safeWallet,
        coin98Wallet,
        compassWallet,
        subWallet,
        oneInchWallet,
        ctrlWallet,
        xPortalWallet,
        oktoWallet,
        paraSwapWallet,
        wigwamWallet,
        zealWallet,
        geminiWallet,
        dawnWallet,
        injectedWallet,
      ],
    },
  ],
  chains: [mainnet, bsc, polygon, arbitrum, base, avalanche],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [avalanche.id]: http(),
  },
  ssr: true,
  });
}

const fallbackProjectId =
  resolveWalletConnectProjectId() || "bypass-invalid-wc-project-id-placeholder";

/** SSR / first paint — client Providers may recreate with runtime-config.js id. */
export const wagmiConfig = createWagmiConfig(fallbackProjectId);

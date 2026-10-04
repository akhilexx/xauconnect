/**
 * Mobile WalletConnect pairing with wallet-specific deep links.
 */
import type { Connector } from "wagmi";
import type { EvmWalletDef } from "./evm-wallets";
import { findWalletConnectConnector, pickEvmConnector } from "./evm-wallets";
import {
  buildWalletConnectDeepLink,
  openMobileWalletDeepLink,
} from "./mobile-wallet-deeplink";

const WC_URI_TIMEOUT_MS = 15_000;

function isInjectedConnector(connector: Connector): boolean {
  const id = connector.id.toLowerCase();
  const type = connector.type?.toLowerCase() ?? "";
  return type === "injected" || id === "injected" || id.includes("injected");
}

/** Pick a connector that can emit a WalletConnect URI on mobile. */
export function pickMobileWalletConnectConnector(
  wallet: EvmWalletDef,
  connectors: readonly Connector[],
): Connector | undefined {
  if (wallet.id === "walletconnect") {
    return findWalletConnectConnector(connectors);
  }

  const direct = pickEvmConnector(wallet, connectors);
  if (direct && !isInjectedConnector(direct)) {
    return direct;
  }

  return findWalletConnectConnector(connectors);
}

function waitForWalletConnectUri(connector: Connector): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("WalletConnect URI timed out — open your wallet app and try again."));
    }, WC_URI_TIMEOUT_MS);

    const onMessage = (message: { type: string; data?: unknown }) => {
      if (message.type !== "display_uri" || typeof message.data !== "string") return;
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      resolve(message.data);
    };

    const cleanup = () => {
      connector.emitter.off("message", onMessage);
    };

    connector.emitter.on("message", onMessage);
  });
}

export type MobileWalletConnectParams = {
  wallet: EvmWalletDef;
  connectors: readonly Connector[];
  connectAsync: (args: { connector: Connector }) => Promise<unknown>;
};

/**
 * Start WalletConnect pairing, open the wallet app via its mobile deep link,
 * and complete the wagmi connection when the user approves in the wallet app.
 */
export async function connectMobileWalletViaWalletConnect({
  wallet,
  connectors,
  connectAsync,
}: MobileWalletConnectParams): Promise<void> {
  const connector = pickMobileWalletConnectConnector(wallet, connectors);
  if (!connector) {
    throw new Error(`${wallet.name} is not available — install the app or try WalletConnect.`);
  }

  const uriPromise = waitForWalletConnectUri(connector);
  const connectPromise = connectAsync({ connector });

  const wcUri = await uriPromise;
  const deepLink = buildWalletConnectDeepLink(wallet.id, wcUri);
  window.setTimeout(() => openMobileWalletDeepLink(deepLink), 0);

  await connectPromise;
}

/**
 * Mobile wallet deep links — dApp-browser handoff + WalletConnect app links.
 *
 * @see https://docs.metamask.io/metamask-connect/evm/guides/metamask-exclusive/use-deeplinks/
 * @see https://developer.trustwallet.com/developer/develop-for-trust/deeplinking
 * @see https://docs.phantom.com/phantom-deeplinks/other-methods/browse
 * @see https://web3.okx.com/build/docs/waas/app-universal-link
 * @see https://help.tokenpocket.pro/developer-en/wallet/pull-up-wallet-with-deeplink
 * @see https://imtoken.gitbook.io/developers/products/universal-links
 * @see https://web3.bitget.com/en/docs/configuration/deeplink
 * @see https://docs.coin98.com/developer-guide/deeplink
 * @see https://developer.onekey.so/en/connect-to-software/mobile-deeplinks/
 */

export type MobileConnectionStrategy = "dapp-handoff" | "walletconnect";

/** Prefer in-app browser (injected provider) when available. */
const DAPP_HANDOFF_WALLET_IDS = new Set([
  "metamask",
  "trust",
  "coinbase",
  "phantom",
  "rainbow",
  "okx",
  "tokenpocket",
  "imtoken",
  "bitget",
  "coin98",
]);

/** Wallets with a known WalletConnect mobile deep-link wrapper (RainbowKit + official docs). */
const WC_DEEP_LINK_WALLET_IDS = new Set([
  "walletconnect",
  "metamask",
  "trust",
  "binance",
  "okx",
  "coinbase",
  "phantom",
  "rainbow",
  "rabby",
  "ledger",
  "bitget",
  "safepal",
  "tokenpocket",
  "zerion",
  "imtoken",
  "uniswap",
  "argent",
  "backpack",
  "bybit",
  "frontier",
  "kraken",
  "onekey",
  "core",
  "fox",
  "gate",
  "mew",
  "ronin",
  "coin98",
  "subwallet",
  "oneinch",
  "xportal",
  "okto",
  "paraswap",
  "zeal",
  "gemini",
  "brave",
  "taho",
  "talisman",
  "enkrypt",
  "compass",
  "ctrl",
  "frame",
  "wigwam",
  "dawn",
  "injected",
]);

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function getMobileConnectionStrategy(walletId: string): MobileConnectionStrategy | null {
  if (walletId === "safe") return null;
  if (DAPP_HANDOFF_WALLET_IDS.has(walletId)) return "dapp-handoff";
  if (WC_DEEP_LINK_WALLET_IDS.has(walletId)) return "walletconnect";
  return null;
}

export function supportsMobileConnection(walletId: string): boolean {
  return getMobileConnectionStrategy(walletId) !== null;
}

/** @deprecated Use supportsMobileConnection or getMobileConnectionStrategy. */
export function supportsMobileDappHandoff(walletId: string): boolean {
  return DAPP_HANDOFF_WALLET_IDS.has(walletId);
}

export function hasInjectedEvmProvider(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    ethereum?: unknown;
    trustwallet?: { ethereum?: unknown };
    coinbaseWalletExtension?: unknown;
    okxwallet?: unknown;
  };
  return Boolean(
    w.ethereum || w.trustwallet?.ethereum || w.coinbaseWalletExtension || w.okxwallet,
  );
}

/** URL loaded inside the wallet browser — triggers auto-connect on load. */
export function buildWalletHandoffUrl(pageUrl: string, walletId: string): string {
  const url = new URL(pageUrl);
  url.searchParams.set("connect", "1");
  url.searchParams.set("wallet", walletId);
  return url.toString();
}

function metamaskDappPath(handoffUrl: string): string {
  const u = new URL(handoffUrl);
  const path = `${u.host}${u.pathname}${u.search}`;
  return path.startsWith("/") ? path.slice(1) : path;
}

function bitgetDappLink(handoffUrl: string): string {
  const actionId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());
  const params = new URLSearchParams({
    action: "DApp",
    url: handoffUrl,
    actionID: actionId,
    dappName: "XAUConnect",
  });
  if (isAndroid()) {
    return `https://bkcode.vip?${params.toString()}`;
  }
  return `bitkeep://bkconnect?${params.toString()}`;
}

function tokenPocketDappLink(handoffUrl: string): string {
  const params = encodeURIComponent(
    JSON.stringify({ url: handoffUrl, chain: "ETH", source: "xauconnect" }),
  );
  return `tpdapp://open?params=${params}`;
}

function coin98DappLink(handoffUrl: string, chainId = 1): string {
  const u = new URL(handoffUrl);
  const link = `${u.host}${u.pathname === "/" ? "" : u.pathname}${u.search}`;
  return `https://coin98.com/dapp/${link}/${chainId}`;
}

/**
 * Build the wallet-specific deep link that opens `handoffUrl` in the in-app browser.
 */
export function buildMobileWalletDeepLink(walletId: string, handoffUrl: string): string | null {
  const origin = new URL(handoffUrl).origin;

  switch (walletId) {
    case "metamask":
      return `https://link.metamask.io/dapp/${metamaskDappPath(handoffUrl)}`;
    case "trust":
      return `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(handoffUrl)}`;
    case "coinbase":
      return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(handoffUrl)}`;
    case "phantom":
      return `https://phantom.app/ul/browse/${encodeURIComponent(handoffUrl)}?ref=${encodeURIComponent(origin)}`;
    case "rainbow":
      return `https://rnbwapp.com/open?url=${encodeURIComponent(handoffUrl)}`;
    case "okx": {
      const okxDeep = `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(handoffUrl)}`;
      return `https://web3.okx.com/download?deeplink=${encodeURIComponent(okxDeep)}`;
    }
    case "tokenpocket":
      return tokenPocketDappLink(handoffUrl);
    case "imtoken":
      return `https://connect.token.im/link/navigate/DappView?url=${encodeURIComponent(handoffUrl)}`;
    case "bitget":
      return bitgetDappLink(handoffUrl);
    case "coin98":
      return coin98DappLink(handoffUrl);
    default:
      return null;
  }
}

type WcLinkBuilder = (uri: string) => string;

/**
 * Wrap a WalletConnect pairing URI with a wallet-specific mobile deep link.
 * Patterns mirror @rainbow-me/rainbowkit wallet connectors + official wallet docs.
 */
export function buildWalletConnectDeepLink(walletId: string, wcUri: string): string {
  const builders: Record<string, WcLinkBuilder> = {
    walletconnect: (uri) => uri,
    trust: (uri) => `trust://wc?uri=${encodeURIComponent(uri)}`,
    tokenpocket: (uri) => `tpoutside://wc?uri=${encodeURIComponent(uri)}`,
    imtoken: (uri) => `imtokenv2://wc?uri=${encodeURIComponent(uri)}`,
    zerion: (uri) => (isIOS() ? `zerion://wc?uri=${encodeURIComponent(uri)}` : uri),
    bitget: (uri) => (isAndroid() ? uri : `bitkeep://wc?uri=${encodeURIComponent(uri)}`),
    uniswap: (uri) => `uniswap://wc?uri=${encodeURIComponent(uri)}`,
    argent: (uri) => (isAndroid() ? uri : `argent://app/wc?uri=${encodeURIComponent(uri)}`),
    bybit: (uri) =>
      `bybitapp://open/route?targetUrl=by://web3/walletconnect/wc?uri=${encodeURIComponent(uri)}`,
    ronin: (uri) => `roninwallet://wc?uri=${encodeURIComponent(uri)}`,
    mew: (uri) => `https://mewwallet.com/wc?uri=${encodeURIComponent(uri)}`,
    frontier: (uri) =>
      isAndroid() ? `frontier://wc?uri=${encodeURIComponent(uri)}` : uri,
    gate: (uri) => (isAndroid() ? uri : `gtweb3wallet://wc?uri=${encodeURIComponent(uri)}`),
    zeal: (uri) => `zeal://wc?uri=${encodeURIComponent(uri)}`,
    okx: (uri) => (isAndroid() ? uri : `okex://main/wc?uri=${encodeURIComponent(uri)}`),
    binance: (uri) =>
      isAndroid() ? uri : `bnc://app.binance.com/cedefi/wc?uri=${encodeURIComponent(uri)}`,
    safepal: (uri) => `safepalwallet://wc?uri=${encodeURIComponent(uri)}`,
    subwallet: (uri) => `subwallet://wc?uri=${encodeURIComponent(uri)}`,
    oneinch: (uri) => `oneinch://wc?uri=${encodeURIComponent(uri)}`,
    paraswap: (uri) => `paraswap://wc?uri=${encodeURIComponent(uri)}`,
    fox: (uri) => `foxwallet://wc?uri=${encodeURIComponent(uri)}`,
    okto: (uri) => (isAndroid() ? uri : `okto://wc?uri=${encodeURIComponent(uri)}`),
    xportal: (uri) => (isIOS() ? `xportal://wc?uri=${encodeURIComponent(uri)}` : uri),
    kraken: (uri) => `krakenwallet://wc?uri=${encodeURIComponent(uri)}`,
    ledger: (uri) => (isAndroid() ? uri : `ledgerlive://wc?uri=${encodeURIComponent(uri)}`),
    onekey: (uri) => `https://app.onekey.so/wc/connect/wc?uri=${encodeURIComponent(uri)}`,
    rainbow: (uri) =>
      isIOS()
        ? `rainbow://wc?uri=${encodeURIComponent(uri)}&connector=rainbowkit`
        : `https://rnbwapp.com/wc?uri=${encodeURIComponent(uri)}`,
    rabby: (uri) => `rabby://wc?uri=${encodeURIComponent(uri)}`,
    coin98: (uri) => uri,
    core: (uri) => uri,
    gemini: (uri) => uri,
    phantom: (uri) => uri,
    coinbase: (uri) => uri,
    metamask: (uri) => uri,
    brave: (uri) => uri,
    backpack: (uri) => uri,
    taho: (uri) => uri,
    talisman: (uri) => uri,
    enkrypt: (uri) => uri,
    compass: (uri) => uri,
    ctrl: (uri) => uri,
    frame: (uri) => uri,
    wigwam: (uri) => uri,
    dawn: (uri) => uri,
    injected: (uri) => uri,
  };

  const builder = builders[walletId];
  if (builder) return builder(wcUri);

  // Unknown wallet — open raw WC URI (Android intent chooser / iOS universal handler).
  return wcUri;
}

/** Resolve the deep link to open for a wallet on mobile (handoff or WC — caller supplies WC URI when needed). */
export function resolveMobileWalletLink(
  walletId: string,
  opts: { pageUrl: string; wcUri?: string },
): string | null {
  const strategy = getMobileConnectionStrategy(walletId);
  if (!strategy) return null;

  if (strategy === "dapp-handoff") {
    const handoff = buildWalletHandoffUrl(opts.pageUrl, walletId);
    return buildMobileWalletDeepLink(walletId, handoff);
  }

  if (!opts.wcUri) return null;
  return buildWalletConnectDeepLink(walletId, opts.wcUri);
}

/**
 * Open a deep link via a synthetic anchor click (works better than location.href
 * on iOS/Android Chrome — avoids popup-blocker / App Store misroutes).
 */
export function openMobileWalletDeepLink(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_self";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * EVM wallet catalog — local icons in /public/wallets/, connector IDs, deep links.
 */
import {
  buildMobileWalletDeepLink,
  buildWalletHandoffUrl,
  getMobileConnectionStrategy,
  supportsMobileConnection,
} from "./mobile-wallet-deeplink";

export type EvmWalletGroup = "popular" | "more";

export type EvmWalletDef = {
  id: string;
  name: string;
  group: EvmWalletGroup;
  /** wagmi / RainbowKit connector.id values */
  connectorIds: string[];
  /** Path under /public/wallets/ */
  iconPath: string;
  installUrl: string;
  mobileDappUrl?: (pageUrl: string) => string;
};

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://xauconnect.com";

function pageUrl(path = "/swap"): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${window.location.pathname}${window.location.search}`;
  }
  return `${APP_ORIGIN}${path}`;
}

function w(
  id: string,
  name: string,
  connectorIds: string[],
  group: EvmWalletGroup,
  installUrl: string,
  iconFile = `${id}.svg`,
  mobileDappUrl?: (url: string) => string,
): EvmWalletDef {
  return {
    id,
    name,
    group,
    connectorIds,
    iconPath: `/wallets/${iconFile}`,
    installUrl,
    mobileDappUrl,
  };
}

export const EVM_WALLETS: EvmWalletDef[] = [
  // ── Popular (direct connect + WalletConnect) ─────────────────────────────
  w("walletconnect", "WalletConnect", ["walletConnect"], "popular", "https://walletconnect.com/wallets"),
  w(
    "metamask",
    "MetaMask",
    ["metaMask", "io.metamask"],
    "popular",
    "https://metamask.io/download/",
    "metamask.svg",
    (url) => `https://metamask.app.link/dapp/${encodeURIComponent(url.replace(/^https?:\/\//, ""))}`,
  ),
  w(
    "trust",
    "Trust Wallet",
    ["trust", "trustWallet"],
    "popular",
    "https://trustwallet.com/download",
    "trust.svg",
    (url) => `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(url)}`,
  ),
  w("binance", "Binance Wallet", ["binance", "BinanceW3W", "binanceWallet"], "popular", "https://www.binance.com/en/web3wallet", "binance.svg", () => "https://www.binance.com/en/web3wallet"),
  w(
    "okx",
    "OKX Wallet",
    ["okx", "okxWallet", "OKX Wallet"],
    "popular",
    "https://www.okx.com/web3",
    "okx.svg",
    (url) => `okex://wallet/dapp/url?dappUrl=${encodeURIComponent(url)}`,
  ),
  w(
    "coinbase",
    "Coinbase Wallet",
    ["coinbaseWallet", "coinbaseWalletSDK", "com.coinbase.wallet"],
    "popular",
    "https://www.coinbase.com/wallet/downloads",
    "coinbase.svg",
    (url) => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`,
  ),
  w(
    "phantom",
    "Phantom",
    ["phantom", "app.phantom"],
    "popular",
    "https://phantom.app/download",
    "phantom.svg",
    (url) => `https://phantom.app/ul/browse/${encodeURIComponent(url)}`,
  ),
  w(
    "rainbow",
    "Rainbow",
    ["rainbow", "rainbowWallet"],
    "popular",
    "https://rainbow.me/download",
    "rainbow.svg",
    (url) => `https://rnbwapp.com/open?url=${encodeURIComponent(url)}`,
  ),

  // ── More wallets (30+ direct options) ──────────────────────────────────────
  w("rabby", "Rabby Wallet", ["rabby", "io.rabby"], "more", "https://rabby.io/"),
  w("ledger", "Ledger", ["ledger"], "more", "https://www.ledger.com/ledger-live"),
  w("bitget", "Bitget Wallet", ["bitget", "bitgetWallet"], "more", "https://web3.bitget.com/"),
  w("safepal", "SafePal", ["safepal", "safepalWallet"], "more", "https://www.safepal.com/download"),
  w("tokenpocket", "TokenPocket", ["tokenPocket", "tokenPocketWallet"], "more", "https://www.tokenpocket.pro/"),
  w("zerion", "Zerion", ["zerion", "zerionWallet"], "more", "https://zerion.io/"),
  w("imtoken", "imToken", ["imToken", "imTokenWallet"], "more", "https://token.im/"),
  w("brave", "Brave Wallet", ["brave", "braveWallet"], "more", "https://brave.com/wallet/"),
  w("uniswap", "Uniswap Wallet", ["uniswapWallet", "uniswap"], "more", "https://wallet.uniswap.org/"),
  w("argent", "Argent", ["argent", "argentWallet"], "more", "https://www.argent.xyz/"),
  w("backpack", "Backpack", ["backpack", "backpackWallet"], "more", "https://backpack.app/"),
  w("bybit", "Bybit Wallet", ["bybit", "bybitWallet"], "more", "https://www.bybit.com/web3/"),
  w("frame", "Frame", ["frame", "frameWallet"], "more", "https://frame.sh/"),
  w("frontier", "Frontier", ["frontier", "frontierWallet"], "more", "https://frontier.xyz/"),
  w("kraken", "Kraken Wallet", ["kraken", "krakenWallet"], "more", "https://www.kraken.com/wallet"),
  w("onekey", "OneKey", ["oneKey", "oneKeyWallet"], "more", "https://onekey.so/"),
  w("core", "Core", ["core", "coreWallet"], "more", "https://core.app/"),
  w("fox", "FoxWallet", ["fox", "foxWallet"], "more", "https://foxwallet.com/"),
  w("gate", "Gate Wallet", ["gate", "gateWallet"], "more", "https://www.gate.io/web3"),
  w("mew", "MEW Wallet", ["mew", "mewWallet"], "more", "https://www.myetherwallet.com/"),
  w("taho", "Taho", ["taho", "tahoWallet"], "more", "https://taho.xyz/"),
  w("ronin", "Ronin Wallet", ["ronin", "roninWallet"], "more", "https://wallet.roninchain.com/"),
  w("enkrypt", "Enkrypt", ["enkrypt", "enkryptWallet"], "more", "https://www.enkrypt.com/"),
  w("talisman", "Talisman", ["talisman", "talismanWallet"], "more", "https://talisman.xyz/"),
  w("safe", "Safe", ["safe", "safeWallet"], "more", "https://safe.global/"),
  w("coin98", "Coin98", ["coin98", "coin98Wallet"], "more", "https://coin98.com/wallet"),
  w("compass", "Compass", ["compass", "compassWallet"], "more", "https://compasswallet.io/"),
  w("subwallet", "SubWallet", ["subWallet", "subwallet"], "more", "https://subwallet.app/"),
  w("oneinch", "1inch Wallet", ["oneInch", "oneInchWallet"], "more", "https://1inch.io/wallet/"),
  w("ctrl", "Ctrl Wallet", ["ctrl", "ctrlWallet"], "more", "https://ctrl.xyz/"),
  w("xportal", "xPortal", ["xPortal", "xPortalWallet"], "more", "https://xportal.com/"),
  w("okto", "Okto", ["okto", "oktoWallet"], "more", "https://okto.tech/"),
  w("paraswap", "ParaSwap", ["paraSwap", "paraSwapWallet"], "more", "https://paraswap.io/"),
  w("wigwam", "Wigwam", ["wigwam", "wigwamWallet"], "more", "https://wigwam.app/"),
  w("zeal", "Zeal", ["zeal", "zealWallet"], "more", "https://zeal.app/"),
  w("gemini", "Gemini", ["gemini", "geminiWallet"], "more", "https://www.gemini.com/wallet"),
  w("dawn", "Dawn", ["dawn", "dawnWallet"], "more", "https://dawn.xyz/"),
  w(
    "injected",
    "Browser Wallet",
    ["injected", "eip6963"],
    "more",
    "https://ethereum.org/en/wallets/",
    "injected.svg",
  ),
];

export const POPULAR_EVM_WALLETS = EVM_WALLETS.filter((x) => x.group === "popular");
export const MORE_EVM_WALLETS = EVM_WALLETS.filter((x) => x.group === "more");

export function isWalletConnectProjectIdValid(id: string | undefined): boolean {
  if (!id) return false;
  if (id === "demo" || id === "xauconnect-demo" || id === "YOUR_PROJECT_ID_HERE") return false;
  return id.length >= 20;
}

/** Public WalletConnect Cloud project id — not a secret (visible in every dApp bundle). */
export const WALLETCONNECT_PROJECT_ID = "bee84fb01deef3c2f88c326565c66089";

/** Module-level so Next.js inlines NEXT_PUBLIC_* at build time in client bundles. */
const BAKED_WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export function getWalletConnectProjectId(): string {
  if (typeof window !== "undefined") {
    const runtime = (
      window as Window & { __XAU_RUNTIME__?: { walletConnectProjectId?: string } }
    ).__XAU_RUNTIME__?.walletConnectProjectId;
    if (isWalletConnectProjectIdValid(runtime)) return runtime!;
  }
  if (isWalletConnectProjectIdValid(BAKED_WALLETCONNECT_PROJECT_ID)) {
    return BAKED_WALLETCONNECT_PROJECT_ID;
  }
  if (isWalletConnectProjectIdValid(WALLETCONNECT_PROJECT_ID)) {
    return WALLETCONNECT_PROJECT_ID;
  }
  return "";
}

export function resolveWalletOpenUrl(wallet: EvmWalletDef, mobile: boolean): string | null {
  if (!mobile) return wallet.installUrl;
  const page = pageUrl();
  if (getMobileConnectionStrategy(wallet.id) === "dapp-handoff") {
    return buildMobileWalletDeepLink(wallet.id, buildWalletHandoffUrl(page, wallet.id));
  }
  if (supportsMobileConnection(wallet.id)) {
    return wallet.installUrl;
  }
  return wallet.installUrl;
}

export function findWalletConnectConnector(
  connectors: ReturnType<typeof import("wagmi").useConnectors>,
) {
  return connectors.find((c) => {
    const id = c.id.toLowerCase();
    return id === "walletconnect" || id.includes("walletconnect");
  });
}

/** Map wagmi connector / last-picked wallet to a local icon under /public/wallets/. */
export function resolveWalletIconPath(
  connectorId?: string | null,
  connectorName?: string | null,
  walletApp?: string | null,
): string {
  const needles = [connectorId, connectorName, walletApp]
    .filter((v): v is string => Boolean(v))
    .map((v) => v.toLowerCase());

  if (walletApp) {
    const byName = EVM_WALLETS.find((w) => w.name.toLowerCase() === walletApp.toLowerCase());
    if (byName) return byName.iconPath;
  }

  for (const wallet of EVM_WALLETS) {
    for (const id of wallet.connectorIds) {
      const cid = id.toLowerCase();
      if (needles.some((n) => n.includes(cid) || cid.includes(n))) {
        return wallet.iconPath;
      }
    }
    const wname = wallet.name.toLowerCase();
    if (needles.some((n) => n.includes(wname) || wname.includes(n))) {
      return wallet.iconPath;
    }
  }

  return "/wallets/walletconnect.svg";
}

/** Resolve the wagmi connector for the wallet the user picked. WalletConnect is only used for the WalletConnect row. */
export function pickEvmConnector(
  wallet: EvmWalletDef,
  connectors: ReturnType<typeof import("wagmi").useConnectors>,
) {
  if (wallet.id === "walletconnect") {
    return connectors.find((c) => {
      const id = c.id.toLowerCase();
      return id === "walletconnect" || id.includes("walletconnect");
    });
  }
  return findConnector(wallet, connectors);
}

function findConnector(
  wallet: EvmWalletDef,
  connectors: ReturnType<typeof import("wagmi").useConnectors>,
) {
  const ids = new Set(wallet.connectorIds.map((id) => id.toLowerCase()));
  return connectors.find((c) => {
    const cid = c.id.toLowerCase();
    const cname = c.name.toLowerCase();
    return ids.has(cid) || ids.has(cname) || cname === wallet.name.toLowerCase();
  });
}

export { pageUrl as walletConnectPageUrl };

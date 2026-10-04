/**
 * Mobile browser / in-app WebView detection for wallet connect UX.
 */

export function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /FBAN|FBAV|Instagram|Twitter|Line\/|MicroMessenger|Telegram|Snapchat|TikTok/i.test(ua) ||
    (isMobileUserAgent() && !/Chrome|CriOS|FxiOS|EdgiOS|Safari/i.test(ua) && /AppleWebKit/i.test(ua))
  );
}

export type MobileWalletHint = {
  title: string;
  body: string;
};

export function getMobileWalletHint(): MobileWalletHint | null {
  if (typeof window === "undefined") return null;
  if (!isMobileUserAgent()) return null;

  if (isInAppBrowser()) {
    return {
      title: "Open in your wallet app",
      body: "In-app browsers (Twitter, Telegram, etc.) often block extensions. Tap Connect and pick MetaMask, Coinbase, Phantom, or Trust — or open xauconnect.com in Safari / your wallet browser.",
    };
  }

  return {
    title: "Mobile wallet tip",
    body: "Tap your wallet — it opens the app directly so you can connect. Each wallet uses its official deep link or WalletConnect.",
  };
}

/** Persist return path across mobile wallet app handoff. */
export function stashWalletReturnPath(path: string): void {
  try {
    sessionStorage.setItem("xau-wallet-return", path);
  } catch {
    /* private mode */
  }
}

export function consumeWalletReturnPath(): string | null {
  try {
    const p = sessionStorage.getItem("xau-wallet-return");
    if (p) sessionStorage.removeItem("xau-wallet-return");
    return p;
  } catch {
    return null;
  }
}

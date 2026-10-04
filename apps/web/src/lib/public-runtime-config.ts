/**
 * Runtime + build-time public config for the web client.
 * WalletConnect project ID is baked at build time when possible, with a
 * hardcoded public fallback and optional /runtime-config.js override.
 */
import { isWalletConnectProjectIdValid, WALLETCONNECT_PROJECT_ID } from "./evm-wallets";

declare global {
  interface Window {
    __XAU_RUNTIME__?: {
      walletConnectProjectId?: string;
    };
  }
}

const BAKED_WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export function resolveWalletConnectProjectId(): string {
  if (typeof window !== "undefined") {
    const runtime = window.__XAU_RUNTIME__?.walletConnectProjectId;
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

export { WALLETCONNECT_PROJECT_ID };

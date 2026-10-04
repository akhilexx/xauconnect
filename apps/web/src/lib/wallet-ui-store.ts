import { create } from "zustand";

interface WalletUiState {
  /** One-shot flag: open connect modal (from ?connect=1 or swap CTA). */
  connectRequested: boolean;
  requestConnect: () => void;
  clearConnectRequest: () => void;
  evmModalOpen: boolean;
  openEvmModal: () => void;
  closeEvmModal: () => void;
  /** Last wallet picked in the EVM modal (e.g. Trust Wallet via WalletConnect). */
  lastWalletApp: string | null;
  setLastWalletApp: (name: string | null) => void;
  /** Active EVM connect attempt — cleared on success, timeout, or cancel. */
  evmConnectingWalletId: string | null;
  setEvmConnectingWalletId: (id: string | null) => void;
  evmConnectPending: boolean;
  setEvmConnectPending: (pending: boolean) => void;
  /** True while waiting for user to return from a mobile in-app browser handoff. */
  evmHandoffMode: boolean;
  setEvmHandoffMode: (handoff: boolean) => void;
  /** After handoff, connect this wallet once an injected provider is available. */
  autoConnectWalletId: string | null;
  requestAutoConnect: (walletId: string) => void;
  clearAutoConnect: () => void;
  abortEvmConnect: () => void;
}

export const useWalletUiStore = create<WalletUiState>((set) => ({
  connectRequested: false,
  requestConnect: () => set({ connectRequested: true }),
  clearConnectRequest: () => set({ connectRequested: false }),
  evmModalOpen: false,
  openEvmModal: () => set({ evmModalOpen: true }),
  closeEvmModal: () => set({ evmModalOpen: false }),
  lastWalletApp: null,
  setLastWalletApp: (name) => set({ lastWalletApp: name }),
  evmConnectingWalletId: null,
  setEvmConnectingWalletId: (id) => set({ evmConnectingWalletId: id }),
  evmConnectPending: false,
  setEvmConnectPending: (pending) => set({ evmConnectPending: pending }),
  evmHandoffMode: false,
  setEvmHandoffMode: (handoff) => set({ evmHandoffMode: handoff }),
  autoConnectWalletId: null,
  requestAutoConnect: (walletId) => set({ autoConnectWalletId: walletId }),
  clearAutoConnect: () => set({ autoConnectWalletId: null }),
  abortEvmConnect: () =>
    set({
      evmConnectingWalletId: null,
      evmConnectPending: false,
      evmHandoffMode: false,
    }),
}));

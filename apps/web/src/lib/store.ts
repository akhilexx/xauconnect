/**
 * Zustand stores — global UI + session state.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CHAINS, type ChainInfo } from "@xauconnect/utils";
import { api } from "./api";

interface ChainState {
  /** Currently selected chain across Swap/Liquidity/Launchpad. */
  chainKey: string;
  chain: ChainInfo;
  setChain: (key: string) => void;
}

export const useChainStore = create<ChainState>((set) => ({
  chainKey: "ethereum",
  chain: CHAINS[0]!,
  setChain: (key) => {
    const chain = CHAINS.find((c) => c.key === key);
    if (chain) set({ chainKey: key, chain });
  },
}));

interface SessionState {
  token?: string;
  address?: string;
  role?: "USER" | "ADMIN";
  setSession: (s: { token: string; address: string; role: "USER" | "ADMIN" }) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: undefined,
      address: undefined,
      role: undefined,
      setSession: ({ token, address, role }) => {
        api.setToken(token);
        set({ token, address, role });
      },
      clearSession: () => {
        api.setToken(undefined);
        set({ token: undefined, address: undefined, role: undefined });
      },
    }),
    {
      name: "xau-session",
      onRehydrateStorage: () => (state) => {
        if (state?.token) api.setToken(state.token);
      },
    },
  ),
);

interface SlippageState {
  slippageBps: number;
  setSlippageBps: (bps: number) => void;
}

export const useSlippageStore = create<SlippageState>()(
  persist((set) => ({ slippageBps: 50, setSlippageBps: (bps) => set({ slippageBps: bps }) }), {
    name: "xau-slippage",
  }),
);

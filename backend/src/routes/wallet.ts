/**
 * Wallet routes — multi-chain balances via live RPC + DexScreener USD pricing.
 * Solana history via Helius Enhanced Transactions API.
 */
import { Router } from "express";
import { WalletConnectRegisterSchema, getSwapTokenCatalog } from "@xauconnect/utils";
import { asyncHandler, validate } from "../middleware/error.js";
import { standardLimiter } from "../middleware/rate-limit.js";
import { cached } from "../cache.js";
import { heliusConfigured, heliusWalletHistory } from "../services/helius.js";
import { registerWalletConnection } from "../services/connected-wallets.js";
import { fetchEvmWalletBalances, fetchWalletBalances, fetchTokenBalanceMap } from "../services/wallet-balances.js";

export const walletRouter = Router();
walletRouter.use(standardLimiter);

/** Register an app wallet connect (EVM or Solana) — upserts user + balance snapshot. */
walletRouter.post(
  "/connect",
  asyncHandler(async (req, res) => {
    const input = validate(WalletConnectRegisterSchema, req.body);
    const result = await registerWalletConnection(input, req);
    res.json(result);
  }),
);

walletRouter.get(
  "/:address/balances",
  asyncHandler(async (req, res) => {
    const owner = req.params.address ?? "";
    const chainKey = req.query.chainKey as string | undefined;
    const tokensParam = req.query.tokens as string | undefined;

    if (tokensParam) {
      const addresses = tokensParam.split(",").filter(Boolean);
      const catalog = getSwapTokenCatalog(chainKey === "all" ? undefined : chainKey);
      const wanted = catalog.filter((t) =>
        addresses.some((a) => a.toLowerCase() === t.address.toLowerCase()),
      );
      const map = await fetchTokenBalanceMap(owner, wanted);
      return res.json({ balances: map, live: true });
    }

    const cacheKey = owner.startsWith("0x") ? owner.toLowerCase() : owner;
    const result = await cached(`wallet:balances:${cacheKey}`, 20, async () => {
      if (owner.startsWith("0x") && owner.length === 42) {
        const snapshot = await fetchEvmWalletBalances(owner);
        return {
          balances: snapshot.balances,
          portfolioUsd: snapshot.portfolioUsd,
          nativeBalance: snapshot.nativeBalance,
          nativeSymbol: snapshot.nativeSymbol,
          live: true,
        };
      }
      if (isSolanaAddress(owner)) {
        const snapshot = await fetchWalletBalances(owner, "solana");
        return {
          balances: snapshot.balances,
          portfolioUsd: snapshot.portfolioUsd,
          nativeBalance: snapshot.nativeBalance,
          nativeSymbol: snapshot.nativeSymbol,
          live: true,
        };
      }
      return { balances: [], live: true };
    });
    res.json(result);
  }),
);

function isSolanaAddress(address: string): boolean {
  return !address.startsWith("0x") && address.length >= 32 && address.length <= 44;
}

walletRouter.get(
  "/:address/history",
  asyncHandler(async (req, res) => {
    const address = req.params.address ?? "";

    if (isSolanaAddress(address) && heliusConfigured()) {
      const history = await cached(`wallet:history:solana:${address}`, 30, () =>
        heliusWalletHistory(address, 30),
      );
      return res.json({ history, live: true });
    }

    res.json({
      history: [],
      live: true,
      note: isSolanaAddress(address)
        ? "Set HELIUS_API_KEY or RPC_SOLANA with api-key for Solana history"
        : "EVM transaction history requires Alchemy/Covalent (not yet wired)",
    });
  }),
);

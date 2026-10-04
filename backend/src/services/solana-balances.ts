/**
 * Solana native + SPL balance reads (Helius/public RPC with fallbacks).
 */
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  DEFAULT_TOKENS,
  SOLANA_NATIVE_MINT,
  getChainByKey,
  isNativeToken,
  type TokenInfo,
} from "@xauconnect/utils";
import { rpcUrl } from "../config.js";
import { chainByKeyStrict, withTimeout } from "./routing/evm.js";
import { tokenUsdPrice } from "./token-price.js";
import type { WalletBalance, WalletBalanceSnapshot } from "./wallet-balances.js";

const BALANCE_TIMEOUT_MS = 4_000;

export const SOLANA_RPC_FALLBACKS = [
  "https://solana-rpc.publicnode.com",
  "https://api.mainnet-beta.solana.com",
];

function solanaRpcUrls(): string[] {
  const chain = getChainByKey("solana");
  const primary = chain ? rpcUrl("solana", chain.defaultRpc) : SOLANA_RPC_FALLBACKS[0]!;
  return [...new Set([primary, ...SOLANA_RPC_FALLBACKS])];
}

async function withSolanaConnection<T>(fn: (connection: Connection) => Promise<T>): Promise<T | null> {
  for (const url of solanaRpcUrls()) {
    try {
      const connection = new Connection(url, "confirmed");
      return await fn(connection);
    } catch {
      // try next RPC
    }
  }
  return null;
}

async function tokenPriceUsd(token: TokenInfo): Promise<number> {
  return tokenUsdPrice(token);
}

function pushBalance(
  out: WalletBalance[],
  token: TokenInfo,
  raw: bigint,
  formatted: string,
  usdValue: number,
): void {
  if (raw <= 0n) return;
  out.push({
    chainKey: "solana",
    address: token.address,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    balance: raw.toString(),
    balanceFormatted: formatted,
    usdValue,
    simulated: false,
  });
}

/** Native SOL + DEFAULT_TOKENS SPL balances for a Solana owner. */
export async function fetchSolanaWalletBalances(owner: string): Promise<WalletBalanceSnapshot> {
  let ownerPk: PublicKey;
  try {
    ownerPk = new PublicKey(owner);
  } catch {
    return { balances: [], portfolioUsd: 0, nativeSymbol: "SOL" };
  }

  const chain = chainByKeyStrict("solana");
  const catalog = DEFAULT_TOKENS.filter((t) => t.chainKey === "solana");
  const splCatalog = catalog.filter((t) => !isNativeToken(chain, t.address));
  const mintToToken = new Map(splCatalog.map((t) => [t.address, t]));

  const balances = await withSolanaConnection(async (connection) => {
    const out: WalletBalance[] = [];
    const lamports = await withTimeout(connection.getBalance(ownerPk), BALANCE_TIMEOUT_MS);
    const solToken = catalog.find((t) => isNativeToken(chain, t.address));
    if (solToken && lamports > 0n) {
      const formatted = String(lamports / LAMPORTS_PER_SOL);
      const price = await tokenPriceUsd(solToken);
      pushBalance(out, solToken, BigInt(lamports), formatted, Number(formatted) * price);
    }

    const parsed = await withTimeout(
      connection.getParsedTokenAccountsByOwner(ownerPk, { programId: TOKEN_PROGRAM_ID }),
      BALANCE_TIMEOUT_MS,
    );

    for (const { account } of parsed.value) {
      const parsedInfo = account.data.parsed?.info as
        | { mint?: string; tokenAmount?: { amount?: string; decimals?: number; uiAmount?: number } }
        | undefined;
      const mint = parsedInfo?.mint;
      if (!mint) continue;
      const token = mintToToken.get(mint);
      if (!token) continue;
      const amountStr = parsedInfo?.tokenAmount?.amount ?? "0";
      const raw = BigInt(amountStr);
      if (raw <= 0n) continue;
      const ui = parsedInfo?.tokenAmount?.uiAmount;
      const formatted =
        ui != null && Number.isFinite(ui)
          ? String(ui)
          : String(Number(amountStr) / 10 ** token.decimals);
      const price = await tokenPriceUsd(token);
      pushBalance(out, token, raw, formatted, Number(formatted) * price);
    }

    return out;
  });

  if (!balances) {
    return { balances: [], portfolioUsd: 0, nativeSymbol: "SOL" };
  }

  const portfolioUsd = balances.reduce((sum, b) => sum + b.usdValue, 0);
  const native = balances.find((b) => b.address === SOLANA_NATIVE_MINT || b.symbol === "SOL");

  return {
    balances,
    portfolioUsd,
    nativeBalance: native?.balanceFormatted,
    nativeSymbol: "SOL",
  };
}

/** Native SOL only — shared with admin protocol wallet list. */
export async function fetchSolanaNativeBalance(address: string): Promise<string | undefined> {
  let ownerPk: PublicKey;
  try {
    ownerPk = new PublicKey(address);
  } catch {
    return undefined;
  }

  const lamports = await withSolanaConnection((connection) =>
    withTimeout(connection.getBalance(ownerPk), BALANCE_TIMEOUT_MS),
  );
  if (lamports == null) return undefined;
  return String(lamports / LAMPORTS_PER_SOL);
}

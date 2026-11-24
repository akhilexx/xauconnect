import { Connection, type ParsedTransactionWithMeta } from "@solana/web3.js";
import { SOLANA_NATIVE_MINT } from "@xauconnect/utils";
import { solanaRpcUrls } from "../solana-rpc.js";
import { digest, requireEvidence, type Ticket, type Evidence } from "./evidence.js";

type Parsed = ParsedTransactionWithMeta;
/** SPL balances exclude network fees, priority fees, and account rent. */
export function splDelta(tx: Parsed, owner: string, mint: string): bigint {
  const balances = (rows: NonNullable<Parsed["meta"]>["preTokenBalances"]) =>
    (rows ?? [])
      .filter((b) => b.owner === owner && b.mint === mint)
      .reduce((n, b) => n + BigInt(b.uiTokenAmount.amount), 0n);
  return balances(tx.meta!.postTokenBalances) - balances(tx.meta!.preTokenBalances);
}

/** Wrapped SOL accounts can be created and closed in one transaction. Follow the
 * actual SPL transfers through accounts owned by the signer, including transient ATAs. */
export function wrappedMovement(tx: Parsed, owner: string): bigint {
  const mint = SOLANA_NATIVE_MINT,
    accounts = new Set<string>();
  for (const row of [...(tx.meta!.preTokenBalances ?? []), ...(tx.meta!.postTokenBalances ?? [])]) {
    if (row.owner === owner && row.mint === mint)
      accounts.add(tx.transaction.message.accountKeys[row.accountIndex]!.pubkey.toBase58());
  }
  const instructions = [
    ...tx.transaction.message.instructions,
    ...(tx.meta!.innerInstructions ?? []).flatMap((x) => x.instructions),
  ].flatMap((i) =>
    "parsed" in i &&
    (i.program === "spl-token" ||
      i.program === "spl-token-2022" ||
      i.program === "spl-associated-token-account")
      ? [i]
      : [],
  );
  for (const {
    parsed: { type, info },
    program,
  } of instructions) {
    if (info?.mint !== mint) continue;
    if (
      (program === "spl-associated-token-account" &&
        /^create(Idempotent)?$/i.test(type) &&
        info.wallet === owner) ||
      (/^initializeAccount[23]?$/.test(type) && info.owner === owner)
    )
      accounts.add(info.account);
  }
  let net = 0n;
  for (const {
    parsed: { type, info },
  } of instructions) {
    if (type !== "transfer" && type !== "transferChecked") continue;
    const amount = BigInt(info.amount ?? info.tokenAmount.amount);
    if (accounts.has(info.destination)) net += amount;
    if (accounts.has(info.source)) net -= amount;
  }
  return net;
}

export async function verifySolana(t: Ticket): Promise<Evidence> {
  for (const url of solanaRpcUrls()) {
    const rpc = new Connection(url, {
      commitment: "finalized",
      disableRetryOnRateLimit: true,
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
    });
    const opts = { commitment: "finalized" as const, maxSupportedTransactionVersion: 0 };
    const result = await Promise.all([
      rpc.getTransaction(t.txHash!, opts),
      rpc.getParsedTransaction(t.txHash!, opts),
      rpc.getGenesisHash(),
    ]).catch(() => null);
    if (!result) continue;
    const [raw, tx, genesis] = result;
    if (
      genesis !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d" ||
      !raw?.meta ||
      !tx?.meta ||
      !tx.blockTime ||
      raw.slot !== tx.slot
    )
      continue;
    requireEvidence(!raw.meta.err && !tx.meta.err, "reverted");
    requireEvidence(
      raw.transaction.signatures[0] === t.txHash &&
        tx.transaction.signatures[0] === t.txHash &&
        tx.transaction.message.accountKeys[0]?.signer &&
        tx.transaction.message.accountKeys[0].pubkey.toBase58() === t.taker &&
        digest(raw.transaction.message.serialize()) === t.fingerprint,
      "build_mismatch",
    );
    const movement = (mint: string) =>
      mint === SOLANA_NATIVE_MINT ? wrappedMovement(tx, t.taker) : splDelta(tx, t.taker, mint);
    const fee = splDelta(tx, t.feeRecipient, t.tokenOut);
    return {
      amountIn: -movement(t.tokenIn),
      amountOut: movement(t.tokenOut),
      fee,
      feeToken: t.tokenOut,
      time: new Date(tx.blockTime * 1000),
      blockRef: String(tx.slot),
    };
  }
  throw new Error("awaiting_finality");
}

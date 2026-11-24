import { VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { type QuoteRequest, type SwapTx } from "@xauconnect/utils";
import { db } from "../../db/client.js";
import { ApiError } from "../../middleware/error.js";
import { logger } from "../../logger.js";
import { settlementPrices } from "../token-price.js";
import { evmIntegratorFeeRecipient, solanaFeeWallet } from "../routing/integrator-fees.js";
import {
  digest,
  evmFingerprint,
  InvalidEvidence,
  requireEvidence,
  type Ticket,
} from "./evidence.js";
import { verifyEvm } from "./evm.js";
import { verifySolana } from "./solana.js";

const HOUR = 3_600_000;
type Attribution = { clientSource: string; clientId?: string; clientName?: string };
export async function trackBuild(
  req: QuoteRequest,
  built: SwapTx,
  meta?: Attribution,
): Promise<SwapTx> {
  if (!built.simulation.success || !req.taker || !built.venue) return built;
  if (!db) throw new ApiError(503, "Settlement ledger unavailable", "LEDGER_UNAVAILABLE");
  const sol = req.chainKey === "solana";
  const fp =
    sol && built.solanaTransaction
      ? digest(
          VersionedTransaction.deserialize(
            Buffer.from(built.solanaTransaction, "base64"),
          ).message.serialize(),
        )
      : built.evm
        ? evmFingerprint(built.evm.to, built.evm.data, BigInt(built.evm.value))
        : null;
  if (!fp) throw new Error("Missing executable build");
  const addr = (s: string) => (sol ? s : s.toLowerCase());
  const tokenIn = addr(req.tokenIn),
    tokenOut = addr(req.tokenOut);
  const ticket = await db.swapVerification.create({
    data: {
      chainKey: req.chainKey,
      taker: addr(req.taker),
      tokenIn,
      tokenOut,
      venue: built.venue,
      amountIn: req.amountIn,
      fingerprint: fp,
      feeRecipient: sol ? solanaFeeWallet() : evmIntegratorFeeRecipient(),
      prices: await settlementPrices(req.chainKey, [tokenIn, tokenOut]).catch(() => ({})),
      ...meta,
    },
    select: { id: true },
  });
  return { ...built, buildId: ticket.id };
}

export async function queueSettlement(buildId: string, chainKey: string, hash: string) {
  if (!db) throw new ApiError(503, "Settlement ledger unavailable", "LEDGER_UNAVAILABLE");
  const sol = chainKey === "solana";
  if (
    sol
      ? !/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(hash) || bs58.decode(hash).length !== 64
      : !/^0x[\da-f]{64}$/i.test(hash)
  )
    throw new ApiError(400, "Invalid transaction identifier", "BAD_TX_HASH");
  const txHash = sol ? hash : hash.toLowerCase();
  // A build can be associated with exactly one submission, even across API replicas.
  await db.swapVerification.updateMany({
    where: {
      id: buildId,
      chainKey,
      state: "built",
      txHash: null,
      createdAt: { gte: new Date(Date.now() - 24 * HOUR) },
    },
    data: { txHash, state: "pending", nextCheck: new Date() },
  });
  const row = await db.swapVerification.findUnique({
    where: { id: buildId },
    select: { chainKey: true, txHash: true, state: true },
  });
  if (!row || row.chainKey !== chainKey || row.txHash !== txHash)
    throw new ApiError(409, "Unknown, expired, or already used build", "INVALID_BUILD");
  if (row.state === "rejected" || row.state === "review")
    throw new ApiError(422, "Settlement has not been verified", "NOT_VERIFIED");
  return { ok: true, status: row.state === "verified" ? "verified" : "pending" };
}

function usd(ticket: Ticket, token: string, raw: bigint) {
  if (raw === 0n) return { value: 0, priced: true };
  const quote = (ticket.prices as Record<string, { usd: number; decimals: number }>)[token];
  const value = quote ? (Number(raw) / 10 ** quote.decimals) * quote.usd : 0;
  return { value: Number.isFinite(value) ? value : 0, priced: Number.isFinite(value) && value > 0 };
}

async function processTicket(ticket: Ticket) {
  const client = db!;
  const lease = new Date(Date.now() + 3 * 60_000);
  const claimed = await client.swapVerification.updateMany({
    where: { id: ticket.id, state: "pending", nextCheck: ticket.nextCheck },
    data: { nextCheck: lease, attempts: { increment: 1 } },
  });
  if (!claimed.count) return;
  const owned = { id: ticket.id, state: "pending", nextCheck: lease };
  try {
    const e = await (ticket.chainKey === "solana" ? verifySolana : verifyEvm)(ticket);
    requireEvidence(
      e.amountIn > 0n && e.amountIn <= BigInt(ticket.amountIn) && e.amountOut > 0n && e.fee >= 0n,
      "no_matching_exchange",
    );
    // Never value old transactions using a fresh build's price snapshot.
    requireEvidence(
      e.time.getTime() >= ticket.createdAt.getTime() - 90_000 &&
        e.time.getTime() <= ticket.createdAt.getTime() + HOUR,
      "outside_build_window",
    );
    const denom = e.feeToken === ticket.tokenIn ? e.amountIn : e.amountOut + e.fee;
    requireEvidence(e.fee <= denom, "ambiguous_fee");
    const vol = usd(ticket, ticket.tokenIn, e.amountIn),
      fee = usd(ticket, e.feeToken, e.fee);
    const settlementKey = ticket.chainKey + ":" + ticket.txHash;
    await client.$transaction(async (tx) => {
      const locked = await tx.swapVerification.updateMany({
        where: owned,
        data: { state: "verified", reason: null },
      });
      if (!locked.count) return;
      // ON CONFLICT DO NOTHING makes repeat builds and concurrent deliveries harmless.
      await tx.swap.createMany({
        skipDuplicates: true,
        data: [
          {
            chainKey: ticket.chainKey,
            dexId: ticket.venue,
            tokenIn: ticket.tokenIn,
            tokenOut: ticket.tokenOut,
            takerAddress: ticket.taker,
            amountIn: e.amountIn.toString(),
            amountOut: e.amountOut.toString(),
            protocolFee: e.fee.toString(),
            feeToken: e.feeToken,
            feeBps: Number((e.fee * 10000n) / denom),
            volumeUsd: vol.value,
            feeUsd: fee.value,
            volumePriced: vol.priced,
            feePriced: fee.priced,
            txHash: ticket.txHash,
            settlementKey,
            verifiedAt: new Date(),
            blockRef: e.blockRef,
            createdAt: e.time,
            status: "confirmed",
            clientSource: ticket.clientSource,
            clientId: ticket.clientId,
            clientName: ticket.clientName,
          },
        ],
      });
    });
  } catch (err) {
    const invalid = err instanceof InvalidEvidence,
      expired = Date.now() - ticket.createdAt.getTime() > 48 * HOUR;
    if (!invalid && ticket.attempts === 0)
      logger.warn(
        { chainKey: ticket.chainKey, txHash: ticket.txHash },
        "Waiting for finalized settlement evidence",
      );
    const state = invalid ? "rejected" : expired ? "review" : "pending";
    await client.swapVerification.updateMany({
      where: owned,
      data: {
        state,
        reason: invalid ? err.message : "rpc_or_evidence_unavailable",
        nextCheck: new Date(
          Date.now() + Math.min(15 * 60_000, 12_000 * 2 ** Math.min(ticket.attempts, 7)),
        ),
      },
    });
  }
}

let running = false,
  cleanupAt = 0;
export async function checkSettlements() {
  if (!db || running) return;
  running = true;
  try {
    const rows = await db.swapVerification.findMany({
      where: { state: "pending", nextCheck: { lte: new Date() } },
      orderBy: { nextCheck: "asc" },
      take: 8,
    });
    await Promise.all(rows.map(processTicket));
    if (Date.now() > cleanupAt) {
      await db.swapVerification.deleteMany({
        where: { state: "built", createdAt: { lt: new Date(Date.now() - 24 * HOUR) } },
      });
      cleanupAt = Date.now() + HOUR;
    }
  } catch {
    logger.warn("Settlement worker unavailable; pending submissions will be retried");
  } finally {
    running = false;
  }
}

/**
 * Fiat on-ramp / off-ramp routes — Buy & Sell crypto with card, Apple Pay,
 * Google Pay, bank transfer and local methods, via the Onramper aggregator.
 *
 * Flow:
 *   GET  /onramp/config         — is the feature live? (key present)
 *   GET  /onramp/geo            — detected country + local currency
 *   GET  /onramp/defaults       — country-aware default fiat/crypto/amount/method
 *   GET  /onramp/assets         — supported crypto + fiat for a source currency
 *   GET  /onramp/payment-types  — methods for a (source, destination) pair
 *   GET  /onramp/quote          — live best-route quote incl. our partner fee
 *   POST /onramp/checkout       — create a transaction → provider hosted URL
 *   POST /onramp/webhook        — provider status callbacks → FiatTransaction
 *   GET  /onramp/transaction/:ctx — poll our record for the UI
 */
import { Router } from "express";
import { randomUUID } from "node:crypto";
import {
  ONRAMP_NETWORK_BY_CHAIN,
  ONRAMP_CHAIN_BY_NETWORK,
  OnrampCheckoutRequestSchema,
  OnrampQuoteRequestSchema,
} from "@xauconnect/utils";
import { asyncHandler, validate, ApiError } from "../middleware/error.js";
import { quoteLimiter, standardLimiter } from "../middleware/rate-limit.js";
import { env } from "../config.js";
import { logger } from "../logger.js";
import { db } from "../db/client.js";
import jwt from "jsonwebtoken";
import {
  createCheckout,
  geoFor,
  getAssets,
  getDefaults,
  getPaymentTypes,
  getQuotes,
  isOnrampEnabled,
  onrampConfig,
  onrampPartnerFeePct,
  OnrampDisabledError,
} from "../services/onramp/index.js";

export const onrampRouter = Router();

function requireEnabled() {
  if (!isOnrampEnabled()) {
    throw new ApiError(503, "Fiat buy/sell is being configured", "ONRAMP_DISABLED");
  }
}

function parseType(v: unknown): "buy" | "sell" {
  return v === "sell" ? "sell" : "buy";
}

/** Resolve the partner-fee % for a crypto id whose network maps to one of our chains. */
async function feePctForCrypto(cryptoId: string, network?: string): Promise<number> {
  let chainKey = network ? ONRAMP_CHAIN_BY_NETWORK[network.toLowerCase()] : undefined;
  if (!chainKey) {
    // crypto ids are often suffixed with the network, e.g. "usdc_polygon".
    const suffix = cryptoId.split("_")[1];
    if (suffix && ONRAMP_NETWORK_BY_CHAIN[suffix]) chainKey = suffix;
    else if (cryptoId === "sol") chainKey = "solana";
  }
  return onrampPartnerFeePct(chainKey);
}

onrampRouter.get("/config", standardLimiter, (_req, res) => {
  res.json(onrampConfig());
});

onrampRouter.get("/geo", standardLimiter, (req, res) => {
  res.json(geoFor(req));
});

onrampRouter.get(
  "/defaults",
  standardLimiter,
  asyncHandler(async (req, res) => {
    requireEnabled();
    const type = parseType(req.query.type);
    const country = (req.query.country as string | undefined)?.toUpperCase() ?? geoFor(req).country;
    res.json(await getDefaults(type, country));
  }),
);

onrampRouter.get(
  "/assets",
  standardLimiter,
  asyncHandler(async (req, res) => {
    requireEnabled();
    const type = parseType(req.query.type);
    const source = (req.query.source as string | undefined) ?? "usd";
    const country = (req.query.country as string | undefined)?.toUpperCase() ?? geoFor(req).country;
    res.json(await getAssets(type, source, country));
  }),
);

onrampRouter.get(
  "/payment-types",
  standardLimiter,
  asyncHandler(async (req, res) => {
    requireEnabled();
    const type = parseType(req.query.type);
    const source = (req.query.source as string | undefined) ?? "usd";
    const destination = (req.query.destination as string | undefined) ?? "eth";
    const country = (req.query.country as string | undefined)?.toUpperCase() ?? geoFor(req).country;
    res.json({ paymentMethods: await getPaymentTypes(type, source, destination, country) });
  }),
);

onrampRouter.get(
  "/quote",
  quoteLimiter,
  asyncHandler(async (req, res) => {
    requireEnabled();
    const parsed = validate(OnrampQuoteRequestSchema, {
      type: parseType(req.query.type),
      fiat: req.query.fiat,
      crypto: req.query.crypto,
      amount: req.query.amount != null ? Number(req.query.amount) : undefined,
      paymentMethod: req.query.paymentMethod,
      country: req.query.country,
      walletAddress: req.query.walletAddress,
    });
    const country = parsed.country?.toUpperCase() ?? geoFor(req).country;
    const partnerFeePct = await feePctForCrypto(parsed.crypto);
    const result = await getQuotes({
      type: parsed.type,
      fiat: parsed.fiat,
      crypto: parsed.crypto,
      amount: parsed.amount,
      paymentMethod: parsed.paymentMethod,
      country,
      walletAddress: parsed.walletAddress,
      partnerFeePct,
    });
    res.json(result);
  }),
);

onrampRouter.post(
  "/checkout",
  quoteLimiter,
  asyncHandler(async (req, res) => {
    requireEnabled();
    const body = validate(OnrampCheckoutRequestSchema, req.body);
    const country = body.country?.toUpperCase() ?? geoFor(req).country;
    const partnerContext = `xau-${randomUUID()}`;

    // Resolve crypto network → our chain key (for analytics + network param).
    const network =
      body.network ??
      (() => {
        const suffix = body.crypto.split("_")[1];
        if (suffix && ONRAMP_NETWORK_BY_CHAIN[suffix]) return ONRAMP_NETWORK_BY_CHAIN[suffix];
        if (body.crypto === "sol") return "solana";
        if (body.crypto === "eth") return "ethereum";
        return undefined;
      })();
    const chainKey = network ? ONRAMP_CHAIN_BY_NETWORK[network] : undefined;
    const partnerFeePct = await feePctForCrypto(body.crypto, network);

    const origin = `${req.protocol}://${req.get("host")}`;
    const checkout = await createCheckout({
      type: body.type,
      routeProvider: body.provider,
      fiat: body.fiat,
      crypto: body.crypto,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      walletAddress: body.walletAddress,
      network,
      email: body.email,
      country,
      partnerContext,
      successUrl: `${origin.replace("/api", "")}/wallet?fiat=success`,
    });

    if (db) {
      try {
        await db.fiatTransaction.create({
          data: {
            providerTxId: checkout.transactionId,
            partnerContext,
            type: body.type,
            provider: body.provider,
            status: "created",
            fiatCurrency: body.fiat.toUpperCase(),
            fiatAmount: body.type === "buy" ? body.amount : 0,
            cryptoAsset: body.crypto,
            chainKey,
            cryptoAmount: body.type === "sell" ? body.amount : 0,
            paymentMethod: body.paymentMethod,
            country,
            walletAddress: body.walletAddress,
            partnerFeePct,
            partnerFeeFiat:
              body.type === "buy" ? Number(((body.amount * partnerFeePct) / 100).toFixed(2)) : 0,
            clientIp: (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? null,
          },
        });
      } catch (err) {
        logger.warn({ err }, "failed to persist fiat transaction");
      }
    }

    res.json({
      transactionId: checkout.transactionId,
      url: checkout.url,
      redirectType: checkout.redirectType,
      partnerContext,
    });
  }),
);

/** Map Onramper status strings to our canonical lifecycle. */
function normalizeStatus(s?: string): string {
  switch ((s ?? "").toLowerCase()) {
    case "completed":
    case "paid":
    case "delivered":
      return "completed";
    case "failed":
    case "cancelled":
    case "canceled":
    case "declined":
      return "failed";
    case "expired":
      return "expired";
    case "pending":
    case "in_progress":
    case "inprogress":
    case "processing":
      return "pending";
    default:
      return s ?? "pending";
  }
}

onrampRouter.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    // Authenticate the callback when a secret is configured.
    if (env.ONRAMPER_WEBHOOK_SECRET) {
      const provided =
        (req.headers["x-onramper-webhook-secret"] as string | undefined) ??
        (req.query.secret as string | undefined);
      if (provided !== env.ONRAMPER_WEBHOOK_SECRET) {
        throw new ApiError(401, "Invalid webhook signature", "WEBHOOK_UNAUTHORIZED");
      }
    }

    const payload = req.body as {
      transactionId?: string;
      partnerContext?: string;
      onrampTransactionId?: string;
      status?: string;
      outAmount?: number;
      inAmount?: number;
      transactionHash?: string;
      onramp?: string;
      partnerFee?: string | number;
    };

    if (db && (payload.transactionId || payload.partnerContext)) {
      try {
        const where = payload.partnerContext
          ? { partnerContext: payload.partnerContext }
          : { providerTxId: payload.transactionId! };
        const existing = await db.fiatTransaction.findFirst({ where });
        const data: Record<string, unknown> = {
          status: normalizeStatus(payload.status),
          provider: payload.onramp ?? existing?.provider ?? undefined,
          txHash: payload.transactionHash || undefined,
          providerTxId: payload.transactionId ?? existing?.providerTxId ?? undefined,
        };
        if (typeof payload.outAmount === "number") {
          if (existing?.type === "sell") data.fiatAmount = payload.outAmount;
          else data.cryptoAmount = payload.outAmount;
        }
        if (existing) {
          await db.fiatTransaction.update({ where: { id: existing.id }, data });
        } else {
          await db.fiatTransaction.create({
            data: {
              providerTxId: payload.transactionId,
              partnerContext: payload.partnerContext,
              type: "buy",
              status: normalizeStatus(payload.status),
              fiatCurrency: "USD",
              cryptoAsset: "unknown",
              ...data,
            } as never,
          });
        }
      } catch (err) {
        logger.warn({ err }, "fiat webhook persist failed");
      }
    }
    res.json({ ok: true });
  }),
);

// ── Transak webhook ───────────────────────────────────────────────────────────
// Transak posts { data: <JWT signed (HS256) with your API secret> }. Decode and
// update the matching FiatTransaction by partnerOrderId (= our partnerContext).

function normalizeTransakStatus(s?: string): string {
  switch ((s ?? "").toUpperCase()) {
    case "COMPLETED":
      return "completed";
    case "FAILED":
    case "CANCELLED":
    case "REFUNDED":
      return "failed";
    case "EXPIRED":
      return "expired";
    default:
      return "pending";
  }
}

onrampRouter.post(
  "/webhook/transak",
  asyncHandler(async (req, res) => {
    let data: {
      eventID?: string;
      webhookData?: {
        id?: string;
        status?: string;
        partnerOrderId?: string;
        cryptoAmount?: number;
        fiatAmount?: number;
        transactionHash?: string;
        cryptoCurrency?: string;
        network?: string;
      };
    } = {};

    const token = (req.body as { data?: string })?.data;
    if (typeof token === "string" && env.TRANSAK_API_SECRET) {
      try {
        data = jwt.verify(token, env.TRANSAK_API_SECRET) as typeof data;
      } catch {
        throw new ApiError(401, "Invalid Transak webhook signature", "WEBHOOK_UNAUTHORIZED");
      }
    } else if (typeof token !== "string") {
      // Unsigned/test payloads (staging): accept the raw body shape.
      data = req.body as typeof data;
    }

    const w = data.webhookData;
    if (db && w && (w.partnerOrderId || w.id)) {
      try {
        const where = w.partnerOrderId
          ? { partnerContext: w.partnerOrderId }
          : { providerTxId: w.id! };
        const existing = await db.fiatTransaction.findFirst({ where });
        const update: Record<string, unknown> = {
          status: normalizeTransakStatus(w.status),
          provider: "transak",
          providerTxId: w.id ?? existing?.providerTxId ?? undefined,
          txHash: w.transactionHash || undefined,
        };
        if (typeof w.cryptoAmount === "number") update.cryptoAmount = w.cryptoAmount;
        if (typeof w.fiatAmount === "number") update.fiatAmount = w.fiatAmount;
        if (existing) {
          await db.fiatTransaction.update({ where: { id: existing.id }, data: update });
        }
      } catch (err) {
        logger.warn({ err }, "transak webhook persist failed");
      }
    }
    res.json({ ok: true });
  }),
);

onrampRouter.get(
  "/transaction/:ctx",
  standardLimiter,
  asyncHandler(async (req, res) => {
    if (!db) {
      res.json({ transaction: null });
      return;
    }
    const ctx = req.params.ctx;
    const tx = await db.fiatTransaction.findFirst({
      where: { OR: [{ partnerContext: ctx }, { providerTxId: ctx }] },
    });
    res.json({ transaction: tx });
  }),
);

void OnrampDisabledError;

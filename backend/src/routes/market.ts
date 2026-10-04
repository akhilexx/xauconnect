/**
 * Market data routes — discovery feeds, token detail, candles.
 */
import { Router } from "express";
import { z } from "zod";
import { CandleIntervalSchema, DiscoveryTabSchema } from "@xauconnect/utils";
import { asyncHandler, validate } from "../middleware/error.js";
import { standardLimiter } from "../middleware/rate-limit.js";
import { getLiveLaunches } from "../services/launches.js";
import { candles, discovery, tokenDetail } from "../services/market.js";
import { getTokenIntel } from "../services/token-intel.js";

export const marketRouter = Router();
marketRouter.use(standardLimiter);
marketRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  next();
});

/** Warm snapshot of the live launch feed (real-time stream is on WS "launches"). */
marketRouter.get(
  "/launches/live",
  asyncHandler(async (_req, res) => {
    const { launches, syncedAt } = await getLiveLaunches();
    res.json({ launches, syncedAt, source: "geckoterminal+dexscreener+database" });
  }),
);

marketRouter.get(
  "/discovery/:tab",
  asyncHandler(async (req, res) => {
    const tab = validate(DiscoveryTabSchema, req.params.tab);
    const chainKey = req.query.chainKey as string | undefined;
    res.json({ tab, tokens: await discovery(tab, chainKey) });
  }),
);

marketRouter.get(
  "/token/:chainKey/:address",
  asyncHandler(async (req, res) => {
    const { chainKey = "", address = "" } = req.params;
    res.json({ token: await tokenDetail(chainKey, address) });
  }),
);

const IntervalSchema = CandleIntervalSchema.default("1h");

marketRouter.get(
  "/token/:chainKey/:address/intel",
  asyncHandler(async (req, res) => {
    const { chainKey = "", address = "" } = req.params;
    res.json(await getTokenIntel(chainKey, address));
  }),
);

marketRouter.get(
  "/candles/:chainKey/:address",
  asyncHandler(async (req, res) => {
    const interval = validate(IntervalSchema, req.query.interval ?? "1h");
    const { chainKey = "", address = "" } = req.params;
    res.json({
      interval,
      candles: await candles(chainKey, address, interval),
    });
  }),
);

/**
 * LP aggregation routes — add/remove liquidity quotes across venues.
 */
import { Router } from "express";
import { LpQuoteRequestSchema, getLpDexesForChain } from "@xauconnect/utils";
import { asyncHandler, validate } from "../middleware/error.js";
import { quoteLimiter, standardLimiter } from "../middleware/rate-limit.js";
import { quoteLp } from "../services/lp.js";

export const lpRouter = Router();

lpRouter.get("/venues", standardLimiter, (req, res) => {
  const chainKey = (req.query.chainKey as string | undefined) ?? "ethereum";
  res.json({ venues: getLpDexesForChain(chainKey) });
});

lpRouter.post(
  "/quote",
  quoteLimiter,
  asyncHandler(async (req, res) => {
    const request = validate(LpQuoteRequestSchema, req.body);
    const quotes = await quoteLp(request);
    res.json({ request, quotes, quotedAt: Date.now() });
  }),
);

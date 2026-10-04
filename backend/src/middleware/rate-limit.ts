/**
 * Fixed-window rate limiting backed by the cache layer (Redis in prod).
 * Standard RateLimit headers are emitted for well-behaved clients.
 */
import type { NextFunction, Request, Response } from "express";
import { cache } from "../cache.js";
import { ApiError } from "./error.js";

export interface RateLimitOptions {
  /** Max requests per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Bucket prefix so different routes get independent budgets. */
  prefix: string;
}

export function rateLimit({ limit, windowSeconds, prefix }: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip =
        (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
        req.socket.remoteAddress ??
        "unknown";
      const window = Math.floor(Date.now() / (windowSeconds * 1000));
      const key = `rl:${prefix}:${ip}:${window}`;
      const count = await cache.incr(key, windowSeconds);

      res.setHeader("RateLimit-Limit", limit);
      res.setHeader("RateLimit-Remaining", Math.max(0, limit - count));

      if (count > limit) {
        next(new ApiError(429, "Too many requests — slow down", "RATE_LIMITED"));
        return;
      }
      next();
    } catch {
      next(); // never let the limiter take the API down
    }
  };
}

/** Default budgets. */
export const standardLimiter = rateLimit({ limit: 120, windowSeconds: 60, prefix: "std" });
export const quoteLimiter = rateLimit({ limit: 300, windowSeconds: 60, prefix: "quote" });
export const authLimiter = rateLimit({ limit: 20, windowSeconds: 60, prefix: "auth" });
export const adminLimiter = rateLimit({ limit: 60, windowSeconds: 60, prefix: "admin" });

/**
 * Limit order monitor — checks spot price vs target; marks triggered orders.
 */
import { z } from "zod";
import { db } from "../db/client.js";
import { lookupToken } from "./market-lookup.js";
import { logger } from "../logger.js";

export const CreateLimitOrderSchema = z.object({
  chainKey: z.string(),
  userAddress: z.string().min(3),
  tokenIn: z.string(),
  tokenOut: z.string(),
  amountIn: z.string().regex(/^\d+$/),
  targetPrice: z.number().positive(),
  slippageBps: z.number().int().min(1).max(5000).default(50),
  expiresInHours: z.number().min(1).max(168).optional(),
});

export async function createLimitOrder(input: z.infer<typeof CreateLimitOrderSchema>) {
  if (!db) throw new Error("Database required for limit orders");
  const expiresAt = input.expiresInHours
    ? new Date(Date.now() + input.expiresInHours * 3_600_000)
    : null;
  return db.limitOrder.create({
    data: {
      chainKey: input.chainKey,
      userAddress: input.userAddress,
      tokenIn: input.tokenIn,
      tokenOut: input.tokenOut,
      amountIn: input.amountIn,
      targetPrice: input.targetPrice,
      slippageBps: input.slippageBps,
      expiresAt,
      status: "pending",
    },
  });
}

export async function listLimitOrders(userAddress: string, chainKey?: string) {
  if (!db) return [];
  return db.limitOrder.findMany({
    where: {
      userAddress: { equals: userAddress, mode: "insensitive" },
      ...(chainKey ? { chainKey } : {}),
      status: { in: ["pending", "triggered"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function cancelLimitOrder(id: string, userAddress: string) {
  if (!db) throw new Error("Database required");
  const order = await db.limitOrder.findUnique({ where: { id } });
  if (!order || order.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
    throw new Error("Order not found");
  }
  return db.limitOrder.update({ where: { id }, data: { status: "cancelled" } });
}

/** Poll pending orders; trigger when tokenOut price <= target (buy dip). */
export async function monitorLimitOrders(): Promise<number> {
  if (!db) return 0;
  const pending = await db.limitOrder.findMany({
    where: { status: "pending" },
    take: 40,
  });
  let triggered = 0;
  const now = Date.now();

  for (const order of pending) {
    if (order.expiresAt && order.expiresAt.getTime() < now) {
      await db.limitOrder.update({ where: { id: order.id }, data: { status: "expired" } });
      continue;
    }
    try {
      const spot = await lookupToken(order.chainKey, order.tokenOut);
      if (!spot?.priceUsd || spot.priceUsd <= 0) continue;
      if (spot.priceUsd <= order.targetPrice) {
        await db.limitOrder.update({
          where: { id: order.id },
          data: { status: "triggered", triggeredAt: new Date() },
        });
        triggered++;
      }
    } catch (err) {
      logger.debug({ err: (err as Error).message, id: order.id }, "limit order check failed");
    }
  }
  return triggered;
}

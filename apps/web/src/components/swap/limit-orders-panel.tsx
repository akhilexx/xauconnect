"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Trash2, Zap } from "lucide-react";
import { formatUsd, type TokenInfo } from "@xauconnect/utils";
import { Badge, GlassButton, GlassCard, Skeleton, toast } from "@xauconnect/ui";
import type { LimitOrder } from "@xauconnect/sdk";
import { api } from "@/lib/api";
import { userFacingError } from "@/lib/user-errors";
import { useSlippageStore } from "@/lib/store";

export interface LimitOrdersPanelProps {
  chainKey: string;
  userAddress?: string;
  tokenIn: TokenInfo | null;
  tokenOut: TokenInfo | null;
  amountInBase: string | null;
  spotPriceUsd?: number;
  onExecuteTriggered?: (order: LimitOrder) => void;
}

export function LimitOrdersPanel({
  chainKey,
  userAddress,
  tokenIn,
  tokenOut,
  amountInBase,
  spotPriceUsd,
  onExecuteTriggered,
}: LimitOrdersPanelProps) {
  const { slippageBps } = useSlippageStore();
  const queryClient = useQueryClient();
  const [targetPrice, setTargetPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const ordersQuery = useQuery({
    queryKey: ["limit-orders", userAddress, chainKey],
    enabled: Boolean(userAddress),
    refetchInterval: 12_000,
    queryFn: () => api.listLimitOrders(userAddress!, chainKey),
  });

  async function createOrder() {
    if (!userAddress || !tokenIn || !tokenOut || !amountInBase) {
      toast.error("Connect wallet and enter swap amount first");
      return;
    }
    const price = Number(targetPrice);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter a valid target price (USD)");
      return;
    }
    setSubmitting(true);
    try {
      await api.createLimitOrder({
        chainKey,
        userAddress,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: amountInBase,
        targetPrice: price,
        slippageBps,
        expiresInHours: 72,
      });
      toast.success("Limit order placed");
      setTargetPrice("");
      await queryClient.invalidateQueries({ queryKey: ["limit-orders", userAddress, chainKey] });
    } catch (err) {
      toast.error("Failed to place order", { description: userFacingError(err) });
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelOrder(id: string) {
    if (!userAddress) return;
    try {
      await api.cancelLimitOrder(id, userAddress);
      await queryClient.invalidateQueries({ queryKey: ["limit-orders", userAddress, chainKey] });
      toast.success("Order cancelled");
    } catch (err) {
      toast.error("Cancel failed", { description: userFacingError(err) });
    }
  }

  const orders = ordersQuery.data?.orders ?? [];

  return (
    <GlassCard className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gold-deep" />
        <p className="text-sm font-semibold">Limit orders</p>
        <Badge tone="gold">Buy at target</Badge>
      </div>

      <p className="text-xs text-ink-muted">
        Executes when {tokenOut?.symbol ?? "token"} spot price drops to your target. Orders are
        monitored server-side; connect your wallet to execute when triggered.
      </p>

      <div className="flex flex-col gap-2 rounded-2xl bg-white/45 p-4 ring-1 ring-white/70">
        <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Target price (USD) for {tokenOut?.symbol ?? "output"}
        </label>
        <div className="flex items-center gap-2">
          <input
            inputMode="decimal"
            placeholder={spotPriceUsd ? spotPriceUsd.toFixed(6) : "0.00"}
            value={targetPrice}
            onChange={(e) => {
              if (/^\d*\.?\d*$/.test(e.target.value)) setTargetPrice(e.target.value);
            }}
            className="w-full rounded-xl bg-white/60 px-3 py-2 font-mono text-sm text-ink outline-none ring-1 ring-white/80"
          />
          {spotPriceUsd != null && spotPriceUsd > 0 && (
            <button
              type="button"
              className="shrink-0 text-xs font-semibold text-gold-deep hover:underline"
              onClick={() => setTargetPrice((spotPriceUsd * 0.95).toFixed(8))}
            >
              −5%
            </button>
          )}
        </div>
        <GlassButton
          size="sm"
          className="mt-1 w-full"
          disabled={!userAddress || !amountInBase || submitting}
          loading={submitting}
          onClick={createOrder}
        >
          Place limit order
        </GlassButton>
      </div>

      {!userAddress && (
        <p className="text-xs text-ink-muted">Connect a wallet to view and manage limit orders.</p>
      )}

      {userAddress && ordersQuery.isLoading && <Skeleton className="h-16 w-full" />}

      {userAddress && orders.length > 0 && (
        <ul className="flex flex-col gap-2">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-white/40 px-3 py-2 text-xs ring-1 ring-white/60"
            >
              <div>
                <p className="font-semibold">
                  Buy at {formatUsd(order.targetPrice)}{" "}
                  <Badge tone={order.status === "triggered" ? "success" : "neutral"}>
                    {order.status}
                  </Badge>
                </p>
                <p className="text-ink-muted">
                  {order.amountIn} in · slippage {(order.slippageBps / 100).toFixed(2)}%
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {order.status === "triggered" && onExecuteTriggered && (
                  <button
                    type="button"
                    onClick={() => onExecuteTriggered(order)}
                    className="glass rounded-lg p-2 text-gold-deep hover:shadow-gold-glow"
                    aria-label="Execute triggered order"
                  >
                    <Zap className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => cancelOrder(order.id)}
                  className="glass rounded-lg p-2 text-ink-muted hover:text-danger"
                  aria-label="Cancel order"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}

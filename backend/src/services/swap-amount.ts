/**
 * Resolve human-readable swap amounts to base-unit integer strings.
 */
import { DEFAULT_TOKENS, parseUnits, tokenAddressEq } from "@xauconnect/utils";
import { ApiError } from "../middleware/error.js";

export function resolveQuoteAmountIn(body: Record<string, unknown>): Record<string, unknown> {
  if (body.amountUnit !== "human") return body;
  const amount = body.amount;
  if (typeof amount !== "string" && typeof amount !== "number") {
    throw new ApiError(400, "amount required when amountUnit is human", "VALIDATION_ERROR");
  }
  const chainKey = body.chainKey;
  const tokenIn = body.tokenIn;
  if (typeof chainKey !== "string" || typeof tokenIn !== "string") {
    throw new ApiError(400, "chainKey and tokenIn required", "VALIDATION_ERROR");
  }
  const token = DEFAULT_TOKENS.find(
    (t) => t.chainKey === chainKey && tokenAddressEq(chainKey, t.address, tokenIn),
  );
  if (!token) {
    throw new ApiError(400, "Unknown tokenIn — use base-unit amountIn or /swap/tokens", "UNKNOWN_TOKEN");
  }
  const human = typeof amount === "number" ? String(amount) : amount;
  const amountIn = parseUnits(human, token.decimals);
  const { amount: _a, amountUnit: _u, ...rest } = body;
  return { ...rest, amountIn: amountIn.toString() };
}

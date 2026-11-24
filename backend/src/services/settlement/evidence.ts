import { createHash } from "node:crypto";
import type { SwapVerification } from "@prisma/client";
import { NATIVE_TOKEN_ADDRESS } from "@xauconnect/utils";

export type Ticket = SwapVerification;
export type Evidence = {
  amountIn: bigint;
  amountOut: bigint;
  fee: bigint;
  feeToken: string;
  time: Date;
  blockRef: string;
};
export class InvalidEvidence extends Error {}
export function requireEvidence(condition: unknown, code: string): asserts condition {
  if (!condition) throw new InvalidEvidence(code);
}
export const digest = (data: string | Uint8Array) =>
  createHash("sha256").update(data).digest("hex");
export const evmFingerprint = (to: string, input: string, value: bigint) =>
  digest([to.toLowerCase(), input.toLowerCase(), value.toString()].join(":"));
export const native = (token: string) => token.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
export const verifiedWhere = {
  status: "confirmed",
  verifiedAt: { not: null },
  settlementKey: { not: null },
} as const;

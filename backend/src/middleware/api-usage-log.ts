/**
 * Swap API usage logging — request IDs + fire-and-forget persistence for admin analytics.
 */
import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db } from "../db/client.js";

type ClientMeta = {
  clientId?: string;
  clientName?: string;
  clientSource: string;
};

type SwapTrackedRequest = Request & {
  requestId?: string;
  clientMeta?: ClientMeta;
};

export function asSwapReq(req: Request): SwapTrackedRequest {
  return req as SwapTrackedRequest;
}

function clientIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim();
  }
  return req.ip;
}

function readClientMeta(req: Request): ClientMeta {
  const clientId = req.headers["x-client-id"];
  const clientName = req.headers["x-client-name"];
  const sourceHeader = req.headers["x-client-source"];
  let clientSource = "api";
  if (typeof sourceHeader === "string" && ["web", "api", "agent"].includes(sourceHeader)) {
    clientSource = sourceHeader;
  } else if (typeof clientId === "string" && clientId.length > 0) {
    clientSource = "agent";
  }
  return {
    clientId: typeof clientId === "string" ? clientId.slice(0, 64) : undefined,
    clientName: typeof clientName === "string" ? clientName.slice(0, 128) : undefined,
    clientSource,
  };
}

function extractChainKey(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  if (typeof b.chainKey === "string") return b.chainKey;
  if (typeof b.fromChainKey === "string") return b.fromChainKey;
  const nested = b.request;
  if (nested && typeof nested === "object") {
    const r = nested as Record<string, unknown>;
    if (typeof r.chainKey === "string") return r.chainKey;
    if (typeof r.fromChainKey === "string") return r.fromChainKey;
  }
  return undefined;
}

function extractTaker(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  if (typeof b.address === "string") return b.address;
  if (typeof b.taker === "string") return b.taker;
  const nested = b.request;
  if (nested && typeof nested === "object") {
    const r = nested as Record<string, unknown>;
    if (typeof r.taker === "string") return r.taker;
  }
  return undefined;
}

export function attachSwapRequestId(req: Request, res: Response, next: NextFunction): void {
  const tracked = asSwapReq(req);
  tracked.requestId = randomUUID();
  tracked.clientMeta = readClientMeta(req);
  res.setHeader("X-Request-Id", tracked.requestId);
  next();
}

export function logSwapApiUsage(req: Request, res: Response, next: NextFunction): void {
  const tracked = asSwapReq(req);
  res.on("finish", () => {
    if (!db) return;
    const endpoint = req.baseUrl + req.path;
    void db.apiRequestLog
      .create({
        data: {
          clientId: tracked.clientMeta?.clientId ?? null,
          clientName: tracked.clientMeta?.clientName ?? null,
          clientSource: tracked.clientMeta?.clientSource ?? "api",
          endpoint,
          method: req.method,
          chainKey: extractChainKey(req.body) ?? null,
          takerAddress: extractTaker(req.body) ?? null,
          clientIp: clientIp(req) ?? null,
          userAgent:
            typeof req.headers["user-agent"] === "string"
              ? req.headers["user-agent"].slice(0, 512)
              : null,
          statusCode: res.statusCode,
          requestId: tracked.requestId ?? null,
        },
      })
      .catch(() => {});
  });
  next();
}

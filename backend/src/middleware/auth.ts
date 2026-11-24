/**
 * Wallet-signature authentication (SIWE-style) with JWT sessions.
 *
 * Flow:
 *   1. POST /auth/challenge { address } -> { nonce, message }
 *   2. wallet signs the message
 *   3. POST /auth/verify { address, signature, nonce } -> { token }
 *   4. Authorization: Bearer <token> on subsequent requests
 *
 * Addresses listed in ADMIN_ADDRESSES receive the ADMIN role.
 */
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import {
  adminCookie,
  isBrowserCredential,
  readBrowserSession,
} from "../services/admin-browser-session.js";
import { cache } from "../cache.js";
import { adminAddresses, env } from "../config.js";
import { ApiError } from "./error.js";

export interface SessionPayload {
  address: string;
  role: "USER" | "ADMIN";
  jti?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    audience: "xau-session-v2",
    jwtid: randomUUID(),
    expiresIn: payload.role === "ADMIN" ? "30m" : "7d",
    issuer: "xauconnect",
  });
}

export function verifySessionToken(token: string): SessionPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
      audience: "xau-session-v2",
      issuer: "xauconnect",
    }) as SessionPayload & jwt.JwtPayload;
    if (
      !decoded.jti ||
      typeof decoded.address !== "string" ||
      !["ADMIN", "USER"].includes(decoded.role)
    )
      throw new Error();
    if (
      decoded.role === "ADMIN" &&
      (decoded.address === "admin:console"
        ? !env.ADMIN_PASSWORD
        : !adminAddresses.has(decoded.address))
    )
      throw new Error();
    return { address: decoded.address, role: decoded.role, jti: decoded.jti };
  } catch {
    throw new ApiError(401, "Invalid or expired session token", "UNAUTHORIZED");
  }
}

/** Require any authenticated wallet. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new ApiError(401, "Missing Authorization header", "UNAUTHORIZED"));
    return;
  }
  const raw = header.slice(7);
  // A custom Authorization header is required even for cookie sessions (CSRF protection).
  const cookie = raw === "cookie-session" ? adminCookie(req) : "";
  if (isBrowserCredential(cookie)) {
    void readBrowserSession(cookie).then((session) => {
      req.session = session;
      next();
    }, next);
    return;
  }
  // Older cookies and non-browser clients use the short-lived JWT path.
  req.session = verifySessionToken(raw === "cookie-session" ? cookie : raw);
  if (req.session.role === "ADMIN") {
    void cache
      .get("auth:active:" + req.session.jti)
      .then((v) => next(!v ? new ApiError(401, "Session expired", "UNAUTHORIZED") : undefined))
      .catch(() => next(new ApiError(503, "Session store unavailable", "AUTH_UNAVAILABLE")));
  } else next();
}

/** Require the ADMIN role (admin dashboard endpoints). */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, (err?: unknown) => {
    if (err) {
      next(err);
      return;
    }
    if (req.session?.role !== "ADMIN") {
      next(new ApiError(403, "Admin role required", "FORBIDDEN"));
      return;
    }
    next();
  });
}

/** SIWE-style message the wallet signs. */
export function buildChallengeMessage(address: string, nonce: string): string {
  return [
    "XAUConnect wants you to sign in with your wallet:",
    address,
    "",
    "This signature proves wallet ownership. It does not authorize any transaction and costs no gas.",
    "",
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join("\n");
}

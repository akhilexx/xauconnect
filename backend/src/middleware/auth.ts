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
import { env } from "../config.js";
import { ApiError } from "./error.js";

export interface SessionPayload {
  address: string;
  role: "USER" | "ADMIN";
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
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d", issuer: "xauconnect" });
}

export function verifySessionToken(token: string): SessionPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: "xauconnect" }) as SessionPayload &
      jwt.JwtPayload;
    return { address: decoded.address, role: decoded.role };
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
  req.session = verifySessionToken(header.slice(7));
  next();
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

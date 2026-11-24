/**
 * Wallet authentication routes (challenge/verify -> JWT).
 */
import { Router, type Request, type Response } from "express";
import { verifyMessage } from "viem";
import bs58 from "bs58";
import { createPublicKey, verify as verifySignature, randomBytes } from "node:crypto";
import { AuthChallengeRequestSchema, AuthVerifyRequestSchema } from "@xauconnect/utils";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { cache } from "../cache.js";
import { adminAddresses, env } from "../config.js";
import { db } from "../db/client.js";
import { asyncHandler, validate, ApiError } from "../middleware/error.js";
import {
  ADMIN_COOKIE,
  adminCookie,
  adminCookieOptions,
  createBrowserSession,
  isBrowserCredential,
  revokeBrowserSession,
} from "../services/admin-browser-session.js";
import { authLimiter } from "../middleware/rate-limit.js";
import {
  buildChallengeMessage,
  requireAuth,
  signSession,
  verifySessionToken,
} from "../middleware/auth.js";

export const authRouter = Router();
authRouter.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
}, authLimiter);
async function sendSession(req: Request, res: Response, address: string, role: "ADMIN" | "USER") {
  const previous = adminCookie(req);
  if (role === "ADMIN" && req.body.browserSession === true) {
    const { raw, expiresAt } = await createBrowserSession(address, previous);
    res.cookie(ADMIN_COOKIE, raw, { ...adminCookieOptions, expires: expiresAt });
    res.json({ token: "cookie-session", role });
    return;
  }
  if (req.body.browserSession === true && previous) {
    await revokeBrowserSession(previous);
    res.clearCookie(ADMIN_COOKIE, adminCookieOptions);
  }
  const token = signSession({ address, role });
  if (role === "ADMIN") await cache.set("auth:active:" + verifySessionToken(token).jti, "1", 1800);
  res.json({ token, role });
}

authRouter.post(
  "/logout",
  // Deletion by the browser's own credential is idempotent, including after expiry.
  (req, res, next) => {
    if (
      req.get("authorization") === "Bearer cookie-session" &&
      (!adminCookie(req) || isBrowserCredential(adminCookie(req)))
    )
      return next();
    requireAuth(req, res, next);
  },
  asyncHandler(async (req, res) => {
    if (req.get("authorization") === "Bearer cookie-session")
      await revokeBrowserSession(adminCookie(req));
    if (req.session?.role === "ADMIN" && req.session.jti)
      await cache.del("auth:active:" + req.session.jti);
    res.clearCookie(ADMIN_COOKIE, adminCookieOptions).json({ ok: true });
  }),
);

/** Step 1 — issue a nonce + message for the wallet to sign. */
authRouter.post(
  "/challenge",
  asyncHandler(async (req, res) => {
    const { address } = validate(AuthChallengeRequestSchema, req.body);
    const nonce = randomBytes(16).toString("hex");
    const message = buildChallengeMessage(address, nonce);
    await cache.set(`auth:nonce:${nonce}`, JSON.stringify({ address, message }), 300);
    res.json({ nonce, message });
  }),
);

/** Step 2 — verify the signature, mint a session JWT. */
authRouter.post(
  "/verify",
  asyncHandler(async (req, res) => {
    const { address, signature, nonce } = validate(AuthVerifyRequestSchema, req.body);

    const stored = await cache.take(`auth:nonce:${nonce}`);
    if (!stored) throw new ApiError(401, "Challenge expired — request a new one", "NONCE_EXPIRED");
    const { address: expected, message } = JSON.parse(stored) as {
      address: string;
      message: string;
    };
    if (
      address.startsWith("0x")
        ? expected.toLowerCase() !== address.toLowerCase()
        : expected !== address
    ) {
      throw new ApiError(401, "Address mismatch", "ADDRESS_MISMATCH");
    }

    // EVM signature verification (viem). Solana ed25519 verification can be
    // added with tweetnacl when the embedded Solana auth flow ships.
    let valid = false;
    if (address.startsWith("0x")) {
      valid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      }).catch(() => false);
    }
    if (!address.startsWith("0x")) {
      try {
        const key = bs58.decode(address),
          sig = bs58.decode(signature);
        if (key.length === 32 && sig.length === 64)
          valid = verifySignature(
            null,
            Buffer.from(message),
            createPublicKey({
              key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), key]),
              format: "der",
              type: "spki",
            }),
            sig,
          );
      } catch {
        valid = false;
      }
    }
    const canonical = address.startsWith("0x") ? address.toLowerCase() : address;
    if (!valid) throw new ApiError(401, "Invalid signature", "BAD_SIGNATURE");

    const role = address.startsWith("0x") && adminAddresses.has(canonical) ? "ADMIN" : "USER";

    // Upsert user record (best-effort; demo mode has no DB).
    if (db) {
      await db.user
        .upsert({
          where: { address: canonical },
          update: { lastSeenAt: new Date(), role },
          create: {
            address: canonical,
            chainKind: address.startsWith("0x") ? "evm" : "solana",
            role,
          },
        })
        .catch(() => {});
    }

    await sendSession(req, res, canonical, role);
  }),
);

/**
 * Admin console login — email + password, separate from the wallet flow.
 * Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD; the issued JWT carries
 * the ADMIN role and unlocks the full /admin/* workflow.
 */
const AdminLoginSchema = z.object({
  email: z.string().email().max(128),
  password: z.string().min(1).max(256),
});

function safeEqual(expected: string, given: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

authRouter.post(
  "/admin-login",
  asyncHandler(async (req, res) => {
    const { email, password } = validate(AdminLoginSchema, req.body);
    const emailOk = safeEqual(env.ADMIN_EMAIL.toLowerCase(), email.toLowerCase());
    const passOk = safeEqual(env.ADMIN_PASSWORD, password);
    if (!emailOk || !passOk) {
      throw new ApiError(401, "Invalid admin credentials", "BAD_ADMIN_CREDENTIALS");
    }

    await sendSession(req, res, "admin:console", "ADMIN");
  }),
);

/** Whoami — validate an existing session. */
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ session: req.session });
  }),
);

// ── Social profile ──────────────────────────────────────────────────────────

const SocialProfileSchema = z.object({
  displayName: z.string().max(48).optional(),
  twitter: z.string().max(64).optional(),
  telegram: z.string().max(64).optional(),
  discord: z.string().max(64).optional(),
  website: z.string().url().max(200).optional().or(z.literal("")),
});

const PROFILE_FIELDS = {
  displayName: true,
  twitter: true,
  telegram: true,
  discord: true,
  website: true,
} as const;

/** Fetch the signed-in user's social links (null in demo mode / no DB). */
authRouter.get(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!db) return res.json({ profile: null, demo: true });
    const user = await db.user.findUnique({
      where: { address: req.session!.address },
      select: PROFILE_FIELDS,
    });
    res.json({ profile: user ?? null });
  }),
);

/** Update the signed-in user's social links. */
authRouter.put(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = validate(SocialProfileSchema, req.body);
    const data = {
      displayName: profile.displayName || null,
      twitter: profile.twitter?.replace(/^@/, "") || null,
      telegram: profile.telegram?.replace(/^@/, "") || null,
      discord: profile.discord || null,
      website: profile.website || null,
    };
    if (!db) {
      // Demo mode — echo back so the UI flow works without a database.
      return res.json({ ok: true, profile: data, demo: true });
    }
    const user = await db.user.update({
      where: { address: req.session!.address },
      data,
      select: PROFILE_FIELDS,
    });
    res.json({ ok: true, profile: user });
  }),
);

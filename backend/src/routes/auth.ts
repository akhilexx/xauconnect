/**
 * Wallet authentication routes (challenge/verify -> JWT).
 */
import { Router } from "express";
import { verifyMessage } from "viem";
import { randomBytes } from "node:crypto";
import { AuthChallengeRequestSchema, AuthVerifyRequestSchema } from "@xauconnect/utils";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { cache } from "../cache.js";
import { adminAddresses, env } from "../config.js";
import { db } from "../db/client.js";
import {
  asyncHandler,
  validate,
  ApiError,
} from "../middleware/error.js";
import { authLimiter } from "../middleware/rate-limit.js";
import { buildChallengeMessage, requireAuth, signSession } from "../middleware/auth.js";

export const authRouter = Router();
authRouter.use(authLimiter);

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

    const stored = await cache.get(`auth:nonce:${nonce}`);
    if (!stored) throw new ApiError(401, "Challenge expired — request a new one", "NONCE_EXPIRED");
    const { address: expected, message } = JSON.parse(stored) as {
      address: string;
      message: string;
    };
    if (expected.toLowerCase() !== address.toLowerCase()) {
      throw new ApiError(401, "Address mismatch", "ADDRESS_MISMATCH");
    }
    await cache.del(`auth:nonce:${nonce}`); // single-use

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
    if (!valid) throw new ApiError(401, "Invalid signature", "BAD_SIGNATURE");

    const role = adminAddresses.has(address.toLowerCase()) ? "ADMIN" : "USER";

    // Upsert user record (best-effort; demo mode has no DB).
    if (db) {
      await db.user
        .upsert({
          where: { address: address.toLowerCase() },
          update: { lastSeenAt: new Date(), role },
          create: { address: address.toLowerCase(), role },
        })
        .catch(() => {});
    }

    res.json({ token: signSession({ address: address.toLowerCase(), role }), role });
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

    res.json({
      token: signSession({ address: "admin:console", role: "ADMIN" }),
      role: "ADMIN" as const,
    });
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

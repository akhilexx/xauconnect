import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { CookieOptions, Request } from "express";
import { adminAddresses, env } from "../config.js";
import { db } from "../db/client.js";
import { ApiError } from "../middleware/error.js";

export const ADMIN_COOKIE = "xau_admin";
export const adminCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/",
};

export function adminCookie(req: Request): string {
  return /(?:^|;\s*)xau_admin=([^;]+)/.exec(req.headers.cookie ?? "")?.[1] ?? "";
}

export function isBrowserCredential(value: string): boolean {
  return /^as1_[A-Za-z0-9_-]{43}$/.test(value);
}

function digest(context: string, value: string): string {
  return createHmac("sha256", env.JWT_SECRET)
    .update(context)
    .update("\0")
    .update(value)
    .digest("hex");
}
const tokenHash = (raw: string) => digest("admin-browser-cookie-v1", raw);
function credentialTag(address: string): string | null {
  if (address === "admin:console") {
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return null;
    return digest(
      "admin-console-v1",
      JSON.stringify([env.ADMIN_EMAIL.toLowerCase(), env.ADMIN_PASSWORD]),
    );
  }
  return adminAddresses.has(address) ? digest("admin-wallet-v1", address) : null;
}

const unavailable = () =>
  new ApiError(503, "Session store temporarily unavailable", "AUTH_UNAVAILABLE");
const expired = () => new ApiError(401, "Admin session expired or revoked", "UNAUTHORIZED");

export async function createBrowserSession(address: string, previous: string) {
  if (!db) throw unavailable();
  const tag = credentialTag(address);
  if (!tag) throw expired();
  const raw = "as1_" + randomBytes(32).toString("base64url");
  const now = new Date(),
    expiresAt = new Date(+now + env.ADMIN_BROWSER_SESSION_DAYS * 86_400_000);
  try {
    await db.$transaction([
      db.adminBrowserSession.deleteMany({
        where: {
          OR: [
            { expiresAt: { lte: now } },
            ...(isBrowserCredential(previous) ? [{ tokenHash: tokenHash(previous) }] : []),
          ],
        },
      }),
      db.adminBrowserSession.create({
        data: { tokenHash: tokenHash(raw), address, credentialTag: tag, createdAt: now, expiresAt },
      }),
    ]);
  } catch {
    throw unavailable();
  }
  return { raw, expiresAt };
}

export async function readBrowserSession(raw: string) {
  if (!db) throw unavailable();
  const row = await db.adminBrowserSession
    .findUnique({
      where: { tokenHash: tokenHash(raw) },
      select: { address: true, credentialTag: true, expiresAt: true },
    })
    .catch(() => {
      throw unavailable();
    });
  if (!row || row.expiresAt.getTime() <= Date.now()) throw expired();
  const tag = credentialTag(row.address);
  if (!tag || !timingSafeEqual(Buffer.from(row.credentialTag), Buffer.from(tag))) throw expired();
  return { address: row.address, role: "ADMIN" as const };
}

export async function revokeBrowserSession(raw: string) {
  if (!isBrowserCredential(raw)) return;
  if (!db) throw unavailable();
  await db.adminBrowserSession.deleteMany({ where: { tokenHash: tokenHash(raw) } }).catch(() => {
    throw unavailable();
  });
}

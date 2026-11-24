BEGIN;
CREATE TABLE IF NOT EXISTS "AdminBrowserSession" (
  "tokenHash" CHAR(64) PRIMARY KEY,
  "address" TEXT NOT NULL,
  "credentialTag" CHAR(64) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "AdminBrowserSession_valid_lifetime" CHECK ("expiresAt" > "createdAt")
);
CREATE INDEX IF NOT EXISTS "AdminBrowserSession_expiresAt_idx" ON "AdminBrowserSession" ("expiresAt");
CREATE INDEX IF NOT EXISTS "AdminBrowserSession_address_idx" ON "AdminBrowserSession" ("address");
COMMIT;

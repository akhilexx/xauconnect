-- Fiat on-ramp / off-ramp (Buy & Sell crypto) support.
-- Adds the partner-fee column to FeeConfig and the FiatTransaction lifecycle table.

ALTER TABLE "FeeConfig" ADD COLUMN IF NOT EXISTS "onrampFeeBps" INTEGER NOT NULL DEFAULT 300;

CREATE TABLE IF NOT EXISTS "FiatTransaction" (
  "id" TEXT NOT NULL,
  "providerTxId" TEXT,
  "partnerContext" TEXT,
  "type" TEXT NOT NULL DEFAULT 'buy',
  "provider" TEXT,
  "status" TEXT NOT NULL DEFAULT 'created',
  "fiatCurrency" TEXT NOT NULL,
  "fiatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cryptoAsset" TEXT NOT NULL,
  "chainKey" TEXT,
  "cryptoAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paymentMethod" TEXT,
  "country" TEXT,
  "walletAddress" TEXT,
  "partnerFeeFiat" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "partnerFeePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "txHash" TEXT,
  "clientSource" TEXT DEFAULT 'web',
  "clientIp" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FiatTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FiatTransaction_providerTxId_key" ON "FiatTransaction"("providerTxId");
CREATE UNIQUE INDEX IF NOT EXISTS "FiatTransaction_partnerContext_key" ON "FiatTransaction"("partnerContext");
CREATE INDEX IF NOT EXISTS "FiatTransaction_status_createdAt_idx" ON "FiatTransaction"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "FiatTransaction_type_createdAt_idx" ON "FiatTransaction"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "FiatTransaction_walletAddress_createdAt_idx" ON "FiatTransaction"("walletAddress", "createdAt");

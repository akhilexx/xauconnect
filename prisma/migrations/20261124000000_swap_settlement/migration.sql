-- No old report (including one labeled confirmed) is evidence of settlement.
BEGIN;
SELECT pg_advisory_xact_lock(83111624);
ALTER TABLE "Swap" ADD COLUMN IF NOT EXISTS "settlementKey" TEXT, ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "blockRef" TEXT, ADD COLUMN IF NOT EXISTS "feeToken" TEXT,
  ADD COLUMN IF NOT EXISTS "volumePriced" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS "feePriced" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "Swap_settlementKey_key" ON "Swap"("settlementKey");
CREATE INDEX IF NOT EXISTS "Swap_verifiedAt_createdAt_idx" ON "Swap"("verifiedAt", "createdAt");
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Swap_evidence_required' AND conrelid='"Swap"'::regclass) THEN
ALTER TABLE "Swap" ADD CONSTRAINT "Swap_evidence_required" CHECK (
  ("verifiedAt" IS NULL AND "settlementKey" IS NULL) OR
  ("verifiedAt" IS NOT NULL AND "settlementKey" IS NOT NULL AND "status" = 'confirmed'
   AND "txHash" IS NOT NULL AND "settlementKey" = "chainKey" || ':' || "txHash"
   AND "amountIn" > 0 AND "amountOut" > 0 AND "protocolFee" >= 0 AND "blockRef" IS NOT NULL));
END IF; END $$;
CREATE TABLE IF NOT EXISTS "SwapVerification" (
  "id" TEXT PRIMARY KEY, "chainKey" TEXT NOT NULL, "taker" TEXT NOT NULL,
  "tokenIn" TEXT NOT NULL, "tokenOut" TEXT NOT NULL, "amountIn" TEXT NOT NULL, "venue" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL, "feeRecipient" TEXT NOT NULL, "prices" JSONB NOT NULL,
  "clientSource" TEXT, "clientId" TEXT, "clientName" TEXT, "txHash" TEXT, "reason" TEXT,
  "state" TEXT NOT NULL DEFAULT 'built', "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextCheck" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SwapVerification_state_nextCheck_idx" ON "SwapVerification"("state","nextCheck");
CREATE INDEX IF NOT EXISTS "SwapVerification_createdAt_idx" ON "SwapVerification"("createdAt");
ALTER TABLE "FiatTransaction" ADD COLUMN IF NOT EXISTS "providerVerifiedAt" TIMESTAMP(3);
COMMIT;

-- AlterTable
ALTER TABLE "Swap" ADD COLUMN IF NOT EXISTS "clientSource" TEXT;
ALTER TABLE "Swap" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE "Swap" ADD COLUMN IF NOT EXISTS "clientName" TEXT;
ALTER TABLE "Swap" ADD COLUMN IF NOT EXISTS "requestId" TEXT;

CREATE INDEX IF NOT EXISTS "Swap_clientSource_createdAt_idx" ON "Swap"("clientSource", "createdAt");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ApiClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "apiKeyHash" TEXT,
    "contactEmail" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiClient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApiClient_apiKeyHash_key" ON "ApiClient"("apiKeyHash");
CREATE INDEX IF NOT EXISTS "ApiClient_name_idx" ON "ApiClient"("name");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ApiRequestLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "chainKey" TEXT,
    "takerAddress" TEXT,
    "clientSource" TEXT NOT NULL DEFAULT 'api',
    "clientName" TEXT,
    "clientIp" TEXT,
    "userAgent" TEXT,
    "statusCode" INTEGER NOT NULL,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiRequestLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ApiRequestLog_clientId_createdAt_idx" ON "ApiRequestLog"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "ApiRequestLog_endpoint_createdAt_idx" ON "ApiRequestLog"("endpoint", "createdAt");
CREATE INDEX IF NOT EXISTS "ApiRequestLog_takerAddress_createdAt_idx" ON "ApiRequestLog"("takerAddress", "createdAt");
CREATE INDEX IF NOT EXISTS "ApiRequestLog_requestId_idx" ON "ApiRequestLog"("requestId");

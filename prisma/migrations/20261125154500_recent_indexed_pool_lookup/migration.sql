-- Run outside a transaction so reads and indexer writes can continue.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IndexedPool_chainKey_isActive_createdAt_idx"
ON "IndexedPool" ("chainKey", "isActive", "createdAt" DESC);

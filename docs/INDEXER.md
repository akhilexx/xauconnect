# XAUConnect On-Chain Market Indexer

Self-hosted market data pipeline: pool discovery, on-chain pricing, swap indexing,
and OHLCV aggregation. Runs on a dedicated **Azure Linux VM** alongside the
existing **Windows app VM**.

## Architecture

```
App host
│   Express :4000 · Next.js :3000 · reverse proxy :80
│   Deploy: ./scripts/deploy.sh
│
Indexer host
│   systemd xauconnect-indexer.service
│   Deploy: ./scripts/deploy-indexer.sh
│
PostgreSQL
    Shared by the app and the indexer
```

## Backend modules

| Path | Role |
| --- | --- |
| `backend/src/indexer/worker.ts` | Indexer entrypoint (`pnpm --filter @xauconnect/backend indexer`) |
| `backend/src/indexer/onchain/evm-v2-price.ts` | V2 reserve → USD price |
| `backend/src/indexer/onchain/native-usd.ts` | WETH/USDC reference oracle |
| `backend/src/indexer/price-service.ts` | Token price + snapshot loop |
| `backend/src/indexer/streams/pair-created.ts` | EVM PairCreated scanner |
| `backend/src/indexer/streams/solana-launches.ts` | Pump.fun / Raydium via Helius |
| `backend/src/indexer/streams/swap-v2.ts` | V2 Swap log indexer |
| `backend/src/indexer/streams/swap-v3.ts` | V3 Swap log indexer |
| `backend/src/indexer/aggregator/candles.ts` | OHLCV from swaps |
| `backend/src/indexer/maintenance/retention.ts` | 90d swaps / 7d snapshots prune |
| `backend/src/services/market-lookup.ts` | Triple merge: Gecko + Dex + on-chain |

## Prisma models

- `IndexedPool` — tracked liquidity pools
- `PoolSnapshot` — point-in-time price/liquidity
- `IndexerCursor` — block scan resume state
- `SwapEvent` — raw swap logs
- `CandleBar` — pre-aggregated OHLCV

Apply schema: `pnpm db:push` (included in deploy scripts).

## Environment variables

| Variable | Host | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Both VMs | Shared Postgres (`?sslmode=require` on Azure) |
| `INDEXER_ENABLED=true` | Linux VM | Start worker |
| `INDEXER_ROLE=worker` | Linux VM | Marks indexer host |
| `MARKET_SOURCE` | App VM | `hybrid` (default), `db`, or `external` |
| `RPC_*` | Both | Archive-capable RPC for `eth_getLogs` |
| `RPC_SOLANA` / `HELIUS_API_KEY` | Indexer | Solana launch discovery |

## Provisioning (one-time)

```bash
# 1. Create SSH key
ssh-keygen -t ed25519 -f ~/.ssh/xauconnect_indexer_deploy

# 2. Provision Azure Linux VM + PostgreSQL
./deploy/provision-azure-infra.sh

# 3. Bootstrap Linux VM
ssh -i ~/.ssh/xauconnect_indexer_deploy <user>@<indexer-ip> 'bash -s' < deploy/provision-azure-indexer.sh

# 4. Migrate Postgres from Windows localhost → Flexible Server
#    pg_dump on Windows VM → pg_restore to xauconnect-db

# 5. Update DATABASE_URL on both VMs; add INDEXER_ENABLED=true on Linux

# 6. Deploy
./scripts/deploy.sh          # app VM
./scripts/deploy-indexer.sh  # Linux VM
```

Add to `~/.ssh/config`:

```
Host xauconnect-indexer
  HostName <azure-linux-vm-public-ip>
  User <deploy-user>
  IdentityFile ~/.ssh/xauconnect_indexer_deploy
```

## systemd (Linux indexer)

Unit file: `deploy/xauconnect-indexer.service`

```bash
sudo systemctl enable --now xauconnect-indexer
curl http://127.0.0.1:4100/health
```

Logs: `/opt/xauconnect/logs/indexer.log`

## Data retention

- `SwapEvent`: 90 days
- `PoolSnapshot`: 7 days
- `CandleBar`: indefinite

## Feature flags

- `MARKET_SOURCE=hybrid` — DB/on-chain first, Gecko/Dex supplement gaps
- `MARKET_SOURCE=db` — indexed tokens only from Postgres/RPC
- `MARKET_SOURCE=external` — legacy Gecko + Dex only (no on-chain merge)

## Reorg policy

- Cursors store `lastBlock`; on restart, re-scan last 20 blocks
- Swaps dedupe on `(txHash, logIndex)` via unique constraint

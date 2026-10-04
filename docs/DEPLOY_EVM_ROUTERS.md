 # Deploy AggregatorRouter on all 6 EVM chains

XAUConnect EVM swaps execute through your own **`AggregatorRouter`** contract.
Quotes come from 1inch / 0x / on-chain adapters, but the **transaction always
targets `ROUTER_ADDRESS_<CHAIN>`** on the backend VM.

You deploy the router yourself — there is no third-party API that gives you
this address. Each chain gets its own deployment.

## What gets deployed

Per network (`packages/contracts/scripts/deploy.ts`):

| Contract | Purpose |
|----------|---------|
| `FeeCollector` | Protocol fee skim (UUPS proxy) |
| `AggregatorRouter` | **Copy this address → `ROUTER_ADDRESS_*`** |
| `UniswapV2Adapter` | One per V2 DEX router (QuickSwap, Camelot, etc.) |
| `LiquidityZap`, `TokenFactory`, `Launchpad` | LP + launchpad (optional for swap-only) |

Venue routers are canonical addresses from `packages/utils/src/dexes.ts`.

## Prerequisites

1. **Funded deployer wallet** — same key on every chain you deploy to.
2. **Root `.env`** (never commit):

```bash
DEPLOYER_PRIVATE_KEY=0x...   # hot wallet with gas on each chain
RPC_ETHEREUM=https://eth-mainnet.g.alchemy.com/v2/...
RPC_BSC=...
RPC_POLYGON=...
RPC_ARBITRUM=...
RPC_BASE=...
RPC_AVALANCHE=...
```

3. **Compile contracts** (from repo root):

```bash
pnpm --filter @xauconnect/contracts build
```

## Deploy per chain

Run **one network at a time**. Save the printed `AggregatorRouter:` line.

```bash
# Testnets (cheap validation)
pnpm --filter @xauconnect/contracts deploy:sepolia
pnpm --filter @xauconnect/contracts deploy:bscTestnet

# Mainnets — real gas; verify venue routers in dexes.ts first
pnpm --filter @xauconnect/contracts deploy:ethereum
pnpm --filter @xauconnect/contracts deploy:bsc
pnpm --filter @xauconnect/contracts deploy:polygon
pnpm --filter @xauconnect/contracts deploy:arbitrum
pnpm --filter @xauconnect/contracts deploy:base
pnpm --filter @xauconnect/contracts deploy:avalanche
```

Example output:

```
AggregatorRouter:  0xAbC123...
  adapter quickswap: 0x... -> 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff
```

## Configure production server

On the Windows app VM (`C:\xauconnect\.env`), set:

```bash
ROUTER_ADDRESS_ETHEREUM=0x...
ROUTER_ADDRESS_BSC=0x...
ROUTER_ADDRESS_POLYGON=0x...
ROUTER_ADDRESS_ARBITRUM=0x...
ROUTER_ADDRESS_BASE=0x...
ROUTER_ADDRESS_AVALANCHE=0x...
```

Sync from your machine:

```bash
./scripts/sync-production-env.sh   # if you maintain .local/production.env
```

Restart backend:

```powershell
nssm restart xauconnect-backend
```

Verify: swap on each chain should build a tx to your router (not `0x000…000`).

## Where router addresses come from

| Source | Use for |
|--------|---------|
| **Your deploy output** | `ROUTER_ADDRESS_*` — AggregatorRouter you own |
| `packages/utils/src/dexes.ts` | **Venue** routers (Uniswap, PancakeSwap, etc.) — wired as adapters at deploy |
| 1inch / 0x APIs | Quotes only — execution still goes through AggregatorRouter |

## Post-deploy checklist

- [ ] Confirm `withdrawalRecipient` on `FeeCollector` → `PROTOCOL_FEE_COLLECTOR_EVM` (`0xC062…79B6`)
- [ ] Grant `WITHDRAWER_ROLE` to `PROTOCOL_OPERATIONS_EVM` if ops wallet should sweep fees
- [ ] Set fee on `FeeCollector` to match admin `FeeConfig` per chain (25–75 bps on-chain)
- [ ] Register each `UniswapV2Adapter` on `AggregatorRouter` (deploy script does this)
- [ ] Copy `FeeCollector` proxy → `FEE_RECIPIENT` in server env (per chain if you track separately)
- [ ] Smoke-test `POST /api/swap/build` on each chain
- [ ] Small mainnet swap with a connected wallet

### FeeCollector withdrawal target

Deploy reads from root `.env`:

```bash
PROTOCOL_FEE_COLLECTOR_EVM=0xC0624F22BAd798Bd9236EF0c95E35404614079B6
PROTOCOL_OPERATIONS_EVM=0x6b16cD6c922F5FA47D27a0cE0d86434597e94b69
```

On deploy, `setWithdrawalRecipient` is called automatically. For an **already deployed** proxy:

```bash
FEE_COLLECTOR_ADDRESS=0x... \
PROTOCOL_FEE_COLLECTOR_EVM=0xC0624F22BAd798Bd9236EF0c95E35404614079B6 \
pnpm --filter @xauconnect/contracts configure:withdrawals
```

Treasury sweeps use `withdrawToRecipient(token, amount)` — funds land in the fee-collector hot wallet only.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ROUTER_ADDRESS_* not configured` | Env var missing on server; restart backend |
| Simulation revert | Wrong adapter / venue router; redeploy adapter |
| Quote works, build fails | Router not deployed on that chain yet |
| Insufficient gas | Fund deployer with native token on that chain |

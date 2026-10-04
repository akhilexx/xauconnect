# DeFiLlama listing playbook — XAUConnect

Single highest-ROI distribution channel for a DeFi aggregator: a **Fees** chart on DeFiLlama with a backlink to `xauconnect.com`. This document is the operational source of truth; PR-ready code lives in [`defillama/`](../defillama/).

## Executive summary

| Item | Value |
|------|--------|
| **List as** | Fees / Revenue (primary), DEX Volume (optional, router-only) |
| **Do not list as** | TVL (non-custodial aggregator) |
| **PR target repo** | [DefiLlama/dimension-adapters](https://github.com/DefiLlama/dimension-adapters) |
| **Adapter files** | `defillama/fees/xauconnect.ts`, optional `defillama/dexs/xauconnect.ts` |
| **Public website** | https://xauconnect.com/about (trust + contract transparency) |

## On-chain fee sources

XAUConnect earns fees through two paths:

### Path A — Own AggregatorRouter (EVM)

1. User signs swap on `AggregatorRouter`.
2. Router skims protocol fee and calls `FeeCollector.notifyFee`.
3. `FeeCollector` emits **`FeeReceived(kind, token, amount, payer)`**.

Track via `getLogs` on per-chain FeeCollector proxy.

### Path B — Integrator aggregators (1inch / 0x / Jupiter)

1. Backend builds calldata with partner fee parameter.
2. Fee settles to published hot wallet (EVM) or Solana fee ATA.
3. Track via **`addTokensReceived`** + **`getETHReceived`** on wallet `0xC0624F22BAd798Bd9236EF0c95E35404614079B6`.

**Double-count guard:** When Path A fees sit in FeeCollector then withdraw to the hot wallet, exclude transfers **from** FeeCollector in Path B wallet tracking (`blacklist_fromAddresses` / `notFromSenders`).

## Deployed addresses (mainnet)

| Chain | FeeCollector | AggregatorRouter | Status |
|-------|--------------|------------------|--------|
| Polygon | `0xa5e0A97385278Dae82f4BdFD59Ad8939917D0ec0` | `0xA24313e01f02369fdF55516618e8Ce5120a2A223` | Confirmed (OpenZeppelin) |
| Ethereum | _set `FEE_COLLECTOR_ADDRESS_ETHEREUM`_ | _set `ROUTER_ADDRESS_ETHEREUM`_ | Deploy when live |
| BSC | _env_ | _env_ | Deploy when live |
| Arbitrum | _env_ | _env_ | Deploy when live |
| Base | _env_ | _env_ | Deploy when live |
| Avalanche | _env_ | _env_ | Deploy when live |
| Solana | N/A (wallet) | N/A | `ENobDuF4iGAmF1Y211aLj6gXCNpdHBfnNkUyLDdbUabb` |

Source of truth for protocol wallets: `packages/utils/src/protocol-wallets.ts`.

## Methodology text (paste into PR)

**Fees:** Swap, liquidity, launchpad, and listing fees recorded on-chain via `FeeReceived` events on UUPS `FeeCollector` contracts, plus integrator partner fees received at the published EVM fee wallet. Vault withdrawals to the hot wallet are excluded from wallet-based counting.

**Revenue:** 100% of protocol fees are retained by XAUConnect Labs (no separate supply-side share from the platform fee component).

**Default swap fee:** 30 bps (0.30%) on router path — configurable on-chain via `FeeCollector.swapFeeBps()`.

**Volume (optional adapter):** Sum of `amountIn` from `SwapExecuted` on `AggregatorRouter` only. Does not include volume where users sign 1inch/0x calldata directly.

## PR workflow

1. Fork `DefiLlama/dimension-adapters`.
2. Copy `defillama/fees/xauconnect.ts` → `fees/xauconnect.ts`.
3. Set accurate **`start`** dates per chain (first fee on explorer).
4. Run local adapter test per dimension-adapters README.
5. Open PR with website, GitHub, methodology, and Polygon contract links.
6. Respond to reviewer requests within 48h (common asks: fix start date, add logo, clarify double-count).
7. After merge, verify `defillama.com/fees/...` and share chart link.

See [`defillama/README.md`](../defillama/README.md) for copy-paste PR body.

## Off-chain data (not for DeFiLlama)

`POST /swap/record` writes to Postgres `Swap` table for admin analytics. DeFiLlama adapters must be **trustless/on-chain** — do not submit API-only volume in the adapter.

## Post-listing distribution

1. Link DeFiLlama chart from `/about` (optional badge in footer later).
2. Add to `llms.txt` / developer blog post.
3. Submit homepage + `/about` to GSC (already in sitemap `core.xml`).
4. One social post: fees chart + non-custodial aggregator positioning.

## Maintenance

When deploying a new chain:

```bash
pnpm --filter @xauconnect/contracts deploy:ethereum  # example
# → update C:\xauconnect\.env ROUTER_* and FEE_COLLECTOR_*
# → update defillama/fees/xauconnect.ts chainConfig
# → open dimension-adapters follow-up PR
```

## Solana follow-up

Jupiter integrator fees land on `feeCollectorSolana`. Implement Solana fee adapter in a second PR using dimension-adapters Solana helpers (`getSolanaReceived`).

## Legal / trust pages (YMYL)

DeFiLlama reviewers and users expect:

- https://xauconnect.com/about
- https://xauconnect.com/terms
- https://xauconnect.com/privacy

Linked from site footer and included in `sitemaps/core.xml`.

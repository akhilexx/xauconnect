# DeFiLlama listing — XAUConnect

This folder contains **PR-ready adapters** for [DefiLlama/dimension-adapters](https://github.com/DefiLlama/dimension-adapters). XAUConnect is a **DEX aggregator**, not an AMM — list under **Fees/Revenue** first (highest ROI backlink). Optional **DEX volume** adapter covers on-router swaps only.

## Why fees, not TVL

TVL adapters measure liquidity locked in pools. XAUConnect routes through external venues (Uniswap, QuickSwap, 1inch, Jupiter, etc.) and does not custody LP deposits in a single protocol pool. **Fees** reflect real protocol earnings and match how aggregators like LI.FI and Socket appear on DeFiLlama.

## Files to copy

| Local file | Target in dimension-adapters repo |
|------------|-----------------------------------|
| `defillama/fees/xauconnect.ts` | `fees/xauconnect.ts` |
| `defillama/dexs/xauconnect.ts` | `dexs/xauconnect.ts` (optional) |
| `defillama/config.ts` | Reference only — keep in xauconnect repo |

## Step-by-step PR checklist

### 1. Fork & clone

```bash
git clone https://github.com/YOUR_USER/dimension-adapters.git
cd dimension-adapters
pnpm install
```

### 2. Copy the fees adapter

```bash
cp /path/to/xauconnect/defillama/fees/xauconnect.ts fees/xauconnect.ts
```

### 3. Verify chain config

Edit `chainConfig` in `fees/xauconnect.ts`:

- **Polygon** — confirmed deploy (OpenZeppelin): FeeCollector `0xa5e0A97385278Dae82f4BdFD59Ad8939917D0ec0`, Router `0xA24313e01f02369fdD55516618e8Ce5120a2A223`
- **Other EVM chains** — set `feeCollector` after deploy; until then integrator wallet inflows still capture 1inch/0x partner fees
- **`start` dates** — set to first day with non-zero fees (check explorers)

Integrator fee wallet (all EVM chains): `0xC0624F22BAd798Bd9236EF0c95E35404614079B6`  
Solana fee wallet: `ENobDuF4iGAmF1Y211aLj6gXCNpdHBfnNkUyLDdbUabb`

### 4. Test locally (dimension-adapters)

```bash
# Example: Polygon fees for yesterday
pnpm run test fees xauconnect polygon
# or per their README:
npm run test -- fees xauconnect
```

Fix any TypeScript errors (`fromAddresses` on helpers may need adjustment to match current dimension-adapters API).

### 5. Open PR

Title: **`feat(fees): add XAUConnect aggregator`**

PR body template:

```markdown
## Protocol
- Name: XAUConnect
- Website: https://xauconnect.com
- Twitter: (add if live)
- Category: DEX Aggregator
- Chains: Ethereum, BSC, Polygon, Arbitrum, Base, Avalanche (+ Solana fees TBD)

## Methodology
- **Fees:** FeeReceived events on per-chain FeeCollector UUPS proxies + ERC20/native inflows to published integrator fee wallet (1inch/0x partner fees). Withdrawals from FeeCollector → hot wallet excluded from wallet tracking to prevent double count.
- **Revenue:** 100% of fees = protocol revenue (30 bps default swap fee on router path).
- **Not TVL:** Non-custodial aggregator; no pooled TVL.

## Contracts
- FeeCollector ABI: https://github.com/akhilexx/xauconnect/tree/main/packages/contracts/contracts/FeeCollector.sol
- Polygon FeeCollector: 0xa5e0A97385278Dae82f4BdFD59Ad8939917D0ec0
- Public fee wallet: 0xC0624F22BAd798Bd9236EF0c95E35404614079B6

## Links
- About: https://xauconnect.com/about
- API docs: https://xauconnect.com/developers
- GitHub: https://github.com/akhilexx/xauconnect
```

### 6. Protocol page (DefiLlama-Adapters)

Some listings also need a parent entry in [DefiLlama/DefiLlama-Adapters](https://github.com/DefiLlama/DefiLlama-Adapters). For aggregators, dimension-adapters alone is often sufficient — ask reviewers in the PR if a stub `projects/xauconnect/index.js` is required.

### 7. After merge

- Confirm chart: `https://defillama.com/fees/xauconnect` (slug may differ)
- Add backlink from https://xauconnect.com/about (already references transparency)
- Tweet / Farcaster post with chart link (distribution)

## Solana fees (follow-up PR)

Solana adapter pattern differs (Helius / `fetchTransactions` or token balance deltas on `ENobDuF4iGAmF1Y211aLj6gXCNpdHBfnNkUyLDdbUabb`). Open a separate `fees/xauconnect-solana.ts` or extend with `CHAIN.SOLANA` once dimension-adapters Solana fee helpers are confirmed.

## Updating addresses

When you deploy routers on new chains:

1. Run deploy per `docs/DEPLOY_EVM_ROUTERS.md`
2. Set `FEE_COLLECTOR_ADDRESS_*` and `ROUTER_ADDRESS_*` on production VM
3. Update `defillama/config.ts` and `fees/xauconnect.ts` chainConfig
4. Open a small follow-up PR to dimension-adapters with new `start` + addresses

## Related docs

Full operational guide: [docs/DEFILLAMA_LISTING.md](../docs/DEFILLAMA_LISTING.md)

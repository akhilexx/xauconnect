# XAUConnect — Swap Execution & Fee Collection Decision Plan

**Purpose:** Single reference to decide how swaps should work, how fees get collected, and what to build/deploy next — without deploy funds, with deploy funds, or hybrid.

**Last updated:** June 2026  
**Production:** https://xauconnect.com  
**Related docs:** [`DEPLOY_EVM_ROUTERS.md`](./DEPLOY_EVM_ROUTERS.md), [`INDEXER.md`](./INDEXER.md)

---

## 1. Executive summary (read this first)

| Question | Answer today |
|----------|----------------|
| Can users swap on **Solana**? | **Yes** — Jupiter builds the transaction; Phantom signs. |
| Can users swap on **EVM** (ETH, BSC, etc.)? | **No** — quotes work; execution blocked (no `ROUTER_ADDRESS_*` deployed). |
| Are you **collecting protocol fees** on Solana? | **No** — fee is math on quotes only; Jupiter tx has no `platformFeeBps`. |
| Are you **collecting protocol fees** on EVM? | **No** — routers not deployed; 1inch/0x only used for **prices**, not execution. |
| Do users see internal API errors? | **Fixed** — user-friendly messages on live site; ops detail in server logs. |
| Do you need money to enable **any** paid swaps? | **No** for Solana+EVM via API execution path. **Yes** only if you want **your own** on-chain routers. |

**Core decision:**

```
Do you need on-chain fee enforcement you fully own?
  ├─ NO  → API execution path (Jupiter + 1inch/0x) — $0 deploy, fees via integrator params
  └─ YES → Deploy AggregatorRouter per EVM chain + wire Jupiter platformFeeBps on Solana
           (or both — API now, own contracts later)
```

---

## 2. How the app works today (architecture)

### 2.1 User flow

```
Swap page (/swap)
    │
    ├─► POST /api/swap/quote     ← engine fans out to all venues on chain
    │       └─► Returns comparison table + best route + fee-adjusted amounts (display)
    │
    ├─► POST /api/swap/build     ← builds tx for selected route
    │       ├─ Solana + Jupiter  → base64 VersionedTransaction ✅
    │       └─ EVM               → calldata to YOUR AggregatorRouter ❌ (not set)
    │
    └─► Wallet signs & sends
            └─► POST /api/swap/record  (analytics; fee fields are bookkeeping)
```

### 2.2 Quote sources by chain

| Chain | Direct on-chain quotes | Meta-aggregator quotes |
|-------|------------------------|-------------------------|
| Ethereum | Uniswap V2/V3, SushiSwap | 1inch, 0x, Paraswap |
| BSC | PancakeSwap V2/V3, BiSwap, ApeSwap | 1inch, 0x |
| Polygon | QuickSwap, Uniswap V3, SushiSwap | 1inch, 0x |
| Arbitrum | Uniswap V3, Camelot, SushiSwap | 1inch, 0x |
| Base | Uniswap V3, Aerodrome, BaseSwap | 1inch, 0x |
| Avalanche | Trader Joe, Pangolin | 1inch, 0x |
| Solana | (skipped — Jupiter covers liquidity) | **Jupiter** |

**Requires on server:** `RPC_*` per chain + at least one of `ONEINCH_API_KEY` / `ZEROX_API_KEY` for EVM quotes; `RPC_SOLANA` for Solana.

### 2.3 Execution paths (what actually moves tokens)

| Path | Status | Fee collected? |
|------|--------|----------------|
| **Solana → Jupiter `/swap`** | Live | **No** (no `platformFeeBps` / `feeAccount`) |
| **EVM → AggregatorRouter** | Not configured | Would be **yes** (on-chain skim via `FeeCollector`) |
| **EVM → 1inch `/swap` tx** | Not wired | Could be **yes** (integrator fee param, max ~3%) |
| **EVM → 0x swap tx** | Not wired | Could be **yes** (fee recipient on standard plan) |
| **Deep link** (1inch/Uniswap UI) | Not implemented | Only if their UI supports your referral |

### 2.4 Key code locations

| Area | Path |
|------|------|
| Quote + fee math | `backend/src/services/routing/engine.ts` |
| Jupiter / 1inch / 0x quotes | `backend/src/services/routing/meta.ts` |
| Tx build | `backend/src/services/routing/build.ts` |
| Contract deploy | `packages/contracts/scripts/deploy.ts` |
| Venue router addresses | `packages/utils/src/dexes.ts` |
| Swap UI | `apps/web/src/components/swap/swap-panel.tsx` |
| Admin fee config | `apps/web` admin → `FeeConfig` in Postgres |
| User-facing errors | `backend/src/lib/user-errors.ts`, `apps/web/src/lib/user-errors.ts` |

---

## 3. Fee model — quote vs reality

### 3.1 What admin configures

- Per-chain **swap levy** in admin (`FeeConfig.swapFeeBps`), default **30 bps (0.30%)**.
- Range in app: **0–10,000 bps (0–100%)**.
- Levy is **hidden from swap UI** (by design); still applied in quote math.

### 3.2 What happens on each path

| Step | Solana (today) | EVM (today) | EVM (own router) |
|------|------------------|-------------|------------------|
| Quote shows `amountOutAfterFee` | Reduced by fee % in engine | Same | Same |
| Transaction built | Jupiter full output | Fails (no router) | Router skims fee on-chain |
| User wallet receives | **Full Jupiter output** | N/A | Net after on-chain fee |
| Admin `recordSwap` feeUsd | Estimated from quote | N/A | Can match on-chain |

**Important:** Quote fee ≠ collected fee unless execution path enforces it.

### 3.3 Jupiter fee limits (when wired)

| Mechanism | Min | Max (API) | Practical |
|-----------|-----|-----------|-----------|
| **`platformFeeBps`** (Swap API — recommended) | 0% | **100%** (10,000 bps) | **0.1–1%** typical |
| **Referral `/order`** (legacy) | 0.5% | 2.55% | Jupiter takes 20% of your fee |

**Requirements for Jupiter collection:**
- `platformFeeBps` on quote/build
- `feeAccount` — your SPL token account for the swap’s input or output mint
- Pre-create fee token accounts for mints you care about (SOL, USDC, common meme coins)

### 3.4 1inch / 0x integrator fees (when wired for EVM execution)

| Provider | Free tier | Integrator fee cap | Execution API |
|----------|-----------|-------------------|-----------------|
| **1inch** | ~100k calls/mo | **~3%** (300 bps) | `/swap` returns `to`, `data`, `value` |
| **0x** | Standard plan | Plan-based; fee recipient supported | Quote includes transaction |
| **Your router** | N/A (gas to deploy) | **0–100%** (your `FeeCollector`) | `AggregatorRouter.swap()` |

---

## 4. Option A — API execution (no deploy wallet funds)

**Best if:** You want live swaps + fee collection **now**, no gas for contracts.

### Solana

1. Set `SOLANA_FEE_WALLET` (your Solana pubkey) in server env.
2. Create / derive SPL **fee token accounts** per mint (or on-demand).
3. Wire `buildJupiterSwap`:
   - Pass `platformFeeBps` = admin `swapFeeBps` for `solana`
   - Pass matching `feeAccount` on `/swap`
4. Quotes should use the **same** `platformFeeBps` so displayed output matches execution.

**Cost:** $0 deploy. Jupiter API free tier.  
**Fee ownership:** Integrator fee to your Solana token accounts.

### EVM (all 6 chains)

1. Extend `buildSwapTx`: when route is `1inch` or `0x`, call their **swap/quote** endpoint (not just price).
2. Return their `to`, `data`, `value` to the wallet (same pattern as Jupiter).
3. Set integrator fee:
   - 1inch: `fee` param on swap (within their cap)
   - 0x: `swapFeeRecipient` + `swapFeeBps` per their docs
4. Fall back to own router when `ROUTER_ADDRESS_*` is set later.

**Cost:** $0 deploy. 1inch/0x free API tiers (already on server).  
**Fee ownership:** Integrator fee to wallet you specify in API.

### Pros / cons

| Pros | Cons |
|------|------|
| $0 contract deploy | Fee caps (1inch ~3%; Jupiter API max 100% but UX degrades if high) |
| Works on all chains API supports | Depends on third-party uptime & ToS |
| Fast to ship (medium code change) | Not “fully own” execution contract |
| Matches how many aggregators launch | Must maintain fee token accounts (Solana) |

---

## 5. Option B — Own AggregatorRouter (on-chain control)

**Best if:** You want maximum control, on-chain fee enforcement, launchpad/LP tied to same contracts.

### What you deploy (per chain)

From `packages/contracts/scripts/deploy.ts`:

| Contract | Role |
|----------|------|
| `FeeCollector` | Protocol fee config (UUPS) |
| **`AggregatorRouter`** | **→ `ROUTER_ADDRESS_<CHAIN>`** |
| `UniswapV2Adapter` | Per DEX (QuickSwap, Camelot, …) |
| `LiquidityZap`, `TokenFactory`, `Launchpad` | LP + launchpad (optional for swap-only) |

Venue routers (Uniswap, PancakeSwap, etc.) are **already deployed by those protocols** — you only register adapters pointing at them.

### 5.1 Who provides the liquidity (LP)? — detailed beginner guide

**Short answer:** **You do not.** Deploying `AggregatorRouter` does **not** mean you must deposit tokens or “be the market.” Swaps use **liquidity that already exists** on public DEXes (Uniswap, PancakeSwap, QuickSwap, etc.). Random people all over the world — called **liquidity providers (LPs)** — deposited those tokens years ago (or yesterday). Your router is only a **cashier that takes your fee and sends the trade to those existing markets.**

---

#### The lemonade stand analogy

Imagine a mall with many lemonade stands (DEXes):

| Piece | Real-world | Crypto |
|-------|------------|--------|
| **Mall** | Ethereum, BSC, Polygon… | A **blockchain** |
| **Lemonade stands** | Uniswap, PancakeSwap, QuickSwap… | **DEXes** with **liquidity pools** |
| **Stand owners’ juice inventory** | Their lemons + sugar in the stand | **LP tokens** locked in **pools** |
| **Your booth** | “XAUConnect checkout” desk at the entrance | **`AggregatorRouter`** |
| **Customer** | Person buying lemonade | **Swapper** with a wallet |

When someone swaps on XAUConnect with your router deployed:

1. Customer pays **your checkout desk** (`AggregatorRouter`).
2. Desk keeps **your small fee** (e.g. 0.30%).
3. Desk forwards the rest to **PancakeSwap’s stand** (or Uniswap, etc.).
4. PancakeSwap uses **its pool** (other people’s deposited USDC + BNB) to complete the trade.
5. Customer receives output tokens.

**You never owned the lemonade.** You only own the **checkout process** and the **fee**.

---

#### What is “LP” (liquidity)?

**Liquidity** = tokens sitting in a **pool** so trades can happen.

- A pool might be **USDC + ETH** on Uniswap (Ethereum).
- Someone deposited both tokens and earned trading fees — they are an **LP**.
- When a user swaps USDC → ETH, the pool’s balances change; price moves slightly (**slippage**).

**No pool = no swap.** If nobody ever created a USDC/NEWTOKEN pool on BSC, your router cannot magically create liquidity — the swap fails or routes elsewhere (if another DEX has a pool).

---

#### What your contracts actually do (not LP)

```
User wallet
    │
    ▼
AggregatorRouter  ← YOU deploy this (one per chain)
    │  1. Pull tokens from user
    │  2. Skim XAU protocol fee → FeeCollector
    │  3. Send remainder to adapter
    ▼
UniswapV2Adapter  ← YOU deploy this (small helper per DEX family)
    │  Calls the OFFICIAL DEX router (already on-chain for years)
    ▼
PancakeSwap Router  ← NOT yours; PancakeSwap deployed it
    │  Swaps against PancakeSwap POOLS
    ▼
Liquidity pools  ← OTHER PEOPLE'S deposits (LPs worldwide)
```

From `UniswapV2Adapter.sol` — your adapter literally calls `dexRouter.swapExactTokensForTokens(...)` on **PancakeSwap’s / QuickSwap’s / Uniswap’s** existing router address configured at deploy time.

**You provide:** routing + fee collection.  
**You do not provide:** the token inventory in pools (unless you separately become an LP — see below).

---

#### Who provides LP on each of the 6 EVM chains?

These are the **markets** your adapters plug into (from `packages/utils/src/dexes.ts` + `deploy.ts`). **LPs are the users/projects who deposited into these protocols** — not XAUConnect.

| Chain | Example DEXes (existing pools) | Who deposited into pools? |
|-------|-------------------------------|---------------------------|
| **Ethereum** | Uniswap V2/V3, SushiSwap | Global LPs, funds, traders, protocols |
| **BSC** | PancakeSwap V2, BiSwap | Same — BSC community, projects, bots |
| **Polygon** | QuickSwap, SushiSwap, Uniswap V3 | Polygon DeFi users |
| **Arbitrum** | Camelot, SushiSwap, Uniswap V3 | Arbitrum L2 LPs |
| **Base** | Aerodrome, BaseSwap, Uniswap V3 | Base ecosystem LPs |
| **Avalanche** | Trader Joe, Pangolin | Avalanche LPs |

**Per chain:** liquidity is **local to that chain**. ETH liquidity on Ethereum does **not** automatically exist on BSC. Each chain has its own pools (sometimes bridged copies of the same token, but separate pools).

**Depth varies:** ETH/USDC on Uniswap is huge. A brand-new meme coin might only have liquidity on one chain in one small pool — or none.

---

#### How this differs from 1inch / Jupiter (API path)

| | Your AggregatorRouter | 1inch / 0x / Jupiter API |
|--|----------------------|---------------------------|
| **Who finds the pool?** | Your backend quotes venues; router uses **one chosen** adapter | API **searches many** venues/pools in one go |
| **Who provides LP?** | Still **the same DEX pools** | Still **the same DEX pools** (Raydium, Orca, Uniswap, …) |
| **What you deploy** | Your router + adapters | Nothing (API returns a tx) |
| **Liquidity source** | **Identical** — public DEX LPs | **Identical** — public DEX LPs |

1inch/Jupiter are **smarter cashiers** that split an order across multiple stands. The **juice still comes from LPs at those stands**, not from 1inch/Jupiter themselves.

---

#### Solana — who provides LP there?

- Swaps today go through **Jupiter**, which routes across **Raydium, Orca, Meteora**, pump.fun pools, etc.
- **LP = people who deposited** into those Solana AMM pools.
- Jupiter does **not** create liquidity; it **routes** to where liquidity already is.
- Your indexer also watches **pump.fun** launches — early liquidity is often **bonding curve / pool creators**, still not “XAUConnect LP” unless **you** deposit.

---

#### When DOES XAUConnect provide or touch LP?

Separate from swap routing — optional product features:

| Feature | Contract | Meaning |
|---------|----------|---------|
| **LiquidityZap** | Deployed with full script | Lets **users** add/remove LP on allowed DEX routers through your UI — **they** supply tokens |
| **Launchpad** | Bonding curve → “graduates” to a DEX pool | **Launchers** bring initial liquidity; after graduation, pool is on PancakeSwap/etc. |
| **You depositing as LP** | Manual | You could deposit your own tokens like any user — **optional**, not required for swaps |

**Deploying the router does not auto-create pools or force you to fund them.**

---

#### Common misconceptions (read this if confused)

| Myth | Reality |
|------|---------|
| “I deploy router → I must fund liquidity on 6 chains” | **No.** You fund **gas to deploy** (~$5–$250 per chain). Liquidity comes from existing DEX pools. |
| “AggregatorRouter holds all the tokens” | **No.** It passes tokens through in one transaction; it does not run a giant pool (V2 adapter is **stateless**). |
| “XAUConnect = Uniswap competitor with our own AMM” | **Not by default.** You’re a **frontend + fee layer** on top of existing AMMs. |
| “Same liquidity on all 6 chains” | **No.** Each chain has its own pools and depth. |
| “1inch gives free liquidity” | **No.** They route to **other people’s** pools. |
| “No pool = router creates one” | **No.** Swap fails or quotes empty until someone (anyone) creates a pool on a DEX. |

---

#### What you ARE responsible for vs NOT

| You ARE responsible for | You are NOT responsible for |
|-------------------------|----------------------------|
| Deploying `AggregatorRouter` + adapters (gas) | Depositing USDC/ETH into Uniswap pools |
| Setting `ROUTER_ADDRESS_*` on the server | Making every token tradable everywhere |
| Configuring fee % in admin / `FeeCollector` | Guaranteeing low slippage (depends on pool depth) |
| Quoting routes that **exist** on-chain | Inventing liquidity for illiquid tokens |
| (Optional) Launchpad / LiquidityZap UX | Other LPs’ impermanent loss or pool risk |

---

#### Minimal mental model (one sentence)

> **Your AggregatorRouter is a toll booth on the highway; the highway and the fuel stations (pools) were built and stocked by Uniswap, PancakeSwap, and thousands of anonymous LPs — not by you.**

---

### Estimated deploy cost (full script, one-time gas)

| Chain | Rough USD | Priority if broke |
|-------|-----------|-------------------|
| Ethereum | $80 – $250+ | Last |
| BSC | $3 – $15 | **First** |
| Polygon | $1 – $8 | Early |
| Arbitrum | $2 – $12 | Early |
| Base | $1 – $8 | Early |
| Avalanche | $3 – $15 | Mid |
| **All 6** | **~$100 – $300+** | — |
| **Testnets** | **$0** (faucets) | Learning only |

### Steps (per chain)

1. Fund deployer wallet with native gas token.
2. Set `DEPLOYER_PRIVATE_KEY` + `RPC_*` in root `.env`.
3. `pnpm --filter @xauconnect/contracts deploy:<chain>`
4. Copy `AggregatorRouter:` address → `ROUTER_ADDRESS_<CHAIN>` on `C:\xauconnect\.env`
5. `nssm restart xauconnect-backend`

See [`DEPLOY_EVM_ROUTERS.md`](./DEPLOY_EVM_ROUTERS.md).

### Pros / cons

| Pros | Cons |
|------|------|
| On-chain fee skim (your rules) | Requires gas money per chain |
| Same stack as launchpad/LP | Ethereum deploy is expensive |
| No 3% cap like 1inch | You maintain contracts/upgrades |
| Full brand (“XAUConnect router”) | Slower to get all 6 chains live |

---

## 6. Option C — Hybrid (recommended phased plan)

| Phase | What | Cost | Fees collected |
|-------|------|------|----------------|
| **Phase 1** (now) | Wire **Jupiter `platformFeeBps`** on Solana | $0 | Solana ✅ |
| **Phase 2** | Wire **1inch/0x EVM execution** | $0 | EVM via API ✅ |
| **Phase 3** (when funded) | Deploy router on **BSC or Base** only | ~$5–15 | That chain on-chain ✅ |
| **Phase 4** | Roll out remaining EVM chains | ~$100+ total | Full on-chain ✅ |

Phase 2 can coexist with Phase 3: if `ROUTER_ADDRESS_*` is set, prefer own router; else fall back to 1inch/0x.

---

## 7. Option D — Zero-code shortcuts (no fee to you)

| Method | Effort | Fees to XAUConnect |
|--------|--------|-------------------|
| **Deep link** to 1inch / Uniswap with token params | Low | Only if their referral program |
| **Embed widget** (1inch, Li.Fi, Rango iframe) | Low | Widget rev-share rules |
| **Quote-only** (current EVM state) | None | None |

Useful as temporary UX; users leave your site or you don’t control levy.

---

## 8. Other platform context (already built)

### Discovery & market

- **Issue fixed:** Discover was Solana-heavy (indexer bias + hybrid skip). Now merges Gecko + Dex + per-chain quotas + `discovery-cache.ts` scoring (trending / new / gainers / volume).
- **Charts:** More timeframes (5m–1d), longer OHLCV history, slower polling.
- **Indexer host:** pools, swaps, candles, Solana launches (Helius).

### Limit orders

- Prisma `LimitOrder` + API + swap UI panel.
- Server monitors price; user executes when triggered (not fully automated on-chain execution).

### Infrastructure

| Resource | Role |
|----------|------|
| App host | Web + API + reverse proxy |
| Azure Postgres | DB |
| Linux indexer VM | Chain indexing |
| Cloudflare | TLS, `xauconnect.com` |

---

## 9. Environment & keys checklist

### Already configured (per ops)

- Alchemy `RPC_*` (6 EVM)
- `RPC_SOLANA` + `HELIUS_API_KEY`
- `ONEINCH_API_KEY`, `ZEROX_API_KEY`

### Not set (blocks EVM execution)

```
ROUTER_ADDRESS_ETHEREUM=
ROUTER_ADDRESS_BSC=
ROUTER_ADDRESS_POLYGON=
ROUTER_ADDRESS_ARBITRUM=
ROUTER_ADDRESS_BASE=
ROUTER_ADDRESS_AVALANCHE=
```

### Not set (blocks Solana fee collection)

```
SOLANA_FEE_WALLET=          # proposed — your pubkey
# + SPL fee token accounts per mint (operational)
```

### Deploy-only (Option B)

```
DEPLOYER_PRIVATE_KEY=       # hot wallet with gas on each chain
```

---

## 10. Decision matrix

| Criterion | Option A (API) | Option B (Own router) | Option C (Hybrid) |
|-----------|----------------|----------------------|-------------------|
| Upfront cost | **$0** | **$100–300+** | **$0 → $15+** |
| Time to live EVM swaps | Days (code) | Days (code + deploy) | Days |
| Solana fees | Wire Jupiter | Wire Jupiter | Wire Jupiter first |
| EVM fee cap | ~3% (1inch) / plan (0x) | 0–100% (yours) | API first, on-chain later |
| Dependency on 3rd party | High | Low (EVM) | Medium |
| Launchpad/LP alignment | Partial | **Full** | Grows over time |
| Needs deployer wallet | No | **Yes** | Later |

---

## 11. Recommended default (if you have no deploy funds)

1. **Approve Phase 1 + 2** (API execution + real fee collection).
2. **Provide one Solana wallet address** for fee receipts.
3. **Pick default EVM integrator** for build path: 1inch primary, 0x fallback (keys already on server).
4. **Defer Option B** until you can fund BSC or Base deploy (~$5–15).
5. Keep admin levy at **0.30%** (30 bps) unless product strategy says otherwise.

---

## 12. What I need from you to proceed

| Decision | Your call |
|----------|-----------|
| **Path** | A (API only) / B (routers only) / **C (hybrid)** / D (widgets/links) |
| **Solana fee wallet** | Public key (Phantom etc.) to receive fees |
| **Target EVM fee %** | Default 0.30% OK? Max willing on API path (≤3% for 1inch)? |
| **First on-chain chain** (if B/C phase 3) | BSC / Base / Polygon / other |
| **Deployer wallet** (if B) | Funded when ready; never share key in chat — use `.env` only |

---

## 13. Implementation checklist (engineering)

### Phase 1 — Solana fees
- [ ] Add `SOLANA_FEE_WALLET` to config + `.env.example`
- [ ] Fee token account resolver (SOL, USDC, top mints)
- [ ] `quoteJupiter` + `buildJupiterSwap`: `platformFeeBps` + `feeAccount`
- [ ] Align quote `amountOutAfterFee` with Jupiter fee-inclusive quote
- [ ] Verify fee lands in wallet on mainnet test swap

### Phase 2 — EVM API execution
- [ ] `build1inchSwap` / `build0xSwap` in `meta.ts`
- [ ] `buildSwapTx` branch on `route.protocol === "meta"`
- [ ] Integrator fee params from admin `FeeConfig`
- [ ] Fallback: own router if `ROUTER_ADDRESS_*` set
- [ ] Smoke test per chain with MetaMask

### Phase 3 — Own router (optional)
- [ ] Deploy one chain per [`DEPLOY_EVM_ROUTERS.md`](./DEPLOY_EVM_ROUTERS.md)
- [ ] Set `ROUTER_ADDRESS_*`, restart backend
- [ ] Align `FeeCollector` bps with admin dashboard

---

## 14. Glossary

| Term | Meaning |
|------|---------|
| **bps** | Basis points; 100 bps = 1% |
| **AggregatorRouter** | Your smart contract that executes swaps and skims fee |
| **Venue router** | Uniswap/PancakeSwap/etc. — already on-chain |
| **Meta-aggregator** | 1inch, 0x, Jupiter — finds routes across venues |
| **Quote** | Price estimate |
| **Build** | Actual transaction bytes for wallet to sign |
| **platformFeeBps** | Jupiter integrator fee parameter |
| **feeAccount** | Your SPL token account that receives Jupiter fees |
| **LP (liquidity provider)** | Person/protocol that deposited tokens into a DEX pool so swaps can occur |
| **Liquidity pool** | Smart contract holding two (or more) tokens for trading |
| **Venue / DEX** | Uniswap, PancakeSwap, etc. — operates the pools |
| **Adapter** | Your small contract that talks to one venue’s router |

---

## 15. One-page decision form

Copy and fill in:

```
DECISION — XAUConnect Swap & Fees
Date: ___________

1. Primary path (circle one):
   ( ) A — API execution only ($0 deploy)
   ( ) B — Own routers only (need gas wallet)
   ( ) C — Hybrid: API now + routers later  ← recommended
   ( ) D — Widgets / deep links only

2. Solana fee wallet (pubkey): _________________________________

3. Default swap fee %: ______%  (suggest: 0.30%)

4. EVM integrator preference: ( ) 1inch  ( ) 0x  ( ) both

5. First chain to deploy own router (if any): _________________
   When funded (Y/N): ___

6. Admin levy stays hidden in UI (Y/N): ___

7. Notes / constraints:
   ___________________________________________________________
```

---

*This document is the source of truth for product/ops decisions. Technical deploy steps for EVM routers remain in [`DEPLOY_EVM_ROUTERS.md`](./DEPLOY_EVM_ROUTERS.md).*

---

## 16. Pre-contract path — 0x + 1inch (6 EVM) + Jupiter (Solana)

Use this until `ROUTER_ADDRESS_*` is set on each chain. Keys are already on production.

### How routing works

```
POST /api/swap/quote
    ├─ EVM: engine fans out direct DEX quotes + quote1inch + quote0x (per chainId)
    └─ Solana: quoteJupiter only

POST /api/swap/build  (after wiring Phase 1 + 2)
    ├─ EVM meta route → build1inchSwap / build0xSwap → wallet signs their tx
    ├─ EVM own router  → AggregatorRouter.swap (when ROUTER_ADDRESS_* set)
    └─ Solana          → buildJupiterSwap with platformFeeBps + feeAccount
```

**Liquidity source is identical** on API vs own-router path — public DEX pools (Uniswap, PancakeSwap, Raydium, etc.). You only change *who builds the transaction* and *how the fee is skimmed*.

### Fees you can collect (before own contracts)

| Platform | Chains | Mechanism | Typical cap | Paid to |
|----------|--------|-----------|-------------|---------|
| **Jupiter** | Solana | `platformFeeBps` + `feeAccount` on `/swap` | 0–100% API (use 0.1–1%) | `SOLANA_FEE_WALLET` SPL accounts |
| **1inch** | All 6 EVM | `fee` / referrer on `/swap/v6.0/{chainId}/swap` | **~3%** (300 bps) | `PROTOCOL_FEE_COLLECTOR_EVM` |
| **0x** | All 6 EVM | `swapFeeRecipient` + `swapFeeBps` on quote/swap | Plan-based (Standard) | Same EVM fee-collector wallet |
| **Your router** | Per deployed chain | On-chain skim → `FeeCollector` → `withdrawToRecipient` | 25–75 bps on-chain | Hot wallet after sweep |

**Aggregator platform fees (theirs, not yours):** DEX LP fees (~0.05–0.3%) always apply. 1inch/0x/Jupiter may have API tier limits; Jupiter legacy referral takes 20% of your integrator fee if you use `/order` instead of `platformFeeBps`.

**Admin `FeeConfig.swapFeeBps` today:** Display/bookkeeping only until build path passes the same bps into Jupiter / 1inch / 0x params.

### Freedom vs constraints

| | 1inch / 0x / Jupiter (API) | Own AggregatorRouter |
|--|------------------------------|----------------------|
| Deploy cost | **$0** | ~$100–300 gas (6 chains) |
| Route quality | Best-in-class multi-venue split | Single adapter per quote (your backend picks venue) |
| Fee ceiling | 1inch ~3%; Jupiter flexible | 25–75 bps enforced in `FeeCollector` |
| Brand / control | User tx targets 1inch/0x router | User tx targets **your** contract |
| Uptime | Depends on aggregator API | Depends on your RPC + contracts |
| Launchpad alignment | Partial | Full (same `FeeCollector`) |

**Recommended:** Hybrid (Option C) — wire API execution + fees now; deploy own router on BSC/Base when funded; prefer own router in `buildSwapTx` when `ROUTER_ADDRESS_*` is set.

### Code changes still needed (Phase 1 + 2)

**Solana (Phase 1)** — implemented

- [x] `SOLANA_FEE_WALLET` in backend config
- [x] SPL `feeAccount` resolver (derived ATA per output mint)
- [x] `quoteJupiter` + `buildJupiterSwap`: `platformFeeBps` from admin `FeeConfig` (default **500 = 5%**)
- [x] Meta quotes include integrator fee in `amountOutAfterFee`

**EVM (Phase 2)** — implemented

- [x] `build1inchSwap` / `build0xSwap` in `meta.ts`
- [x] `buildSwapTx`: meta routes when `ROUTER_ADDRESS_*` unset
- [x] Integrator fee → `PROTOCOL_FEE_COLLECTOR_EVM` (default **300 bps = 3%**)
- [ ] Fallback to own router when `ROUTER_ADDRESS_*` set (already wired — prefer router when present)

**Operational**

- [ ] Pre-create Jupiter fee ATAs for common output mints (SOL, USDC) if swap build fails on new tokens

### Env checklist (pre-contract)

```bash
# Already on production
ONEINCH_API_KEY=...
ZEROX_API_KEY=...
JUPITER_API_KEY=...

# Fee destinations (wired in .env.example + production)
PROTOCOL_FEE_COLLECTOR_EVM=0xC0624F22BAd798Bd9236EF0c95E35404614079B6
SOLANA_FEE_WALLET=ENobDuF4iGAmF1Y211aLj6gXCNpdHBfnNkUyLDdbUabb

# Still empty until you deploy
ROUTER_ADDRESS_ETHEREUM=
ROUTER_ADDRESS_BSC=
# ... etc
```

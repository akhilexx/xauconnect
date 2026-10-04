# XAUConnect Gold Curve

A live launchpad for [Meteora](https://docs.meteora.ag/developer-guides/dbc) Dynamic Bonding Curve pools.

Open [xauconnect.com](https://xauconnect.com), pick one of six shared mainnet recipes, name the token, and sign once. The mint and the pool appear together. People can buy immediately. At exactly 10 SOL or 750 USDC the pool graduates into a locked DAMM v2 market.

Pitch deck: [xauconnect.com/pitch/xauconnect-gold-curve.pdf](https://xauconnect.com/pitch/xauconnect-gold-curve.pdf)

## The six recipes

These are partner configs. Every Gold Curve token reuses one of them. The rules are on the config account, not a promise in the interface.

| Recipe | Quote | Curve | Fee | Config |
| --- | --- | --- | --- | --- |
| Fair | SOL | 1 segment, liquidity spread evenly | Fixed 1% | `ExTrSGZBjzMrueBNHEALCCJmppB9zpoTSWJea4iR2gQu` |
| Fair | USDC | 1 segment, liquidity spread evenly | Fixed 1% | `Hrro7hmEAXyN9uGgMWwDwosJiuCjhXcVn6xGw5pChBn8` |
| Shield | SOL | 1 segment | 50% decaying to 1% over 10 minutes | `5Edj53kfFx2da3dJy9gcxKLZF6W45QYozog5S4hNfA25` |
| Shield | USDC | 1 segment | 50% decaying to 1% over 10 minutes | `4VyDGF5jS9JqUBQqbijzVDDrtq7T6dHMURNudmwzPKZB` |
| Distribute | SOL | 3 segments, liquidity weights 1, 4, 1 | Fixed 1% | `3sLsCEfr4aCdkczvqy3mM4nyWB4P3Ec6yd9rbQM2Xune` |
| Distribute | USDC | 3 segments, liquidity weights 1, 4, 1 | Fixed 1% | `DT4NYCPLJYjPN8TqHQZrHj1PovVa6xmzRKVKvruc5vWy` |

Shield uses an exponential fee scheduler: 5000 bps down to 100 bps, 10 periods of 60 seconds. The token page shows the countdown.

### Shared rules

- Supply is 1,000,000,000 tokens, 6 decimals.
- Metadata is immutable. There is no mint authority.
- Leftover supply is 1,000,000 whole tokens (0.1%), sent to the partner wallet.
- 20% of supply is placed for migration.
- Graduation is exactly 10 SOL or exactly 750 USDC.
- Migration is DAMM v2 only, using the 100 bps fee config `Hv8Lmzmnju6m7kcokVKvwqz7QPmdX9XfKjJsXz8RXcjp`.
- Migrated LP is 100% permanently locked, split 50% creator and 50% XAUConnect.
- The creator keeps 50% of bonding-phase trading fees and claims them from Profile. Claiming fees does not unlock the LP.
- Partner fee claimer: `ENobDuF4iGAmF1Y211aLj6gXCNpdHBfnNkUyLDdbUabb`
- DBC program: `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`

## A pool that is already live

We launched this one on mainnet, Fair curve, SOL quote.

| | |
| --- | --- |
| Name | XAU Gold Curve (XAUGC) |
| Mint | [`HXXMuNxDShXhK6QGd4CczTgSiXr1YqNbUdpg9rTbWj5r`](https://xauconnect.com/token/solana/HXXMuNxDShXhK6QGd4CczTgSiXr1YqNbUdpg9rTbWj5r) |
| Pool | `DvDDoFZiC5RqhuVcPgJsj865ykaNW4hhhhb62gPjRTwU` |
| Config | `ExTrSGZBjzMrueBNHEALCCJmppB9zpoTSWJea4iR2gQu` |
| Create tx | [`nKprP4Bi8CekQiLqpH1CaAVqxCCaiFL4bas6qhBsgYASvKYNCSdFET8B2XqCdQkQtXSDBHqstEfFgWuk6Q5MFoY`](https://solscan.io/tx/nKprP4Bi8CekQiLqpH1CaAVqxCCaiFL4bas6qhBsgYASvKYNCSdFET8B2XqCdQkQtXSDBHqstEfFgWuk6Q5MFoY) |

The token page shows the curve, the fee, the phase, progress toward 10 SOL, the creator fee share, and the locked LP terms.

While the pool is on the curve, buys and sells are built with the DBC program. After migration, quotes hand off to Jupiter and the DAMM v2 pool.

## Launch flow

1. **Network.** Meteora is selected.
2. **Token.** Name and symbol.
3. **Curve.** Fair, Shield, or Distribute, and SOL or USDC.
4. **Sign.** One transaction. The mint and the pool appear together.

The rest of the site is swap, liquidity, discover, and a wallet view across Ethereum, Solana, BNB Chain, Polygon, Arbitrum, Base, and Avalanche. Those are separate from the Gold Curve. The Solidity contracts in `packages/contracts` are the EVM swap and liquidity layer. They are not the Meteora launch path.

## Run it

Node 20 or newer, and pnpm 10 (`corepack enable`).

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm dev
```

Web is on port 3000. The API is on port 4000.

Gold Curve reads the six config addresses from the server environment (`DBC_CONFIG_*` in `.env.example`). Without those, the launch wizard cannot prepare a mainnet pool. Do not commit a filled `.env`.

```bash
pnpm contracts:test   # Hardhat suite for the EVM contracts
pnpm typecheck
```

## Layout

```
apps/web          Next.js site
apps/mobile       Expo app
backend           API, Gold Curve prepare/quote/swap, indexer
packages/contracts  EVM aggregator, fee collector, liquidity zap
packages/sdk      Typed API client and contract ABIs
packages/ui       Interface components
packages/utils    Chains, tokens, fee math
prisma            Database schema
```

## License

MIT

/**
 * First-party long-form articles written from how XAUConnect actually works:
 * quote ranking, FeeCollector, unsigned txs, 1inch/0x/Jupiter, WalletConnect,
 * launchpad, indexer discovery. Not spun from competitor SERPs.
 */
import type { RichContent } from "./content-expand.js";

export const PRODUCT_LEARN_CONTENT: Record<string, RichContent> = {
  "how-xauconnect-routing-works": {
    intro:
      "XAUConnect does not pick a route because a DEX paid for placement. It asks several liquidity sources for the same trade, then ranks the answers by **minimum received after platform fees** — the floor your wallet is actually protected by — not by the headline exchange rate on a marketing card.\n\nThis article is the product description we wish existed when we shipped the first quote card: which venues are queried, what “best” means in code, why a two-hop path can beat a direct pool, and what still happens on-chain after you sign. It is written from the aggregator’s point of view, not from a generic “what is routing” textbook.",
    sections: [
      {
        heading: "What the quote request actually asks",
        body:
          "When you enter an amount, the app sends a quote request with chain, token-in, token-out, and size. On EVM networks the backend fans that out to configured aggregators — typically 1inch and 0x — plus any on-router path our own AggregatorRouter can build. On Solana the same idea runs through Jupiter. Each provider returns one or more candidate routes with an estimated output, gas hint, and a path label (pool names or hop list).\n\nXAUConnect does not custody the trade while this happens. The quote is a plan. Nothing moves until your wallet signs the later build step.",
      },
      {
        heading: "How “best route” is ranked",
        body:
          "The ranking key is net output after the platform fee line you see on the card. A route that advertises a slightly better mid-market rate but consumes more of the fee or more price impact can lose to a quieter path that delivers more tokens to your address. We also discard quotes that fail simulation, return zero output, or cannot produce unsigned calldata/bytes.\n\nThis is why two screenshots of “ETH → USDC” from different apps rarely match. They are not quoting the same graph, the same fee, or the same minimum-received math.",
      },
      {
        heading: "Single-hop, multi-hop, and split routes",
        body:
          "A single-hop swap uses one pool. A multi-hop swap walks through an intermediate — often a stablecoin or the chain’s wrapped native — because no direct pool exists or the direct pool is thinner than the detour. Split routes break size across several pools so no single curve moves as far.\n\nEach extra hop adds an LP fee and a chance the second pool is stale by the time the first hop lands. The quote card’s hop list is there so you can reject a clever-looking path that routes through a token you do not want to touch.",
      },
      {
        heading: "What you sign is not the quote JSON",
        body:
          "The quote is advisory. The build endpoint returns unsigned EVM transaction fields (`to`, `data`, `value`) or Solana VersionedTransaction bytes. Your wallet simulates that payload against current chain state. If the pool moved, simulation fails or the minimum-received check reverts — which is the contract doing its job, not XAUConnect “cancelling” you.\n\nWe never broadcast EVM transactions for you. On Solana, submit-solana only relays already-signed bytes to RPC so browser wallets are not blocked by 403s. The private key never leaves the signer.",
      },
      {
        heading: "Cross-chain is a different machine",
        body:
          "A same-chain swap settles in one transaction (plus an ERC-20 approval if needed). A cross-chain quote adds a bridge or messaging leg: you sign on the source chain, wait for confirmation, then receive a representation or a destination swap on the target chain. Latency, extra smart-contract risk, and wrapped-asset variants all apply. Treat the status panel as part of the trade, not as decoration.",
      },
      {
        heading: "What routing cannot fix",
        body:
          "No aggregator can invent liquidity. If the only pool for a ticker is a $4k AMM with a 12% fee-on-transfer token, every route will look bad. Routing also cannot save you from pasting the wrong contract, signing on the wrong chain, or setting slippage so wide that a sandwich fills to your floor. Those are wallet and verification problems, not quote problems.",
      },
    ],
    faqs: [
      {
        question: "Does XAUConnect run its own AMM?",
        answer:
          "No. It is an aggregator. Liquidity lives in third-party pools (Uniswap-style AMMs, 1inch/0x graphs, Jupiter on Solana). Our on-chain EVM pieces are a fee collector and router that skim a disclosed platform fee — they are not the order book.",
      },
      {
        question: "Why did a direct Uniswap quote look better than XAUConnect?",
        answer:
          "Compare minimum received after all fees, not the mid price. Also confirm you used the same token addresses, the same chain, and a quote taken in the same block window. A single-DEX UI often hides price impact that an aggregator is forced to show.",
      },
      {
        question: "Can I force a specific DEX?",
        answer:
          "The product ranks by net output. If you need a specific venue you can still trade there directly; XAUConnect’s job is the comparison, not locking you into one pool.",
      },
      {
        question: "Is the route guaranteed until I click confirm?",
        answer:
          "No. Quotes expire as blocks land. Re-quote if you wait. The on-chain guarantee is the minimum-received parameter inside the signed transaction, not the number you saw thirty seconds earlier.",
      },
    ],
    description:
      "How XAUConnect chooses a swap route: multi-venue quotes, ranking by minimum received after fees, hops vs splits, and what your wallet actually signs.",
  },

  "how-xauconnect-fees-work": {
    intro:
      "Three different costs hide inside a “simple swap”: the **liquidity-provider fee** inside each pool, the **network gas** paid to validators, and XAUConnect’s **platform fee**, which defaults to 30 basis points (0.30%) on configured EVM routers unless the in-app quote says otherwise. Mixing those three numbers is how people conclude an aggregator is “expensive” when they actually paid Ethereum base fee during a blob-fee spike.\n\nThis guide unpacks each line as it appears on the XAUConnect quote card, where the platform fee lands on-chain, and when paying that fee in USDC is cheaper than burning extra native gas token dust.",
    sections: [
      {
        heading: "The three fee layers",
        body:
          "Pool (LP) fees are baked into the AMM curve — commonly 0.05%, 0.30%, or 1.00% per hop on Uniswap-style pools, with different schedules on other venues. You do not sign a separate “LP invoice”; the output amount is already net of those fees.\n\nNetwork gas is paid in the chain’s native asset (ETH, BNB, POL, AVAX, SOL, …) to validators. Failed EVM transactions still consume gas. Solana uses a small base fee plus an optional priority fee when the network is busy.\n\nThe platform fee is XAUConnect’s disclosed cut for aggregation and routing. On EVM deployments it is enforced by the FeeCollector / AggregatorRouter contracts (Polygon FeeCollector proxy `0xa5e0A97385278Dae82f4BdFD59Ad8939917D0ec0` among others). It is not hidden in slippage.",
      },
      {
        heading: "Where to read the number before you sign",
        body:
          "The quote card shows estimated output, minimum received, platform fee, and a gas estimate. If those four are not visible, do not sign. Integrator routes (1inch/0x partner parameters, Jupiter) may add their own partner fee on top — that should also appear in the breakdown. There is no “deposit address” and no surprise invoice after settlement.",
      },
      {
        heading: "Paying the platform fee in USDC",
        body:
          "On supported EVM chains you can pay the platform fee in USDC instead of having it taken from the native gas token or the input asset. That is useful when you are swapping an alt and do not want leftover dust in ETH, or when you already hold USDC for gas-adjacent costs.\n\nUSDC-as-fee still requires you to hold (or receive) enough USDC of the **correct contract** on that chain. Native Circle USDC and a bridged USDC.e are not interchangeable — see the companion article on native vs bridged stables.",
      },
      {
        heading: "Gas vs platform fee: a worked comparison",
        body:
          "Suppose you swap $1,000 of a liquid pair on Arbitrum. A 30 bps platform fee is $3. L2 gas might be a few cents. The LP fee on a 5 bps pool is $0.50. Total friction is dominated by the platform fee, which you can compare against a CEX withdrawal fee or a single-DEX UI that looks “free” while hiding worse price impact.\n\nOn Ethereum mainnet the ranking often flips: a $8–$40 gas bill can dwarf a $3 platform fee. That is why the same trade is cheaper on Base or Arbitrum even when the pool fee is identical.",
      },
      {
        heading: "What we do not charge",
        body:
          "There is no account fee, no withdrawal fee (there is nothing to withdraw), and no custody fee. Quotes are free. The public Swap API does not require a key for quote and build. Optional client identification headers are for analytics attribution, not billing.",
      },
    ],
    faqs: [
      {
        question: "Is the 0.30% fee negotiable for bots?",
        answer:
          "Displayed fees follow the on-chain FeeCollector configuration and quote response. Integrators should read the live quote rather than hard-coding 30 bps in a bot. Changes are shown in-app before sign, not after.",
      },
      {
        question: "Why did I pay gas on a failed swap?",
        answer:
          "On most EVM chains, validators keep gas for work even if the swap reverts (slippage, insufficient allowance, or a paused pool). The platform fee is not taken on a revert because the swap never succeeded.",
      },
      {
        question: "Does Solana use the same FeeCollector?",
        answer:
          "Solana fee collection uses a published Solana fee wallet, not the EVM FeeCollector proxy. The quote still discloses the platform line before you sign.",
      },
      {
        question: "Are quotes free?",
        answer:
          "Yes. You pay only if you sign and the swap (or bridge leg) executes, plus any network gas for attempts that revert on EVM.",
      },
    ],
    description:
      "XAUConnect fees explained: 30 bps platform fee, LP pool fees, gas, USDC fee payment, and how to read the quote card before you sign.",
  },

  "how-to-swap-with-the-xauconnect-api": {
    intro:
      "The same quote and build pipeline the website uses is a public REST API at `https://xauconnect.com/api`. There is no API key required to compare routes. Your bot — or an LLM tool call — asks for a quote, receives unsigned transaction data, signs with **its own** key manager, then optionally records the hash for analytics.\n\nThis is a working walkthrough, not a marketing page: endpoints, the EVM vs Solana fork, identification headers, and the mistakes that drain test wallets.",
    sections: [
      {
        heading: "Map the flow before you write code",
        body:
          "1) Fetch supported chains and tokens to resolve chain keys and checksummed addresses. Never guess a USDC address. 2) Request a quote with chainKey, tokenIn, tokenOut, and amount. 3) If the quote looks right, request a build for the unsigned payload. 4) Sign locally. 5) Broadcast via your RPC on EVM, or submit already-signed Solana bytes through the relay endpoint. 6) Optionally record the hash so the trade shows in usage analytics.\n\nOpenAPI lives at `/openapi.json` and the human docs at `/developers/api/swap`.",
      },
      {
        heading: "Identify the agent",
        body:
          "Send client identification headers (id, display name, and source) on every call if you want the admin API Agents tab to attribute traffic. These headers do not grant extra rate limit by themselves and they are not a custody handshake. Do not put secrets in them.",
      },
      {
        heading: "EVM: you broadcast, we do not",
        body:
          "Build returns `{ to, data, value }`. Check ERC-20 allowance (`GET /swap/allowance`); if it is below the input amount, send an approve to the spender in the quote, wait for confirmation, then `sendTransaction` from viem/ethers/Turnkey. There is no `POST /swap/submit-evm` on purpose — a server that submits unsigned EVM txs would be a custodian.\n\nAlways simulate. If simulation fails, do not retry blindly with higher gas; fix allowance, amount, or slippage first.",
      },
      {
        heading: "Solana: sign first, then relay",
        body:
          "Build returns base64 unsigned VersionedTransaction bytes. Sign with a keypair, Phantom adapter, or custody provider. `POST /swap/submit-solana` broadcasts those signed bytes through the backend RPC (Helius in production) because some browser environments block public RPC. The server still never sees the private key.",
      },
      {
        heading: "Cross-chain from a bot",
        body:
          "`POST /swap/cross-chain/quote` and `/build` add bridge status. Your agent must poll until destination funds arrive and must not treat source-chain success as the full trade. Timeouts and stuck messages are operational risk — budget them like you would an exchange withdrawal.",
      },
      {
        heading: "Rate limits and hygiene",
        body:
          "Bursting quote every 50ms on an idle pair wastes everyone’s crawl of liquidity APIs and will get you throttled. Poll on a timer that matches your edge (1–5s for arb, slower for treasury rebalances). Cache token lists. Pin decimals from the token endpoint, not from a screenshot.",
      },
      {
        heading: "Errors you should treat as fatal vs retryable",
        body:
          "Retryable: provider timeouts, empty route lists on a liquid pair, RPC 429s. Fatal until a human looks: unknown token address, impact above your policy cap, simulation revert that names a tax token, or a chainKey your allowlist does not include. A bot that retries fatal errors with higher slippage is how treasuries disappear.\n\nLog the quote id, the hop list, and the minimum received you almost signed. Support conversations without those three are guesswork. The OpenAPI examples in /developers/api/swap match this flow exactly — copy them rather than inventing a fourth client.",
      },
    ],
    faqs: [
      {
        question: "Do I need KYC to use the Swap API?",
        answer:
          "No. It is a non-custodial quote/build API. You still must follow the laws that apply to your bot and your jurisdiction. The API will not KYC you because it never holds the funds.",
      },
      {
        question: "Can an LLM call this directly?",
        answer:
          "Yes, as a tool: quote is read-only; build still requires a signer the model does not control. Never paste a private key into a prompt. Use Turnkey, KMS, or a session signer with spending limits.",
      },
      {
        question: "Where is the interactive spec?",
        answer:
          "https://xauconnect.com/developers/api and https://xauconnect.com/openapi.json",
      },
      {
        question: "What if quote succeeds and build fails?",
        answer:
          "Liquidity moved or the provider rejected the size. Re-quote. Do not reuse calldata from a previous block.",
      },
    ],
    description:
      "Use the public XAUConnect Swap API: quote, build, sign locally, Solana submit relay, optional record, and agent identification headers.",
  },

  "how-to-use-limit-orders-on-xauconnect": {
    intro:
      "A spot swap fills “now” at whatever the pool will give you inside your slippage envelope. A **limit order** on XAUConnect waits until price crosses the level you set, then attempts execution — closer to how a CEX works, but still settled by your wallet against on-chain liquidity, not against XAUConnect’s balance sheet.\n\nUse limits when you refuse to chase a candle and you can live with the order sitting unfilled. Do not use them as a substitute for verifying the token contract.",
    sections: [
      {
        heading: "When a limit is the right tool",
        body:
          "You want to sell a bag only if it reaches a target, or buy a dip without watching the screen. Spot swaps are the wrong hammer there: you either take the current impact or you babysit. Limits encode the patience.\n\nThey are the wrong tool for illiquid launches where a single wallet can wick through your price and leave you filled in a 90% down candle with no exit liquidity.",
      },
      {
        heading: "What “fill” means on a DEX",
        body:
          "There is no XAUConnect matching engine sitting on your order. When the market crosses your limit, the system (or you, manually) submits a swap whose minimum-received corresponds to that limit. If the pool cannot satisfy the floor, the transaction should fail rather than fill worse.\n\nThat is different from a CEX, which can fill against the exchange’s own book. On-chain, fill quality still depends on pool depth at trigger time.",
      },
      {
        heading: "Approvals, expiry, and gas",
        body:
          "EVM limits still need an ERC-20 allowance if the input is a token. An unlimited allowance left sitting for a limit you forgot about is a standing risk — prefer exact or reasonably capped allowances and cancel stale orders.\n\nYou pay gas when the fill attempt is submitted, including failed attempts. On L2s that is usually cheap; on Ethereum mainnet, a limit that retries through a volatile hour can cost more than the edge you were hunting.",
      },
      {
        heading: "How to place one in the app",
        body:
          "Open Swap, choose the pair and chain, switch to the limit ticket, enter price and size, review the implied minimum received, then sign. Confirm the order appears in the open-orders list. If you walk away, you are still responsible for the allowance you granted.\n\nCancel from the same panel; cancelling is its own transaction on some flows. Verify on the explorer that the cancel landed before you assume the allowance is harmless.",
      },
      {
        heading: "Limits vs stop-losses",
        body:
          "A classic stop-loss needs a trigger *through* a price and then a marketable sell. Thin meme pools gap through stops. If you need risk control on a farm-town ticker, size the position as if no stop will fill. Limits help entries more than they save disaster exits.",
      },
    ],
    faqs: [
      {
        question: "Does a limit order lock my tokens?",
        answer:
          "It may require an approval so a keeper or router can spend the input when price hits. That is not the same as depositing into XAUConnect. You can revoke the allowance, which should be paired with cancelling the order.",
      },
      {
        question: "Can the order fill at a worse price than my limit?",
        answer:
          "It should not if minimum-received is set from your limit. Always read that floor on the review step. Slippage settings that are too wide can undermine the point of a limit.",
      },
      {
        question: "Are limits available on Solana and all EVM chains?",
        answer:
          "Availability follows the in-app ticket per chain. If the limit toggle is missing, use a spot swap or wait — do not assume a CEX-style book exists off-screen.",
      },
      {
        question: "What if price hits but I never fill?",
        answer:
          "Depth disappeared, gas was too low, the keeper missed the block, or your allowance was insufficient. Check the order status and explorer; re-quote rather than assuming the UI is the ledger.",
      },
    ],
    description:
      "DEX limit orders on XAUConnect: how they differ from spot swaps, approvals, gas on failed fills, and when not to use them on thin meme pools.",
  },

  "how-to-launch-a-token-on-xauconnect": {
    intro:
      "XAUConnect’s launchpad is for teams that want a public, non-custodial listing surface next to the same swap aggregator traders already use — not a guaranteed “fair launch” halo and not a promise that anyone will buy the token. If you cannot explain the contract permissions, the liquidity plan, and the chain you are launching on in one sitting, you are not ready to press deploy.\n\nThis guide is written for builders using the Launchpad flow: what you must prepare, what the UI collects, and how traders will interrogate you after the token appears on Discover.",
    sections: [
      {
        heading: "Solana uses a Gold Curve on Meteora",
        body:
          "On Solana, launch a token on Meteora with a Gold Curve on Meteora. Pick Fair, Shield, or Distribute, connect a Solana wallet, and sign one create transaction. Traders can buy immediately. At 10 SOL or 750 USDC the pool graduates into a locked DAMM v2 market.\n\nThat path is not the EVM TokenFactory wizard. Do not send an SPL mint through an EVM form, and do not expect a Meteora curve on Base or Ethereum. After the transaction confirms, publish the mint address — the ticker is not the identity — and the token can appear on Discover.",
      },
      {
        heading: "Pick a chain like an operator, not a mascot",
        body:
          "Ethereum mainnet gives you the deepest stable pools later and the most expensive failed experiments. Base, Arbitrum, and BNB Chain are where most small launches actually live because gas lets you iterate. Solana is a different token program (SPL/Token-2022) with different wallet UX.\n\nLaunching on three chains at once multiplies bridged-ticker confusion. Start with one canonical mint/contract and bridge later if you must.",
      },
      {
        heading: "What you upload vs what the chain already knows",
        body:
          "Metadata (name, symbol, logo, socials) is how humans find you. The contract/mint address is how wallets refuse to be fooled. Traders on XAUConnect are taught — in our own security guides — to paste the address, not trust the ticker. If those two disagree, you will be treated as a scam clone even if you are the real team.\n\nHave the explorer verification done before you ask anyone to swap.",
      },
      {
        heading: "Liquidity is the product",
        body:
          "A launch without locked or clearly owned liquidity is, to a trader who read our rug-pull article, indistinguishable from an exit scam. Decide the pairing asset (usually native gas or USDC), the initial depth, who can pull LP, and the unlock schedule. Put that in the listing description in plain language.\n\nXAUConnect routing cannot make a $2,000 pool safe for a $50,000 market-cap dream. Price impact will print the truth on the quote card.",
      },
      {
        heading: "Using the Launchpad UI",
        body:
          "Open Launchpad, connect the wallet that actually owns the token and LP, select the chain, paste the contract/mint, fill socials, and submit. Only the controlling wallet should do this — a teammate “helping” from a random seed is how listings get hijacked.\n\nAfter it goes live, buy a tiny amount yourself from a second wallet and publish the transaction. That is worth more than a thread of emojis.",
      },
      {
        heading: "After listing: what Discover will show",
        body:
          "Discovery ranking blends indexer data (on-chain swaps we actually saw), GeckoTerminal, and DexScreener. If nobody trades, you will not trend. If you wash-trade, sophisticated users and eventually the indexer heuristics will treat the tape as junk.\n\nKeep a canonical announcement link. When clones appear — they will — answer with the address, not with anger.",
      },
    ],
    faqs: [
      {
        question: "Does XAUConnect invest in or endorse launches?",
        answer:
          "No. Listing is tooling, not a listing-as-approval. Treat every launch as high risk.",
      },
      {
        question: "Can I launch without locking liquidity?",
        answer:
          "Mechanically maybe; reputationally you should assume traders will skip you. Our education pages tell them unlocked LP is a rug signal.",
      },
      {
        question: "Which wallets can submit a listing?",
        answer:
          "The connected wallet in the Launchpad form. Use the deployer or a clearly disclosed operations wallet. Do not use a browser seed you also use for a mainnet treasury.",
      },
      {
        question: "How do traders swap the new token?",
        answer:
          "They paste the address into Swap on the correct chain, read impact, start with a test size, and verify the receipt. You should publish that exact address everywhere.",
      },
    ],
    description:
      "Launch a token on the XAUConnect launchpad: chain choice, metadata vs contract, liquidity plan, submission wallet, and how Discover ranking actually works.",
  },

  "how-to-swap-on-mobile-with-walletconnect": {
    intro:
      "Desktop MetaMask is the happy path in every screenshot. Real usage is a phone, a WalletConnect session, and a handoff that either signs cleanly or dies in a tab the OS suspended. XAUConnect supports WalletConnect on EVM and the usual Solana mobile wallets; this guide is the mobile-specific version of “how to swap,” including the failure modes we see in production.\n\nIf you skip the network check, mobile will punish you faster than desktop — wallets often sit on the last chain you used, which is rarely the chain you intended to trade.",
    sections: [
      {
        heading: "Install a real wallet, not a lookalike",
        body:
          "Download MetaMask, Rainbow, Coinbase Wallet, Phantom, or another wallet you already trust from the official app store listing. Phishing apps clone the icon. XAUConnect will never text you a seed phrase, never ask you to “validate” by typing it, and never require a deposit to connect.",
      },
      {
        heading: "Connect via WalletConnect",
        body:
          "On the site, tap Connect wallet and choose WalletConnect (or the wallet’s deep link). Approve the session in the wallet app. That session shares your public address and asks permission to request signatures later. It does not move funds.\n\nIf the QR/deep link fails, don’t spray the same URI into three wallets — you will get ghost sessions. Kill stale pairings in the wallet’s connected-sites list and start once.",
      },
      {
        heading: "Force the chain before you quote",
        body:
          "The swap network in XAUConnect and the active network in the wallet must match. Mobile wallets hide the chain switch behind a network icon. A Polygon USDC balance will not pay an Arbitrum swap. Cross-chain exists as a separate flow; it is not automatic because you connected a wallet that “supports many chains.”",
      },
      {
        heading: "The handoff: quote on the phone, sign in the wallet",
        body:
          "Enter the trade, read minimum received, then confirm. The OS switches to the wallet. Check the spender, the chain ID, and the amount on that wallet screen — not only in the browser. Safari and Chrome both freeze background tabs; if you wait five minutes in the wallet, the quote may be stale. Re-quote rather than hammering “retry.”",
      },
      {
        heading: "When the wallet comes back to a blank page",
        body:
          "Mobile browsers discard memory. XAUConnect’s wallet handoff is built to reconnect the session when you return. If the UI looks logged out, reconnect; your on-chain balances are in the wallet, not in the website. Never restore a seed into a random “support” site that appeared because the tab crashed.",
      },
      {
        heading: "Bookmark the real domain",
        body:
          "On a phone, the highest-ROI security habit is a Safari/Chrome bookmark to https://xauconnect.com — not a link from a Telegram bio, not an ad, not a push notification. WalletConnect sessions should be killed from the wallet’s connected-dapps list when you are done, the same way you would log out of a bank app. If a pairing request appears when you did not tap Connect, reject it. Phishing sites clone our glass UI; they cannot clone the domain in your bookmark bar.",
      },
    ],
    faqs: [
      {
        question: "Does WalletConnect let XAUConnect move funds later?",
        answer:
          "Only if you later sign a transaction that says so. Disconnecting the session in the wallet stops new signature requests. Revoke ERC-20 allowances separately if you granted them.",
      },
      {
        question: "Can I use Phantom for Ethereum?",
        answer:
          "Use Phantom for Solana (and whatever EVM support that wallet currently documents). For EVM-first trades, MetaMask, Rainbow, or Coinbase Wallet are the less surprising path. Mixing networks in one mental model is how people send assets into the void.",
      },
      {
        question: "Why does simulation fail only on mobile?",
        answer:
          "Usually stale quotes after the app-switch delay, or the wallet still on the wrong chain. Re-quote on the correct network. If it still fails, reduce size, then slippage, in that order.",
      },
      {
        question: "Is there a native iOS/Android app?",
        answer:
          "The mobile web app is the supported surface today, plus WalletConnect. Prefer the official domain xauconnect.com bookmarked, not ads.",
      },
    ],
    description:
      "Swap on your phone with XAUConnect: WalletConnect sessions, chain matching, OS handoff delays, and what to do when the browser tab is killed.",
  },

  "what-happens-when-you-sign-a-swap": {
    intro:
      "The scary moment in DeFi is not the quote. It is the wallet modal with a hex blob. This article translates that modal into the actual state changes: what a connection permission is, what an ERC-20 approval is, what the swap transaction does, and what XAUConnect can never do even if the website were compromised tomorrow.\n\nIf you only remember one sentence: **XAUConnect cannot broadcast an EVM transaction you did not sign, and it never learns your seed.**",
    sections: [
      {
        heading: "Permission to connect ≠ permission to spend",
        body:
          "Connecting a wallet shares your public address and lets the site *request* signatures. It is closer to “this dapp may show me popups” than to “this dapp may empty the account.” You can disconnect anytime. Disconnecting does not revoke token allowances already granted on-chain.",
      },
      {
        heading: "The approval transaction (EVM tokens)",
        body:
          "ERC-20 tokens cannot be pulled by a router unless you set an allowance. The first swap of a given token therefore often needs two signatures: approve, then swap. Native ETH/BNB/AVAX/POL do not use allowances.\n\nUnlimited approvals are convenient and dangerous. Prefer the exact amount. If you already granted unlimited, use our revoke guide and revoke.cash-style tools on the same chain.",
      },
      {
        heading: "The swap transaction",
        body:
          "The payload names a router/spender, encoded calldata that specifies token path and minimum output, and a value field for native input. Your wallet should simulate it. On success, pool reserves update, you receive the output token, and the platform fee is skimmed per the FeeCollector configuration.\n\nOn failure, EVM still charges gas. Solana simulation usually stops you before fee burn of that size, but priority fees still exist.",
      },
      {
        heading: "What a compromised website could still do",
        body:
          "A malicious front end can ask you to sign a different payload than the UI describes. That is why you read the wallet’s decoded fields, not only our glass card. Hardware wallets help because the screen is not the phishing page.\n\nA compromised front end still cannot steal funds from people who do not sign. It also cannot invent an allowance you never granted. The defense is verification culture, not trust in a logo.",
      },
      {
        heading: "How to verify after the fact",
        body:
          "Open the transaction on the chain explorer linked from the success state. Confirm token transfers in and out match the addresses you intended. If the output is a lookalike ticker, you swapped the clone. Save the hash; support conversations without a hash are not support conversations.",
      },
      {
        heading: "Hardware wallets change the threat model",
        body:
          "A Ledger or similar device displays destination, chain, and amount on a screen that the phishing page cannot rewrite. That does not decode every nested AMM hop, but it stops the most common drain: signing a transfer-from-max to an attacker spender while the website still shows a swap card. If the device says “Approve unlimited” and you meant a $50 test, reject. Convenience is how unlimited allowances happen.",
      },
    ],
    faqs: [
      {
        question: "Can XAUConnect see my seed phrase?",
        answer:
          "No. Seeds live in the wallet. We never ask for them. Anyone who does is not us.",
      },
      {
        question: "Why two popups?",
        answer:
          "Approve (once per token/spender) then swap. Native coin swaps skip approve. Solana has no ERC-20-style two-step allowance.",
      },
      {
        question: "Does disconnecting revoke approvals?",
        answer:
          "No. Approvals are on-chain until you revoke them.",
      },
      {
        question: "What if I signed the wrong chain?",
        answer:
          "The tx lands where you signed. Funds do not hop back automatically. That is a recovery/bridge problem, not an undo button.",
      },
    ],
    description:
      "What your wallet signature actually authorizes on XAUConnect: connect vs approve vs swap, and what a compromised site still cannot do without you.",
  },

  "native-usdc-vs-bridged-usdc": {
    intro:
      "USDC is not one asset. On Ethereum it is Circle’s native token. On many L2s and sidechains you will meet **native USDC** (Circle CCTP / official) and older **bridged USDC.e / USDC.e-style** representations that came through a lock-and-mint bridge. They have different contract addresses, sometimes different decimals handling in UI, and they do not substitute 1:1 inside a single pool.\n\nXAUConnect will happily quote whichever address you pick. Picking the wrong one is how you pay a 2% pool to “swap USDC to USDC” or how a bot sends CCTP funds to a wallet expecting USDC.e.",
    sections: [
      {
        heading: "Why two USDCs exist",
        body:
          "Bridges existed before Circle issued native USDC on every chain. Early Arbitrum/Polygon/Avalanche users received a bridged ERC-20 backed by lockboxes on Ethereum. Later, Circle issued native USDC on those chains. Both tickers often still display as “USDC” in wallets.\n\nThe only stable identifier is the contract address. Our token lists prefer native USDC where CoinGecko/Circle mark it canonical, but your wallet may still hold the legacy bridged version from an old CEX withdrawal.",
      },
      {
        heading: "How this shows up in a quote",
        body:
          "If you select native USDC as output but hold only USDC.e, the wallet balance is zero and the swap will fail or pull a different token if you pasted the wrong address. If a route hops through “USDC” it may be hopping through whichever contract the aggregator graph considers liquid — read the hop list.\n\nStable-to-stable trades between the two versions are real trades with real fees and impact. They are not a free rename.",
      },
      {
        heading: "Per-network habits that save money",
        body:
          "Ethereum: one canonical USDC. Base: native USDC is the default for new apps. Arbitrum and Polygon: check whether your CEX withdrew native or bridged. Avalanche: same story. Solana: USDC is an SPL mint — there is no ERC-20 USDC.e, but there are plenty of fake SPL tickers. Always paste the mint.\n\nBNB Chain USDC liquidity is thinner than USDT in some size ranges; do not assume the Ethereum mental model.",
      },
      {
        heading: "Bridging does not magically unify them",
        body:
          "A cross-chain swap from Ethereum USDC to “USDC on Arbitrum” must specify which Arbitrum contract you want. CCTP native-to-native is a different path than lock-and-mint into USDC.e. If the destination wallet is a smart-account that only indexes one address, the other USDC is invisible until you swap it.",
      },
      {
        heading: "Operational checklist",
        body:
          "Before a treasury move: 1) copy the address from Circle or the chain’s canonical token list, 2) paste it into XAUConnect’s token search, 3) confirm the quote’s output token matches, 4) send $10 first. Screenshots of tickers are not a checklist.",
      },
    ],
    faqs: [
      {
        question: "Which USDC does XAUConnect default to?",
        answer:
          "The token list’s canonical address for that chain — generally native Circle USDC where it exists. Always expand the token and read the address.",
      },
      {
        question: "Can I swap USDC.e to native USDC inside XAUConnect?",
        answer:
          "Yes if a route exists. Treat it as a normal swap with impact and fees, not as a conversion button.",
      },
      {
        question: "Why did my CEX deposit not show in the swap widget?",
        answer:
          "Wrong chain or wrong USDC contract. Check the CEX withdrawal explorer link.",
      },
      {
        question: "Is USDT the same mess?",
        answer:
          "USDT also has native vs bridged variants on some chains. Same rule: addresses, not tickers.",
      },
    ],
    description:
      "Native Circle USDC vs bridged USDC.e across Ethereum, L2s, and Solana — why tickers lie, how XAUConnect quotes them, and how not to bridge into the wrong contract.",
  },

  "non-custodial-aggregator-vs-cex": {
    intro:
      "A centralized exchange (CEX) is a company that holds your assets on its ledger until you withdraw. XAUConnect is a **non-custodial aggregator**: it never takes the deposit. You trade against public pools through a wallet you control. That single difference drives KYC, withdrawal queues, solvency risk, and — on the other side — gas, MEV, and irreversible mistakes.\n\nNeither venue is “safer” in the abstract. They fail in different ways. This article is the comparison we give people who ask whether they should “just use Binance instead.”",
    sections: [
      {
        heading: "Custody and counterparty risk",
        body:
          "On a CEX, you have an IOU. If the exchange pauses withdrawals, your ticker balance is not a blockchain balance. On XAUConnect, a hack of our website cannot drain you without a signature, but a hack of a pool, a bridge, or your own approval set can. You swapped CEX insolvency risk for operational self-custody risk.",
      },
      {
        heading: "KYC, privacy, and rails",
        body:
          "CEXs exist partly to connect bank rails and to satisfy travel-rule compliance. XAUConnect does not open accounts and does not KYC because there is no account. That does not make activity invisible — every swap is on a public ledger. “No signup” is not “anonymous cash.”\n\nIf you need fiat on-ramp, use a regulated on-ramp or CEX, then withdraw to a wallet and swap. Mixing those jobs in one confused flow is how people send USD-stablecoins to the wrong chain.",
      },
      {
        heading: "Price quality",
        body:
          "CEX spot books can be deeper than on-chain pools for BTC/ETH size. On-chain aggregators win when you already hold tokens, when you want an alt that is not listed, or when withdrawal fees erase the CEX’s tighter spread. Always compare **net**: CEX fee + withdrawal vs LP fee + gas + platform fee + impact.",
      },
      {
        heading: "Speed and finality",
        body:
          "A CEX fill is instant on their database and slow when you withdraw. An on-chain swap is slow to click (wallet, approve) and then final in seconds on L2/Solana. You cannot email support to reverse a signed swap. You also cannot be trapped in a withdrawal queue.",
      },
      {
        heading: "When we tell people to use a CEX anyway",
        body:
          "Large first-time fiat buys. Assets you cannot self-custody safely yet. Situations where you need customer support more than you need composability. Self-custody is a skill. Aggregators reward people who already have that skill, they do not replace it.",
      },
      {
        heading: "Taxes and records",
        body:
          "A CEX exports a CSV. A DEX aggregator does not file for you. Every swap is a taxable event in many jurisdictions, including hop tokens you never “meant” to hold. Keep explorer hashes. If you need fiat accounting, withdraw to a CEX after the on-chain work — do not pretend the aggregator is your bookkeeper. We are a software interface.",
      },
    ],
    faqs: [
      {
        question: "Is XAUConnect an exchange?",
        answer:
          "It is a DEX aggregator interface plus launchpad and API. It is not a CEX, broker, or custodian.",
      },
      {
        question: "Do I get a trade confirmation email?",
        answer:
          "No. The explorer hash is the confirmation. Bookmark it.",
      },
      {
        question: "Can I recover funds sent to the wrong address?",
        answer:
          "Not through us. On-chain transfers are final. A CEX sometimes helps if you sent to their deposit wallet with a memo missing — different system.",
      },
      {
        question: "Which is better for meme coins?",
        answer:
          "Most memes never list on major CEXs. That is exactly why they are risky on DEXs: you can buy things with no honest book. Use tiny size and the verification guides.",
      },
    ],
    description:
      "Non-custodial DEX aggregator vs centralized exchange: custody, KYC, net price, finality, and when XAUConnect is the wrong tool.",
  },

  "why-swap-quotes-expire-and-failed-transactions": {
    intro:
      "Quotes are photographs of a pool at a moment in time. Blocks keep happening. If you treat a quote like a limit you already own, you will sign a transaction that reverts, and on EVM you will still pay gas. This is the troubleshooting manual we wanted when “Transaction failed” was the entire error string.\n\nIt covers stale quotes, slippage too tight, insufficient allowance, wrong chain, fee-on-transfer tokens, and what to do — in order — so you do not double-submit.",
    sections: [
      {
        heading: "Why quotes go stale",
        body:
          "Every swap in that pool, and every sandwich bot watching the mempool, can move price before your transaction is included. Aggregator quotes also depend on third-party APIs that cache for a second or two. Thirty seconds of hesitation on a meme pair is a different market.",
      },
      {
        heading: "Read the revert before you retry",
        body:
          "Open the failed hash on the explorer. `STF` / transfer-from failures often mean allowance or a fee-on-transfer token. `Too little received` / slippage errors mean the floor was missed — raise slippage a notch or cut size, do not jump to 12%. Out-of-gas means the estimate was wrong; bump the gas limit, not the priority fee first.\n\nIf the explorer shows the tx as pending, do **not** send a second copy with the same nonce intent until you know whether the first will land. Double-sends on Ethereum create nonce queues.",
      },
      {
        heading: "Allowance and the “it worked in the UI” bug",
        body:
          "The website can show a quote while your allowance is still for a previous spender. After we rotate routers or you last traded on another aggregator, approve again. Check `GET /swap/allowance` if you are a bot. Humans: look for a second “Approve” button instead of assuming the first swap pop-up is the swap.",
      },
      {
        heading: "Fee-on-transfer and rebasing tokens",
        body:
          "Some tokens tax every transfer. A router that assumes it received amount X actually received X minus tax, then the minimum-received check fails. Those tokens need specialized routes or they are simply not worth integrating. If simulation fails only for one token, suspect the token, not Ethereum.",
      },
      {
        heading: "A recovery order that wastes less gas",
        body:
          "1) Confirm chain. 2) Re-quote. 3) Cut size in half. 4) Nudge slippage 0.1–0.3% at a time. 5) Check allowance. 6) Try a more liquid output (native USDC) as an intermediate via a two-hop you actually understand. 7) Stop. Going to 5% slippage on a public mempool is how you donate to MEV.",
      },
      {
        heading: "Pending vs failed vs dropped",
        body:
          "Pending means the nonce is in the mempool — wait or replace, do not duplicate. Failed/reverted means it landed and undid the swap; gas is gone on EVM. Dropped means it never landed; you can resend. Wallets blur these three. The explorer does not. If you are unsure, paste the hash before you tap anything else. That one habit prevents more lost gas than any slippage preset.",
      },
    ],
    faqs: [
      {
        question: "Did XAUConnect take a fee on the failed tx?",
        answer:
          "No platform fee on a reverted swap. You may still have paid network gas on EVM.",
      },
      {
        question: "The wallet said success but I do not see tokens",
        answer:
          "Wrong token list, wrong chain view, or you received a wrapped/bridged variant. Check the explorer transfer logs, not the wallet’s favourite tokens.",
      },
      {
        question: "Can I speed up a pending swap?",
        answer:
          "Use the wallet’s speed-up/replace if it supports the same nonce with higher fees. Do not build a brand-new swap from the site in parallel unless you know what you are doing.",
      },
      {
        question: "Solana failed with a simulation error",
        answer:
          "Usually blockhash expired or slippage. Re-quote and sign quickly; Solana blockhashes are short-lived. Add a modest priority fee during congestion.",
      },
    ],
    description:
      "Why DEX quotes expire, how to decode failed XAUConnect swaps on the explorer, and a gas-saving retry order that does not feed sandwich bots.",
  },

  "ethereum-l2-vs-solana-swap-costs": {
    intro:
      "Traders ask “which chain is cheapest?” as if it were a single number. It is not. You are buying a bundle of **gas**, **pool fees**, **bridge costs if you are not already there**, and **failure rates**. This is a practitioner comparison of Ethereum L1, the L2s XAUConnect supports (Arbitrum, Base, Polygon, plus BNB and Avalanche as EVM peers), and Solana — using how our quote card actually behaves, not a 2021 gas tweet.\n\nFigures below are order-of-magnitude from typical liquid-pair swaps in 2026, not a live oracle. Always read the current estimate in the widget.",
    sections: [
      {
        heading: "Ethereum L1: deepest pools, dearest mistakes",
        body:
          "ETH/USDC class pools on mainnet can absorb size that would wreck an L2 meme pool. You pay for that with gas that still spikes. A failed approval plus a failed swap can cost more than the platform fee on a $2,000 trade. Use L1 when the asset genuinely lives there or the size demands the depth.",
      },
      {
        heading: "Arbitrum and Base: the default for iteration",
        body:
          "For most retail swaps of majors, L2 gas is cents. The constraint becomes pool choice and native vs bridged USDC, not the validator fee. If you are bridging from L1, add the bridge time and risk to the “cheap L2” story — a $0.04 swap after a $3 bridge and 15 minutes is not $0.04.",
      },
      {
        heading: "Polygon, BNB Chain, Avalanche",
        body:
          "Cheap gas, uneven liquidity. USDT is often deeper than USDC on BNB Chain. Polygon still has legacy bridged stables in the wild. Avalanche C-Chain is EVM-familiar with thinner long-tail books. Check Discover and the quote’s impact line; do not assume Uniswap-mainnet depth.",
      },
      {
        heading: "Solana: fast finality, different failure mode",
        body:
          "Jupiter-routed swaps finalize in about a slot, not in a 12-second block plus blob market. Priority fees replace EIP-1559 tips. There is no ERC-20 approve step, which removes a whole class of “unlimited allowance” disasters and introduces mint-address phishing instead.\n\nCongestion shows up as failed simulations and priority-fee auctions, not as $80 gas. Re-sign quickly; blockhashes expire.",
      },
      {
        heading: "A decision rule we actually use",
        body:
          "If you already hold the asset on a chain, swap there unless impact is offensive. If you are moving size in majors, prefer the deepest book even if gas is higher. If you are experimenting, use Base/Arbitrum/Solana and a test amount. Never bridge your entire stack to chase a 5 bps fee difference.",
      },
      {
        heading: "Do not forget the way home",
        body:
          "Cheap execution on an L2 does not help if your CEX only deposits Ethereum USDC and you are stuck with a bridged variant plus no ETH for the bridge. Before you “save gas,” confirm you can reverse the path with a test size. The all-in cost of a strategy includes the last mile back to wherever you actually needed the funds.",
      },
    ],
    faqs: [
      {
        question: "Which chain does XAUConnect recommend?",
        answer:
          "We recommend reading the quote. The cheapest all-in path depends on where your tokens already are.",
      },
      {
        question: "Is Polygon still an L2?",
        answer:
          "Polygon PoS is an EVM sidechain / commit-chain, not an Optimistic/ZK rollup like Arbitrum or Base. Gas is still low; security assumptions differ. We list it because traders use it, not because the words “L2” are interchangeable.",
      },
      {
        question: "Does bridging to Solana always save money?",
        answer:
          "Only if you stay there. Bridging in and out can erase years of gas savings in one mistake or one delayed message.",
      },
      {
        question: "Where do I see gas in the UI?",
        answer:
          "On the quote card, separate from the platform fee. If gas is missing, do not sign.",
      },
    ],
    description:
      "Swap cost comparison across Ethereum, Arbitrum, Base, Polygon, BNB, Avalanche, and Solana — gas, depth, bridges, and how XAUConnect quotes each.",
  },

  "how-ai-agents-swap-tokens-without-holding-keys": {
    intro:
      "“AI agent trading” is usually a prompt wrapped around a hot wallet, which is just a bot with extra steps. The architecture that does not immediately lose the treasury is: the **model proposes**, a **policy engine constrains**, and a **signer** (KMS, Turnkey, hardware, session key with caps) **executes**. XAUConnect’s API is the quote/build layer in the middle. It is not the signer.\n\nThis article is for people wiring LangChain/OpenAI tools to quote and build endpoints without pasting a private key into a .env that also lives in a chatbot log. If you cannot draw those three boxes on a whiteboard, do not connect a funded wallet yet.",
    sections: [
      {
        heading: "The three processes",
        body:
          "Planner: an LLM that turns “rebalance 10% into USDC on Base” into a structured intent. Router: XAUConnect quote + your own risk checks (max impact, allowlisted tokens, max notional per hour). Signer: something that cannot be the chat transcript.\n\nIf those three share one Node process with one env var, you built a custodial bot and called it an agent.",
      },
      {
        heading: "What the model is allowed to see",
        body:
          "Give it quotes, token symbols, and explorer links. Do not give it seed phrases, KMS credentials, or raw signed bytes that another process could broadcast. Tool outputs should be numbers and hashes, not “here is the private key in case you need it.”",
      },
      {
        heading: "Policy before build",
        body:
          "Hard-code: allowlisted chainKeys, allowlisted token addresses, max USD notionals, max price impact, min liquidity, cool-down after a failed tx. The LLM must not be able to invent a new token address from a tweet. Paste-from-Twitter is how agents buy honeypots faster than humans.",
      },
      {
        heading: "Identification and audit",
        body:
          "Set a stable agent name in the client identification headers. Record every fill through the optional swap recording endpoint and keep your own ledger of intents vs hashes. When the agent misbehaves you want a timeline, not a vibe.",
      },
      {
        heading: "Solana vs EVM for agents",
        body:
          "EVM: you broadcast. Solana: you may use the signed-bytes relay after signing. Either way the signer is yours. Session keys with spending limits are kinder than god-mode keys when the prompt injection of the week arrives.",
      },
      {
        heading: "Prompt injection is a market order",
        body:
          "If a webpage, tweet, or token description can change the model’s next tool call, it can change the token address. Treat untrusted text as hostile. Strip it before the planner. The policy engine should ignore any address the user did not explicitly allowlist, even if the model “is sure.” Speed without that clamp is just automated honeypot shopping. Write the allowlist in config, not in the prompt, and fail closed when the list is empty.",
      },
    ],
    faqs: [
      {
        question: "Does XAUConnect host agent keys?",
        answer:
          "No. We never take custody. If a vendor offers “we’ll sign for your GPT,” that vendor is the custodian, not us.",
      },
      {
        question: "Is there a special AI schema for Google?",
        answer:
          "No. Google’s June 2026 documentation says extra AI markup is unnecessary. Agents consume the REST API; crawlers read the HTML docs.",
      },
      {
        question: "Can I let the model set slippage?",
        answer:
          "Only inside a tight bound your policy engine clamps. Unbounded slippage is how an injected prompt empties a wallet in one hop.",
      },
      {
        question: "Where do I start in the docs?",
        answer:
          "/developers/quickstart, /developers/blog/introducing-swap-api-for-ai-agents, and this site’s Swap API reference.",
      },
    ],
    description:
      "How AI agents should swap on XAUConnect without holding keys: planner vs policy vs signer, allowlists, and why the API is not a custodian.",
  },

  "how-xauconnect-discovery-ranks-tokens": {
    intro:
      "Discover is not a paid trending board. The feed is a merge of **our indexer** (factory pair-created events and swap logs written to Postgres), **GeckoTerminal**, and **DexScreener**, with launchpad tokens mixed in when they exist. If a ticker is pumping on Twitter and missing here, either it is too new for those sources, it is on a chain we do not index, or it is noise we are deliberately not amplifying.\n\nThis is how to read the board so you do not treat rank #3 as investment research. Rank is a camera angle on public tape, not a rating from XAUConnect Labs.",
    sections: [
      {
        heading: "What the indexer actually stores",
        body:
          "The indexer VM scans supported EVM factories and Solana where configured, then writes pools, snapshots, swaps, and candles. The app API prefers that database when `MARKET_SOURCE` is hybrid/db. External APIs fill gaps when coverage is thin. That architecture exists so Discover does not die when a third-party rate limit trips.",
      },
      {
        heading: "Ranking is a blend, not a single API",
        body:
          "Trending, new, gainers, and volume slices combine those sources and de-duplicate. A token can look “new” on DexScreener and already old in our DB. We bias toward names with real swap events, not empty pools with a logo. Washy volume still sneaks through — treat outlier 24h volume on a nothing-burger FDV as a warning, not a green light.",
      },
      {
        heading: "Chain filters exist because liquidity is local",
        body:
          "A Solana-only tape will drown Ethereum names if we do not shard. Use the chain chips. A “top” token on BNB Chain is not comparable to a “top” token on Ethereum without looking at liquidity USD, not just percent change.",
      },
      {
        heading: "How to go from a Discover card to a safe swap",
        body:
          "Open the token, copy the address from the page, paste it into Swap yourself (yes, again), check holders and LP on the explorer, then test-size. Discover is a camera, not a due-diligence department. Our meme-risk and rug-pull articles apply to everything on this board.",
      },
      {
        heading: "What will not get you ranked",
        body:
          "Paying us. Spamming factory pair-created events with empty pools. Cloning a ticker. We would rather a thinner honest board than a 25,000-page doorway of fake tokens — we already burned that playbook on purpose.",
      },
      {
        heading: "Launchpad names vs organic tape",
        body:
          "Tokens submitted through Launchpad can appear beside indexer-discovered pools. That adjacency is distribution, not a quality badge. If a launch has no swaps in our database and only a logo, it will sit at the bottom until someone actually trades. That is the feature. A board that ranks ads above fills would be a worse product and a worse library for anyone trying to learn how markets work here. Trade first, then look at rank.",
      },
    ],
    faqs: [
      {
        question: "Why is a CoinGecko-famous token missing?",
        answer:
          "Wrong chain filter, indexer lag, or it does not trade in pools we recognize. Search by address on Swap.",
      },
      {
        question: "Is Discover financial advice?",
        answer:
          "No. It is market data. Percent-change leaders are often the riskiest names on the screen.",
      },
      {
        question: "How live is “live”?",
        answer:
          "Launches/live and trending endpoints refresh on the order of seconds to tens of seconds. Candles are not tick-by-tick trading-terminal quality.",
      },
      {
        question: "Can I API this?",
        answer:
          "Yes — discovery/trending and related market routes on the public API. Same non-custodial rule: data in, keys stay with you.",
      },
    ],
    description:
      "How XAUConnect Discover ranks tokens: indexer vs Gecko vs DexScreener, chain filters, and why trending is not a buy rating.",
  },

  "how-to-size-a-large-swap-on-thin-liquidity": {
    intro:
      "Large is relative. $8,000 is nothing in ETH/USDC on Ethereum and is a wrecking ball in a two-day-old meme pool with $40k TVL. Sizing is the skill of asking **what percentage of the pool you are**, not what percentage of your feelings you are.\n\nThis guide is the practical method we use: read depth, split orders, avoid hero slippage, and know when the honest answer is “don’t.”",
    sections: [
      {
        heading: "Translate USD into pool percentage",
        body:
          "If the quote shows 8% price impact, you are the event. Impact is the pool moving because of you; slippage tolerance is how much extra movement you allow while the tx confirms. For large orders, impact dominates. Cut size until impact is a number you could explain to a partner without coughing.",
      },
      {
        heading: "Split in time, not only in hops",
        body:
          "Aggregators already split across pools when it helps. You can still split across **blocks**: four $2,500 swaps ten minutes apart often hurt you less than one $10,000 smash, and they give sandwiches a smaller surface if you also keep slippage tight.\n\nDo not split by signing four copies at once. That is the same smash with worse nonce hygiene.",
      },
      {
        heading: "Use the deeper venue even if it is boring",
        body:
          "If Discover shows a cousin pool on a different chain with 10× liquidity, bridging may still be cheaper than eating 15% impact — or it may not, once you add bridge risk. Compute both. Boring USDC on Arbitrum has saved more treasuries than clever routing through three microcaps.",
      },
      {
        heading: "Slippage for size",
        body:
          "Tight slippage + large size = revert + gas. Loose slippage + large size = MEV picnic. The adult setting is: reduce size first, then give only the slippage the impact line already implies plus a thin buffer (for example impact 0.7% → slippage ~1.0%, not 8%).\n\nOn Solana, add priority fee rather than opening slippage like a door.",
      },
      {
        heading: "When to walk away",
        body:
          "If the only route is a 3-hop through an unknown ticker, if LP is unlocked, if top wallets hold 40%, or if you need 5%+ slippage to land — you are not trading, you are donating. XAUConnect will still show a quote. Showing a quote is not an endorsement of the size.",
      },
      {
        heading: "Stablecoin as a shock absorber",
        body:
          "Going alt → alt in one click often means two thin pools. Going alt → native USDC (correct contract), waiting a block, then USDC → dest alt lets you abort after the first leg if impact was worse than quoted. That is slower and usually cheaper than a heroic multi-hop. It also leaves you in a known asset if the second pool disappears. For treasuries, that abort option is the whole point of sizing.",
      },
    ],
    faqs: [
      {
        question: "Will XAUConnect cap my size?",
        answer:
          "The pool caps you via impact and reverts. We do not provide socialized loss protection.",
      },
      {
        question: "Are TWAP bots available?",
        answer:
          "You can build time slicing with the public API and your own signer. There is no custodial TWAP vault.",
      },
      {
        question: "Does splitting increase total platform fees?",
        answer:
          "Platform fee is per executed notional. Four fills of $2,500 cost about the same bps as one $10,000 fill, plus extra gas. On L2 the gas extra is usually the lesser evil versus impact.",
      },
      {
        question: "How do I see depth before I type an amount?",
        answer:
          "Market snapshot on token pages, liquidity on Discover, and the impact line that appears as soon as you enter size. If impact is blank, stop.",
      },
    ],
    description:
      "How to size a large DEX swap on thin liquidity: pool percentage, splitting across blocks, slippage vs impact, and when to not trade.",
  },
};

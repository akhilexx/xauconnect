/**
 * Hand-authored long-form Learn / Guide articles.
 *
 * Each entry is keyed by the page slug and supplies genuinely unique editorial
 * content (no templating, no spinning). The content engine prefers these over
 * generated prose; topics without an entry here fall back to the generator.
 */
import { PRODUCT_LEARN_CONTENT } from "./learn-content-product.js";
import { SWAP_LEARN_CONTENT } from "./learn-content-swap.js";
import { CREATE_LEARN_CONTENT } from "./learn-content-create.js";
import { COMMERCIAL_EXTRA_SECTIONS } from "./learn-content-extra.js";
import { COMMERCIAL_EXTRA_SECTIONS_2 } from "./learn-content-extra2.js";
import type { RichContent } from "./content-expand.js";

export const LEARN_CONTENT: Record<string, RichContent> = {
  "how-to-swap-tokens-on-xauconnect": {
    intro:
      "Swapping tokens on XAUConnect takes about a minute once your wallet is connected, but understanding what happens behind each tap is what separates a clean fill from an expensive mistake. This guide walks through the entire flow end to end: connecting a wallet on the right network, requesting and reading a quote, granting a token approval when one is required, and confirming the swap so the transaction settles on-chain. XAUConnect is a non-custodial aggregator, which means it never holds your funds at any point. It reads liquidity from many decentralized exchanges and routing partners, ranks the available paths by how much you actually receive after fees, and hands your wallet an unsigned transaction to approve. You stay in control of your keys from start to finish.\n\nThe walkthrough below applies across all seven supported networks — Ethereum, BNB Chain, Polygon, Arbitrum, Base, Avalanche, and Solana — with notes where a step differs between EVM chains and Solana.",
    sections: [
      {
        heading: "Step 1 — Connect your wallet on the correct network",
        body:
          "Open the swap widget and choose the network you want to trade on before anything else. The single most common beginner error is holding tokens on one chain and trying to swap them on another; assets do not move between networks automatically, so a USDC balance on Polygon is invisible while the app is set to Arbitrum.\n\nOn EVM chains (Ethereum, BNB Chain, Polygon, Arbitrum, Base, Avalanche) connect MetaMask, Rabby, Coinbase Wallet, or any WalletConnect-compatible wallet, then confirm the chain ID shown in your wallet header matches the network selected in the app. On Solana, connect Phantom, Solflare, or Backpack. When the wallet prompts you to approve a connection it is only sharing your public address and asking permission to request signatures later — it is not moving funds.",
      },
      {
        heading: "Step 2 — Choose tokens and enter an amount",
        body:
          "Select the token you are paying with (the input) and the token you want to receive (the output). You can search by symbol or name, or paste a contract/mint address directly. Pasting an address is the safest option for anything that is not a household-name asset, because ticker symbols collide constantly and copycat tokens reuse popular names on purpose.\n\nEnter the amount you want to spend. Within a second or two the widget requests quotes from every venue it can route through and shows you the best result. Quotes are live and expire quickly because pool prices change with every block, so treat the number as a snapshot rather than a fixed promise.",
      },
      {
        heading: "Step 3 — Read the quote before you commit",
        body:
          "A good quote tells you four things: the route source (which DEX or combination of pools the trade passes through), the minimum received (the floor you are guaranteed after slippage), the platform and routing fees, and an estimate of network gas. Look at the minimum received first — it is the only number you are actually protected by. If it looks far below the headline rate, the pool is thin or your trade is large relative to its depth.\n\nIf the route shows multiple hops (for example, swapping an altcoin to USDC and then USDC to another altcoin because no direct pool exists), each hop carries its own fee and price impact. A great rate on the first hop can be eaten by a shallow second pool, which is why comparing the net output matters more than any single leg.",
      },
      {
        heading: "Step 4 — Approve the token (EVM only, once per token)",
        body:
          "On EVM chains, before a router can move an ERC-20 token on your behalf you must grant an allowance. This is a separate transaction from the swap itself and only appears for tokens you have not traded through that router before; native assets like ETH, BNB, or AVAX never need approval. Whenever your wallet offers the choice, approve the exact amount you intend to trade rather than an unlimited allowance — an unlimited approval is a standing permission that a malicious or compromised contract could later exploit.\n\nSolana handles this differently: there is no separate approval step, but transactions are simulated before signing, and you may need a small priority fee during periods of network congestion.",
      },
      {
        heading: "Step 5 — Confirm, then verify the receipt",
        body:
          "Confirm the swap in your wallet. On EVM chains the transaction enters the mempool and confirms within a few seconds to a couple of minutes depending on the network and gas you paid. On Solana it usually finalizes in well under a second once it lands.\n\nAfter it settles, open your wallet history or the block explorer for that chain and confirm the output amount matches the minimum received you accepted. If the figure is lower than expected, slippage was likely consumed during confirmation; if the transaction failed, you still paid gas on most EVM chains, and the usual causes are slippage set too tight or liquidity that moved while you hesitated.",
      },
      {
        heading: "Common problems and how to fix them",
        body:
          "If a quote will not generate, your wallet is probably on the wrong network or the pair has no routable liquidity at your size. If a transaction keeps failing simulation, reduce the trade size first, then nudge slippage up in small increments rather than jumping to a large value. If a transaction sits pending on an EVM chain for several minutes, check the explorer before resubmitting — sending a duplicate can waste gas and, on chains with strict nonce ordering, create a stuck queue.",
      },
    ],
    faqs: [
      {
        question: "Do I need to create an account to swap on XAUConnect?",
        answer:
          "No. XAUConnect is non-custodial and requires no signup or KYC to get quotes. You only connect a wallet when you are ready to execute, and you sign every transaction yourself.",
      },
      {
        question: "Why does my swap need two transactions?",
        answer:
          "On EVM chains an ERC-20 token requires a one-time approval transaction before the swap transaction so the router can move that token. Native coins like ETH or BNB skip the approval. Solana does not use a separate approval step at all.",
      },
      {
        question: "What slippage should I set for my first swap?",
        answer:
          "Start at about 0.5% for deep, liquid pairs such as a major token against USDC. Thin or volatile pairs may need more, but raise it gradually — a high slippage setting invites worse fills and sandwich attacks on public mempools.",
      },
      {
        question: "Does XAUConnect ever hold my funds?",
        answer:
          "Never. The platform aggregates quotes and builds unsigned transactions; custody stays in your wallet throughout. There is no deposit address and no shared balance.",
      },
    ],
    description:
      "Step-by-step guide to swapping tokens on XAUConnect: connect a wallet, read the quote, approve the token, confirm, and verify the receipt across Ethereum, Solana, and five more chains.",
  },
  "how-to-set-slippage-tolerance": {
    intro:
      "Slippage tolerance is the single setting that most often decides whether your swap fills cleanly, fails outright, or gets sandwiched for a worse price. It is the maximum amount the price is allowed to move between the moment you sign and the moment the transaction confirms on-chain. Set it too tight and your transaction reverts when the market ticks against you, wasting gas. Set it too loose and you hand front-running bots an open invitation to push your fill to the edge of what you authorized.\n\nThis guide explains what slippage actually controls, gives concrete starting numbers for different kinds of pairs, and shows how slippage interacts with price impact and pool depth so you can choose a value deliberately instead of guessing.",
    sections: [
      {
        heading: "What slippage tolerance really controls",
        body:
          "When you accept a quote, the swap contract is told a minimum amount of output tokens you will accept. That floor is derived from the quoted price minus your slippage tolerance. If, by the time miners or validators include your transaction, the realized price still delivers at least that minimum, the swap succeeds. If the price has moved beyond your tolerance, the contract reverts to protect you.\n\nSlippage is therefore a protection, not a fee. You do not pay your slippage tolerance — it is simply the worst outcome you are willing to accept. Most of the time you receive better than the floor.",
      },
      {
        heading: "Practical starting numbers",
        body:
          "For deep stablecoin pairs (USDC to USDT, for example) 0.1% to 0.3% is usually enough. For a blue-chip token against a stablecoin or the native gas coin on a major chain, 0.5% is a sensible default. For mid-cap tokens with moderate liquidity, 1% to 2% is common. For thin or freshly launched memecoins, you may need 3% or more simply to get a fill — but at that point you should also shrink your trade size, because the wide tolerance is a symptom of a shallow pool that will move sharply against you.\n\nThese are starting points, not rules. The right number depends on the specific pool depth at the time you trade, which is why the same token can need different settings on different days.",
      },
      {
        heading: "Slippage is not price impact",
        body:
          "Traders constantly confuse the two. Price impact is what your own trade does to the pool: a large order against a small reserve moves the price along the curve before anyone else acts. Slippage tolerance is your buffer against everyone else's activity between signing and confirmation. A $50,000 trade into a $200,000 pool will show large price impact no matter how you set slippage — widening tolerance will not save you from a thin market, it will only let the bad fill go through. The fix for high price impact is a smaller trade or a deeper venue, not a looser slippage setting.",
      },
      {
        heading: "Why a loose setting is dangerous on public mempools",
        body:
          "On Ethereum and most EVM chains, pending transactions are visible in a public mempool before they confirm. A high slippage tolerance tells searchers exactly how much room they have to sandwich you: they buy in front of your trade, let your order push the price up, and sell into it, pocketing the difference your tolerance allowed. Keeping slippage as tight as the pool permits shrinks that attack surface. For large or sensitive trades, splitting the order into smaller clips reduces both price impact and the profit available to a sandwich.",
      },
      {
        heading: "A repeatable method",
        body:
          "Start with the lowest tolerance that lets the quote simulate successfully. If the transaction fails, raise it one step at a time rather than maxing it out. For anything beyond a routine trade, check the pool's depth in Discover first so your tolerance reflects real liquidity. And whenever you pause for more than a minute between previewing and signing, request a fresh quote — the floor you accepted earlier was based on a price that has since moved.",
      },
    ],
    faqs: [
      {
        question: "What happens if slippage is set too low?",
        answer:
          "The transaction reverts when the realized price falls below your minimum, and on most EVM chains you still pay gas for the failed attempt. Raise the tolerance slightly and retry.",
      },
      {
        question: "Is higher slippage ever the right choice?",
        answer:
          "Sometimes — thin or fast-moving pools may not fill at a tight setting. But pair a higher tolerance with a smaller trade size, because a wide tolerance on a shallow pool is exactly what sandwich bots exploit.",
      },
      {
        question: "Does slippage cost me money directly?",
        answer:
          "No. Slippage tolerance is a maximum acceptable loss, not a fee. You frequently receive better than the floor; it only matters when the market moves against you before confirmation.",
      },
      {
        question: "Why does the same token need different slippage on different days?",
        answer:
          "Because pool depth and volatility change. A pair that is deep and calm one day may be thin and choppy the next, so the tolerance that worked before may be too tight now.",
      },
    ],
    description:
      "How to choose a slippage tolerance that protects you from sandwich attacks without causing failed transactions, with concrete numbers for stable, blue-chip, and thin pools.",
  },
  "how-to-read-a-dex-route-comparison": {
    intro:
      "An aggregator quote can look like a wall of numbers, but every line answers one question: how many output tokens will actually land in your wallet, and what stands between you and that amount. Learning to read a route comparison turns the quote from something you accept on faith into a decision you can defend. This guide breaks down each element of a DEX route card — the route source, the hop structure, minimum received, price impact, platform fee, and estimated gas — and explains which one actually decides whether a route is good.",
    sections: [
      {
        heading: "Route source and why aggregation exists",
        body:
          "The route source tells you which venue or combination of venues your trade will pass through — a single Uniswap-style pool, a split across several pools, or a multi-hop path through an intermediate token. Aggregation exists because no single DEX has the best price for every pair at every size. By comparing many venues and even splitting one order across several, an aggregator can return more output than any individual exchange would on its own. The route label is your window into how that result was assembled.",
      },
      {
        heading: "Hops: one pool or several",
        body:
          "A single-hop route swaps directly from your input token to your output token in one pool. A multi-hop route passes through an intermediate asset — commonly the native coin or a stablecoin — because no deep direct pool exists. Multi-hop routes are normal and often optimal, but each hop adds a pool fee and its own price impact. When you compare two routes, a single-hop path is not automatically better; what matters is the net output after every hop's costs are subtracted.",
      },
      {
        heading: "Minimum received is the number that protects you",
        body:
          "The headline exchange rate is an estimate; the minimum received is a guarantee. It is the quoted output reduced by your slippage tolerance, and it is the figure the smart contract enforces. If two routes show similar headline rates but very different minimums, the one with the higher minimum is the safer fill. Train yourself to look here first — everything above it is marketing, and this line is the contract.",
      },
      {
        heading: "Price impact tells you if your trade is too big",
        body:
          "Price impact measures how far your own order moves the pool price. A fraction of a percent means the pool is deep relative to your size. Several percent means you are a large fish in a small pond, and a meaningful chunk of value is lost simply to moving the curve. High price impact is not solved by changing slippage — it is solved by trading less per transaction or finding a deeper venue. If a route shows uncomfortable impact, split the order.",
      },
      {
        heading: "Fees and gas: two different costs",
        body:
          "There are two distinct costs on every trade. The platform or routing fee is charged by the aggregator and is shown explicitly in the quote; on supported chains XAUConnect lets you pay this in USDC. Network gas is paid to the chain's validators and is independent of the aggregator — it is roughly fixed per transaction regardless of trade size, which is why small trades feel gas-heavy and large trades barely notice it. When you compare routes, fold both into the net output rather than judging them separately.",
      },
      {
        heading: "Putting it together",
        body:
          "To compare two routes properly, ignore the headline rate and rank them by minimum received after fees and gas. Use price impact as a warning light: if it is high on the best route, your size is the problem, not the venue. When trade value runs into the thousands, it is worth comparing at least two routes before signing, because that is precisely the size at which venue differences become real money.",
      },
    ],
    faqs: [
      {
        question: "Which number on a quote matters most?",
        answer:
          "Minimum received. It is the contract-enforced floor after slippage, so it is the only output you are actually guaranteed. Rank competing routes by it after accounting for fees and gas.",
      },
      {
        question: "Is a single-hop route always better than multi-hop?",
        answer:
          "No. Multi-hop routes are often optimal when no deep direct pool exists. Each hop adds cost, so judge by net output, not by the number of hops.",
      },
      {
        question: "How do I lower high price impact?",
        answer:
          "Trade a smaller amount per transaction or use a deeper venue. Widening slippage does not reduce price impact — it only lets a poor fill go through.",
      },
      {
        question: "Are platform fees and gas the same thing?",
        answer:
          "No. The platform fee is charged by the aggregator and shown in the quote; gas is paid to network validators and is roughly fixed per transaction regardless of size.",
      },
    ],
    description:
      "Understand every line of a DEX aggregator quote: route source, hops, minimum received, price impact, platform fee, and gas — and which one actually decides if a route is good.",
  },
  "how-to-avoid-swap-scams-and-honeypots": {
    intro:
      "Most money lost on decentralized exchanges is not lost to volatility — it is lost to scams that are entirely avoidable with a short checklist. Fake tokens, honeypot contracts, malicious approvals, and phishing front-ends all rely on the same thing: a trader moving fast and trusting a name, a link, or a social-media post instead of verifying on-chain. This guide covers the four ways traders most commonly lose funds on a DEX and the specific defense against each. None of them require technical expertise; they require the discipline to check before you sign.",
    sections: [
      {
        heading: "Fake and copycat tokens",
        body:
          "Anyone can deploy a token and name it anything. Scammers mint tokens that reuse the exact symbol and name of a popular asset, seed a little liquidity, and wait for traders who search by ticker to buy the impostor. The defense is simple and absolute: trade by contract or mint address, not by symbol. Get the canonical address from the project's official site or a reputable data source, and compare the full string — not just the first and last few characters, because address-poisoning attacks deliberately match the visible ends.",
      },
      {
        heading: "Honeypot contracts",
        body:
          "A honeypot is a token you can buy but cannot sell. The contract contains logic that blocks transfers from ordinary holders, allows only the deployer to sell, or applies a punishing tax on exit. The chart looks like it only goes up because nobody can take profit. Before buying anything unfamiliar, check whether other wallets have successfully sold it, read the contract's permissions on the block explorer, and be deeply skeptical of tokens with transfer restrictions, mint functions, or blacklist capabilities. A tiny test sell after buying confirms whether you can actually exit.",
      },
      {
        heading: "Malicious approvals and drainer signatures",
        body:
          "Granting a token approval lets a contract move that token on your behalf. Scam front-ends try to trick you into approving an unlimited allowance to a contract they control, or into signing an opaque off-chain message that authorizes a transfer. Approve only the amount you intend to trade, never sign a transaction or message you do not understand, and periodically review and revoke old allowances. A wallet that has been drained almost always signed something it should have refused.",
      },
      {
        heading: "Phishing front-ends and fake links",
        body:
          "Attackers clone real interfaces at look-alike domains and promote them through ads, compromised social accounts, and direct messages. The cloned site looks identical but routes your approval or signature to the attacker. Bookmark the official domain and use the bookmark every time. Never reach a swap interface through a search ad or a link someone sent you, and confirm the URL in the address bar before connecting your wallet. No legitimate platform will ever ask for your seed phrase.",
      },
      {
        heading: "A pre-trade checklist that prevents most losses",
        body:
          "Before approving any unfamiliar token: confirm the full contract address against an official source; verify the contract is published and readable on the explorer; check that liquidity exists and that other holders have sold successfully; size the first trade as a small test; and review the approval amount your wallet is about to grant. Five checks, under two minutes, and they defend against the overwhelming majority of preventable losses.",
      },
    ],
    faqs: [
      {
        question: "How do I know if a token is a honeypot?",
        answer:
          "Check whether ordinary wallets have successfully sold it, read the contract permissions on the explorer for transfer restrictions or blacklist functions, and place a small test sell after buying to confirm you can exit.",
      },
      {
        question: "What is the safest way to find the right token?",
        answer:
          "Trade by full contract or mint address taken from the project's official source, and compare the entire address — not just the ends, which poisoning attacks deliberately match.",
      },
      {
        question: "Why should I avoid unlimited token approvals?",
        answer:
          "An unlimited allowance is a standing permission that a malicious or later-compromised contract can use to drain that token. Approve only the amount you are trading, and revoke old allowances periodically.",
      },
      {
        question: "How do I avoid phishing sites?",
        answer:
          "Bookmark the official domain and always use the bookmark. Never reach a swap interface via a search ad or a link from a message, and never enter your seed phrase anywhere.",
      },
    ],
    description:
      "The common ways traders lose funds on DEXs — fake tokens, honeypots, malicious approvals, and phishing front-ends — and the specific checklist that defends against each.",
  },
  "what-is-a-dex-aggregator": {
    intro:
      "A DEX aggregator is a tool that searches many decentralized exchanges at once, compares the routes they offer for your trade, and sends your order through whichever path returns the most tokens after costs. Instead of manually checking Uniswap, then a second pool, then a third, and guessing which is cheapest, you get a single ranked comparison and a one-click execution that still settles non-custodially from your own wallet. This article explains how aggregation works, why it almost always beats a single-DEX quote, and what the aggregator does and does not control.",
    sections: [
      {
        heading: "The problem aggregators solve",
        body:
          "Liquidity on decentralized exchanges is fragmented. The same pair might trade on a dozen different pools across several protocols, each with its own depth, fee tier, and price. No single venue is consistently best, because the optimal place to trade depends on the pair, the size, and the moment. Checking them all by hand is slow and error-prone, and by the time you have compared three of them, prices have already moved. An aggregator does that comparison in milliseconds and keeps doing it as conditions change.",
      },
      {
        heading: "How routing actually works",
        body:
          "When you request a quote, the aggregator queries the state of many pools and routing partners. It considers direct pools, multi-hop paths through intermediate tokens, and even splitting a single order across several venues to reduce price impact. It then ranks the candidate routes by net output — the amount you receive after pool fees, platform fees, and estimated gas — and presents the best one, usually with the alternatives visible so you can inspect the trade-offs.",
      },
      {
        heading: "Why aggregation beats a single DEX",
        body:
          "For small trades on a deep pair, the difference between venues may be negligible. But as size grows, price impact on any single pool rises quickly, and the ability to split the order or route through a deeper path can return materially more tokens. Aggregators also surface multi-hop routes a trader might not think to construct manually. The result is consistently equal-or-better execution, with the worst case being the same price a single DEX would have given anyway.",
      },
      {
        heading: "What the aggregator does not do",
        body:
          "An aggregator does not set prices, hold your funds, or guarantee an outcome. It reads on-chain pool state and partner quotes, then builds an unsigned transaction for you to approve. Prices still move between quote and confirmation, which is why slippage tolerance exists. And aggregation cannot create liquidity that is not there — on a genuinely thin token, every venue is shallow, and the best route is simply the least-bad one. Custody, signing, and the final decision remain entirely with you.",
      },
      {
        heading: "How XAUConnect approaches it",
        body:
          "XAUConnect aggregates liquidity across Ethereum, BNB Chain, Polygon, Arbitrum, Base, Avalanche, and Solana from one interface. It ranks routes by minimum received after fees, shows the fee breakdown before you sign, and supports paying the platform fee in USDC on chains where that is available. Because it is non-custodial, every route ends with a transaction your own wallet signs — there is no account, no deposit, and no shared balance.",
      },
    ],
    faqs: [
      {
        question: "Is a DEX aggregator safe to use?",
        answer:
          "A non-custodial aggregator never holds your funds — it only builds transactions you sign yourself. The usual DEX risks (token quality, slippage, approvals) still apply, so verify contracts and read the quote before confirming.",
      },
      {
        question: "Does an aggregator charge more than using a DEX directly?",
        answer:
          "Aggregators add a platform fee shown in the quote, but they frequently return more net output by finding better routes, so the all-in result is usually equal to or better than trading on one DEX.",
      },
      {
        question: "Can an aggregator get me a good price on an illiquid token?",
        answer:
          "It will find the best available route, but it cannot create liquidity that does not exist. On a thin token every venue is shallow, so expect higher price impact regardless of routing.",
      },
      {
        question: "Which chains does XAUConnect aggregate?",
        answer:
          "Ethereum, BNB Chain, Polygon, Arbitrum, Base, Avalanche, and Solana, all from a single non-custodial interface.",
      },
    ],
    description:
      "A DEX aggregator scans many liquidity venues and routes your trade for the best net output. How aggregation and routing work, and why it beats a single-DEX quote.",
  },
  "what-is-impermanent-loss": {
    intro:
      "Impermanent loss is the gap between what a liquidity provider ends up with and what they would have had by simply holding the two tokens instead. It is one of the most misunderstood ideas in DeFi, partly because the name is misleading: the loss is only impermanent if prices return to where they started, and it becomes very permanent the moment you withdraw. This article explains why it happens, walks through a concrete example, and shows when trading fees make providing liquidity worthwhile despite it.",
    sections: [
      {
        heading: "Why it happens at all",
        body:
          "When you deposit into a standard automated market maker pool, you provide two tokens in equal value. The pool's formula keeps their values balanced by allowing arbitrage traders to rebalance it as the market price moves. Those arbitrageurs are profiting from the pool, and that profit comes out of your position. The effect is that the pool automatically sells you more of whichever token is rising and accumulates more of whichever is falling — the opposite of what a holder would want. The divergence between the two assets' prices is what creates the loss.",
      },
      {
        heading: "A concrete example",
        body:
          "Suppose you deposit into an ETH/USDC pool when ETH is worth 2,000 USDC, contributing 1 ETH and 2,000 USDC for a total of 4,000 USDC of value. If ETH then doubles to 4,000 USDC, arbitrageurs rebalance the pool, and when you withdraw you will hold less ETH and more USDC than you started with — roughly 0.707 ETH and about 2,828 USDC, worth around 5,657 USDC. Had you simply held the original 1 ETH and 2,000 USDC, you would have about 6,000 USDC. That gap of roughly 343 USDC is the impermanent loss. You still made money versus your deposit, but less than holding.",
      },
      {
        heading: "When fees make it worth it",
        body:
          "Liquidity providers earn a share of the trading fees the pool generates. On a high-volume pair, those fees can exceed the impermanent loss, leaving you ahead of simply holding. The calculation is a race: fee income versus divergence loss. Stable-to-stable pairs barely diverge, so even modest fees win. Volatile pairs diverge sharply, so they need very high volume to compensate. This is why providing liquidity for correlated or stable assets is generally lower risk than for a volatile token against a stablecoin.",
      },
      {
        heading: "Why the name is misleading",
        body:
          "The loss is called impermanent because if the two prices return to their original ratio, the divergence disappears and you are left only with the fees you earned. But prices rarely return exactly, and the instant you withdraw, whatever divergence exists at that moment is locked in as a real, permanent result. Treat impermanent loss as a real cost you are betting fees will outrun, not as something that magically reverses.",
      },
    ],
    faqs: [
      {
        question: "Does impermanent loss mean I lost money?",
        answer:
          "Not necessarily versus your deposit — you can still end up ahead. It means you have less than you would have by simply holding the two tokens. Trading fees can offset or exceed it on high-volume pools.",
      },
      {
        question: "Which pools have the least impermanent loss?",
        answer:
          "Pairs whose prices stay close together — stablecoin-to-stablecoin or tightly correlated assets — diverge little, so impermanent loss is minimal and fees easily compensate.",
      },
      {
        question: "When does impermanent loss become permanent?",
        answer:
          "The moment you withdraw. Until then, the loss only fully reverses if the two token prices return to their original ratio, which rarely happens exactly.",
      },
      {
        question: "How do I decide if providing liquidity is worth it?",
        answer:
          "Compare expected fee income against expected divergence. High-volume, low-volatility pairs favor the provider; low-volume, high-volatility pairs often do not.",
      },
    ],
    description:
      "Impermanent loss explained: why providing liquidity can underperform holding, a concrete worked example, and when trading fees make it worthwhile.",
  },
  "how-to-connect-metamask-to-a-dex": {
    intro:
      "MetaMask is the most widely used wallet for EVM networks, and connecting it to a decentralized exchange is the gateway to every swap you will make. The process is quick, but a few details — adding the right network, confirming the chain ID, and understanding exactly what a connection authorizes — separate a safe setup from one that leaves you exposed. This guide walks through installing and securing MetaMask, adding networks, connecting to a DEX, and the permissions you actually grant when you click connect.",
    sections: [
      {
        heading: "Install and secure the wallet first",
        body:
          "Install MetaMask only from the official browser extension store or the official mobile app listing, never from a link sent to you. During setup you receive a 12-word recovery phrase. Write it down offline and never type it into any website, form, or message — no legitimate site or support agent will ever ask for it. Anyone with that phrase controls your funds permanently. This single habit prevents the majority of catastrophic wallet losses.",
      },
      {
        heading: "Add the network you want to trade on",
        body:
          "MetaMask ships with Ethereum mainnet. To trade on BNB Chain, Polygon, Arbitrum, Base, or Avalanche you add each network with its chain ID and RPC endpoint. Most DEX interfaces offer a one-click add-network prompt, which is safer than pasting RPC details manually. After adding, confirm the chain ID shown matches the official value for that network (for example, 1 for Ethereum, 56 for BNB Chain, 8453 for Base) so you are not connected to a spoofed network.",
      },
      {
        heading: "Connect to the exchange",
        body:
          "On the swap interface, click connect and choose MetaMask. The wallet opens a prompt showing the site requesting access and the account it will see. Approving this shares only your public address and grants permission for the site to request signatures later — it does not move funds and does not give the site spending power over your tokens. Spending power is granted separately, per token, through approval transactions you confirm individually.",
      },
      {
        heading: "Switching chains mid-session",
        body:
          "When you change the network in the DEX, it asks MetaMask to switch chains, and MetaMask prompts you to confirm. Always glance at the network badge in the wallet header before signing any transaction. A surprising number of failed or confusing swaps come down to the wallet sitting on a different chain than the interface, so the balance you expect simply is not visible.",
      },
      {
        heading: "What you are actually authorizing",
        body:
          "Three distinct actions exist and it helps to keep them separate: connecting (sharing your address, reversible any time by disconnecting), approving a token (granting a router permission to move a specific token, which you should scope to the amount you are trading), and signing a swap (the actual transaction that moves funds). Reviewing each prompt — what it is, which contract it involves, and how much it authorizes — is the core discipline of safe self-custody.",
      },
    ],
    faqs: [
      {
        question: "Does connecting MetaMask give a site access to my funds?",
        answer:
          "No. Connecting only shares your public address and lets the site request signatures. Moving tokens requires a separate approval and a swap transaction that you confirm individually.",
      },
      {
        question: "How do I add a new network safely?",
        answer:
          "Use the DEX's one-click add-network prompt rather than pasting RPC details by hand, then verify the chain ID matches the official value for that network in your wallet header.",
      },
      {
        question: "What if my token balance does not show up?",
        answer:
          "You are almost certainly on the wrong network. Tokens do not move between chains automatically, so switch MetaMask to the chain where the asset actually lives.",
      },
      {
        question: "Will anyone legitimate ask for my recovery phrase?",
        answer:
          "Never. No exchange, wallet, or support agent needs your 12-word phrase. Anyone who asks is attempting to steal your funds.",
      },
    ],
    description:
      "Connect MetaMask to a DEX safely: install and secure the wallet, add networks with the right chain IDs, and understand exactly what a connection and approval authorize.",
  },
  "how-to-connect-a-phantom-wallet-on-solana": {
    intro:
      "Phantom is the most popular wallet for Solana, and connecting it to a decentralized exchange works a little differently from the EVM world. Solana has no separate token-approval step, transactions are simulated before you sign, and priority fees rather than gas auctions determine how quickly your swap lands during congestion. This guide covers setting up Phantom safely, connecting to a Solana DEX, reading the transaction simulation, and managing priority fees so your swaps go through even when the network is busy.",
    sections: [
      {
        heading: "Set up and secure Phantom",
        body:
          "Install Phantom from the official extension store or app listing. As with any self-custody wallet, you receive a recovery phrase during setup — store it offline and never enter it on a website. Phantom addresses use Solana's base58 format, which looks completely different from an Ethereum 0x address. Never send Solana assets to an EVM-style address or vice versa; cross-format mistakes are unrecoverable.",
      },
      {
        heading: "Connect to a Solana DEX",
        body:
          "On the swap interface, choose Phantom from the wallet options. Phantom prompts you to approve the connection, sharing your public Solana address. As on EVM, this does not move funds — it lets the site request transaction signatures. You will sign each swap individually, and Phantom shows you a preview of what the transaction does before you approve it.",
      },
      {
        heading: "Read the transaction simulation",
        body:
          "Before you sign, Phantom simulates the transaction and shows the expected balance changes — which tokens leave your wallet and which arrive. This is one of Solana's best safety features: if the simulated result does not match what you intended (a different token, an unexpected amount, or a drained balance), reject it. A failed simulation usually points to insufficient liquidity, slippage set too tight, or a stale quote rather than a problem with your wallet.",
      },
      {
        heading: "Priority fees and congestion",
        body:
          "Solana does not use the gas-auction model of EVM chains. Instead, during periods of heavy activity — popular token launches, for example — you attach a small priority fee to have validators include your transaction sooner. If a swap repeatedly fails to land during a busy period, raising the priority fee modestly or reducing your trade size usually resolves it. Keep a little SOL in the wallet at all times to cover these fees.",
      },
      {
        heading: "Confirm and verify",
        body:
          "Solana transactions finalize quickly, often in well under a second once they land. After a swap, check your Phantom history or a Solana explorer to confirm the output matches what you expected. Because settlement is fast, the main failure mode is not slow confirmation but a transaction that never lands during congestion — which the priority-fee adjustment above addresses.",
      },
    ],
    faqs: [
      {
        question: "Does Solana have token approvals like Ethereum?",
        answer:
          "No. There is no separate ERC-20-style approval transaction. Instead, Phantom simulates each transaction and shows the balance changes before you sign, so you can reject anything unexpected.",
      },
      {
        question: "Why did my Solana swap fail to confirm?",
        answer:
          "Usually network congestion. Attach or raise a small priority fee, or reduce trade size, and keep some SOL available to pay those fees.",
      },
      {
        question: "Can I send Solana tokens to an Ethereum address?",
        answer:
          "No. Solana uses base58 addresses and EVM uses 0x addresses; the formats are incompatible and sending across them loses the funds. Bridge assets properly instead.",
      },
      {
        question: "What does the transaction simulation show?",
        answer:
          "The expected balance changes — which tokens leave and which arrive. If the preview does not match your intent, reject the transaction.",
      },
    ],
    description:
      "Connect Phantom to swap SPL tokens on Solana: secure the wallet, read the transaction simulation, and manage priority fees during congestion for swaps that actually land.",
  },
  "how-to-buy-meme-coins-safely": {
    intro:
      "Meme coins are the highest-risk corner of crypto trading: thin liquidity, anonymous teams, copycat contracts, and supply that can be dumped on holders without warning. People still trade them, and some do so profitably — but the difference between a calculated speculation and a guaranteed loss is a repeatable risk routine you run before every buy. This guide is that routine: verifying the contract, reading liquidity and holder distribution, sizing a test trade, and recognizing the honeypots and rugs designed to take your money.",
    sections: [
      {
        heading: "Verify the exact contract first",
        body:
          "The number one way people lose money on meme coins is buying an impostor. Anyone can deploy a token with the same name and symbol as a trending coin. Always get the contract or mint address from the project's official channel and compare the entire string before trading — not just the first and last characters, because address-poisoning scams deliberately match the visible ends. If you cannot find an authoritative source for the address, that absence is itself a warning.",
      },
      {
        heading: "Read the liquidity before the price",
        body:
          "A meme coin's chart is meaningless if there is no liquidity to exit into. Check the size of the pool and the 24-hour volume relative to the market cap. A token showing a large notional market cap but only a few thousand dollars of liquidity cannot absorb your exit — you will crater the price selling even a modest position. Liquidity, not market cap, determines whether you can actually get out.",
      },
      {
        heading: "Check holder distribution and permissions",
        body:
          "Look at how supply is distributed. If a handful of wallets hold the majority, those holders can dump on you at any moment. On the contract itself, read the permissions: mint functions (the team can print more supply), blacklist functions (they can block you from selling), and high transfer taxes are all serious red flags. Locked or burned liquidity reduces — but does not eliminate — rug risk; verify the lock and its unlock date rather than trusting a claim.",
      },
      {
        heading: "Detect honeypots with a test trade",
        body:
          "A honeypot lets you buy but not sell. The safest detection is empirical: after a small buy, immediately attempt a small sell to confirm you can exit. Before that, check whether other ordinary wallets have successfully sold the token on-chain. If only the deployer's wallet ever sells, treat it as a trap. Never commit meaningful size until you have proven the exit works.",
      },
      {
        heading: "Size as if it goes to zero",
        body:
          "Even a legitimate meme coin can lose most of its value in hours. Position size is your real risk control: only commit an amount you are fully prepared to lose, and treat your first trade in any new token as a small test. Set a plan for taking profit and cutting losses before you buy, because the emotional pull of a fast-moving chart is precisely what the structure of these tokens is built to exploit.",
      },
    ],
    faqs: [
      {
        question: "What is the single most important meme-coin check?",
        answer:
          "Verifying the full contract address against an official source. Buying a copycat token is the most common and most avoidable way traders lose funds.",
      },
      {
        question: "Why does liquidity matter more than market cap?",
        answer:
          "Market cap is a notional figure; liquidity is what you actually sell into. A token can show a huge cap with almost no liquidity, meaning you cannot exit without collapsing the price.",
      },
      {
        question: "How do I know a token is not a honeypot?",
        answer:
          "Confirm other ordinary wallets have sold it, read the contract for transfer restrictions or blacklist functions, and do a small test sell right after buying.",
      },
      {
        question: "How much should I put into a meme coin?",
        answer:
          "Only what you can afford to lose entirely, and start with a small test position. These tokens can lose most of their value within hours.",
      },
    ],
    description:
      "A risk checklist for buying meme coins safely: verify the contract, read liquidity and holder distribution, detect honeypots with a test trade, and size for total loss.",
  },
  "how-to-sell-tokens-for-usdc": {
    intro:
      "Selling a token into a stablecoin is how most traders lock in a result, and USDC is the most common destination because it holds its value while you decide what to do next. The mechanics are the same as any swap, but a few details specific to exiting into USDC — picking the correct USDC variant, watching price impact on the way out, and confirming the receipt — make the difference between a clean exit and an unpleasant surprise. This guide covers selling any token for USDC cleanly and the traps that catch people on the exit.",
    sections: [
      {
        heading: "Pick the right USDC variant",
        body:
          "USDC is not a single token across all chains. There is native USDC issued directly on a network and bridged USDC that arrived from another chain, and they are different contracts with different liquidity. Selling into the wrong variant can mean a wide spread or a near-empty pool. On each chain, target the variant with the deepest liquidity — usually native USDC where it exists. When in doubt, verify the contract address against an official source rather than trusting the symbol alone.",
      },
      {
        heading: "Watch price impact on the way out",
        body:
          "Exiting a position is where thin liquidity bites hardest, because selling pushes the price down along the pool curve. A token you bought easily in small size can be painful to exit in large size. Check the price impact in the quote before confirming; if it is high, split the sale into smaller clips or route through a deeper intermediate pair. The goal on an exit is to preserve the value you already have, not to chase the last fraction of a percent.",
      },
      {
        heading: "Use the route comparison",
        body:
          "When no deep direct pool exists between your token and USDC, an aggregator may route through the native coin or another stablecoin. Read the route: each hop has its own fee and impact, and the minimum received after all hops is what you actually keep. Compare the net USDC you will receive across routes rather than the headline rate on any single leg.",
      },
      {
        heading: "Mind gas and approvals",
        body:
          "On EVM chains, selling an ERC-20 requires a one-time approval before the swap if you have not traded that token through the router before. Keep enough of the native gas coin available for both the approval and the swap. On Solana there is no approval step, but keep a little SOL for priority fees. Running out of gas mid-exit is a frustrating and avoidable problem.",
      },
      {
        heading: "Confirm the receipt",
        body:
          "After the swap settles, check your wallet or the block explorer to confirm the USDC amount matches the minimum you accepted. If it came in lower, slippage was consumed during confirmation; if it failed, the usual causes are slippage set too tight on a moving market or insufficient gas. For tax purposes, save the transaction hash — selling a token for USDC is frequently a taxable event depending on your jurisdiction.",
      },
    ],
    faqs: [
      {
        question: "Is all USDC the same across chains?",
        answer:
          "No. Native USDC and bridged USDC are different contracts with different liquidity. Target the deepest variant on your chain and verify the contract address rather than trusting the symbol.",
      },
      {
        question: "Why is selling sometimes worse than buying was?",
        answer:
          "Exiting pushes the price down along the pool curve, and thin liquidity amplifies that. Check price impact and split large sales into smaller clips.",
      },
      {
        question: "Do I need gas to sell a token?",
        answer:
          "Yes. On EVM chains you may need a one-time approval plus the swap, both paid in the native gas coin. On Solana keep a little SOL for priority fees.",
      },
      {
        question: "Is selling for USDC a taxable event?",
        answer:
          "In many jurisdictions, yes. Save the transaction hash from the explorer for your records; this content is not tax advice.",
      },
    ],
    description:
      "Exit a position into a stablecoin cleanly: pick the right USDC variant, watch price impact on the way out, compare routes, and confirm the receipt matches your quote.",
  },
  "how-to-verify-a-token-contract-before-trading": {
    intro:
      "The address you trade is the token — not the name, not the logo, not the chart. Symbols and names can be copied freely, so the only reliable way to know you are trading the real asset is to verify its contract or mint address before you swap. This short, high-value routine takes under a minute and prevents the most common irreversible mistake in DeFi: buying a convincing impostor. This guide shows exactly how to confirm you have the right contract and what to look for on the explorer.",
    sections: [
      {
        heading: "Get the address from an authoritative source",
        body:
          "Start from a source you trust: the project's official website, its verified social account, or a reputable data aggregator. Copy the full contract (EVM) or mint (Solana) address from there. Do not copy addresses from random social-media posts, group chats, or search ads — those are the primary distribution channels for scam tokens that reuse popular names.",
      },
      {
        heading: "Compare the entire string",
        body:
          "Address-poisoning attacks generate addresses whose first and last few characters match a legitimate one, betting that you only glance at the ends. Defeat this by comparing the whole address, character by character or by pasting both into a text comparison. In the swap interface, prefer pasting the verified address directly into the token field rather than selecting by symbol from a list, which can contain look-alikes.",
      },
      {
        heading: "Check that the contract is verified and readable",
        body:
          "On the block explorer, a legitimate, established token usually has published, verified source code you can read. Unverified contracts are not automatically malicious, but for anything beyond a household name, the inability to inspect the code is a reason for extra caution. Look at the token's age, transaction history, and number of holders — a brand-new contract with a handful of holders and a spiking price deserves skepticism.",
      },
      {
        heading: "Read the permissions",
        body:
          "Inspect what the contract can do. Mint functions let the team create new supply and dilute holders. Blacklist or pause functions let them block specific wallets from selling. Fee-on-transfer or tax logic can cause swaps to behave unexpectedly. None of these are automatically disqualifying for every token, but each is a risk you should price in consciously rather than discover after you are trapped.",
      },
      {
        heading: "Confirm you can exit",
        body:
          "Finally, verify the token is actually tradable in both directions. Check that ordinary wallets — not just the deployer — have successfully sold it on-chain. The combination of a verified address, readable code, sane permissions, and a proven two-way market is what lets you trade with confidence instead of hope.",
      },
      {
        heading: "Make verification a fixed habit",
        body:
          "Build this into a routine you never skip under time pressure: address from an official source, full-string comparison, a glance at the code and holder count, a read of the permissions, and confirmation of a two-way market. The whole pass takes under a minute. The single time it stops you from approving a convincing impostor pays for every minute you will ever spend on it, because that mistake is irreversible.",
      },
    ],
    faqs: [
      {
        question: "Why is verifying the contract so important?",
        answer:
          "Because names and symbols can be copied. The address is the only reliable identity of a token, and buying a copycat is the most common irreversible mistake in DeFi.",
      },
      {
        question: "What is address poisoning?",
        answer:
          "An attack that creates an address matching the first and last characters of a legitimate one, exploiting traders who only check the ends. Compare the entire string to defeat it.",
      },
      {
        question: "Is an unverified contract always a scam?",
        answer:
          "Not always, but for anything beyond a well-known token, the inability to read the code is a reason for extra caution alongside age, holder count, and permissions.",
      },
      {
        question: "How do I confirm a token is tradable?",
        answer:
          "Check on the explorer that ordinary wallets, not just the deployer, have sold it, and consider a small test trade before committing size.",
      },
    ],
    description:
      "Confirm you are trading the real token: get the contract address from an official source, compare the full string, check verification and permissions, and prove you can exit.",
  },
  "how-to-bridge-assets-between-chains": {
    intro:
      "Bridging moves value from one blockchain to another, and it is unavoidable the moment your tokens live on a different network than the one you want to trade or use. Done carefully it is routine; done carelessly it is one of the easier ways to lose funds, because bridges add their own contracts, relayers, and wrapped-token quirks on top of ordinary swap risk. This guide explains how to bridge safely: choosing a route, budgeting gas on both sides, understanding what arrives, and verifying the transfer completed.",
    sections: [
      {
        heading: "Understand what a bridge actually does",
        body:
          "Most bridges either lock your asset on the source chain and mint a representation on the destination, or use a liquidity network that pays out the equivalent asset on the other side. Either way, there is a waiting period while the bridge confirms the transfer, and there is a destination representation that may differ from the native asset. Knowing which model your route uses tells you what to expect on arrival and what the risks are.",
      },
      {
        heading: "Budget gas on both chains",
        body:
          "You need the native gas coin on the source chain to initiate the bridge, and you frequently need the destination chain's native coin to do anything once funds arrive — including swapping them further. A classic trap is bridging your entire balance and landing with tokens you cannot move because you have no gas on the new chain. Keep a small gas buffer on both sides before you start.",
      },
      {
        heading: "Compare routes by what arrives",
        body:
          "An aggregator can compare bridge routes the same way it compares swaps. Judge them by the net amount you receive on the destination chain and the estimated arrival time, not by the headline bridge fee alone. Some routes swap before bridging and others swap on arrival, which changes the total cost. The minimum received on the destination is the number that matters.",
      },
      {
        heading: "Know your destination token",
        body:
          "What lands on the destination chain may be a wrapped or bridged version of the original asset, with a different contract address and sometimes different decimals. Confirm the arriving token is the representation your downstream app or pool expects. For Solana-to-EVM or EVM-to-Solana routes, also remember the address formats are completely different — never send to the wrong address type.",
      },
      {
        heading: "Verify completion and avoid duplicates",
        body:
          "Bridges are not instant; most configured routes finalize within a few minutes to about fifteen, longer during congestion or outages. While a transfer is in transit, do not submit a second one unless the interface clearly reports failure — duplicate bridges are a common and expensive mistake. Track the status, and verify the arrival on the destination explorer independently of the UI before considering the transfer done. On any unfamiliar route, start with a small test amount.",
      },
    ],
    faqs: [
      {
        question: "Why do I need gas on the destination chain?",
        answer:
          "Bridged funds are useless if you cannot pay for the next transaction. Keep a small amount of the destination chain's native coin so you can swap or transfer after arrival.",
      },
      {
        question: "How long does bridging take?",
        answer:
          "Most configured routes finalize within a few minutes to around fifteen, depending on the provider and network congestion. Solana routes may differ from EVM ones.",
      },
      {
        question: "What arrives on the other chain?",
        answer:
          "Often a wrapped or bridged representation with a different contract address and possibly different decimals. Confirm it matches what your destination app expects.",
      },
      {
        question: "Should I bridge a large amount on a new route first?",
        answer:
          "No. Bridge contracts and relayers carry real risk. Start with a small test amount on any route you have not used before.",
      },
    ],
    description:
      "Bridge assets between chains safely: pick a route by net amount received, budget gas on both sides, know the destination token, and verify completion before trusting the UI.",
  },
  "how-to-calculate-price-impact": {
    intro:
      "Price impact is the amount your own trade moves the market price as it executes, and on automated market makers it is entirely predictable from the pool's math. Understanding it turns a confusing quote into something you can reason about: why a large order returns proportionally fewer tokens, why splitting a trade helps, and why price impact is a different thing from slippage. This guide explains how to calculate price impact with worked intuition, not just a definition, so you can size trades deliberately.",
    sections: [
      {
        heading: "Where price impact comes from",
        body:
          "A standard AMM holds two assets in a pool and keeps the product of their quantities constant. When you buy one asset, you remove it from the pool and add the other, which shifts the ratio and therefore the price. The bigger your trade relative to the pool's reserves, the more the ratio shifts mid-trade, so each successive unit costs more than the last. Price impact is simply the difference between the price at the start of your trade and the average price you actually paid.",
      },
      {
        heading: "An intuitive worked example",
        body:
          "Imagine a pool with 100 ETH and 200,000 USDC, so ETH starts at 2,000 USDC. Buying 1 ETH barely moves the ratio — impact is tiny. Buying 10 ETH removes a tenth of the ETH side, so the price climbs noticeably as you go, and your average cost is meaningfully above 2,000. Buying 50 ETH — half the pool — sends the price soaring and your average cost far above the start. The same dollar trade in a pool ten times larger would show a tenth of the impact. Depth is everything.",
      },
      {
        heading: "How the quote shows it",
        body:
          "Aggregators display price impact as a percentage in the quote. A fraction of a percent means the pool is deep relative to your size. A few percent is a warning that you are a large participant in a small pool. Double-digit impact means you are paying a heavy premium simply for moving the curve, and you should reconsider size, venue, or whether to trade at all.",
      },
      {
        heading: "Price impact is not slippage",
        body:
          "These two are constantly confused. Price impact is deterministic and caused by your own trade size against pool depth — it exists even if you are the only trader. Slippage tolerance is your buffer against other people's activity between signing and confirmation. Widening slippage does nothing to reduce price impact; it only allows a high-impact fill to go through. The cure for high impact is a smaller trade or a deeper pool.",
      },
      {
        heading: "Reducing impact in practice",
        body:
          "Split large orders into smaller clips, ideally spaced so the pool has time to rebalance through arbitrage between them. Use an aggregator that can route across multiple pools or split a single order, which spreads the impact. And check pool depth before sizing — a quick look at reserves or TVL tells you how much you can trade before impact becomes the dominant cost.",
      },
    ],
    faqs: [
      {
        question: "What causes price impact?",
        answer:
          "Your own trade size relative to the pool's reserves. Removing a large fraction of one asset shifts the price along the AMM curve, so larger trades cost progressively more per unit.",
      },
      {
        question: "How much price impact is acceptable?",
        answer:
          "A fraction of a percent is healthy. A few percent is a warning that your size is large for the pool. Double-digit impact means you are paying a heavy premium and should reduce size or change venue.",
      },
      {
        question: "Does raising slippage reduce price impact?",
        answer:
          "No. Slippage protects against others' activity before confirmation; price impact comes from your own trade. Raising slippage only lets a high-impact fill through.",
      },
      {
        question: "How do I lower price impact?",
        answer:
          "Trade smaller clips, use a deeper pool, or use an aggregator that splits the order across venues. Check pool depth before sizing.",
      },
    ],
    description:
      "Price impact explained with worked intuition: how trade size moves the AMM curve, how the quote shows it, why it differs from slippage, and how to keep it under control.",
  },
  "how-to-revoke-token-approvals": {
    intro:
      "Every time you let a router move an ERC-20 token, you grant an allowance that stays active until you change it. Over months of trading, these standing permissions accumulate, and any contract you ever approved with an unlimited allowance remains able to move that token — including if it is later upgraded maliciously or compromised. Revoking approvals you no longer need is the cheapest, highest-leverage security habit in DeFi. This guide explains how allowances work, how to audit them, and how to revoke the ones that are dead weight.",
    sections: [
      {
        heading: "What an approval actually grants",
        body:
          "An ERC-20 approval authorizes a specific spender contract to move up to a set amount of one token from your wallet. Many interfaces default to an unlimited allowance for convenience, so you only approve once. The trade-off is that an unlimited approval is a permanent standing key: the approved contract can move that token at any future time, up to the limit, without asking again. If that contract is exploited later, your approval is the door it walks through.",
      },
      {
        heading: "Exact vs unlimited allowances",
        body:
          "Whenever your wallet offers the choice, approve the exact amount you are about to trade rather than unlimited. This means an extra approval next time, but it eliminates the standing risk between trades. For tokens or routers you use constantly you might accept an unlimited approval for convenience — just make a habit of reviewing those periodically rather than letting them pile up forgotten.",
      },
      {
        heading: "Audit your existing approvals",
        body:
          "Use a reputable allowance-checker tool or your wallet's built-in permissions view to list every active approval per chain: which token, which spender, and how much. You will likely find approvals to contracts you used once and forgot. Treat anything you no longer recognize or use as a candidate for revocation. Do this per network, since approvals are chain-specific.",
      },
      {
        heading: "Revoke what you do not need",
        body:
          "Revoking is itself an on-chain transaction that sets the allowance back to zero, so it costs gas. Prioritize revoking unlimited approvals on tokens that hold real value and approvals to contracts you do not trust or recognize. You do not need to revoke everything constantly — a periodic cleanup, plus preferring exact approvals going forward, keeps your exposure small.",
      },
      {
        heading: "Build it into your routine",
        body:
          "Set a recurring reminder — quarterly is reasonable for active traders — to review allowances across the chains you use. Combine that with never signing an approval or message you do not understand, and revoking promptly if you ever interact with a contract that later turns out to be suspect. These habits cost a little gas and a few minutes, and they prevent the kind of loss that no amount of trading skill can recover.",
      },
    ],
    faqs: [
      {
        question: "Why are unlimited approvals risky?",
        answer:
          "They are a standing permission: the approved contract can move that token at any time up to the limit. If the contract is later exploited or upgraded maliciously, your approval is the path it uses.",
      },
      {
        question: "Should I always approve the exact amount?",
        answer:
          "For most trades, yes — it removes the standing risk between trades at the cost of an extra approval next time. For constantly-used routers you might accept unlimited, but review those periodically.",
      },
      {
        question: "How do I see my active approvals?",
        answer:
          "Use a reputable allowance-checker or your wallet's permissions view, per chain, to list each token, spender, and allowance amount.",
      },
      {
        question: "Does revoking cost money?",
        answer:
          "Yes, revoking is an on-chain transaction that costs gas. Prioritize unlimited approvals on valuable tokens and approvals to contracts you no longer trust.",
      },
    ],
    description:
      "Unlimited ERC-20 allowances are a standing risk. Learn how approvals work, how to audit active allowances per chain, and how to revoke the ones you no longer need.",
  },
  "how-to-pay-swap-fees-in-usdc": {
    intro:
      "On supported chains, XAUConnect lets you pay the platform fee in USDC instead of the native gas token. It is a small convenience with a real benefit: you do not have to keep dust amounts of every chain's native coin solely to cover platform fees, and your costs are easier to track when they are denominated in a stablecoin. This guide explains what paying fees in USDC does and does not change, when it helps, and how it interacts with the gas you still owe the network.",
    sections: [
      {
        heading: "Two different costs on every swap",
        body:
          "It helps to separate the two costs again. Network gas is paid to the chain's validators to include your transaction, and it must be paid in that chain's native coin — there is no way around that, because it is a protocol-level requirement. The platform fee is what the aggregator charges for its service, and that is the fee XAUConnect can let you pay in USDC where supported. Paying fees in USDC changes the second cost, not the first.",
      },
      {
        heading: "What it changes",
        body:
          "When you opt to pay the platform fee in USDC, the fee is deducted in the stablecoin rather than skimmed from the native asset. The practical upshot is that you do not need to hold extra native coin beyond what is required for gas, and your fee accounting stays in a stable unit. For traders who already hold USDC on a chain, this is simpler than maintaining a separate native-coin buffer for fees.",
      },
      {
        heading: "When it helps most",
        body:
          "Paying fees in USDC is most useful on chains where you do not want to hold much of the native asset, or when you are doing a series of trades and prefer consistent stablecoin-denominated costs. It is also convenient right after bridging into a chain, when you may have stablecoins but only a thin native balance. It is a quality-of-life feature rather than a way to reduce total cost.",
      },
      {
        heading: "You still need gas",
        body:
          "The most important caveat: paying the platform fee in USDC does not remove the need for the native gas coin. You still need enough of the chain's native asset to pay for the swap transaction itself, and on EVM chains for any token approval. Plan a small native-coin balance regardless. Running out of gas will block the transaction no matter how your platform fee is denominated.",
      },
      {
        heading: "A practical workflow",
        body:
          "In practice, treat the native coin as your gas reserve and USDC as your working balance. Keep a small amount of the chain's native asset topped up for transactions, hold your tradable capital and fees in USDC, and enable USDC fee payment where the chain supports it. This keeps your accounting in a stable unit while ensuring a transaction is never blocked for lack of gas — the combination that makes the feature genuinely convenient rather than a trap.",
      },
    ],
    faqs: [
      {
        question: "Does paying fees in USDC remove gas costs?",
        answer:
          "No. Network gas must be paid in the chain's native coin — it is a protocol requirement. Paying fees in USDC only changes how the platform fee is charged.",
      },
      {
        question: "When should I pay the platform fee in USDC?",
        answer:
          "When you would rather not hold much native coin, when you want stablecoin-denominated cost tracking, or right after bridging when you hold USDC but little native asset.",
      },
      {
        question: "Is paying in USDC cheaper overall?",
        answer:
          "It is a convenience feature, not a discount. Total cost is similar; the benefit is not needing a separate native-coin buffer for fees.",
      },
      {
        question: "Is this available on every chain?",
        answer:
          "It is available on supported chains. Where it is not, the platform fee is taken in the native asset as usual.",
      },
    ],
    description:
      "On supported chains XAUConnect lets you pay the platform fee in USDC instead of native gas. What it changes, when it helps, and why you still need a native gas balance.",
  },
  "how-to-read-pool-liquidity-and-depth": {
    intro:
      "Liquidity depth is the quiet variable behind every quote you see. It determines how much you can trade before price impact bites, whether a token is safe to exit, and how trustworthy a chart really is. Learning to read reserves, total value locked, and volume turns liquidity from an abstract word into a number you can size against. This guide explains what depth means, how to read it before a trade, and how to use it to avoid the thin pools where most avoidable losses happen.",
    sections: [
      {
        heading: "What liquidity depth means",
        body:
          "Depth is the amount of capital sitting in a pool ready to trade against. A deep pool can absorb large orders with little price movement; a shallow one lurches on modest trades. Depth is why the same dollar trade can be frictionless on one pair and ruinous on another. When you size a position, you are really sizing it against the pool's depth, not against the token's headline market cap.",
      },
      {
        heading: "Reserves and total value locked",
        body:
          "The clearest measure is the pool's reserves — how much of each token it holds — and the total value locked, which is the combined dollar value. A pool with millions in reserves can handle large trades; one with a few thousand dollars cannot absorb even a modest order without heavy price impact. Always relate your intended trade size to the reserves: a good rule of thumb is to stay well under a single-digit percentage of the relevant side.",
      },
      {
        heading: "Volume tells you if depth is real",
        body:
          "Reserves show capacity; 24-hour volume shows whether the pool is actually used. A pool with deep reserves but almost no volume may have stale liquidity that vanishes the moment you try to trade size. High, consistent volume relative to liquidity suggests active market makers who will rebalance the pool — meaning spreads stay tight and your exit is more reliable.",
      },
      {
        heading: "Why thin pools are dangerous",
        body:
          "Shallow liquidity is where honeypots, rugs, and brutal price impact concentrate. A token can display a large market cap while only a few thousand dollars back the price; that cap is fictional for trading purposes because you cannot exit into it. Before trusting any chart, check that there is enough depth to support both your entry and your exit at the size you intend.",
      },
      {
        heading: "Use depth to size every trade",
        body:
          "Make reading depth a pre-trade habit: glance at reserves and volume in Discover, compare them to your trade size, and split or shrink the order if you would be a large fraction of the pool. Depth also changes over time — bridge inflows, large withdrawals, and weekend lulls all move it — so check it close to when you trade rather than relying on a number from yesterday.",
      },
    ],
    faqs: [
      {
        question: "What is the difference between liquidity and market cap?",
        answer:
          "Market cap is price times supply, a notional figure. Liquidity is the capital actually in the pool you trade against. You can only exit into liquidity, not into market cap.",
      },
      {
        question: "How much of a pool can I safely trade?",
        answer:
          "As a rule of thumb, stay well under a single-digit percentage of the relevant reserve side. Larger fractions cause heavy price impact along the AMM curve.",
      },
      {
        question: "Why check volume as well as reserves?",
        answer:
          "Reserves show capacity; volume shows the pool is actually used and that market makers are present. Deep reserves with no volume can mean stale, unreliable liquidity.",
      },
      {
        question: "Does liquidity change over time?",
        answer:
          "Yes. Bridge inflows, large withdrawals, and quiet periods all move depth, so check it close to when you trade rather than relying on older figures.",
      },
    ],
    description:
      "Liquidity depth determines how much you can trade before price impact bites. How to read reserves, TVL, and volume before sizing a position and avoid dangerous thin pools.",
  },
  "what-is-an-automated-market-maker-amm": {
    intro:
      "An automated market maker, or AMM, is the engine behind most decentralized exchanges. Instead of matching buyers to sellers through an order book, it lets you trade against a pool of tokens using a mathematical formula that sets the price automatically. That single design choice is what makes permissionless, always-on, on-chain trading possible. This article explains how AMMs work, the constant-product math at their core, why prices move with every trade, and what the people who supply the pools actually earn.",
    sections: [
      {
        heading: "No order book, just a pool",
        body:
          "A traditional exchange maintains an order book of bids and asks and matches them. An AMM has no order book. Instead, liquidity providers deposit two tokens into a shared pool, and traders swap against that pool. A formula decides the exchange rate based purely on the ratio of tokens in the pool. There is no counterparty waiting to take the other side of your trade — the pool itself is the counterparty, and it is always open.",
      },
      {
        heading: "The constant-product formula",
        body:
          "The most common AMM keeps the product of the two token quantities constant: multiply the amount of token A by the amount of token B and that number stays fixed through every trade. When you buy token A, you remove some from the pool and add token B; to keep the product constant, the price of A rises. This simple rule produces a smooth pricing curve that always quotes a price, no matter how large or small the trade.",
      },
      {
        heading: "Why prices move on every trade",
        body:
          "Because price depends on the ratio of reserves, every trade changes the price for the next trader. Small trades against a deep pool barely move it; large trades move it a lot. This is the source of price impact, and it is why quotes expire — other people's trades change the ratio between the moment you preview and the moment you sign. It is also what arbitrageurs exploit to keep AMM prices in line with the wider market.",
      },
      {
        heading: "What liquidity providers earn",
        body:
          "Providers deposit tokens and earn a share of the trading fees the pool charges on every swap, proportional to their share of the pool. The catch is impermanent loss: when the two token prices diverge, providers end up with less value than if they had simply held the tokens. Whether providing liquidity pays depends on whether fee income outruns that divergence, which is why stable, high-volume pairs are generally friendlier to providers than volatile ones.",
      },
      {
        heading: "Variations on the theme",
        body:
          "Newer AMMs refine the basic model. Concentrated-liquidity designs let providers focus their capital in a price range for greater efficiency, and stable-swap curves are tuned for assets meant to trade near parity, giving very tight spreads between stablecoins. The core idea is the same throughout: a formula and a pool replace the order book, and an aggregator like XAUConnect reads across these pools to find your best route.",
      },
    ],
    faqs: [
      {
        question: "How does an AMM set prices without an order book?",
        answer:
          "A formula based on the ratio of tokens in the pool sets the price. Trading shifts the ratio, which moves the price automatically — no buyers and sellers need to be matched.",
      },
      {
        question: "What is the constant-product formula?",
        answer:
          "It keeps the product of the two token quantities fixed. Buying one token raises its price so the product stays constant, producing a smooth curve that always quotes a price.",
      },
      {
        question: "Why do AMM prices change with every trade?",
        answer:
          "Because price depends on reserve ratios. Each trade changes the ratio, so it moves the price for the next trader — the source of price impact and why quotes expire.",
      },
      {
        question: "What do liquidity providers earn?",
        answer:
          "A share of trading fees proportional to their stake, offset by impermanent loss when token prices diverge. High-volume, low-volatility pools favor providers.",
      },
    ],
    description:
      "AMMs replace order books with liquidity pools and a pricing formula. Constant-product math, why prices move per trade, and what liquidity providers actually earn.",
  },
  "what-is-a-liquidity-pool": {
    intro:
      "A liquidity pool is the reserve of tokens that an automated market maker trades against. Every swap you make on a decentralized exchange is really a trade with a pool, not with another person. Understanding pools — how they are funded, how fees work, and how depth shapes the price you get — is foundational to everything else in DeFi trading. This article explains what a pool is, who fills it, and why its depth is the most important number behind your quote.",
    sections: [
      {
        heading: "What a pool actually is",
        body:
          "A liquidity pool is a smart contract holding two tokens that traders swap between. Anyone can become a liquidity provider by depositing both tokens in the required ratio; in return they receive pool tokens representing their share. Those deposits are the reserves the AMM formula uses to quote prices. When you swap, you add one token to the pool and remove the other, and the pool's balances adjust accordingly.",
      },
      {
        heading: "Who funds pools and why",
        body:
          "Liquidity providers fund pools to earn a cut of the trading fees. Every swap charges a small fee that is distributed to providers in proportion to their share. For a high-volume pair, those fees can be a meaningful yield. The risk they accept in exchange is impermanent loss — ending up with less value than simply holding when the two token prices move apart — so providing liquidity is a trade-off, not free income.",
      },
      {
        heading: "Depth determines your price",
        body:
          "The amount of capital in a pool — its depth — decides how much your trade moves the price. Deep pools absorb large orders with minimal impact; shallow pools lurch on small ones. This is why the same token can be cheap to trade in one pool and punishing in another, and why checking depth before sizing a trade matters more than glancing at the token's market cap.",
      },
      {
        heading: "Fees and fee tiers",
        body:
          "Pools charge a swap fee, and many protocols offer multiple fee tiers for the same pair — lower tiers for stable, predictable pairs and higher tiers for volatile ones to compensate providers for greater risk. The fee is part of your cost on every trade and is separate from any aggregator platform fee and from network gas. An aggregator compares pools across fee tiers and protocols to find the best net result.",
      },
      {
        heading: "Pools and routing",
        body:
          "When no direct pool exists between the two tokens you want to trade, an aggregator routes through one or more intermediate pools — for example, your token to a stablecoin, then the stablecoin to your target. Each pool in the path contributes its own fee and price impact. Reading the route shows you which pools your trade touches, and the minimum received reflects the combined effect of all of them.",
      },
    ],
    faqs: [
      {
        question: "What is a liquidity pool in simple terms?",
        answer:
          "A smart contract holding two tokens that traders swap between. When you swap, you trade against the pool's reserves rather than against another person.",
      },
      {
        question: "How do liquidity providers make money?",
        answer:
          "They earn a share of swap fees proportional to their stake in the pool, accepting impermanent-loss risk when the two token prices diverge.",
      },
      {
        question: "Why does pool depth matter to me as a trader?",
        answer:
          "Depth determines how much your trade moves the price. Deep pools absorb large orders cheaply; shallow pools cause heavy price impact even on modest trades.",
      },
      {
        question: "What happens when there is no direct pool?",
        answer:
          "An aggregator routes through intermediate pools, each adding its own fee and impact. The minimum received reflects the combined cost of the whole path.",
      },
    ],
    description:
      "Liquidity pools are the reserves AMMs trade against. How deposits, fees, and reserves work, who funds them, and why pool depth determines the price you actually get.",
  },
  "slippage-vs-price-impact-what-s-the-difference": {
    intro:
      "Slippage and price impact are the two terms traders confuse most, and the confusion costs money. They sound similar and both affect the output of a swap, but they come from completely different sources and have completely different fixes. Getting them straight is one of the highest-return pieces of knowledge in DeFi: it tells you when to adjust a setting, when to shrink a trade, and when a poor quote is your own size talking. This article draws the line clearly and shows how the two interact on a real swap.",
    sections: [
      {
        heading: "Price impact: caused by you",
        body:
          "Price impact is the price movement your own trade creates by shifting the pool's token ratio. It is deterministic and depends only on your trade size relative to pool depth — it would exist even if you were the only trader in the world. Buy a large fraction of a pool and the price climbs as you go; that gap between the starting price and your average fill is price impact. The fix is structural: trade less per transaction, use a deeper pool, or split across venues.",
      },
      {
        heading: "Slippage: caused by everyone else",
        body:
          "Slippage tolerance is the buffer you set for price movement between the moment you sign and the moment the transaction confirms. In that window, other people's trades change the pool, and your realized price can drift from the quote. Slippage tolerance is the maximum drift you will accept before the contract reverts to protect you. It is not caused by your size; it is caused by the time delay and the activity of others.",
      },
      {
        heading: "Why the distinction matters",
        body:
          "Because the fixes are opposite. If a quote shows high price impact, raising slippage does nothing useful — it just lets the bad fill through. The right response is a smaller trade. If a trade keeps failing on a volatile but deep pair, that is a slippage problem, and nudging tolerance up slightly is the right response. Misdiagnosing one as the other leads people to widen slippage on thin pools, which is exactly how they get sandwiched.",
      },
      {
        heading: "How they interact on a real swap",
        body:
          "On a large trade in a thin pool, you face both at once: heavy price impact from your size, plus exposure to slippage during confirmation. The combination can be brutal. The disciplined play is to reduce size until price impact is acceptable, then set slippage just wide enough to confirm reliably. Tackling the two separately — size for impact, tolerance for drift — produces far better fills than fiddling with a single number.",
      },
    ],
    faqs: [
      {
        question: "Is slippage the same as price impact?",
        answer:
          "No. Price impact comes from your own trade size against pool depth; slippage tolerance is your buffer against other traders' activity between signing and confirmation.",
      },
      {
        question: "When should I lower my trade size instead of raising slippage?",
        answer:
          "Whenever the quote shows high price impact. That is a size-versus-depth problem; raising slippage only permits the poor fill rather than improving it.",
      },
      {
        question: "When is adjusting slippage the right move?",
        answer:
          "When a trade on a deep but volatile pair keeps failing. Nudge tolerance up slightly so the contract does not revert on normal price drift.",
      },
      {
        question: "Why is widening slippage on a thin pool dangerous?",
        answer:
          "It signals how much room a sandwich attacker has and lets a high-impact fill go through. Shrink the trade instead.",
      },
    ],
    description:
      "Slippage is a tolerance you set against others' activity; price impact is what your own size does to the pool. How they differ, why it matters, and how they interact.",
  },
  "what-is-a-token-approval-and-why-does-it-matter": {
    intro:
      "Before a decentralized exchange can move your ERC-20 tokens, you have to grant it permission through an approval. This small, easy-to-overlook step is one of the most important security surfaces in DeFi: approvals are how routers swap your tokens, and they are also how drained wallets get drained. Understanding what an approval grants, the difference between exact and unlimited allowances, and why stale approvals are a standing risk turns a confusing extra transaction into a deliberate security decision.",
    sections: [
      {
        heading: "Why approvals exist",
        body:
          "ERC-20 tokens do not let arbitrary contracts move them by default. For a router to execute your swap, it must be authorized to transfer the specific token on your behalf. That authorization is the approval: a transaction that sets an allowance — a maximum amount the spender contract may move. Native coins like ETH or BNB need no approval because they are not ERC-20 tokens; only tokens require this step, and only the first time you trade them through a given router.",
      },
      {
        heading: "Exact vs unlimited allowances",
        body:
          "Many interfaces default to an unlimited allowance so you only approve once. The convenience is real, but so is the risk: an unlimited approval is a permanent standing permission. If the approved contract is later compromised or was malicious to begin with, it can move that token from your wallet up to the limit, without prompting you again. Approving the exact amount you intend to trade closes that window at the cost of an extra approval next time.",
      },
      {
        heading: "Why stale approvals are dangerous",
        body:
          "Approvals do not expire on their own. Over time you accumulate allowances to dozens of contracts, many of which you used once and forgot. Each is a door that remains unlocked. The largest DeFi losses for ordinary users often trace back not to a bad trade but to an old unlimited approval on a contract that was later exploited. The allowance you forgot about is exactly the one an attacker uses.",
      },
      {
        heading: "Managing approvals well",
        body:
          "Prefer exact approvals for tokens that hold real value. Periodically audit your active allowances per chain with a reputable checker and revoke the ones you no longer need — revoking sets the allowance back to zero. And never approve a transaction or sign a message you do not understand; drainer sites rely on users clicking through prompts without reading what permission they are granting.",
      },
      {
        heading: "Approvals are not the same as signatures",
        body:
          "One more distinction worth internalizing: an on-chain approval is a transaction that costs gas and sets a token allowance, while a signed message is an off-chain signature that costs nothing but can also authorize actions — including, on some token standards, gasless permit approvals. Drainers increasingly abuse signature prompts precisely because they look harmless. Read what a signature requests as carefully as a transaction, and reject anything whose purpose you cannot state plainly.",
      },
    ],
    faqs: [
      {
        question: "Why does my swap need an approval transaction?",
        answer:
          "ERC-20 tokens require explicit authorization before a router can move them. The approval grants that permission; native coins like ETH skip it.",
      },
      {
        question: "Should I approve unlimited or exact amounts?",
        answer:
          "Exact is safer for valuable tokens because it closes the standing risk between trades. Unlimited is convenient but leaves a permanent permission you must remember to review.",
      },
      {
        question: "Do approvals expire?",
        answer:
          "No. They remain active until you revoke them, which is why old unlimited approvals are a common path for wallet drains after a contract is compromised.",
      },
      {
        question: "How do I stay safe with approvals?",
        answer:
          "Prefer exact allowances, audit and revoke stale ones periodically, and never sign an approval or message you do not understand.",
      },
    ],
    description:
      "Before a router can move your ERC-20s it needs an approval. How allowances work, the risk of unlimited approvals, why stale ones are dangerous, and safer alternatives.",
  },
  "what-is-mev-and-how-does-sandwiching-work": {
    intro:
      "MEV — maximal extractable value — is the profit that can be captured by controlling the order of transactions in a block. On public blockchains your pending swap is visible before it confirms, and specialized actors compete to reorder, insert, or front-run transactions for gain. The most common form ordinary traders meet is the sandwich attack. This article explains where MEV comes from, how a sandwich works step by step, and the concrete habits that reduce your exposure.",
    sections: [
      {
        heading: "Where MEV comes from",
        body:
          "When you submit a transaction on most EVM chains, it sits in a public mempool waiting to be included in a block. Whoever builds the block decides the order of transactions in it. That ordering power has value: by placing transactions before or after yours, a searcher can profit from the price movement your trade will cause. MEV is the umbrella term for all such value, from benign arbitrage that keeps prices aligned to predatory tactics aimed at your trade.",
      },
      {
        heading: "How a sandwich attack works",
        body:
          "A sandwich targets a swap with loose slippage. The attacker sees your pending buy, places their own buy immediately before it (front-run), which pushes the price up. Your trade then executes at the inflated price, pushing it higher still. The attacker immediately sells right after your trade (back-run), pocketing the difference. You are the filling: you paid more than you should have, and the gap you lost is exactly the room your slippage tolerance allowed.",
      },
      {
        heading: "Why slippage settings matter here",
        body:
          "A sandwich is only profitable up to the slippage you authorized — that tolerance defines the maximum the attacker can extract. Setting slippage as tight as the pool allows shrinks or eliminates the profit, often making your trade not worth attacking. This is the practical reason the slippage guides warn against maxing out tolerance: a loose setting is an open invitation written in your own transaction.",
      },
      {
        heading: "How to reduce your exposure",
        body:
          "Keep slippage tight, especially on large or liquid trades where the dollar profit from a sandwich is highest. Split big orders into smaller clips so no single trade offers an attractive target. Where available, use private transaction routes or MEV-protected submission that keep your trade out of the public mempool until it is included. And re-quote before signing — a fresh, tight quote leaves less room than a stale, loose one.",
      },
      {
        heading: "MEV is not unique to one chain",
        body:
          "Although sandwiching is most associated with public-mempool EVM chains, transaction-ordering value exists wherever there is a profit in sequencing trades — Solana included, where it takes different forms. The defenses generalize: minimize the room your own transaction offers, avoid broadcasting large, loose orders into a fully public queue, and prefer execution paths that reduce how visible and exploitable your pending trade is. The goal is never to be the easiest target in the block.",
      },
    ],
    faqs: [
      {
        question: "What is MEV in simple terms?",
        answer:
          "The profit available from controlling the order of transactions in a block. It ranges from harmless arbitrage to predatory tactics like sandwich attacks aimed at your trade.",
      },
      {
        question: "How does a sandwich attack work?",
        answer:
          "An attacker buys just before your trade to push the price up, lets your trade fill at the worse price, then sells right after — capturing the difference your slippage allowed.",
      },
      {
        question: "How do I protect myself from sandwiching?",
        answer:
          "Keep slippage tight, split large trades, use MEV-protected or private submission where available, and re-quote before signing.",
      },
      {
        question: "Does MEV exist on every chain?",
        answer:
          "It is most associated with public-mempool EVM chains. Different networks and submission methods change how exposed your trade is, but ordering value exists broadly.",
      },
    ],
    description:
      "MEV, front-running, and sandwich attacks explained: how public mempools expose your pending swap, how a sandwich profits from your slippage, and what reduces the risk.",
  },
  "gas-fees-explained-across-chains": {
    intro:
      "Gas is what you pay the network to process your transaction, and it works differently enough across chains that a habit which is cheap on one can be expensive on another. Understanding gas — base fees, priority fees, and why a failed transaction still costs money — helps you time trades, avoid getting stuck, and choose the right network for a given trade size. This article explains the gas model on Ethereum, layer-2 networks, and Solana, and how each shapes your real cost.",
    sections: [
      {
        heading: "What gas actually pays for",
        body:
          "Every transaction consumes computational work that validators perform and are compensated for. Gas is the unit of that work, and your fee is the gas used multiplied by a price you pay per unit. Crucially, gas is paid in the chain's native coin and is largely independent of your trade size — a swap costs roughly the same in gas whether you move a hundred dollars or a hundred thousand. That is why small trades feel gas-heavy and large trades barely notice it.",
      },
      {
        heading: "Ethereum mainnet: base fee plus tip",
        body:
          "Ethereum uses a base fee that adjusts automatically with network demand, plus an optional priority tip to encourage faster inclusion. During quiet periods fees are modest; during NFT mints, token launches, or macro volatility they spike sharply. For small trades on mainnet, gas can exceed the value of the trade itself, which is a strong reason to use a layer 2 for routine activity and reserve mainnet for size.",
      },
      {
        heading: "Layer 2s: cheaper execution, anchored to Ethereum",
        body:
          "Networks like Arbitrum and Base execute transactions cheaply and post data back to Ethereum for security. Their gas is a fraction of mainnet's, which makes frequent trading and small sizes practical. Fees still fluctuate with their own congestion, and they are paid in ETH on those networks. For most retail-sized swaps, an L2 offers the best balance of cost and security.",
      },
      {
        heading: "Solana: priority fees instead of auctions",
        body:
          "Solana charges a very low base fee and adds a priority fee during congestion to determine inclusion order, rather than running a gas auction. Most of the time fees are negligible; during hot mints, raising the priority fee modestly is what gets your transaction included. Keep a little SOL on hand at all times so a swap is never blocked for lack of fee budget.",
      },
      {
        heading: "Why failed transactions still cost gas",
        body:
          "A transaction that reverts — because slippage was too tight, liquidity moved, or it ran out of gas — still consumed validator work up to the point of failure, so on most EVM chains you still pay. This is why setting slippage sensibly and keeping a gas buffer matters: avoidable failures are avoidable costs. Before resubmitting a stuck transaction, check the explorer, because a duplicate can compound the expense.",
      },
    ],
    faqs: [
      {
        question: "Does gas depend on how much I trade?",
        answer:
          "Largely no. Gas pays for computation, which is similar regardless of trade value, so small trades feel gas-heavy while large trades barely notice it.",
      },
      {
        question: "Why is Ethereum mainnet sometimes so expensive?",
        answer:
          "Its base fee rises with demand and spikes during mints and volatility. For small or frequent trades, a layer 2 is usually far cheaper.",
      },
      {
        question: "How is Solana gas different?",
        answer:
          "Solana uses a tiny base fee plus an optional priority fee during congestion rather than an auction. Keep some SOL available so transactions are never blocked.",
      },
      {
        question: "Why did I pay gas for a failed transaction?",
        answer:
          "Because validators performed work up to the failure point. Set slippage sensibly and keep a gas buffer to avoid paying for avoidable reverts.",
      },
    ],
    description:
      "What you actually pay to transact on Ethereum, layer 2s, and Solana: base fees, priority fees, why gas is roughly fixed per trade, and why failed transactions still cost.",
  },
  "how-do-cross-chain-bridges-work": {
    intro:
      "Cross-chain bridges are the infrastructure that lets value move between otherwise isolated blockchains. They make multi-chain trading possible, but they are also among the most security-sensitive components in crypto, having been the target of some of the largest exploits on record. Understanding how bridges work — the main designs, the trade-offs of each, and what to verify before you use one — is essential before you move funds across networks. This article explains the mechanics in plain terms.",
    sections: [
      {
        heading: "The core problem bridges solve",
        body:
          "Blockchains cannot natively read each other's state. An asset on Ethereum has no inherent existence on Solana or Arbitrum. A bridge creates a trustworthy link: it observes that you locked or burned an asset on the source chain and causes an equivalent asset to appear on the destination. The challenge is doing this securely without a central party simply promising the funds are there.",
      },
      {
        heading: "Lock-and-mint and burn-and-release",
        body:
          "The most common model locks your asset in a contract on the source chain and mints a wrapped representation on the destination. To go back, the wrapped token is burned and the original is released. The wrapped asset is only as trustworthy as the bridge holding the locked collateral — if that contract is exploited, the wrapped token can lose its backing. This is the design behind many bridged-token tickers you see on destination chains.",
      },
      {
        heading: "Liquidity-network bridges",
        body:
          "An alternative uses pools of the same asset on both chains. You deposit on the source side and a relayer pays you out from the destination pool, rebalancing later. These can be faster and avoid minting new wrapped assets, but they depend on sufficient liquidity on the destination and on the honesty and solvency of the relayer network. Many modern aggregated routes combine these mechanisms.",
      },
      {
        heading: "Where the risk lives",
        body:
          "Bridges concentrate risk in their validators or relayers and in the contracts holding locked funds. Historically, the largest crypto thefts have been bridge exploits, because a single compromised bridge can hold enormous collateral. This is separate from ordinary DEX risk — you are trusting the bridge's security model in addition to the pools you trade in. Treat bridge selection as a security decision, not just a price comparison.",
      },
      {
        heading: "What to verify before bridging",
        body:
          "Use established routes with a track record. Confirm the destination token is the representation your downstream app expects, including its contract address and decimals. Budget gas on both chains. Start with a small test amount on any unfamiliar route, do not submit duplicate transfers while one is in transit, and verify arrival on the destination explorer before considering the transfer complete. An aggregator that compares bridge routes by net received and arrival time helps you avoid the worst options.",
      },
    ],
    faqs: [
      {
        question: "How does a bridge move my tokens?",
        answer:
          "Typically by locking or burning the asset on the source chain and minting or releasing an equivalent on the destination, or by paying you from a destination liquidity pool via a relayer.",
      },
      {
        question: "Why are bridges considered risky?",
        answer:
          "They concentrate large amounts of collateral in contracts and rely on validators or relayers. Historically they have been the target of some of the biggest exploits in crypto.",
      },
      {
        question: "What is a wrapped token?",
        answer:
          "A representation minted on the destination chain backed by the original asset locked on the source chain. Its value depends on the bridge securely holding that backing.",
      },
      {
        question: "How do I bridge more safely?",
        answer:
          "Use established routes, verify the destination token, budget gas on both sides, test with a small amount first, and confirm arrival on the explorer before trusting the UI.",
      },
    ],
    description:
      "Bridges move value between networks via lock-and-mint, burn-and-release, or liquidity networks. The designs, the trade-offs, where the risk lives, and what to verify.",
  },
  "meme-coin-risks-every-trader-should-know": {
    intro:
      "Meme coins occupy the most volatile and adversarial part of the market. Some deliver outsized returns; far more go to zero, and a meaningful share are designed from the start to take your money. Trading them is a legitimate choice, but only with clear eyes about the specific risks involved. This article lays out the structural dangers — thin liquidity, copycat contracts, insider supply, and rug pulls — and the discipline that lets you participate without being a guaranteed exit liquidity for someone else.",
    sections: [
      {
        heading: "Thin liquidity cuts both ways",
        body:
          "Most meme coins launch with shallow pools. Thin liquidity is what produces the explosive upside moves that attract attention, but it is also what traps you on the way out: selling even a modest position can collapse the price. A chart that looks parabolic may be unsellable at size. Before buying, judge the pool depth and volume, not the price action, and assume your exit will be worse than your entry.",
      },
      {
        heading: "Copycat contracts and ticker collisions",
        body:
          "Because anyone can name a token anything, scammers deploy impostors with the exact name and symbol of a trending coin and seed a little liquidity to catch search traffic. Buying the wrong contract is the most common meme-coin loss. Always trade by the full verified address from an official source, comparing the entire string, not just the ends that poisoning attacks deliberately match.",
      },
      {
        heading: "Insider supply and unlocks",
        body:
          "Check how supply is distributed. If a few wallets hold most of the tokens, those insiders can dump on the market at any moment, and you are the buyer they sell into. Scheduled unlocks of team or early-investor allocations create the same pressure on a timer. Concentrated holdings and opaque distribution are among the clearest warnings that the deck is stacked against later buyers.",
      },
      {
        heading: "Rugs and honeypots",
        body:
          "A rug pull is when liquidity is removed or the team abandons the project, leaving holders with worthless tokens. A honeypot is a contract engineered so you can buy but not sell. Defenses include verifying that liquidity is locked or burned (and checking the unlock date), reading the contract for mint, blacklist, or high-tax functions, confirming ordinary wallets have sold successfully, and doing a small test sell after buying. None of these guarantee safety, but together they filter out most traps.",
      },
      {
        heading: "Discipline is the only edge",
        body:
          "The structure of meme coins is designed to exploit emotion — fear of missing out on the way up, paralysis on the way down. Decide your position size as if the token goes to zero, set entry and exit plans before you buy, and treat the first trade as a small test. Position sizing and pre-commitment, not prediction, are what keep meme-coin speculation from becoming ruin.",
      },
    ],
    faqs: [
      {
        question: "Why is thin liquidity such a big risk?",
        answer:
          "It amplifies upside but traps you on exit — selling a modest position can collapse the price. A parabolic chart can be effectively unsellable at size.",
      },
      {
        question: "What is the most common way people lose money on meme coins?",
        answer:
          "Buying a copycat contract with the same name and symbol as a real token. Always trade by the full verified address from an official source.",
      },
      {
        question: "How do I spot insider risk?",
        answer:
          "Check holder distribution and unlock schedules. Concentrated supply or large upcoming unlocks mean insiders can dump on later buyers.",
      },
      {
        question: "How should I size a meme-coin trade?",
        answer:
          "As if it goes to zero. Use a small test position, set entry and exit plans in advance, and never commit more than you can fully afford to lose.",
      },
    ],
    description:
      "Thin liquidity, copycat contracts, insider supply, and rug pulls — a clear-eyed look at why meme coins are high risk and how to trade them with discipline.",
  },
  "what-is-a-fair-launch": {
    intro:
      "A fair launch is a token release designed to give every participant the same starting line: no pre-sale, no private rounds, and no team allocation set aside before the public can buy. The idea is a reaction against launches where insiders accumulate cheaply and then sell into retail demand. Fair launches sound appealing, and many are genuinely fairer, but the label is not a guarantee of safety. This article explains what a fair launch means in practice and the caveats to check before trusting one.",
    sections: [
      {
        heading: "What the term promises",
        body:
          "In a fair launch, tokens become available to everyone at the same time and on the same terms. There is no privileged early allocation, no discounted insider round, and ideally no portion reserved for the team that could be dumped later. Everyone who wants in competes on equal footing from the first block. The goal is to align the launch so that early insiders do not start with a structural advantage over the public.",
      },
      {
        heading: "Why it matters",
        body:
          "Launches with large pre-sales or team allocations create overhang: insiders hold cheap supply that can be sold into later demand, pressuring the price for everyone who bought at market. A genuine fair launch removes that specific dynamic, which is why it is attractive to communities wary of being exit liquidity. It shifts the launch from a distribution that favors insiders toward one that favors broad participation.",
      },
      {
        heading: "The caveats the label hides",
        body:
          "Fair launch describes distribution, not quality or safety. A fairly launched token can still have a malicious contract, thin liquidity, or a community that coordinates to dump. Worse, sophisticated actors can game even a fair launch — using bots to buy huge amounts in the opening moments, or controlling many wallets to fake decentralization. Fair at launch does not mean decentralized in practice.",
      },
      {
        heading: "What to verify",
        body:
          "Treat a fair-launch claim as a starting point, then verify independently. Read the contract for mint, blacklist, and tax functions. Check holder distribution shortly after launch — if a handful of wallets already dominate, the fairness was theoretical. Confirm liquidity is locked or burned and check the depth. The same due diligence that applies to any new token applies here; the fair-launch label does not replace it.",
      },
      {
        heading: "Fair at launch is not fair forever",
        body:
          "Separate fairness at launch from fairness afterward. An equal starting line says nothing about what happens once trading opens: supply can concentrate within hours as a few buyers accumulate, and control of governance or a treasury can stay centralized regardless of how tokens were first distributed. Judge a fair launch by how distribution actually evolves over the following days, not by the promise made at block zero.",
      },
    ],
    faqs: [
      {
        question: "What is a fair launch?",
        answer:
          "A token release with no pre-sale, private round, or team allocation, so everyone can buy at the same time on the same terms from the start.",
      },
      {
        question: "Does a fair launch mean a token is safe?",
        answer:
          "No. It describes distribution, not quality. A fairly launched token can still have a malicious contract, thin liquidity, or coordinated dumping.",
      },
      {
        question: "Can a fair launch be gamed?",
        answer:
          "Yes. Bots can buy large amounts in the opening moments and actors can split holdings across many wallets to fake decentralization, concentrating supply despite the label.",
      },
      {
        question: "What should I check on a fair-launch token?",
        answer:
          "Contract permissions, holder distribution shortly after launch, and whether liquidity is locked or burned with adequate depth — the same due diligence as any new token.",
      },
    ],
    description:
      "Fair launches aim to give everyone the same starting line, with no pre-sale or team allocation. What that means in practice and the caveats the label can hide.",
  },
  "how-do-limit-orders-work-on-a-dex": {
    intro:
      "A limit order lets you set the price you are willing to trade at and have the trade execute only when the market reaches it, instead of swapping immediately at the current price. On decentralized exchanges this is implemented differently from a centralized order book, and understanding the mechanics — how the order is stored, who executes it, and what can prevent a fill — helps you use limit orders effectively. This article explains how on-chain limit orders work and how they differ from spot swaps.",
    sections: [
      {
        heading: "Limit orders versus spot swaps",
        body:
          "A spot swap executes right now at whatever the pool quotes. A limit order says: only execute if the price reaches my target. That lets you wait for a better entry or exit without watching the market constantly. The trade-off is that a limit order is not guaranteed to fill — if the price never reaches your target, nothing happens, and even when it does, conditions must allow execution.",
      },
      {
        heading: "How a DEX stores the order",
        body:
          "Without a central order book, on-chain limit orders are typically represented as a signed instruction or an order placed in a smart contract that authorizes a trade under specific conditions. You sign the order in advance; it sits until the conditions are met. Crucially, you retain custody — the order is a conditional permission, not a deposit of your funds with an exchange.",
      },
      {
        heading: "Who actually executes it",
        body:
          "Because smart contracts cannot act on their own, someone has to trigger execution when the price condition is satisfied. This role is usually filled by keepers or solvers — independent actors who monitor orders and execute them when profitable or as a service, earning a small incentive. This is why a limit order can fill slightly after the exact moment your price is touched: it depends on a keeper acting.",
      },
      {
        heading: "What can prevent a fill",
        body:
          "Several things can stop a limit order from executing even when the price appears to reach your target. Liquidity may be too thin at that price to fill the size. The price may touch your level only briefly, before a keeper acts. Network congestion or gas conditions can delay execution. And the order parameters — expiry, slippage on execution — affect whether it completes. Limit orders reduce the need to watch the market, but they are best-effort, not guaranteed.",
      },
      {
        heading: "When a limit order is the right tool",
        body:
          "Limit orders suit patient, price-specific trades — buying a dip to a level you set in advance, or taking profit at a target without sitting at the screen. They are less suited to fast-moving or thin markets, where a brief price touch can pass before a keeper fills you, or where execution slippage erodes the edge. Match the tool to the market: deep, liquid pairs reward limit orders most, while urgent trades in volatile conditions are usually better served by a spot swap.",
      },
    ],
    faqs: [
      {
        question: "How is a limit order different from a swap?",
        answer:
          "A swap executes immediately at the current price; a limit order executes only if the market reaches a price you set, and may never fill if it does not.",
      },
      {
        question: "Do I give up custody when placing a limit order?",
        answer:
          "On a non-custodial DEX, no. The order is a signed conditional instruction; your funds stay in your wallet until the conditions are met and it executes.",
      },
      {
        question: "Who executes my limit order?",
        answer:
          "Keepers or solvers — independent actors who monitor orders and trigger them when conditions are met, earning a small incentive, since contracts cannot act on their own.",
      },
      {
        question: "Why might my limit order not fill at my price?",
        answer:
          "Thin liquidity at that level, a price that only briefly touches your target, congestion, or order parameters like expiry can all prevent execution. Limit orders are best-effort.",
      },
    ],
    description:
      "On-chain limit orders defer execution until price crosses your target. How they are stored, who executes them, what can prevent a fill, and how they differ from spot swaps.",
  },
  "stablecoins-usdc-vs-usdt-vs-dai": {
    intro:
      "Stablecoins are the backbone of on-chain trading — the unit most traders price in, exit into, and bridge with. But they are not interchangeable. USDC, USDT, and DAI use different models to hold their peg, and on top of that each exists as native and bridged versions across chains. Picking the wrong one can mean a wide spread, a near-empty pool, or unexpected risk. This article compares the three and explains the variant trap that catches traders moving between chains.",
    sections: [
      {
        heading: "USDC: fully reserved and audited",
        body:
          "USDC is issued by a regulated company and backed by reserves of cash and short-term US treasuries, with regular attestations. Its appeal is transparency and a strong track record of holding its peg. For most traders, native USDC is the default stablecoin on the chains where it is issued, and it usually has the deepest, tightest liquidity for stable pairs.",
      },
      {
        heading: "USDT: the largest and most liquid",
        body:
          "USDT (Tether) is the largest stablecoin by supply and often the most liquid, especially on certain chains and venues. It is also backed by reserves, though its disclosures have historically drawn more scrutiny than USDC's. In practice USDT's enormous liquidity makes it the better-served leg on some pairs and chains, which is why many routes default to it. Liquidity, not ideology, often decides which stable to use.",
      },
      {
        heading: "DAI: crypto-collateralized and decentralized",
        body:
          "DAI is different in kind: rather than being backed by bank reserves, it is generated against crypto collateral locked in a decentralized protocol, with mechanisms to keep it near a dollar. Its appeal is decentralization and on-chain transparency. The trade-off is a more complex stability model and, at times, thinner liquidity than USDC or USDT on certain pairs.",
      },
      {
        heading: "The native vs bridged variant trap",
        body:
          "The subtler danger is not which brand you choose but which version. On many chains there is native USDC issued directly and bridged USDC that arrived from another network — different contracts with different liquidity. Routing into the wrong variant can mean a wide spread or a shallow pool. Always target the variant with the deepest liquidity on your chain, and when in doubt verify the contract address rather than trusting the symbol.",
      },
      {
        heading: "Choosing a stablecoin in practice",
        body:
          "For execution, let liquidity decide. On a given chain and pair, route into whichever stablecoin shows the deepest pool and tightest spread, and prefer the native variant over a bridged one when you can. For longer-term holdings, weigh the backing model that matters to you — full reserves, maximum liquidity, or decentralization. But moment to moment, the deepest variant on your chain almost always delivers the best fill, and that practical test beats brand loyalty.",
      },
    ],
    faqs: [
      {
        question: "Are USDC, USDT, and DAI interchangeable?",
        answer:
          "They all target one dollar but use different backing models and have different liquidity per chain. They are not perfectly interchangeable, and pool depth often decides which to use.",
      },
      {
        question: "Which stablecoin is safest?",
        answer:
          "USDC is fully reserved with regular attestations; USDT is the most liquid but historically less transparent; DAI is decentralized and crypto-collateralized with a more complex model. Each is a different trade-off.",
      },
      {
        question: "What is the difference between native and bridged USDC?",
        answer:
          "Native USDC is issued directly on a chain; bridged USDC arrived from another network and is a separate contract with separate liquidity. Target the deepest variant and verify the address.",
      },
      {
        question: "Why does my stablecoin swap show a wide spread?",
        answer:
          "Often because you selected a thin variant or the wrong contract. Switch to the deeper native version on that chain and confirm the address.",
      },
    ],
    description:
      "Not all stablecoins are the same: USDC, USDT, and DAI collateral models compared, plus the native-vs-bridged variant trap that causes wide spreads and failed routes.",
  },
  "wrapped-and-bridged-tokens-explained": {
    intro:
      "Wrapped and bridged tokens are representations of an asset that live somewhere other than its native home. Wrapped ETH lets ETH behave like a standard token; bridged USDC is dollars that traveled from another chain. They are everywhere in DeFi and mostly work invisibly, but confusing a wrapped or bridged version with the native asset causes failed routes, thin-liquidity surprises, and occasionally lost funds. This article explains what these tokens are, why they exist, and how to handle them without getting tripped up.",
    sections: [
      {
        heading: "Why wrapping exists",
        body:
          "A blockchain's native coin — ETH on Ethereum, for example — does not always follow the same token standard as the tokens built on top of it. Wrapped ETH (WETH) is ETH packaged to behave like a standard ERC-20 so it can be traded in pools and used by contracts uniformly. Wrapping is a one-to-one, fully backed conversion: you can wrap and unwrap freely, and WETH is always redeemable for ETH. It is a convenience layer, not a risk.",
      },
      {
        heading: "Bridged tokens are different",
        body:
          "A bridged token is an asset that originated on another chain and was moved across a bridge, which locked the original and minted a representation on the destination. Bridged USDC on one chain is backed by real USDC locked elsewhere by the bridge. That backing is only as sound as the bridge — and bridges have been exploited — so a bridged token carries the bridge's risk in addition to the asset's. This is the key distinction from simple wrapping.",
      },
      {
        heading: "Native vs bridged liquidity",
        body:
          "On many chains the same asset exists as both a native issuance and one or more bridged versions, each a separate contract with separate pools. The native version usually has the deepest liquidity, while bridged versions can be thin. Trading into the wrong one means a wide spread or a near-empty pool. This is exactly the variant trap that affects stablecoins, and it applies to bridged majors too.",
      },
      {
        heading: "How to handle them safely",
        body:
          "Identify which version you actually hold and which your destination app expects, by checking the contract address and decimals rather than trusting the symbol. When trading, prefer the variant with the deepest liquidity on that chain. When bridging, confirm what will arrive on the other side. And never assume two tokens with the same ticker are fungible — on-chain, the address is the only identity that matters.",
      },
      {
        heading: "A quick mental model",
        body:
          "Hold the distinction this way: wrapping is a format change on the same chain and adds essentially no risk, while bridging moves value across chains and inherits the bridge's security. When a trade or transfer behaves unexpectedly, the variant is the first thing to check — confirm the exact contract on both ends. That single habit avoids the large majority of wrapped-and-bridged mistakes, from thin-pool surprises to sending an asset somewhere it cannot be used.",
      },
    ],
    faqs: [
      {
        question: "What is a wrapped token?",
        answer:
          "An asset packaged to follow a standard token format, like WETH for ETH. It is fully backed one-to-one and freely redeemable — a convenience layer rather than a risk.",
      },
      {
        question: "How is a bridged token different from a wrapped one?",
        answer:
          "A bridged token represents an asset moved from another chain, backed by the original locked in a bridge. It carries the bridge's security risk on top of the asset's.",
      },
      {
        question: "Why does the version I pick matter?",
        answer:
          "Native and bridged versions are separate contracts with separate liquidity. The wrong one can mean a wide spread or an almost-empty pool.",
      },
      {
        question: "How do I tell which version I have?",
        answer:
          "Check the contract address and decimals, not the ticker. On-chain, the address is the only reliable identity of a token.",
      },
    ],
    description:
      "Wrapped tokens repackage a native asset one-to-one; bridged tokens carry an asset across chains and inherit bridge risk. How they differ and how to avoid the variant trap.",
  },
  "how-to-spot-a-rug-pull": {
    intro:
      "A rug pull is when the people behind a token extract its value and leave holders with something worthless — by draining liquidity, minting and dumping supply, or simply abandoning the project. Rugs are deliberate and engineered, which means the warning signs are often visible on-chain before the trap springs. Learning to read them is the single most valuable defensive skill for anyone trading newer tokens. This article catalogs the red flags and the checks that catch most rugs before you buy.",
    sections: [
      {
        heading: "Unlocked or removable liquidity",
        body:
          "The classic rug is a liquidity pull: the team removes the pool's funds, collapsing the price to near zero. The defense is verifying that liquidity is locked in a time-lock contract or burned, and checking the actual unlock date — a lock that expires next week is barely a lock. If liquidity can be withdrawn freely by the team, the rug requires nothing but a single transaction, and you should assume it can happen at any time.",
      },
      {
        heading: "Dangerous contract permissions",
        body:
          "Read what the contract can do. A mint function lets the team print unlimited new supply and dump it on the market. A blacklist or pause function lets them stop you from selling while they exit — the mechanism behind many honeypots. Hidden or adjustable transfer taxes can quietly confiscate value on every trade. Each of these is a lever the team can pull against holders, and their presence in an anonymous project is a serious warning.",
      },
      {
        heading: "Concentrated holdings",
        body:
          "Examine the holder distribution. If the deployer or a handful of wallets control most of the supply, they can crash the price by selling at any time, and you are the buyer on the other side. Watch for many fresh wallets funded from the same source, a common trick to fake decentralization. Broad, organic distribution is reassuring; concentration in a few hands is a structural trap waiting to close.",
      },
      {
        heading: "Behavioral and social red flags",
        body:
          "Beyond the contract, watch the surrounding behavior: anonymous teams with no accountability, aggressive paid promotion and manufactured urgency, locked or fake social channels, copied whitepapers, and price action driven entirely by hype rather than usage. None alone proves a rug, but a cluster of them around a brand-new token with thin liquidity is the standard profile of a scam.",
      },
      {
        heading: "A pre-buy checklist",
        body:
          "Before buying any new token, run the same short routine: verify the full contract address from an official source, confirm liquidity is locked or burned and check the unlock date, read the contract for mint/blacklist/tax functions, inspect holder distribution, and confirm ordinary wallets have sold successfully — ideally with a small test sell of your own. Passing all of these does not guarantee safety, but failing any one of them is reason enough to walk away.",
      },
    ],
    faqs: [
      {
        question: "What is the most common type of rug pull?",
        answer:
          "A liquidity pull, where the team removes the pool's funds and the price collapses. Verifying locked or burned liquidity and its unlock date is the primary defense.",
      },
      {
        question: "Which contract permissions are red flags?",
        answer:
          "Mint functions, blacklist or pause functions, and hidden or adjustable transfer taxes — all give the team levers to dump supply or stop you from selling.",
      },
      {
        question: "Why does holder distribution matter?",
        answer:
          "If a few wallets hold most of the supply, they can crash the price at will. Watch for many fresh wallets funded from one source faking decentralization.",
      },
      {
        question: "Can a checklist guarantee a token is safe?",
        answer:
          "No. Passing the checks reduces risk but does not eliminate it. Failing any single check, however, is reason enough to avoid the token.",
      },
    ],
    description:
      "Rug pulls are engineered, so the warning signs are usually visible first. Unlocked liquidity, dangerous permissions, concentrated holdings, and a pre-buy checklist.",
  },
  "why-locked-liquidity-matters": {
    intro:
      "Locked liquidity is one of the most cited trust signals for a new token, and for good reason: it directly addresses the most common rug pull. But the phrase is often thrown around loosely, and a lock can be shallow, short, or partial in ways that undermine the reassurance it implies. Understanding what locking actually does, how to verify it, and what it does not protect against lets you weigh it properly instead of treating it as a blanket guarantee. This article explains it clearly.",
    sections: [
      {
        heading: "What locking actually does",
        body:
          "When a project provides liquidity to a pool, it receives LP tokens representing that position — and whoever holds those LP tokens can withdraw the underlying funds. Locking liquidity means depositing those LP tokens into a time-lock contract that prevents withdrawal until a set date. Burning them sends them to an unrecoverable address permanently. Either way, the point is to stop the team from yanking the pool out from under holders, which is the classic liquidity-pull rug.",
      },
      {
        heading: "Why it builds trust",
        body:
          "Liquidity that cannot be withdrawn removes the easiest and most damaging exit a malicious team has. It signals that the people behind the token cannot simply collapse the price by reclaiming the pool, at least until the lock expires. For a new token, a credible lock or burn is one of the stronger positive signals you can find, because it costs the team their easiest avenue of betrayal.",
      },
      {
        heading: "How to verify a lock",
        body:
          "Do not take a claim at face value. Verify the LP tokens are actually held by a recognized locker contract or sent to a burn address, and check the unlock date. A lock expiring in a few days offers almost no protection — the team can simply wait. Confirm the proportion locked, too: locking a small slice while keeping the rest withdrawable is a half-measure dressed up as a full one. The details determine whether the lock means anything.",
      },
      {
        heading: "What locking does not protect against",
        body:
          "Locked liquidity addresses one specific rug, not every risk. It does nothing about a malicious mint function that dilutes supply, a blacklist that stops you selling, concentrated holdings that can be dumped, or a slow abandonment that bleeds the price. Treat a verified lock as one box checked on a longer list — necessary for confidence in a new token, but far from sufficient on its own.",
      },
      {
        heading: "What happens when a lock expires",
        body:
          "A detail traders overlook is the unlock itself. A lock does not renew automatically — once the date passes, the team can withdraw the liquidity unless they actively extend it. Before relying on a lock, note the unlock date and treat the period around it as elevated risk. Reputable projects often extend their locks publicly or migrate to longer ones; silence as an unlock approaches is itself a signal worth watching closely.",
      },
    ],
    faqs: [
      {
        question: "What does locking liquidity mean?",
        answer:
          "Depositing the LP tokens that control a pool into a time-lock contract (or burning them) so the team cannot withdraw the pool's funds until a set date — or ever.",
      },
      {
        question: "Why does locked liquidity build trust?",
        answer:
          "It removes the easiest rug — pulling the pool and collapsing the price — by making the underlying funds non-withdrawable for the lock duration.",
      },
      {
        question: "How do I verify liquidity is really locked?",
        answer:
          "Confirm the LP tokens sit in a recognized locker or burn address, check the unlock date, and check what proportion is locked rather than trusting a claim.",
      },
      {
        question: "Does locked liquidity make a token safe?",
        answer:
          "No. It addresses one rug type. Mint functions, blacklists, concentrated holdings, and slow abandonment remain risks regardless of a lock.",
      },
    ],
    description:
      "Locked liquidity stops the classic liquidity-pull rug, but only if the lock is deep, long, and verifiable. What locking does, how to verify it, and what it cannot protect.",
  },
  "tokenomics-basics-for-traders": {
    intro:
      "Tokenomics is the economic design of a token — how much exists, who holds it, how new supply enters circulation, and what the token is actually for. For a trader, tokenomics is not abstract theory: it determines the selling pressure you will face, whether early insiders can dump on you, and whether demand has any reason to grow. This article covers the handful of tokenomics factors that matter most for trading decisions, without the jargon, so you can read a token's structure before you buy it.",
    sections: [
      {
        heading: "Supply: total, circulating, and max",
        body:
          "Three supply numbers matter. Circulating supply is what is tradable now. Total supply includes tokens that exist but are not yet circulating. Max supply is the ceiling, if there is one. The gap between circulating and total is future selling pressure waiting to enter the market. A token with a low circulating fraction and a large locked or unissued remainder will face dilution as that supply unlocks, regardless of how the chart looks today.",
      },
      {
        heading: "Distribution and vesting",
        body:
          "Who holds the supply, and on what schedule it becomes sellable, shapes the price more than almost anything else. Large allocations to the team, investors, or a treasury that unlock on a vesting schedule create predictable waves of selling pressure. Check the distribution and the vesting calendar: an unlock cliff where a big tranche becomes liquid at once is a known headwind that sophisticated traders position around.",
      },
      {
        heading: "Emissions and inflation",
        body:
          "Some tokens continuously issue new supply to reward staking, liquidity provision, or other activity. These emissions are inflation: unless demand grows at least as fast, the new supply pushes the price down. High emissions can prop up an attractive headline yield while quietly diluting holders. Always ask where new tokens come from and whether real demand absorbs them, or whether the yield is just printed dilution.",
      },
      {
        heading: "Utility and demand drivers",
        body:
          "Finally, ask what the token is for. Does it have a use that creates ongoing demand — fees, governance with real power, access, collateral — or is its only demand speculative? Mechanisms like fee burns or buybacks can offset supply growth if they are real and material. A token with genuine utility and disciplined supply has a structural case; one with heavy emissions, concentrated insiders, and no use has gravity working against it.",
      },
      {
        heading: "Reading tokenomics before you trade",
        body:
          "Pulling these together, a quick pre-trade pass looks like this: check the circulating-to-total ratio for dilution waiting in the wings, scan the vesting calendar for upcoming unlocks, identify the emission rate and what absorbs it, and confirm whether real demand drivers exist. None of this predicts price on its own, but it tells you which structural forces you are trading with or against — and that context is what separates an informed entry from a blind one.",
      },
    ],
    faqs: [
      {
        question: "Which supply number should I care about?",
        answer:
          "All three. Circulating supply is tradable now, total includes not-yet-circulating tokens, and max is the ceiling. The gap is future selling pressure as supply unlocks.",
      },
      {
        question: "Why do vesting schedules matter?",
        answer:
          "Large team or investor allocations that unlock on a schedule create predictable waves of selling pressure. Unlock cliffs are known headwinds traders position around.",
      },
      {
        question: "Are high token emissions bad?",
        answer:
          "They are inflationary. Unless demand grows as fast as new supply enters, emissions dilute holders — sometimes hidden behind an attractive headline yield.",
      },
      {
        question: "What makes tokenomics healthy?",
        answer:
          "Genuine utility that drives ongoing demand, disciplined supply, broad distribution, and any burns or buybacks being real and material rather than cosmetic.",
      },
    ],
    description:
      "Tokenomics for traders without the jargon: supply figures, distribution and vesting, emissions and inflation, and the utility that determines real demand for a token.",
  },
  "market-cap-vs-liquidity-don-t-confuse-them": {
    intro:
      "Market cap and liquidity are two of the most misread numbers in crypto, and confusing them leads directly to losses. Market cap is a headline that says how big a token appears; liquidity is the reality of what you can actually trade. A token can show an enormous market cap and yet be impossible to exit without crashing the price. Understanding the difference — and why liquidity is the number that protects you — is essential before trusting any token's apparent size. This article makes the distinction concrete.",
    sections: [
      {
        heading: "What market cap measures",
        body:
          "Market cap is price multiplied by circulating supply. It is a notional figure: it tells you what every token would theoretically be worth if they all traded at the current price. But that price is set by the last trade, often in a small pool, and there is no guarantee that the supply could ever actually sell at that level. Market cap is a measure of perceived size, not of money that exists or that you could extract.",
      },
      {
        heading: "What liquidity measures",
        body:
          "Liquidity is the real capital sitting in the pools you trade against. It determines how much you can buy or sell before the price moves significantly. Unlike market cap, liquidity is the money actually available to take the other side of your trade. When you exit a position, you exit into liquidity — never into market cap. This is the number that decides whether your gains are real or only on paper.",
      },
      {
        heading: "Why the gap is dangerous",
        body:
          "The danger arises when market cap is large but liquidity is thin. A token can be promoted as a multi-million-dollar project while only a few thousand dollars back the price. In that situation, the market cap is fiction for trading purposes: selling even a small position collapses the price, and selling a large one is impossible. Scams exploit exactly this gap, advertising an impressive cap that you can never realize.",
      },
      {
        heading: "How to use both correctly",
        body:
          "Treat market cap as a rough sense of scale and liquidity as the binding constraint on your actual trades. Before buying, compare the liquidity and 24-hour volume to your intended position size, and assume your exit will move the price more than your entry did. A healthy token shows liquidity and volume that are substantial relative to its cap; a dangerous one shows a big cap floating on almost nothing.",
      },
      {
        heading: "A simple sanity check",
        body:
          "A fast check before any trade: compare the pool's liquidity to the token's market cap. A vanishingly small ratio means the headline valuation rests on almost no real capital, so treat the cap as marketing rather than substance. Pair that with 24-hour volume — genuine markets trade meaningfully relative to their size, while a large cap sitting on near-zero volume and liquidity is the classic profile of a token you can buy easily but may never be able to sell.",
      },
    ],
    faqs: [
      {
        question: "What is the difference between market cap and liquidity?",
        answer:
          "Market cap is price times circulating supply — a notional headline. Liquidity is the real capital in the pools you trade against, which determines what you can actually buy or sell.",
      },
      {
        question: "Why can't I rely on market cap?",
        answer:
          "It assumes all supply could sell at the current price, which is rarely true. A large cap can sit on tiny liquidity, making it impossible to realize.",
      },
      {
        question: "Which number protects me as a trader?",
        answer:
          "Liquidity. You exit into liquidity, not market cap. Compare it and 24-hour volume to your position size before trading.",
      },
      {
        question: "How do scams exploit this confusion?",
        answer:
          "By advertising an impressive market cap backed by almost no liquidity, so buyers cannot actually exit without collapsing the price.",
      },
    ],
    description:
      "Market cap is a notional headline; liquidity is what you can actually trade. Why confusing them causes losses, where the gap is dangerous, and how to use both correctly.",
  },
  "how-order-routing-finds-the-best-price": {
    intro:
      "When you request a swap on an aggregator, a lot happens in the moment before a quote appears. The router is searching across many liquidity sources, comparing direct and multi-hop paths, sometimes splitting your order, and accounting for fees and gas to find the route that leaves you with the most tokens. Understanding how that routing works demystifies the quote you see and explains why an aggregator usually beats trading on a single pool. This article walks through the routing process step by step.",
    sections: [
      {
        heading: "The problem routing solves",
        body:
          "Liquidity for any pair is scattered across many pools and protocols, each with different depth, fees, and prices at any moment. Trading on a single pool means accepting whatever that one venue offers, including its price impact. A router's job is to survey the whole landscape and assemble the path — or combination of paths — that delivers the best net result for your specific trade size, which a human comparing manually could never do in real time.",
      },
      {
        heading: "Direct, multi-hop, and split routes",
        body:
          "The router considers several path shapes. A direct route trades your two tokens in one pool. A multi-hop route goes through intermediates — say, your token to a stablecoin to the target — when that yields more than any direct pool. A split route divides your order across several pools simultaneously to reduce the price impact of being a large participant in any one of them. The best route is often a combination, chosen for your exact size.",
      },
      {
        heading: "Net output, not headline price",
        body:
          "A longer or split route is not automatically worse, and a shorter one is not automatically better. Each hop adds a pool fee and some price impact, and the whole transaction costs gas. The router optimizes for net output — the tokens you actually receive after every fee and impact along the path. That is why a three-hop split route can beat a simple direct swap, and why you should judge routes by the minimum received rather than the quoted rate on any single leg.",
      },
      {
        heading: "Why quotes expire",
        body:
          "Routing is computed against the current state of every pool it considers, and that state changes constantly as others trade. The route that is optimal now may not be optimal in ten seconds, and the prices certainly shift. This is why quotes refresh and why your slippage tolerance exists — to bound the difference between the routed quote and the price at the moment your transaction confirms. Re-quoting before signing gives the router fresh data to work with.",
      },
    ],
    faqs: [
      {
        question: "Why does an aggregator beat a single pool?",
        answer:
          "It surveys many pools and protocols and assembles the best path — direct, multi-hop, or split — for your exact trade size, instead of accepting one venue's price and impact.",
      },
      {
        question: "Is a multi-hop or split route worse?",
        answer:
          "Not necessarily. Extra hops add fees and impact but can still yield more net output. The router optimizes for tokens actually received, so judge by the minimum received.",
      },
      {
        question: "What does the router actually optimize?",
        answer:
          "Net output after all pool fees, price impact, and gas — not the headline price of any single leg.",
      },
      {
        question: "Why do quotes expire?",
        answer:
          "Routing reflects the current state of pools, which changes as others trade. Quotes refresh so the route and price stay accurate; re-quote before signing for fresh data.",
      },
    ],
    description:
      "How a DEX aggregator routes your swap: surveying pools, comparing direct, multi-hop, and split paths, optimizing net output after fees and gas, and why quotes expire.",
  },
  "understanding-aggregator-and-protocol-fees": {
    intro:
      "Every swap carries more than one cost, and traders who lump them together end up confused about why their output is lower than the headline rate. There are three distinct fees in play on a typical aggregated swap: the pool fee charged by the liquidity protocol, the platform fee charged by the aggregator, and the network gas paid to validators. Knowing what each one is, who collects it, and how it scales with your trade lets you read a quote accurately and minimize total cost. This article breaks them apart.",
    sections: [
      {
        heading: "Pool (protocol) fees",
        body:
          "Every swap through a liquidity pool pays a fee to that pool's protocol, distributed to the liquidity providers who fund it. This fee is a percentage of the trade and often comes in tiers — lower for stable, predictable pairs and higher for volatile ones to compensate providers for risk. On a multi-hop route, you pay a pool fee on each hop, which is why the number of hops affects your net result. This fee scales with trade size.",
      },
      {
        heading: "Aggregator (platform) fees",
        body:
          "The aggregator that finds your route and routes the transaction may charge its own platform fee for the service. This is separate from the pool fee and is how the aggregator operates. A good aggregator earns its fee by finding routes that save you more than it charges — better net output, even after the platform fee, than you would get trading a single pool yourself. On supported chains, XAUConnect lets this fee be paid in USDC rather than the native coin.",
      },
      {
        heading: "Network gas",
        body:
          "Gas is paid to the chain's validators to process the transaction and is unrelated to the other two fees. Unlike pool and platform fees, gas is roughly fixed per transaction rather than proportional to trade size, so it weighs heavily on small trades and barely registers on large ones. Gas must be paid in the chain's native coin, which is why you always keep a native-coin buffer regardless of how platform fees are denominated.",
      },
      {
        heading: "Reading total cost",
        body:
          "Your true cost is the sum of pool fees across every hop, the platform fee, the gas, and any price impact from your size. The cleanest way to evaluate a swap is to ignore the individual line items and look at the minimum received — the tokens you are guaranteed after everything. Comparing minimum received across routes and across moments tells you the real cost far more reliably than any single advertised rate.",
      },
      {
        heading: "Why \"zero-fee\" claims mislead",
        body:
          "Be skeptical of interfaces advertising zero fees. A platform can waive its own fee and still deliver worse output through a poorer route, wider price impact, or an unfavorable internal spread — costs that never appear as a line item but reduce what you receive. Because pool fees and gas are unavoidable regardless of the front end, the only honest comparison is net output. Judge any \"free\" claim by the minimum received, not the absence of a visible fee.",
      },
    ],
    faqs: [
      {
        question: "What fees are on a typical swap?",
        answer:
          "Three: the pool fee paid to liquidity providers, the aggregator's platform fee for routing, and network gas paid to validators. Price impact from your size adds to the effective cost.",
      },
      {
        question: "How is the platform fee different from the pool fee?",
        answer:
          "The pool fee goes to liquidity providers on each hop and scales with size; the platform fee is the aggregator's charge for finding and routing your trade.",
      },
      {
        question: "Why does gas hurt small trades more?",
        answer:
          "Gas is roughly fixed per transaction rather than proportional to size, so it is a large share of a small trade and a tiny share of a large one.",
      },
      {
        question: "What is the simplest way to compare total cost?",
        answer:
          "Look at the minimum received — the tokens guaranteed after all fees, gas, and impact — rather than trying to add up individual line items.",
      },
    ],
    description:
      "Three fees ride on every swap: pool fees, the aggregator's platform fee, and network gas. What each is, who collects it, how it scales, and how to read total cost.",
  },
  "what-is-a-multi-hop-swap": {
    intro:
      "A multi-hop swap routes your trade through one or more intermediate tokens instead of directly between the two you care about. It sounds inefficient — why take a detour? — but multi-hop routing is often how you get the best price, and sometimes it is the only way to trade a pair at all. Understanding when and why a router chooses multiple hops, and how to read the trade-offs, helps you trust the quote and recognize when a route is genuinely better. This article explains multi-hop swaps in plain terms.",
    sections: [
      {
        heading: "What a hop is",
        body:
          "Each hop is a single swap through one liquidity pool. A direct swap is one hop: token A to token B in a pool that holds both. A multi-hop swap chains several together — token A to token C, then token C to token B — usually passing through a liquid intermediate like a major stablecoin or the chain's native coin. The router assembles these hops into a single transaction so you experience it as one swap.",
      },
      {
        heading: "Why detours can be cheaper",
        body:
          "Sometimes no deep pool exists directly between your two tokens, but both trade deeply against a common intermediate. Routing A to USDC to B through two deep pools can yield far more than forcing the trade through a thin direct pool with heavy price impact. Even when a direct pool exists, splitting through intermediates can reduce overall impact for large trades. The detour wins when the combined fees and impact of the path are lower than the direct route's.",
      },
      {
        heading: "The trade-offs",
        body:
          "Multi-hop is not free. Each hop charges its own pool fee, so more hops mean more fees, and each hop adds some price impact. There is also slightly more that can move between signing and confirmation. The router weighs all of this and only chooses a multi-hop path when the net output beats the alternatives. Your job is not to count hops but to compare the minimum received, which already reflects the full cost of the path.",
      },
      {
        heading: "When it is the only option",
        body:
          "For less common tokens, a direct pool to your desired counterpart may simply not exist, or may be too thin to trade. Multi-hop routing is what makes these pairs tradable at all, by connecting them through assets that do have deep liquidity. This is a core reason aggregators exist: they find these paths automatically, so you can trade pairs that no single pool supports.",
      },
      {
        heading: "Reading a multi-hop quote",
        body:
          "When you see a route with several hops, resist the urge to judge it by length. The quote card shows the full path and the minimum received after every fee and impact along it; that final number is what you compare against any other route, including a direct one. A two- or three-hop path that nets more than a thin direct pool is the better trade, full stop. Trust the net output the router surfaces rather than an instinct that fewer hops must be cheaper.",
      },
    ],
    faqs: [
      {
        question: "What is a multi-hop swap?",
        answer:
          "A trade routed through one or more intermediate tokens — for example A to USDC to B — chained into a single transaction, instead of swapping A directly for B.",
      },
      {
        question: "Why would a detour give a better price?",
        answer:
          "When no deep direct pool exists but both tokens trade deeply against a common intermediate, routing through it avoids the heavy price impact of a thin direct pool.",
      },
      {
        question: "Are more hops always worse?",
        answer:
          "No. Each hop adds fees and impact, but the router only picks a multi-hop path when its net output beats the alternatives. Compare the minimum received, not the hop count.",
      },
      {
        question: "When is multi-hop the only choice?",
        answer:
          "For less common tokens with no deep direct pool, routing through liquid intermediates is what makes the pair tradable at all.",
      },
    ],
    description:
      "Multi-hop swaps route through intermediate tokens to get a better price or to trade pairs with no direct pool. What a hop is, why detours win, the trade-offs, and when it is required.",
  },
};

function withExtraSections(slug: string, content: RichContent | undefined): RichContent | undefined {
  if (!content) return undefined;
  const extra = [
    ...(COMMERCIAL_EXTRA_SECTIONS[slug] ?? []),
    ...(COMMERCIAL_EXTRA_SECTIONS_2[slug] ?? []),
  ];
  if (!extra.length) return content;
  return { ...content, sections: [...content.sections, ...extra] };
}

export function getLearnContent(slug: string): RichContent | undefined {
  return withExtraSections(
    slug,
    LEARN_CONTENT[slug] ??
      PRODUCT_LEARN_CONTENT[slug] ??
      SWAP_LEARN_CONTENT[slug] ??
      CREATE_LEARN_CONTENT[slug],
  );
}

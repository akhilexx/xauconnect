/**
 * Pages written for readers, not filled from a shared outline.
 * Each entry is one intent. Figures are shared only when the picture is the same fact.
 */
import type { SeoPageConfig } from "./types.js";

type Figure = { src: string; alt: string; caption: string };
type Block = {
  intro: string;
  description: string;
  sections: { heading: string; body: string }[];
  faqs: { question: string; answer: string }[];
  figure?: Figure;
};

const ROUTE: Figure = {
  src: "/seo/dex-route-comparison.jpg",
  alt: "Three pools linked by paths, one path brighter, showing a chosen swap route",
  caption: "One route is kept. The others are only compared.",
};
const KEY: Figure = {
  src: "/seo/token-approval-key.jpg",
  alt: "A brass key beside a sealed vial, the picture of a token approval",
  caption: "An approval is permission. It is not the swap.",
};
const BRIDGE: Figure = {
  src: "/seo/cross-chain-bridge.jpg",
  alt: "Two islands and one bridge, a gold disc on the near side and an empty bowl on the far side",
  caption: "What leaves is not the object that arrives.",
};
const SCALE: Figure = {
  src: "/seo/fee-and-gas-scale.jpg",
  alt: "A balance scale with a gold disc on one pan and a small flame on the other",
  caption: "The platform fee and the network fee are different costs.",
};

const PAGES: Record<string, Block> = {
  "/learn/what-is-a-dex-aggregator": {
    figure: ROUTE,
    description:
      "A DEX aggregator reads several pools and keeps the route that pays you more after fees. One signature, your wallet, no custody.",
    intro:
      "What is a DEX aggregator? It asks many pools what they will pay you, then keeps the route with the higher amount after fees.\n\nA single exchange only knows its own pools. If that pool is thin, you move the price and receive less. An aggregator can split the trade or walk through a second token when that path pays more. XAUConnect does this on Ethereum, BNB Chain, Polygon, Arbitrum, Base, Avalanche, and Solana. You still sign in your own wallet.",
    sections: [
      {
        heading: "What you compare",
        body: "Ignore the mid price. The number that matters is the minimum you will receive. That floor already includes the pool fee, the price move your own trade causes, and the platform fee. On a 1,000 unit clip, 30 basis points is 3 units before gas. The live quote can show a different fee, so read the fee line on that quote.",
      },
      {
        heading: "What it does not do",
        body: "An aggregator is not a custodian and not a bridge by itself. A same-chain quote never moves coins to another network. If the wallet is on the wrong chain, the quote is for a different market, even when the ticker matches.",
      },
      {
        heading: "A worked choice",
        body: "Suppose pool A offers 990 USDC for 1 ETH and pool B offers 996 USDC but charges more gas. On Ethereum the gas can erase the extra 6 USDC. On Solana or an L2 it usually does not. The aggregator should show both, and you keep the one with the better minimum after gas.",
      },
    ],
    faqs: [
      {
        question: "Is an aggregator the same as a DEX?",
        answer: "No. A DEX is one venue. An aggregator reads several venues and returns the route that pays more after fees.",
      },
      {
        question: "Does XAUConnect hold the tokens?",
        answer: "No. The swap settles in the wallet that signs. There is no XAUConnect balance to withdraw.",
      },
    ],
  },
  "/learn/what-is-a-token-approval-and-why-does-it-matter": {
    figure: KEY,
    description:
      "A token approval lets a contract spend your ERC-20s. It is a separate transaction from the swap, and an unlimited approval stays until you revoke it.",
    intro:
      "What is a token approval and why does it matter? It is the transaction that lets a router spend a specific ERC-20 from your wallet, and it is not the swap itself.\n\nEthereum tokens do not move because you clicked Swap. The token contract checks an allowance. If the allowance is below the amount, the router cannot pull the tokens and the swap reverts. Solana does not use this ERC-20 allowance step. Phantom shows the balance changes in one signature.",
    sections: [
      {
        heading: "Unlimited is the risky default",
        body: "Many wallets offer an unlimited allowance so you are not asked again. That permission remains after the trade. If the spender contract is later faulty, the allowance is still valid. Exact approvals cost an extra transaction on the next trade and limit the damage.",
      },
      {
        heading: "How to read the prompt",
        body: "The approval names a token and a spender. Match the token to the contract you meant to trade, on the chain shown in the wallet. The first and last characters of an address are not enough. Copycats copy those.",
      },
      {
        heading: "Revoke when the trade is done",
        body: "Set the allowance back to zero for spenders you no longer use. On Ethereum that is another transaction and it costs gas. Do it for old unlimited approvals on contracts you do not recognise. Leave the allowance only if you will trade that pair again soon.",
      },
    ],
    faqs: [
      {
        question: "Does Solana ask for an approval?",
        answer: "Not in the ERC-20 sense. A Solana swap is one signed transaction. The wallet preview is the check.",
      },
      {
        question: "Can an approval drain my ETH?",
        answer: "An ERC-20 approval spends that token, not your ETH. Gas is paid in ETH separately. A malicious spender can still take the approved token up to the allowance.",
      },
    ],
  },
  "/learn/how-do-cross-chain-bridges-work": {
    figure: BRIDGE,
    description:
      "A bridge locks or burns an asset on the source chain and releases a different contract on the destination. You need gas on both sides.",
    intro:
      "How do cross-chain bridges work? They take an asset on one network and release a representation on another, after the source transaction is accepted.\n\nThe coin in your Ethereum wallet does not walk across a wire. A bridge contract locks or burns it, a relayer carries the proof, and a contract on the far chain mints or unlocks a different token. That destination token has its own address. USDC on Ethereum is not the USDC contract on Base until you have checked both addresses.",
    sections: [
      {
        heading: "Time and gas",
        body: "Ethereum blocks are about 12 seconds. Solana slots are well under a second. The bridge wait is extra and is not those block times. You need the source gas token to send, and the destination gas token after arrival, or the received coins sit with no way to move them.",
      },
      {
        heading: "When not to bridge",
        body: "If both tokens already have a deep pool on one chain, swap there. Bridging the same ticker adds a second contract and a wait. XAUConnect will not promise a fill time. If the quote expires, request a new one.",
      },
    ],
    faqs: [
      {
        question: "Can a bridge be reversed from this site?",
        answer: "No. You signed the source transaction. A confirmed bridge is not something XAUConnect can undo.",
      },
      {
        question: "Is wrapped ETH on Base the same as ETH on Ethereum?",
        answer: "No. They are different contracts on different chains. The bridge is what links the value, not the ticker.",
      },
    ],
  },
  "/learn/slippage-vs-price-impact-what-s-the-difference": {
    figure: SCALE,
    description:
      "Price impact is the move your trade causes in the pool. Slippage is how far from the quote you still allow the fill. They are not the same number.",
    intro:
      "Slippage vs price impact: what's the difference? Price impact is the worse price your own size creates. Slippage is the extra movement you are willing to tolerate before the trade should fail.\n\nA 100 USDC swap in a deep ETH pool barely moves the price. The same 100 USDC in a new memecoin pool can move it several percent. That move is impact, and it is already in the quote. Slippage is the guard on top: if the pool moves further before you are included, the transaction reverts instead of filling at a bad price.",
    sections: [
      {
        heading: "A number you can check",
        body: "If the quote says you receive 99 USDC and you set slippage to 0.5 percent, the minimum received is about 98.5 USDC. Do not sign if that floor is below what you will accept. Raising slippage to force a thin pool through is how people donate to the pool.",
      },
      {
        heading: "What to do when it reverts",
        body: "A revert means the pool moved past your floor. Request a new quote. Do not keep the old minimum. On a busy memecoin, wait or cut the size. Splitting a large clip often loses less than one aggressive swap.",
      },
    ],
    faqs: [
      {
        question: "Is 0.5 percent always safe?",
        answer: "It is a normal setting on deep pairs. On a thin pool it can still fill at a painful impact, because impact is inside the quote, not outside it.",
      },
    ],
  },
  "/learn/gas-fees-explained-across-chains": {
    figure: SCALE,
    description:
      "Gas is the network fee, paid in ETH, BNB, POL, AVAX, or SOL. It is separate from the platform fee, and on Ethereum it can exceed that fee.",
    intro:
      "Gas fees explained across chains means the cost to get a transaction into a block, paid in that chain's native coin, not in the token you are swapping.\n\nEthereum gas is priced in gwei and paid in ETH. A calm swap can be a few dollars. A congested one can be much more, which is why a 30 basis point platform fee on a small clip is sometimes the smaller line. BNB Chain and Polygon gas is usually cents. Solana's base fee is a fraction of a cent, plus an optional priority fee when the network is hot.",
    sections: [
      {
        heading: "Keep the gas coin",
        body: "An ERC-20 balance cannot pay gas. If you hold only USDC on Ethereum, the swap cannot start until you have ETH. After a bridge, the same problem appears on the far side: the tokens arrive, and you still need the destination gas coin.",
      },
      {
        heading: "Chain ids worth checking",
        body: "Ethereum is chain id 1. BNB Chain is 56. Polygon is 137. Arbitrum One is 42161. Base is 8453. Avalanche C-Chain is 43114. A wallet on the wrong id is looking at a different market. Solana is not an EVM chain id at all.",
      },
    ],
    faqs: [
      {
        question: "Does the platform fee include gas?",
        answer: "No. The quote lists them separately. Read both before you sign.",
      },
    ],
  },
  "/learn/what-is-a-liquidity-pool": {
    figure: ROUTE,
    description:
      "A liquidity pool is two tokens locked in a contract that quotes a price from their ratio. Your trade moves that ratio. There is no order book.",
    intro:
      "What is a liquidity pool? It is a contract holding two reserves, and the price it offers is a function of how much of each reserve is left.\n\nYou do not match another person at a posted bid. You trade against the pool. Buy the scarce side and its price rises. Add both sides and you are a liquidity provider, earning fees and taking the risk that one token runs away from the other. That gap is impermanent loss, and it is real even when the fee income looks steady.",
    sections: [
      {
        heading: "Why size matters",
        body: "A pool with 50,000 USDC of depth cannot absorb a 40,000 USDC swap without a harsh price. The quote will show that before you sign. If the minimum received is unacceptable, use a deeper pool or a smaller size. Market cap is not depth. A token can look large and still have a thin pool.",
      },
    ],
    faqs: [
      {
        question: "Is a pool the same as an order book?",
        answer: "No. A pool prices from reserves. An order book prices from resting bids and asks. Most DEX routes you see here are pools.",
      },
    ],
  },
  "/learn/stablecoins-usdc-vs-usdt-vs-dai": {
    description:
      "USDC is issued by Circle, USDT by Tether, and DAI is minted against collateral. Same peg, different contracts, and a bridged copy is a fourth thing.",
    intro:
      "Stablecoins: USDC vs USDT vs DAI are three different contracts that try to stay near one dollar, and they do not share a balance.\n\nUSDC is fiat-backed by Circle. USDT is fiat-backed by Tether and usually the deepest pair on BNB Chain and many non-US venues. DAI is minted by Maker against collateral, so its risk is the collateral and the liquidation rules, not a bank account. On Ethereum the USDC contract people mean is 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 and USDT is 0xdAC17F958D2ee523a2206206994597C13D831ec7. Confirm those strings on Etherscan. A USDC logo on another chain can be a bridged IOU.",
    sections: [
      {
        heading: "Which one to hold",
        body: "Use the stablecoin the pool you need already pairs against. Swapping USDC to USDT just to match a thin pool costs a fee for nothing. If you are bridging, check the destination contract after arrival before you trade it.",
      },
      {
        heading: "What none of them guarantee",
        body: "A peg can slip. This page does not promise redemption, a bank balance, or that a bridged copy is the issuer's native token. The quote is a market price, not a claim on Circle or Tether.",
      },
    ],
    faqs: [
      {
        question: "Is USDC on Base the same token as USDC on Ethereum?",
        answer: "Only if you have checked the contract the issuer or the canonical bridge published. The ticker alone is not that check.",
      },
    ],
  },
  "/learn/what-is-mev-and-how-does-sandwiching-work": {
    description:
      "MEV is value taken from the order of transactions. A sandwich buys before your swap and sells after it, and your slippage setting is the room it uses.",
    intro:
      "What is MEV and how does sandwiching work? A searcher sees your pending swap, buys the token before you, lets your trade push the price, and sells into you.\n\nYour slippage setting is the width of that trap. If you allow 5 percent on a public Ethereum mempool, a searcher can legally fill you near that floor. Private order flow and tighter slippage cut the room. They do not remove miners, validators, or searchers from the chain. On Solana the same idea shows up as priority fees and failed landings, not as an ERC-20 approval.",
    sections: [
      {
        heading: "What to set",
        body: "On a deep pair, 0.5 percent is a normal guard. On a memecoin, a wide setting gets you filled and hurt. If the transaction reverts, take a new quote. Do not raise slippage until the trade goes through and then discover the fill.",
      },
    ],
    faqs: [
      {
        question: "Does XAUConnect pay the searcher?",
        answer: "No. The loss, if it happens, is a worse price inside the slippage you signed. The platform fee is a separate line.",
      },
    ],
  },
  "/learn/meme-coin-risks-every-trader-should-know": {
    description:
      "A meme coin can be unsellable, copied, or emptied by a thin pool. The ticker is not identity. Check the contract and try a small sell before you size up.",
    intro:
      "Meme coin risks every trader should know start with this: the chart can be real and the exit can still be fake.\n\nAnyone can deploy a token with a famous name. The contract can tax sells, block wallets, or mint more supply. A pool can hold the only liquidity, and the deployer can pull it. XAUConnect will show a quote if a pool exists. A quote is not a safety review. Buy a small amount, sell it back, and read both minimums. If the sell quote collapses, stop.",
    sections: [
      {
        heading: "The check that matters",
        body: "Match the full contract on the explorer for that chain. Look for a verified source, whether the owner can mint, and whether liquidity is locked. None of those checks are a promise. They only remove the obvious traps.",
      },
    ],
    faqs: [
      {
        question: "If it has a quote, can I sell later?",
        answer: "Not always. A buy quote does not prove a later sell will clear. Test the sell while the size is small.",
      },
    ],
  },
  "/learn/how-order-routing-finds-the-best-price": {
    figure: ROUTE,
    description:
      "Order routing tries direct pools and multi-hop paths, then keeps the one with the higher minimum received. Hop count is not the score.",
    intro:
      "How order routing finds the best price is by scoring routes on what you receive, not on how short the path looks.\n\nA direct pool is one hop. A multi-hop path might go token to USDC to ETH. Each hop takes a pool fee and some impact. The router still picks the detour when the net amount is higher. Your job is to read the minimum on the winning route. If a two-hop path pays more than a thin direct pool, the detour is the better trade.",
    sections: [
      {
        heading: "Where this fails",
        body: "Routing cannot invent liquidity. If every pool is thin, every route is bad. Cut the size. Routing also cannot see a pool on a chain your wallet is not using.",
      },
    ],
    faqs: [
      {
        question: "Should I always pick the fewest hops?",
        answer: "No. Compare the minimum received. That number already includes every hop.",
      },
    ],
  },
  "/learn/guides/how-to-swap-tokens-on-xauconnect": {
    figure: ROUTE,
    description:
      "Open Swap, pick the chain, enter the amount, and sign only if the minimum received is acceptable. EVM may ask for an approval first. Solana does not.",
    intro:
      "How to swap tokens on XAUConnect: connect the wallet on the chain you mean to use, enter the amount, read the minimum you will receive, and sign.\n\nThe whole action is about a minute when the quote is fresh. If a minute passes, request a new quote. The old minimum is for a pool that has already moved.",
    sections: [
      {
        heading: "EVM",
        body: "Confirm the chain id in the wallet. If the token is an ERC-20 and the allowance is short, the wallet asks for an approval first. That is a separate transaction. Then confirm the swap. Gas is the native coin: ETH on Ethereum, Base, and Arbitrum, BNB on BNB Chain, POL on Polygon, AVAX on Avalanche.",
      },
      {
        heading: "Solana",
        body: "Use a Solana wallet such as Phantom. There is no ERC-20 approval. The preview shows the balance changes. If simulation fails, cut the size or raise the priority fee and quote again. You cannot send an SPL token to a 0x address.",
      },
    ],
    faqs: [
      {
        question: "What if the button stays disabled?",
        answer: "The wallet is on the wrong network, the amount is empty, or the quote failed. Check the chain first.",
      },
    ],
  },
  "/learn/guides/how-to-connect-metamask-to-a-dex": {
    description:
      "Install MetaMask, open XAUConnect, choose MetaMask, and check the chain id before you sign. Mobile can open the site inside the wallet app.",
    intro:
      "How to connect MetaMask to a DEX on XAUConnect: use the connect button, pick MetaMask, and approve the connection in the extension or the phone app.\n\nConnection does not move funds. It lets the site ask the wallet to sign later. Before any swap, read the network name. Ethereum is chain id 1. If the extension still says Ethereum while you meant Base, you are about to trade the wrong market.",
    sections: [
      {
        heading: "Mobile",
        body: "If the browser cannot see the extension, open xauconnect.com inside the MetaMask app browser, or use WalletConnect from the connect dialog. Approve the request in the app. A connection that times out was not approved.",
      },
    ],
    faqs: [
      {
        question: "Does connecting reveal my seed phrase?",
        answer: "No. A connect request never asks for the seed. If a page asks for the seed, close it.",
      },
    ],
  },
  "/learn/guides/how-to-bridge-assets-between-chains": {
    figure: BRIDGE,
    description:
      "Pick the source chain, the destination chain, and both tokens. Keep gas on each side. Do not bridge if a same-chain pool already does the job.",
    intro:
      "How to bridge assets between chains: choose the source, the destination, and the two token contracts, then sign only if the quoted arrival amount is enough.\n\nYou need the source gas coin to send and the destination gas coin after the tokens arrive. The object that arrives has a different address. Check it on the destination explorer before you trade it.",
    sections: [
      {
        heading: "A reason to stop",
        body: "If you only wanted to swap USDC for ETH on Ethereum, do not bridge. A same-chain swap is one market. A bridge is two markets and a wait, and this site will not promise how long the wait is.",
      },
    ],
    faqs: [
      {
        question: "The tokens arrived and I cannot move them. Why?",
        answer: "You have no gas coin on the destination chain. Bridge or buy a small amount of that native coin, then move the tokens.",
      },
    ],
  },
  "/learn/guides/how-to-verify-a-token-contract-before-trading": {
    figure: KEY,
    description:
      "Copy the full contract into the explorer for that chain. Check the name, the holders, and whether the owner can mint. The ticker is not proof.",
    intro:
      "How to verify a token contract before trading: paste the full address into the explorer for the chain you are on, and read the contract page before you approve anything.\n\nEtherscan, BscScan, Polygonscan, Arbiscan, Basescan, Snowtrace, and Solscan are the explorers for the chains XAUConnect trades. Match every character. Scam tokens copy the first and last four.",
    sections: [
      {
        heading: "What to look at",
        body: "Verified source is better than a nameless bytecode blob. A mint function with an active owner is extra supply risk. A proxy can change behaviour later. None of this is a guarantee. It is the minimum reading before a large size.",
      },
    ],
    faqs: [
      {
        question: "The logo matches. Is that enough?",
        answer: "No. Logos are cheap. The address is the identity.",
      },
    ],
  },
  "/learn/guides/how-to-revoke-token-approvals": {
    figure: KEY,
    description:
      "Revoking sets an ERC-20 allowance back to zero. It is a normal transaction, it costs gas, and it does not move the tokens you already hold.",
    intro:
      "How to revoke token approvals: open the token's allowance for that spender and set it to zero, then confirm the transaction in your wallet.\n\nYou pay gas in the chain's native coin. The tokens stay in your wallet. Only the permission disappears. Do this for unlimited approvals you do not remember, especially on Ethereum where old spenders are a common loss. Solana swaps do not leave an ERC-20 allowance behind.",
    sections: [
      {
        heading: "What not to revoke in a panic",
        body: "If you are mid-trade, revoking the router you are about to use will make the next swap fail until you approve again. Revoke after the trade, or revoke spenders that are not today's router.",
      },
    ],
    faqs: [
      {
        question: "Does revoke return tokens a contract already took?",
        answer: "No. It only stops future spends. Tokens already transferred are gone.",
      },
    ],
  },
  "/learn/guides/how-to-set-slippage-tolerance": {
    figure: SCALE,
    description:
      "Set slippage to the extra price move you will tolerate after the quote. Start at 0.5 percent on deep pairs. Widen it only when you accept a worse fill.",
    intro:
      "How to set slippage tolerance: read the minimum received, decide the worst fill you will accept, and put that gap in the slippage field before you sign.\n\nOn ETH to USDC, 0.5 percent is a common start. On a memecoin, the quote may already include a large price impact. Adding a wide slippage on top lets the fill get worse still. If the swap reverts, the setting did its job. Take a fresh quote instead of raising the number until it hurts.",
    sections: [
      {
        heading: "Impact is not slippage",
        body: "Impact is already in the quoted amount. Slippage is movement after that quote. Mixing the two names is how people allow a 10 percent loss and call it a setting.",
      },
    ],
    faqs: [
      {
        question: "What number does XAUConnect start with?",
        answer: "The interface starts near 0.5 percent. You can change it per trade. The minimum on the button is the number that will be enforced.",
      },
    ],
  },
  "/chains/ethereum": {
    figure: SCALE,
    description:
      "Trade on Ethereum with XAUConnect. Chain id 1, gas in ETH, about 12 second blocks. Read the minimum received before you sign.",
    intro:
      "Trade on Ethereum with XAUConnect if you already hold ETH for gas and you want the deepest blue-chip pools.\n\nChain id is 1. Blocks are about 12 seconds. Gas is paid in ETH and can cost more than the platform fee on a small swap. WETH, the ERC-20 wrapper, is 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2. Native ETH and WETH are not the same contract. Confirm both on Etherscan.",
    sections: [
      {
        heading: "When Ethereum is the wrong chain",
        body: "If the token you want only has depth on Base or Solana, do not force it here. Bridging in just to swap and bridge out pays gas twice. A 30 basis point fee on 1,000 units is 3 units. Ethereum gas can be larger than that.",
      },
    ],
    faqs: [
      {
        question: "Which wallet?",
        answer: "MetaMask, Rabby, or Coinbase Wallet, on chain id 1. The same address on Base is a different balance.",
      },
    ],
  },
  "/chains/solana": {
    description:
      "Trade on Solana with XAUConnect using a Solana wallet. Gas is SOL. There is no ERC-20 approval. Do not send SPL tokens to a 0x address.",
    intro:
      "Trade on Solana with XAUConnect from Phantom, Solflare, or Backpack. You need a little SOL for fees, and the token is an SPL mint, not an Ethereum contract.\n\nSlots are well under a second. The base fee is tiny. A priority fee matters when mints are hot and your transaction does not land. There is no separate approval transaction. If the preview looks wrong, reject it. You cannot paste a Solana mint into MetaMask and expect a balance.",
    sections: [
      {
        heading: "What this page will not do",
        body: "It will not turn SOL into ETH inside one Ethereum transaction. That is a bridge, with a different destination mint. Test the mint address on Solscan before a large size.",
      },
    ],
    faqs: [
      {
        question: "Why did the swap fail simulation?",
        answer: "The pool moved, the priority fee was too low, or the mint was wrong. Quote again with a smaller size before you raise fees.",
      },
    ],
  },
  "/chains/bsc": {
    description:
      "Trade on BNB Chain with XAUConnect. Chain id 56, gas in BNB, blocks around 3 seconds. Confirm the wallet is not still on Ethereum.",
    intro:
      "Trade on BNB Chain with XAUConnect only after the wallet shows chain id 56. Gas is BNB, and a wallet left on Ethereum will hide the balance you think you have.\n\nBlocks are about 3 seconds. Fees are usually a fraction of a dollar. USDT pairs are the common depth. The explorer is BscScan. A token with the same ticker as an Ethereum coin is a different contract. Check it before you approve.",
    sections: [
      {
        heading: "A limit",
        body: "Cheap gas does not make a thin memecoin safe. The price impact is still in the quote. If the minimum received is poor, the low fee will not save the trade.",
      },
    ],
    faqs: [
      {
        question: "Which wallet on BNB Chain?",
        answer: "MetaMask or Trust Wallet, switched to chain id 56. Trust the network badge, not the token ticker.",
      },
    ],
  },
  "/chains/base": {
    description:
      "Trade on Base with XAUConnect. Chain id 8453, gas in ETH. Base is an L2, so the ETH here is not your Ethereum mainnet balance.",
    intro:
      "Trade on Base with XAUConnect when the pool you need is on Base, chain id 8453. Gas is ETH on Base, which is not the ETH sitting on Ethereum mainnet.\n\nYou get onto Base by bridging or by buying ETH there. A swap on Base never spends mainnet ETH. Coinbase Wallet, MetaMask, and Rabby can add chain id 8453. Confirm it in the header before you sign. Newer memecoins here need a contract check on Basescan.",
    sections: [
      {
        heading: "When to stay on mainnet",
        body: "If the deep pool is on Ethereum and your size is large, Base's cheaper gas does not create depth. Use the chain where the pool can absorb the order.",
      },
    ],
    faqs: [
      {
        question: "Is Base ETH the same balance as Ethereum ETH?",
        answer: "No. Same ticker, different chain. You bridge or buy to get ETH on Base.",
      },
    ],
  },
  "/chains/arbitrum": {
    description:
      "Trade on Arbitrum One with XAUConnect. Chain id 42161, gas in ETH. This is not Arbitrum Nova, and the ETH is not mainnet ETH.",
    intro:
      "Trade on Arbitrum One with XAUConnect on chain id 42161. Gas is ETH on Arbitrum, posted later to Ethereum, and your mainnet ETH balance is a different account state.\n\nUse an EVM wallet with Arbitrum One selected. Do not confuse it with Arbitrum Nova. The explorer is Arbiscan. ETH, USDC, and ARB ecosystem tokens are where the depth usually sits. A bridged asset from another L2 can be a thinner pool than the native listing.",
    sections: [
      {
        heading: "What to watch",
        body: "Quotes include a gas estimate. Congestion can still delay inclusion. If the quote is a minute old, refresh it. The platform fee and the L2 gas are separate lines.",
      },
    ],
    faqs: [
      {
        question: "Which Arbitrum?",
        answer: "Arbitrum One, chain id 42161. Nova is a different network.",
      },
    ],
  },
  "/chains/polygon": {
    description:
      "Trade on Polygon with XAUConnect. Chain id 137, gas in POL. Keep a little POL or approvals and swaps both fail.",
    intro:
      "Trade on Polygon with XAUConnect on chain id 137. Gas is POL. An empty POL balance blocks the swap even when the token balance looks fine.\n\nBlocks are about 2 seconds. Bridged assets can be thinner here than on Ethereum. The explorer is Polygonscan. Any EVM wallet can add Polygon. The check is the network badge before you approve.",
    sections: [
      {
        heading: "A limit",
        body: "Low gas is not depth. Size the trade against the pool, not against the token's market cap. If the minimum received is weak, cut the size.",
      },
    ],
    faqs: [
      {
        question: "Is MATIC still the gas token?",
        answer: "The gas token on chain id 137 is POL. If your wallet still labels an old MATIC balance, confirm you are spending the native coin the network accepts.",
      },
    ],
  },
  "/chains/avalanche": {
    description:
      "Trade on Avalanche C-Chain with XAUConnect. Chain id 43114, gas in AVAX. Do not use an X-Chain or P-Chain address for this.",
    intro:
      "Trade on Avalanche C-Chain with XAUConnect on chain id 43114. Gas is AVAX. X-Chain and P-Chain addresses are a different system and will not complete this swap.\n\nThe explorer is Snowtrace. Subnet activity does not mean the C-Chain pool is deep. Read the minimum received on C-Chain. Add Avalanche C-Chain in the EVM wallet and check the id before you sign.",
    sections: [
      {
        heading: "When this is the wrong network",
        body: "If the token only trades on a subnet, this page cannot reach it. If you wanted Ethereum liquidity, bridging here first is an extra hop you may not need.",
      },
    ],
    faqs: [
      {
        question: "Why is my AVAX invisible in the swap?",
        answer: "The wallet is on the wrong chain, or the funds are on X-Chain. This app uses C-Chain, id 43114.",
      },
    ],
  },
  "/swap/ethereum/eth-ether": {
    figure: SCALE,
    description:
      "Swap Ether (ETH) on Ethereum, chain id 1. Gas is the same ETH you may be selling, so leave enough for the fee. WETH is a different contract.",
    intro:
      "Swap Ether (ETH) on Ethereum when the wallet is on chain id 1 and you have left enough ETH for gas after the amount you sell.\n\nIf you sell your entire ETH balance, the transaction cannot pay for itself. Keep a remainder. Wrapped Ether is 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2. Swapping ETH to USDC is not the same trade as unwrapping WETH. A 30 basis point fee on 1,000 dollars is about 3 dollars, and Ethereum gas can be larger. Read both lines. XAUConnect does not hold the ETH.",
    sections: [
      {
        heading: "When to skip it",
        body: "Skip the swap if the minimum received is below your floor, or if MetaMask is on Base or Arbitrum. Those balances are not this ETH.",
      },
    ],
    faqs: [
      {
        question: "Does this page wrap ETH?",
        answer: "Only if the quote you sign is ETH to WETH. Read the token out before you confirm.",
      },
    ],
  },
  "/swap/ethereum/usdt-tether-usd": {
    description:
      "Swap Tether USD (USDT) on Ethereum at 0xdAC17F958D2ee523a2206206994597C13D831ec7. Match the full address. A bridged USDT is a different token.",
    intro:
      "Swap Tether USD (USDT) on Ethereum against the contract 0xdAC17F958D2ee523a2206206994597C13D831ec7. That string is the check. The logo is not.\n\nUSDT is Tether's dollar token. It is not USDC and not DAI. You need ETH for gas. The first swap also needs an approval if the allowance is short. On 1,000 USDT, 30 basis points is 3 USDT before gas. The live fee line can differ. Do not bridge USDT just to swap it if a deep pool already exists on Ethereum.",
    sections: [
      {
        heading: "A limit",
        body: "This quote is a market price. It is not a promise that Tether will redeem the token, and it is not the USDT contract on another chain.",
      },
    ],
    faqs: [
      {
        question: "Why does the wallet ask twice?",
        answer: "The first prompt is the approval. The second is the swap. Reject either one if the spender or the amount looks wrong.",
      },
    ],
  },
  "/swap/ethereum/usdc-usd-coin": {
    description:
      "Swap USD Coin (USDC) on Ethereum at 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48. Circle's token, not a bridged copy, and not USDT.",
    intro:
      "Swap USD Coin (USDC) on Ethereum using 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48. Confirm that address on Etherscan before you approve.\n\nUSDC is Circle's dollar token. DAI is a different system. USDT is a different issuer. Gas is ETH. USDC on Base or Arbitrum does not spend this balance. If your goal is USDC on another chain, that is a bridge, and the contract that arrives must be checked again.",
    sections: [
      {
        heading: "Cost",
        body: "A 30 basis point fee on 1,000 USDC is 3 USDC before gas and the pool fee. On Ethereum the gas can dominate a small clip. If the minimum received is worse than you accept, do not sign.",
      },
    ],
    faqs: [
      {
        question: "Is every USDC the native Circle token?",
        answer: "No. Bridged copies use other addresses. This page is the Ethereum contract above.",
      },
    ],
  },
  "/swap/ethereum/weth-wrapped-ether": {
    description:
      "Swap Wrapped Ether (WETH) on Ethereum at 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2. Unwrapping stays on Ethereum. It does not bridge.",
    intro:
      "Swap Wrapped Ether (WETH) on Ethereum at 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2. WETH is the ERC-20 wrapper of ETH on chain id 1.\n\nUnwrapping WETH to ETH stays on Ethereum. It does not deliver ETH on Base, Arbitrum, or Solana. Those are other contracts. You still need a little ETH for gas, because WETH cannot pay the fee. Treat a token that only copies the WETH name as untrusted until the address matches.",
    sections: [
      {
        heading: "When the wrapper is the wrong tool",
        body: "If you need ETH on another network, bridge. If you need an ERC-20 on Ethereum to use in a pool, WETH is the usual form. Read the token out on the quote so you do not unwrap by accident.",
      },
    ],
    faqs: [
      {
        question: "Is WETH worth less than ETH?",
        answer: "The wrapper is meant to track ETH on Ethereum. A thin unofficial pool can still misprice it. Use a deep route and read the minimum.",
      },
    ],
  },
  "/swap/ethereum/wbtc-wrapped-btc": {
    description:
      "Swap Wrapped BTC (WBTC) on Ethereum at 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599. It is an ERC-20 claim on BTC, not bitcoin on the Bitcoin chain.",
    intro:
      "Swap Wrapped BTC (WBTC) on Ethereum at 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599. WBTC is an ERC-20 on Ethereum. It is not a Bitcoin transaction and it will not arrive in a Bitcoin wallet.\n\nGas is ETH. The pool is only as deep as the Ethereum reserves. A 30 basis point fee on a 1,000 dollar clip is about 3 dollars, usually smaller than gas. Confirm the address on Etherscan. Other BTC tickers on Ethereum are different products.",
    sections: [
      {
        heading: "A limit",
        body: "This page does not redeem WBTC for bitcoin on the Bitcoin network. If that is the job, you need the issuer's process, not a DEX swap.",
      },
    ],
    faqs: [
      {
        question: "Can I send WBTC to a Bitcoin address?",
        answer: "No. WBTC moves on Ethereum. A Bitcoin address cannot hold it.",
      },
    ],
  },
  "/swap/solana/sol-solana": {
    figure: SCALE,
    description:
      "Swap Solana (SOL) on Solana from a Solana wallet. Leave SOL for fees. There is no ERC-20 approval. Do not send it to a 0x address.",
    intro:
      "Swap Solana (SOL) on Solana from Phantom, Solflare, or Backpack. Keep some SOL for the fee after the amount you sell, or the transaction cannot land.\n\nThere is no approval step. The wallet preview is the whole check. Priority fees rise when the network is busy. If simulation fails, cut the size and quote again. SOL on an exchange account is not this mint until you withdraw it to the wallet that will sign. XAUConnect does not custody the SOL.",
    sections: [
      {
        heading: "Wrong destination",
        body: "An Ethereum 0x address cannot receive SOL. If you need a wrapped representation on Ethereum, that is a bridge, and the asset that arrives is not this mint.",
      },
    ],
    faqs: [
      {
        question: "Why is there only one signature?",
        answer: "Solana swaps do not use ERC-20 allowances. One signature covers the trade.",
      },
    ],
  },
  "/swap/bsc/bnb-eeeeee": {
    description:
      "Swap BNB (BNB) on BNB Chain, chain id 56. Gas is BNB, so do not spend the full balance. A BNB token on Ethereum is a different asset.",
    intro:
      "Swap BNB (BNB) on BNB Chain only when the wallet shows chain id 56. Gas is BNB. Selling the entire balance leaves nothing to pay the fee.\n\nBlocks are about 3 seconds. A BNB-pegged token on Ethereum is not this balance. Check BscScan for the contract you are buying, not for BNB itself when you are spending native BNB. If the minimum received is poor, the cheap gas will not repair a thin pool.",
    sections: [
      {
        heading: "Wallet check",
        body: "MetaMask and Trust Wallet both work. The failure mode is a wallet still sitting on Ethereum. Switch the network before you look at the amount.",
      },
    ],
    faqs: [
      {
        question: "Is BNB on Ethereum the same coin?",
        answer: "No. Native BNB for this swap lives on chain id 56. A token with the same name on Ethereum is a separate contract.",
      },
    ],
  },
};

/** Extra sections: a confusion, a worked case, and one link in a sentence that is already about that page. */
const MORE: Record<string, Block["sections"]> = {
  "/learn/what-is-a-dex-aggregator": [
    {
      heading: "What people mix it up with",
      body: "A DEX aggregator is not the exchange that holds your deposit, and it is not a bridge. If you need the path that produced the price, read [how order routing finds the best price](/learn/how-order-routing-finds-the-best-price). If you are ready to trade, open [the swap](/swap) and judge the minimum received, not the headline rate.",
    },
  ],
  "/learn/what-is-a-token-approval-and-why-does-it-matter": [
    {
      heading: "The next step after the trade",
      body: "When the swap is done, clear spenders you will not use again. The steps are in [how to revoke token approvals](/learn/guides/how-to-revoke-token-approvals). Before the first approval on a new ticker, [verify the contract](/learn/guides/how-to-verify-a-token-contract-before-trading).",
    },
  ],
  "/learn/how-do-cross-chain-bridges-work": [
    {
      heading: "Do this on a real pair",
      body: "Pick the source chain, the destination chain, and both contracts. The click-path is [how to bridge assets between chains](/learn/guides/how-to-bridge-assets-between-chains). Stay on one chain when both tokens already pool there. A bridge is the wrong tool for a same-chain swap.",
    },
  ],
  "/learn/slippage-vs-price-impact-what-s-the-difference": [
    {
      heading: "Where you set the number",
      body: "The field is on the quote, and the button shows the minimum that results. [How to set slippage tolerance](/learn/guides/how-to-set-slippage-tolerance) walks through a 0.5 percent case. Widening it to force a thin pool is the mistake. A revert is the setting working.",
    },
  ],
  "/learn/gas-fees-explained-across-chains": [
    {
      heading: "Which coin pays it",
      body: "ETH on Ethereum, Base, and Arbitrum. BNB on chain id 56. POL on Polygon. AVAX on Avalanche C-Chain. SOL on Solana. The platform fee is a separate line. [Trade on Ethereum](/chains/ethereum) is where gas most often exceeds that fee. On [Solana](/chains/solana) the base fee is usually the smaller number.",
    },
  ],
  "/learn/what-is-a-liquidity-pool": [
    {
      heading: "Depth is not market cap",
      body: "A token can show a large market cap and still have a pool too small for your order. The quote is the depth check. If you are providing both sides, the risk that one coin runs away from the other is impermanent loss, which is a different page from this definition. For a swap, open [the swap](/swap) and read the minimum.",
    },
  ],
  "/learn/stablecoins-usdc-vs-usdt-vs-dai": [
    {
      heading: "Do not swap them without a reason",
      body: "USDC to USDT costs a fee to hold the same dollar. Do it when the pool you need is paired with the other ticker. On Ethereum, start from [USDT](/swap/ethereum/usdt-tether-usd) or [USDC](/swap/ethereum/usdc-usd-coin) and confirm the contract before you approve. A bridged copy on another chain is a fourth asset.",
    },
  ],
  "/learn/what-is-mev-and-how-does-sandwiching-work": [
    {
      heading: "The setting that limits the damage",
      body: "Your slippage is the room a sandwich can use. Keep it tight on deep pairs and take a new quote if the trade reverts. The field is explained in [how to set slippage tolerance](/learn/guides/how-to-set-slippage-tolerance). A private route can hide the transaction from the public mempool. It does not change the pool's price impact.",
    },
  ],
  "/learn/meme-coin-risks-every-trader-should-know": [
    {
      heading: "The test that is worth more than the chart",
      body: "Buy a small amount and sell it back. If the sell minimum collapses, the pool or the tax is the product. Match the contract first, using [how to verify a token contract before trading](/learn/guides/how-to-verify-a-token-contract-before-trading). A quote on XAUConnect only means a pool exists.",
    },
  ],
  "/learn/how-order-routing-finds-the-best-price": [
    {
      heading: "What you do with the result",
      body: "The winning route is the one with the higher minimum, even if it has two hops. That idea is the whole of [what a DEX aggregator is](/learn/what-is-a-dex-aggregator). Open [the swap](/swap), compare the routes, and reject the quote if the floor is worse than you will take.",
    },
  ],
  "/learn/guides/how-to-swap-tokens-on-xauconnect": [
    {
      heading: "Before you raise the amount",
      body: "Do one small swap and read the receipt on the explorer. Then increase size. If you are on Ethereum, leave ETH for gas. The chain notes are on [Trade on Ethereum](/chains/ethereum). On Solana, leave SOL and use [Trade on Solana](/chains/solana). An approval, if the wallet asks, is explained in [what a token approval is](/learn/what-is-a-token-approval-and-why-does-it-matter).",
    },
  ],
  "/learn/guides/how-to-connect-metamask-to-a-dex": [
    {
      heading: "Connection is not a trade",
      body: "After MetaMask connects, nothing has moved. The next page is [how to swap tokens on XAUConnect](/learn/guides/how-to-swap-tokens-on-xauconnect). Check chain id 1 for Ethereum, 8453 for Base, 42161 for Arbitrum One, 56 for BNB Chain, 137 for Polygon, and 43114 for Avalanche C-Chain. A seed-phrase prompt is not this connection. Close that tab.",
    },
  ],
  "/learn/guides/how-to-bridge-assets-between-chains": [
    {
      heading: "What has to be true before you sign",
      body: "You can pay gas on the source chain, and you will be able to pay gas on the destination. You have checked both token addresses. If either check fails, stop. The mechanism is [how cross-chain bridges work](/learn/how-do-cross-chain-bridges-work). A same-chain pair does not need this guide.",
    },
  ],
  "/learn/guides/how-to-verify-a-token-contract-before-trading": [
    {
      heading: "Then try the exit",
      body: "A verified contract can still tax sells or sit on a thin pool. After the address matches, quote a small sell as well as a buy. Meme-coin traps are listed in [meme coin risks](/learn/meme-coin-risks-every-trader-should-know). If you already approved the wrong spender, [revoke it](/learn/guides/how-to-revoke-token-approvals).",
    },
  ],
  "/learn/guides/how-to-revoke-token-approvals": [
    {
      heading: "Which allowance to clear",
      body: "Clear unlimited allowances on spenders you do not recognise. Leave the router you are about to use until the swap confirms, or the next transaction will ask for approval again. Why the allowance exists is [what a token approval is](/learn/what-is-a-token-approval-and-why-does-it-matter). This costs gas. It does not return tokens already taken.",
    },
  ],
  "/learn/guides/how-to-set-slippage-tolerance": [
    {
      heading: "A 1,000 USDC example",
      body: "The quote says 1,000 USDC out. At 0.5 percent the floor is about 995 USDC. At 5 percent it is about 950 USDC. The second number is what a sandwich can fill you at on a public mempool. The difference between that guard and the price your size already moved is [slippage versus price impact](/learn/slippage-vs-price-impact-what-s-the-difference).",
    },
  ],
  "/chains/ethereum": [
    {
      heading: "Tokens people mean on this chain",
      body: "ETH for gas and for trading, [WETH](/swap/ethereum/weth-wrapped-ether) when a pool wants an ERC-20, [USDC](/swap/ethereum/usdc-usd-coin) and [USDT](/swap/ethereum/usdt-tether-usd) for dollars, [WBTC](/swap/ethereum/wbtc-wrapped-btc) for a bitcoin claim. None of those contracts are the asset on another chain. Gas versus the platform fee is [gas fees explained across chains](/learn/gas-fees-explained-across-chains).",
    },
  ],
  "/chains/solana": [
    {
      heading: "What to open next",
      body: "Swap [SOL](/swap/solana/sol-solana) from a Solana wallet, not from MetaMask. There is no approval step, which is why [token approvals](/learn/what-is-a-token-approval-and-why-does-it-matter) do not apply here. If the coins you want are on Ethereum, that is a bridge, not this page.",
    },
  ],
  "/chains/bsc": [
    {
      heading: "What to open next",
      body: "Spend native [BNB](/swap/bsc/bnb-eeeeee) on chain id 56, and keep some for gas. A token named BNB on Ethereum is not this balance. USDT is the usual pair. Confirm the contract on BscScan using [how to verify a token contract](/learn/guides/how-to-verify-a-token-contract-before-trading).",
    },
  ],
  "/chains/base": [
    {
      heading: "What to open next",
      body: "Get ETH onto Base before you swap. Mainnet ETH will not pay this gas. If the deep pool is still on [Ethereum](/chains/ethereum), stay there for large size. Cheap L2 gas does not create depth.",
    },
  ],
  "/chains/arbitrum": [
    {
      heading: "What to open next",
      body: "Use Arbitrum One, chain id 42161, not Nova. ETH here is not [Ethereum mainnet ETH](/chains/ethereum). Read the gas line separately from the platform fee, as in [gas fees explained across chains](/learn/gas-fees-explained-across-chains).",
    },
  ],
  "/chains/polygon": [
    {
      heading: "What to open next",
      body: "Keep POL for gas on chain id 137. A token balance with no POL cannot move. Bridged assets are often thinner than the Ethereum listing. If the size is large, compare the quote with [Ethereum](/chains/ethereum) before you bridge in.",
    },
  ],
  "/chains/avalanche": [
    {
      heading: "What to open next",
      body: "C-Chain only, chain id 43114, gas in AVAX. An X-Chain address will not complete the swap. Subnet tokens are out of scope. If you wanted Ethereum liquidity, start on [Ethereum](/chains/ethereum) instead of bridging here first.",
    },
  ],
  "/swap/ethereum/eth-ether": [
    {
      heading: "Leave gas, then read the floor",
      body: "Selling every ETH fails because the fee is also ETH. Leave a remainder. If the pool wants an ERC-20, the asset is [WETH](/swap/ethereum/weth-wrapped-ether), not this balance. Chain id 1 is required. The longer note is [trade on Ethereum](/chains/ethereum).",
    },
  ],
  "/swap/ethereum/usdt-tether-usd": [
    {
      heading: "Do not treat every dollar ticker as this token",
      body: "This contract is Tether's USDT on Ethereum. [USDC](/swap/ethereum/usdc-usd-coin) is Circle. DAI is Maker. The three-way difference is [USDC vs USDT vs DAI](/learn/stablecoins-usdc-vs-usdt-vs-dai). Approve only this address, then [revoke](/learn/guides/how-to-revoke-token-approvals) if you will not trade it again.",
    },
  ],
  "/swap/ethereum/usdc-usd-coin": [
    {
      heading: "Native here, something else elsewhere",
      body: "This is Circle's USDC on Ethereum. USDC on Base is not spent from this balance. If you only needed dollars against ETH, you are in the right place. If you needed [USDT](/swap/ethereum/usdt-tether-usd), that is a different issuer and a different contract.",
    },
  ],
  "/swap/ethereum/weth-wrapped-ether": [
    {
      heading: "Unwrap or bridge",
      body: "WETH to ETH stays on Ethereum. ETH on Base or Arbitrum is a bridge, described in [how cross-chain bridges work](/learn/how-do-cross-chain-bridges-work). You still need a little native [ETH](/swap/ethereum/eth-ether) for gas, because WETH cannot pay it.",
    },
  ],
  "/swap/ethereum/wbtc-wrapped-btc": [
    {
      heading: "What this swap cannot finish",
      body: "You receive an ERC-20 on Ethereum. You do not receive bitcoin on the Bitcoin chain, and you cannot paste a Bitcoin address as the destination. If you wanted dollar liquidity instead, compare the quote against [USDC](/swap/ethereum/usdc-usd-coin) or [USDT](/swap/ethereum/usdt-tether-usd) and keep the better minimum.",
    },
  ],
  "/swap/solana/sol-solana": [
    {
      heading: "One signature, then stop",
      body: "There is no approval to revoke afterward. If the preview is wrong, reject it. MetaMask cannot hold this mint. The chain notes are [trade on Solana](/chains/solana). A wrapped asset on Ethereum is a bridge, not a second click on this page.",
    },
  ],
  "/swap/bsc/bnb-eeeeee": [
    {
      heading: "Chain id first",
      body: "If the wallet still says Ethereum, you are not looking at this BNB. Switch to chain id 56, leave BNB for gas, then read the minimum. The chain page is [trade on BNB Chain](/chains/bsc). A token named BNB on Ethereum is a different asset.",
    },
  ],
};

export function authoredFor(page: SeoPageConfig): Block | undefined {
  const block = PAGES[page.path];
  if (!block) return undefined;
  const extra = MORE[page.path];
  if (!extra?.length) return block;
  return { ...block, sections: [...block.sections, ...extra] };
}

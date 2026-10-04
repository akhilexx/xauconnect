/**
 * Commercial long-form articles: create / generate crypto tokens, add
 * liquidity, make them swappable. Written from XAUConnect Launchpad
 * (TokenFactory + bonding-curve Launchpad) plus honest Solana SPL notes.
 */
import type { RichContent } from "./content-expand.js";

export const CREATE_LEARN_CONTENT: Record<string, RichContent> = {
  "how-to-create-an-erc-20-token": {
    intro:
      "An ERC-20 is a smart contract on an EVM chain that tracks balances and allowances. Creating one is not “listing on Coinbase.” It is deploying bytecode, receiving a contract address, and then — separately — adding liquidity so anyone can swap it. XAUConnect’s Launchpad does the deploy step through TokenFactory: your wallet pays a small native launch fee, the factory mints the entire supply to you, and the token is a LaunchedToken — fixed supply, no owner mint, no blacklist, no transfer tax.\n\nIf factory contracts are not live on the chain you picked, the wizard still pins metadata and finishes in demo mode. Connect a wallet and pick a chain with a deployed TokenFactory when you want a real address.",
    sections: [
      {
        heading: "What TokenFactory actually deploys",
        body:
          "LaunchedToken is an OpenZeppelin ERC-20 + permit token. At construction it mints `totalSupply` (18 decimals) to you. There is no later mint function, no pause, no blacklist. The `creator` field and `metadataURI` (ipfs:// JSON for logo, description, socials) are recorded for provenance. That honesty is the point: traders on XAUConnect are taught to treat mint and blacklist hooks as rug surfaces.\n\nBonding-curve launches use a different contract (`createLaunch` on Launchpad) and a different distribution model. This article is the standard fixed-supply path.",
      },
      {
        heading: "Wizard steps (Type → Details → Liquidity → Review)",
        body:
          "Choose standard launch and an EVM chain (Ethereum, BNB Chain, Polygon, Arbitrum, Base, Avalanche C-Chain). Name and symbol (1–12 characters, A–Z and 0–9). Supply is an integer of whole tokens; the app scales it by 18 decimals for the contract. Optional logo (under 1 MB) and socials get pinned with metadata when storage is configured.\n\nLiquidity settings (create pool, lock, lock duration, fee currency) are how you tell the world you intend this token to be swappable. A deploy with no LP is a contract sitting in your wallet. Traders cannot swap air.",
      },
      {
        heading: "What you sign and what you pay",
        body:
          "The wallet calls `createToken(name, symbol, totalSupply, metadataURI)` and attaches native coin to cover the launch fee (on the order of 0.01 native in the default config; excess is refunded). You need gas on top of that fee. Ethereum mainnet makes experimentation expensive; Base, Arbitrum, BNB Chain, and Polygon are where most first tokens actually land.\n\nXAUConnect does not hold the supply. It lands in the connected wallet. If that wallet is a hot browser seed, you just minted a treasury onto a phishing target — use hardware for anything you care about.",
      },
      {
        heading: "After the receipt",
        body:
          "Copy the token address from the explorer (BscScan, Basescan, Etherscan, …). Verify source if you can. Publish that address everywhere. Then add and lock liquidity against a real pairing asset (usually native gas or USDC). Until a pool exists, Swap will not have an honest route.\n\nDo a test buy from a second wallet and a test sell. If you cannot sell, you are not ready to tweet.",
      },
      {
        heading: "What this will not do",
        body:
          "It will not register a trademark, get you a CoinMarketCap tick, or make XAUConnect “endorse” the token. Discover ranking is tape, not a rating. Clones of your ticker will appear; answer with the address.",
      },
    ],
    faqs: [
      {
        question: "Can I mint more later?",
        answer:
          "Not with LaunchedToken. Supply is fixed at deploy. If you need inflation, you are choosing a different, riskier design — and you should disclose it in huge letters.",
      },
      {
        question: "Is this Solidity I have to write?",
        answer:
          "No. The factory deploys the audited-pattern token. You still must understand what you deployed: fixed supply to your wallet, metadata on IPFS, no admin mint.",
      },
      {
        question: "Which chain should I create an ERC-20 on?",
        answer:
          "Where your buyers already hold gas and USDC. Cheap deploys without users are just cheap scams in their neighborhood. One home chain.",
      },
      {
        question: "Can I create an ERC-20 on Solana?",
        answer:
          "No. Solana uses SPL / Token-2022. See the SPL creation guide. Launchpad’s factory is EVM.",
      },
    ],
    description:
      "Create an ERC-20 on XAUConnect Launchpad: TokenFactory deploys a fixed-supply LaunchedToken with no mint, tax, or blacklist — then you add locked liquidity.",
  },

  "how-to-create-an-spl-token-on-solana": {
    intro:
      "Solana tokens are mints, not ERC-20 contracts. XAUConnect’s in-app Launchpad wizard deploys EVM tokens; it will not mint an SPL token for you. Creating an SPL (or Token-2022) asset uses Solana’s token programs: you create a mint, set decimals, mint supply to a token account you control, and then decide whether mint authority and freeze authority still exist.\n\nOnce a pool exists, traders swap that mint on XAUConnect through Jupiter. This article is the honest split: create off-wizard, swap on-app.",
    sections: [
      {
        heading: "Mint, decimals, authorities",
        body:
          "A mint address is the token’s identity — like an ERC-20 address, in base58. Decimals are commonly 6 or 9; they are not 18 by default. Mint authority can print more. Freeze authority can freeze accounts. If you promised a fair, immutable token, revoke both authorities after minting the supply you disclosed. Leaving them in place is a rug surface traders will check on Solscan.",
      },
      {
        heading: "Metadata and the logo people screenshot",
        body:
          "Metaplex-style metadata is how wallets show a name and image. Metadata is not liquidity. A pretty token with no pool is unsellable. Pin metadata carefully; impersonators will copy your art onto a different mint the same afternoon.",
      },
      {
        heading: "Liquidity on Solana",
        body:
          "Seed a pool on a major venue Jupiter already routes (Raydium, Orca, and peers). Pair with SOL or USDC. Lock or burn LP if you told the market you would. Thin unlocked LP is how launches become exit liquidity for the creator.\n\nKeep SOL in the creator wallet for fees. Priority fees during your own launch congestion are part of the budget.",
      },
      {
        heading: "Make it swappable on XAUConnect",
        body:
          "Traders select Solana, paste your mint, and swap. Teach them the mint in every post. Ticker search will also surface clones. You cannot “submit the mint to Ethereum Launchpad” — different VM.",
      },
      {
        heading: "Token-2022 extras",
        body:
          "Transfer fees, interest-bearing, and other extensions can break aggregators or surprise buyers. If you enable them, document them. If you want the widest routing, a plain mint with revoked authorities is the boring, correct choice.",
      },
    ],
    faqs: [
      {
        question: "Why doesn’t Launchpad create SPL tokens?",
        answer:
          "The current wizard calls EVM TokenFactory / Launchpad contracts. Solana creation is a different program. Swap support for SPL is live via Jupiter once liquidity exists.",
      },
      {
        question: "Is creating an SPL token free?",
        answer:
          "You pay SOL rent and transaction fees. It is cheap compared with Ethereum deploy gas, which is why Solana is crowded with junk mints. Cheap is not a moat.",
      },
      {
        question: "How do traders buy the token?",
        answer:
          "Phantom (or another Solana wallet) on XAUConnect Swap, mint pasted, simulation read, small test, then size.",
      },
      {
        question: "Can I bridge my SPL token to Ethereum and call it an ERC-20?",
        answer:
          "Only with a real bridge that mints a documented wrapper. Deploying a random ERC-20 with the same ticker is a fake multi-chain token.",
      },
    ],
    description:
      "Create an SPL token on Solana: mint, decimals, revoke freeze/mint authorities, seed a Jupiter-routable pool, then swap the mint on XAUConnect.",
  },

  "how-to-create-a-token-on-base": {
    intro:
      "Base is where a lot of first-time token creators land: low ETH gas, chain ID 8453, Coinbase-adjacent traffic, and a memecoin culture that will clone your name before your LP lock transaction confirms. XAUConnect Launchpad can deploy a standard ERC-20 here via TokenFactory when the factory is live — LaunchedToken, fixed supply, no mint, no blacklist, no tax.\n\nCreating on Base does not list you on Coinbase. It puts a contract on Basescan. Liquidity and a published address are the rest of the product.",
    sections: [
      {
        heading: "Why Base versus Ethereum for a first deploy",
        body:
          "Mainnet deploy-plus-LP can cost more than the experiment is worth. Base lets you iterate. The trade is neighborhood risk: buyers assume most new Base tickers are hostile. You must over-communicate the contract, the LP lock, and the fact that supply was minted to a disclosed wallet.",
      },
      {
        heading: "Wallet and gas",
        body:
          "Connect a wallet on Base with ETH for the launch fee plus gas. Coinbase Wallet users must still be on 8453, not “the Coinbase app balance.” A CEX account cannot sign `createToken`.",
      },
      {
        heading: "Wizard on Base",
        body:
          "Standard launch, name, symbol, supply, metadata. Decide LP against ETH or USDC — those are the spine pools on Base. Lock duration is a promise; pick one you can keep. Review, sign, copy the Basescan address from the receipt.",
      },
      {
        heading: "First swaps",
        body:
          "From a second wallet, buy a tiny amount on XAUConnect (paste address, Base selected) and sell it. Publish both hashes. If sell fails, fix the pool before you market. Discover will not save a token nobody can exit.",
      },
      {
        heading: "Clones",
        body:
          "Same name on Ethereum or Solana is not your token unless you bridged it canonically. Say “Base only” until that is false. Traders using our multi-chain guides are trained to treat other-chain tickers as unrelated.",
      },
    ],
    faqs: [
      {
        question: "Will Coinbase list my Base token because I used Base?",
        answer:
          "No. Base is a chain. Coinbase listings are a separate, gated process.",
      },
      {
        question: "Native USDC or ETH as the LP pair?",
        answer:
          "Whichever your buyers hold. ETH/USDC is the deepest sea; your pool is a pond attached to it. Confirm you pair with canonical contracts.",
      },
      {
        question: "Demo mode?",
        answer:
          "If TokenFactory is not deployed on Base in this environment, metadata can still pin and nothing on-chain happens. Check the wizard result: you need a real token address.",
      },
      {
        question: "Can I create a token on Base without coding?",
        answer:
          "Yes — that is the Launchpad wizard. You still owe the market a liquidity plan and honest permissions (LaunchedToken already removes mint/tax/blacklist).",
      },
    ],
    description:
      "Create a crypto token on Base with XAUConnect Launchpad: chain 8453, fixed-supply ERC-20, ETH gas, lock liquidity, paste the Basescan address into Swap.",
  },

  "how-to-create-a-token-on-bnb-chain": {
    intro:
      "BNB Chain is the other default for “I want to generate a token this afternoon”: tiny BNB fees, USDT-heavy traders, BscScan, and an industrial quantity of ticker clones. Launchpad’s standard path deploys LaunchedToken through TokenFactory — fixed supply to your wallet, no mint, no tax, no blacklist — when the factory is live on chain ID 56.\n\nCheap deploys are not a marketing advantage. They are why your buyers are paranoid. Beat that with locks, a second-wallet round-trip, and an address in every sentence. Do not start marketing from a demo-mode CID.",
    sections: [
      {
        heading: "Chain ID 56 and BNB in the deployer",
        body:
          "MetaMask/Trust Wallet on BNB Smart Chain. Withdraw BNB from an exchange first. The launch fee plus gas are native BNB. USDT in the wallet will not pay `createToken`.",
      },
      {
        heading: "USDT-aware liquidity",
        body:
          "Many BNB Chain traders flatten to USDT, not USDC. Pairing LP with USDT (verified contract) or BNB is usually more honest than pairing with a thin USDC variant. Lock it. Unlocked LP on this chain is treated as a countdown.",
      },
      {
        heading: "Deploy and publish BscScan",
        body:
          "Sign createToken, grab the address from the receipt, verify if possible, put it on socials as text not an image. Images get OCR’d onto scam sites.",
      },
      {
        heading: "Swap path for buyers",
        body:
          "They set BNB Chain on XAUConnect, paste your address, keep BNB for gas, test a sell. Teach them that — our BNB swap guide already tells them ticker search is how they get cloned.",
      },
      {
        heading: "Do not multi-chain spam",
        body:
          "Deploying the same ticker on Ethereum the next day without a bridge is how you create two tokens and one angry community. One home. BNB Chain if that is where you are staying.",
      },
    ],
    faqs: [
      {
        question: "Is a BNB Chain token an ERC-20?",
        answer:
          "Yes — BEP-20 is the EVM ERC-20 interface on this chain. Wallets treat it as ERC-20.",
      },
      {
        question: "Can I add a transfer tax later?",
        answer:
          "Not on LaunchedToken. If you wanted a tax token you would need different bytecode, and most aggregators and our own education pages treat that as hostile. Don’t.",
      },
      {
        question: "Trust Wallet or MetaMask?",
        answer:
          "Either, on chain 56, with BNB for fees. Hardware wallet for the deployer if the supply matters.",
      },
      {
        question: "Will PancakeSwap automatically list me?",
        answer:
          "A pool you seed is what routers see. There is no ceremonial listing that replaces liquidity.",
      },
    ],
    description:
      "Create a token on BNB Chain with XAUConnect: TokenFactory ERC-20, BNB launch fee, USDT or BNB liquidity, lock LP, share the BscScan address.",
  },

  "how-to-create-a-token-on-ethereum": {
    intro:
      "Creating an ERC-20 on Ethereum mainnet is the expensive, high-signal version of a Launchpad deploy. You pay real ETH for createToken, for LP, and for every mistake. That cost filters some spam and does not filter well-funded spam. XAUConnect TokenFactory still deploys the same honest LaunchedToken: fixed supply, no mint, no blacklist, no tax.\n\nOnly choose mainnet if the liquidity you will seed and the traders you want already live there — or if you needed the canonical Ethereum address as the home of a later bridge.",
    sections: [
      {
        heading: "Budget gas like an operator",
        body:
          "Factory deploy, possible token verification, LP add, LP lock, test buy, test sell — each is a transaction. Quote ETH prices before you start. If the budget hurts, Base or Arbitrum is the same bytecode family at a fraction of the fee. Mainnet vanity is not a tokenomic.",
      },
      {
        heading: "Deployer wallet",
        body:
          "Use a hardware wallet. The entire supply mints to `msg.sender`. A browser seed that holds 100% of a mainnet token is a single phishing page away from a headline.",
      },
      {
        heading: "LP on the deepest sea",
        body:
          "ETH/USDC on mainnet is deep. Your new pool is still only as deep as what you deposit. Pair with canonical WETH or native USDC. Lock. Publish Etherscan. Then — and only then — tell anyone to swap on XAUConnect with the address pasted, Ethereum selected.",
      },
      {
        heading: "When mainnet is the wrong first move",
        body:
          "If you are still changing the name, the supply, or the LP plan, deploy on an L2. Migrating a community from a test deploy to mainnet is messy; getting the design right on Base first is cheaper than three failed mainnet LPs.",
      },
      {
        heading: "Bridges later",
        body:
          "A mainnet home plus documented wrappers is a real multi-chain token. A mainnet ticker plus a random BNB clone is not. If you might bridge, say so in the metadata from day one.",
      },
    ],
    faqs: [
      {
        question: "Is Ethereum required for a “serious” token?",
        answer:
          "No. Serious is locked liquidity, honest permissions, and buyers who can exit. Many serious markets now live on L2s. Mainnet is a liquidity and prestige choice, not a morality.",
      },
      {
        question: "Can I create the token on L2 and the “real” one on Ethereum later?",
        answer:
          "That is two tokens unless you bridge. Pick a home.",
      },
      {
        question: "Does XAUConnect pay for my gas?",
        answer:
          "No. You pay ETH. The launch fee goes through FeeCollector as a disclosed launch fee.",
      },
      {
        question: "Will Ethereum users find me on Discover?",
        answer:
          "If they trade. Rank is not purchased. Tape is.",
      },
    ],
    description:
      "Create an ERC-20 on Ethereum mainnet via XAUConnect TokenFactory: budget ETH gas, mint supply to a hardware wallet, lock canonical LP, publish Etherscan.",
  },

  "how-to-generate-a-crypto-token-without-coding": {
    intro:
      "“Generate a crypto token” search usually means: no Solidity, no Hardhat, a form, a wallet signature, a contract address. That is XAUConnect Launchpad’s standard flow. You still make irreversible economic choices — supply, chain, who receives the mint, whether LP is locked — that no form can ethically hide behind “easy.”\n\nThis is the no-code path, including what the contracts refuse to let you do (mint later, tax transfers, blacklist holders) because those are how no-code tokens become rugs.",
    sections: [
      {
        heading: "Open Launchpad, not Swap",
        body:
          "Swap is for trading existing tokens. Launchpad is for creating one. Connect the deployer wallet on an EVM chain. Choose standard ERC-20 or bonding-curve. Fill name, symbol, supply, optional art and socials.",
      },
      {
        heading: "The four screens",
        body:
          "Type: standard versus bonding-curve. Details: identity. Liquidity & fees: whether a pool should exist, lock duration, how you pay the launch fee. Review: read it like a legal document. Then the wallet shows `createToken` or `createLaunch` plus a native value. If you do not understand the native value, you are not ready to sign.",
      },
      {
        heading: "No-code is not no-responsibility",
        body:
          "Supply minted to you is concentration until you distribute or LP it. If you hold 100% and the pool is 2%, you are the market. Disclose. Lock LP. Test sell from another wallet. Our rug-pull education tells buyers to look for exactly this.",
      },
      {
        heading: "Demo mode versus mainnet",
        body:
          "If contracts are missing on that chain, you get pinned metadata and no token. That is not a successful generation. Switch chain or wait for deployment. A CID is not a contract.",
      },
      {
        heading: "Solana no-code",
        body:
          "Third-party Solana UIs can create mints without code. XAUConnect’s wizard is EVM. After any SPL mint exists and has a pool, no-code creators still send buyers to Swap with the mint pasted.",
      },
    ],
    faqs: [
      {
        question: "Do I need GitHub?",
        answer:
          "Not for LaunchedToken. You should still read what it is: fixed supply, no admin mint.",
      },
      {
        question: "Can I generate a token on my phone?",
        answer:
          "WalletConnect plus Launchpad can work; test with tiny value first. Hardware wallets on mobile are slower — re-read the prompt.",
      },
      {
        question: "How much does it cost?",
        answer:
          "Launch fee in native coin (default config on the order of 0.01) plus gas, plus whatever you put in LP. LP is the real budget.",
      },
      {
        question: "Will people automatically swap it?",
        answer:
          "No. No pool, no swap. No attention, no tape. Generation is the beginning.",
      },
    ],
    description:
      "Generate a crypto token without coding on XAUConnect Launchpad: four-step wizard, wallet-signed TokenFactory deploy, then lock liquidity so it can be swapped.",
  },

  "how-to-add-liquidity-after-creating-a-token": {
    intro:
      "A token without liquidity is a scoreboard in a wallet. Adding liquidity deposits your token plus a pairing asset (ETH, BNB, USDC, SOL, …) into a pool so swaps have something to trade against. Price is then pool math, not your opinion. XAUConnect can route that pool once it exists; we cannot invent depth.\n\nIf you used Launchpad’s “create liquidity pool” option, follow through until the pair is visible on the explorer. If you deployed only the token, this article is the missing half.",
    sections: [
      {
        heading: "Pick a pairing asset buyers already hold",
        body:
          "On Ethereum/L2s: ETH or native USDC. On BNB Chain: BNB or USDT. On Solana: SOL or USDC. Pairing with an obscure third token makes a three-hop nightmare and a quote nobody trusts.",
      },
      {
        heading: "Size the pool like an exit, not a market cap tweet",
        body:
          "Market cap is supply × price. Price is pool ratio. A huge supply against $800 of ETH is a toy. Put in enough pairing asset that a realistic buy can also sell. If you cannot afford that, you are not launching — you are hoping.",
      },
      {
        heading: "Lock or burn LP",
        body:
          "LP tokens are the rug switch. Lock them with a public unlock date or burn them if you promised that. Unlock-in-ten-minutes is not a lock. Our Learn library tells traders to check this; they will.",
      },
      {
        heading: "Impermanent loss is real",
        body:
          "If your token moons against the pairing asset, LPs (you) underperform holding both. That is the fee trade. If you are 100% of the LP, you are also 100% of that exposure. Do not pretend LP is free marketing.",
      },
      {
        heading: "After LP: the first external swap",
        body:
          "From a second wallet on XAUConnect, paste the token, swap a small amount of the pairing asset in, then swap back out. Publish both receipts. If impact is already violent, add more pairing asset or reduce the fantasy size of the launch.",
      },
    ],
    faqs: [
      {
        question: "Can I add liquidity on XAUConnect itself?",
        answer:
          "Launchpad collects LP intent and, where LiquidityZap / factory integrations are live, can help seed. You can also add on the underlying DEX and still have XAUConnect route it. The pool must exist on-chain either way.",
      },
      {
        question: "What ratio should I set?",
        answer:
          "The ratio is the starting price. There is no magic 50/50 that makes a bad token good. Be able to explain the implied market cap with a straight face.",
      },
      {
        question: "Can I pull LP later?",
        answer:
          "If you hold unlocked LP, yes — and traders will treat that as an exit scam waiting to happen. Lock it if you asked them to trust you.",
      },
      {
        question: "Does adding LP cost extra gas?",
        answer:
          "Yes. On Ethereum it is material. Budget it as part of launch, not as a surprise.",
      },
    ],
    description:
      "Add liquidity after creating a token: pair with ETH/USDC/USDT/SOL, size for two-way trades, lock LP, then test a round-trip swap on XAUConnect.",
  },

  "how-to-make-a-new-token-swappable": {
    intro:
      "Swappable means: a pool exists, ordinary wallets can buy and sell, aggregators can build a route, and the contract does not trap funds. Deploying bytecode is maybe 20% of that. The rest is liquidity, permissions, and telling people the address.\n\nXAUConnect will quote a token when a route exists on that chain. We will not list you as “coming soon.” Make the market, then paste. If the quote fails, the market is not made yet.",
    sections: [
      {
        heading: "Contract that can be sold",
        body:
          "LaunchedToken is sellable: no blacklist, no pause, no tax. If you deployed something else with max-tx, hidden mint, or a whitelist, aggregators and humans will fail at random. Read your own bytecode or use the factory.",
      },
      {
        heading: "A pool with two sides",
        body:
          "Deposit token + pairing asset. Confirm the pair contract on the explorer. Confirm you can remove zero of it because it is locked. A pool you can drain is a pool traders should ignore.",
      },
      {
        heading: "Routing",
        body:
          "On EVM, 1inch/0x/indexed pools need to see the pair. On Solana, Jupiter needs a venue. After seeding, wait a moment, then quote from a fresh wallet on XAUConnect. If no route, the pool is not where routers look — fix venue, not the tweet.",
      },
      {
        heading: "The buyer’s path you should publish",
        body:
          "1. Open xauconnect.com Swap. 2. Select this chain. 3. Paste this address. 4. Keep native gas. 5. Start small. 6. Confirm you can sell. That paragraph prevents 80% of “how do I buy” DMs and 80% of clone victims.",
      },
      {
        heading: "Discover is a consequence",
        body:
          "Indexer plus market data surfaces tokens with tape. Wash trading to climb a board is visible and stupid. Real swaps from independent wallets are the only honest fuel.",
      },
    ],
    faqs: [
      {
        question: "The token exists but XAUConnect says no quote.",
        answer:
          "No pool, wrong chain selected, Token-2022 extension, or fee-on-transfer. Check the pair on the explorer and the chain selector.",
      },
      {
        question: "Do I need a logo for it to be swappable?",
        answer:
          "No. Logos help humans. Pools make swaps. Metadata without LP is decoration.",
      },
      {
        question: "Can I make it swappable on every chain at once?",
        answer:
          "Only with real bridges and real pools on each. Otherwise you created clones. Start with one chain.",
      },
      {
        question: "Should buyers use ticker search?",
        answer:
          "No. Paste. You should say that until you are tired of saying it.",
      },
    ],
    description:
      "Make a new crypto token swappable: honest contract, locked pool, aggregator-visible venue, published address, test buy and sell on XAUConnect.",
  },

  "how-to-do-your-first-swap-after-a-token-launch": {
    intro:
      "The first swap after you generate a token should not be a stranger’s size. It should be you, from a second wallet, proving the route works both ways. Creators who skip this discover honeypots in production — sometimes their own mis-set pool or the wrong contract pasted in a graphic.\n\nUse XAUConnect Swap on the launch chain. Paste the address from the deploy receipt, not from memory. If you cannot sell, you are not ready to tweet.",
    sections: [
      {
        heading: "Two wallets",
        body:
          "Wallet A deployed and holds LP plus leftover supply. Wallet B holds only a little native gas plus a little pairing asset. If you only have one wallet, you have not tested what a stranger experiences.",
      },
      {
        heading: "Buy",
        body:
          "Chain selector matches launch. Paste token as output, pairing asset as input. Read impact. If a $20 buy moves the chart 15%, your pool is a toy — add LP or reduce expectations before inviting others. Confirm. Verify the token contract in B’s wallet matches the receipt.",
      },
      {
        heading: "Sell immediately",
        body:
          "Flip the pair. Exact approve on EVM. Read impact on the way out — this is what your buyers will feel. If sell simulation fails, stop all marketing. You have a trap, even if you did not mean to.",
      },
      {
        heading: "Publish the hashes",
        body:
          "Explorer links for deploy, LP, test buy, test sell. That packet is more persuasive than a slogan. It also gives supporters the address to paste.",
      },
      {
        heading: "Then, and only then, let others in",
        body:
          "They will still get cloned. They will still set slippage too wide. Point them at the chain guide (Base, BNB, Solana, …) and at contract verification. You cannot swap for them; non-custodial means they sign.",
      },
    ],
    faqs: [
      {
        question: "Should the first swap be large to “show volume”?",
        answer:
          "No. That is wash theater. A small round-trip that works is the professional move.",
      },
      {
        question: "The buy worked and the sell failed. What now?",
        answer:
          "Assume a permission or tax problem, or no real LP. Do not onboard others. Fix the contract/pool.",
      },
      {
        question: "Can I use the same wallet for the test?",
        answer:
          "You can, and you will miss allowance and UI issues strangers hit. Use a second wallet.",
      },
      {
        question: "Does this affect Discover rank?",
        answer:
          "A couple of tiny honest swaps are fine. Farming a board is not a strategy we reward with words like “trending means buy.”",
      },
    ],
    description:
      "First swap after a token launch: second wallet, paste the deploy address, test buy and sell on XAUConnect, publish explorer hashes before inviting others.",
  },

  "token-mint-freeze-and-blacklist-permissions": {
    intro:
      "Token permissions are the difference between a bearer asset and a database the issuer still controls. Mint authority prints supply. Freeze (Solana) or blacklist/pause (EVM) stops you from selling. Admin keys that can change tax or upgrade the token can rewrite the deal after you buy.\n\nXAUConnect Launchpad’s LaunchedToken refuses those hooks: no owner mint, no blacklist, no tax. If you are buying someone else’s token, you still have to read their contract — our factory is not their factory.",
    sections: [
      {
        heading: "Mint",
        body:
          "If mint exists, your percent of supply is a suggestion. Issuers sometimes “need mint for staking rewards.” That can be true and still dump you. Prefer revoked mint or a hard cap you can see on the explorer. LaunchedToken mints once in the constructor.",
      },
      {
        heading: "Freeze and blacklist",
        body:
          "Solana freeze authority can freeze token accounts. EVM blacklists (USDT-style) can stop addresses. Either means the asset is not purely bearer. For a memecoin, freeze is usually unacceptable. For a regulated stablecoin, blacklist is part of the product — know which you are buying.",
      },
      {
        heading: "Pause and upgrade",
        body:
          "Pausable tokens halt transfers. Upgradeable proxies can change logic. Launchpad’s LaunchedToken is not a UUPS token (the factory is upgradeable; the token bytecode you hold is not). If a random launch uses a proxy, read who the admin is.",
      },
      {
        heading: "How to check before a swap",
        body:
          "Etherscan/BscScan/Solscan token page: holders, max supply vs total, owner functions, verified source. If source is unverified, you are guessing. Size as if you guessed wrong.",
      },
      {
        heading: "If you are the issuer",
        body:
          "Use the honest token unless you have a regulated reason not to. Disclose any remaining admin in the Launchpad description. Traders using our guides will look. Lies last until the first holder who can read Solidity.",
      },
    ],
    faqs: [
      {
        question: "Does XAUConnect scan every token for mint functions?",
        answer:
          "No. We do not audit tokens. Quotes are not safety certifications. You verify.",
      },
      {
        question: "Is a mint function always a scam?",
        answer:
          "No. It is always a power. Powers get abused. Price that in or walk away.",
      },
      {
        question: "What did I get if I used TokenFactory?",
        answer:
          "Fixed supply to you, ERC20Permit, creator + metadataURI, no mint/pause/blacklist/tax.",
      },
      {
        question: "Solana freeze still on after launch — problem?",
        answer:
          "For a community token you marketed as immutable, yes. Revoke it or explain a concrete reason.",
      },
    ],
    description:
      "Mint, freeze, blacklist, and pause: how token permissions trap swappers, what LaunchedToken removes, and what to check on the explorer before you buy.",
  },

  "erc-20-vs-spl-token-standards": {
    intro:
      "ERC-20 and SPL are how two different computers implement “a token.” They are not interchangeable files. You cannot send an ERC-20 to a Phantom address. You cannot approve an SPL mint in MetaMask. XAUConnect supports both as swap venues — EVM chains for ERC-20, Solana for SPL — and Launchpad currently deploys ERC-20s.\n\nIf you are choosing a standard to generate a token, you are choosing an ecosystem: wallets, gas, bridges, and scam neighborhoods. Pick one home before you print a second ticker.",
    sections: [
      {
        heading: "ERC-20 in practice",
        body:
          "Balances and allowances on Ethereum, BNB Chain, Polygon, Arbitrum, Base, Avalanche C-Chain. Swaps often need `approve` then `swap`. Gas is the chain’s native coin. Addresses are 0x. LaunchedToken is this family.",
      },
      {
        heading: "SPL in practice",
        body:
          "Mints and token accounts on Solana. No ERC-20 allowance; the swap instruction moves tokens. Simulation preview. Gas is SOL plus optional priority fee. Addresses are base58. Token-2022 adds extensions that can surprise routers.",
      },
      {
        heading: "Wrapping is not translation",
        body:
          "A bridged ERC-20 on Solana is an SPL mint representing some other contract. A bridged SPL on Ethereum is an ERC-20 representing some mint. Those wrappers have extra risk. They are not “the same token” in a legal or practical sense until the issuer says the mapping is canonical.",
      },
      {
        heading: "Which should you create?",
        body:
          "Create where users already swap. Solana if your distribution is Phantom-native. Base/BNB if your distribution is MetaMask-native. Both only with a real bridge plan. “We’ll do both tickers this weekend” is how you fund cloners.",
      },
      {
        heading: "How XAUConnect treats them",
        body:
          "Same quote card idea: minimum received, fees, then a signature. Different wallets, different explorers, different failure modes. Use the chain-specific swap guides rather than mixing steps.",
      },
    ],
    faqs: [
      {
        question: "Is BEP-20 different from ERC-20?",
        answer:
          "On BNB Chain it is the ERC-20 interface. Treat it as ERC-20 with BNB gas and BscScan.",
      },
      {
        question: "Can one Launchpad click do both standards?",
        answer:
          "No. Factory is EVM. SPL is Solana tooling.",
      },
      {
        question: "Which is safer?",
        answer:
          "Neither. Permissions and liquidity dominate. Solana freeze vs EVM blacklist are parallel risks.",
      },
      {
        question: "Can I swap ERC-20 to SPL in one signature?",
        answer:
          "That is a cross-chain bridge, not a standard conversion. Two wallets, extra risk, test small.",
      },
    ],
    description:
      "ERC-20 vs SPL: approvals versus simulation, 0x versus base58, which standard to create on, and how XAUConnect swaps each without mixing them up.",
  },

  "how-bonding-curve-launches-work-on-xauconnect": {
    intro:
      "A bonding-curve launch sells tokens against a price function as buyers come in, instead of seeding a classic constant-product pool on day one. XAUConnect’s Launchpad offers this as a second launch type: the wallet calls `createLaunch` on the Launchpad contract with name, symbol, and metadata URI, plus the native launch fee — not `createToken` on TokenFactory.\n\nCurves can be fairer than a hidden presale. They can also be confusing exits if nobody understands when (or whether) liquidity migrates to a normal AMM. Read the launch type before you sign, whether you are the creator or the first buyer.",
    sections: [
      {
        heading: "Standard versus curve",
        body:
          "Standard: entire supply mints to the creator, who must LP. Curve: distribution is tied to the curve’s buys. Creator convenience and buyer fairness are different. If you need a simple swappable ERC-20 with locked LP, standard plus LP lock is easier to explain and easier for aggregators to route.",
      },
      {
        heading: "What buyers should ask",
        body:
          "Where is the curve contract? When does it graduate to a pool XAUConnect can route? Who can pull leftover parameters? If those answers are missing, treat it as higher risk than a locked Uniswap-style pair you can already quote.",
      },
      {
        heading: "What creators should not promise",
        body:
          "Do not call it a fair launch if team wallets still have special exits. Do not promise aggregator support during a phase where only the curve contract trades. Point people at the correct UI for that phase, then at Swap once a normal pool exists.",
      },
      {
        heading: "After graduation",
        body:
          "Once a regular pool exists, the first-swap-after-launch checklist applies: second wallet, buy and sell, publish hashes. Until then, XAUConnect Swap may honestly return no route.",
      },
      {
        heading: "Fees",
        body:
          "Launch fee is still native coin through FeeCollector. Curve trades may have their own fee schedule. Disclosed fees are fine. Surprise fees are how you get compared to tax tokens in our education pages.",
      },
    ],
    faqs: [
      {
        question: "Which button in the wizard?",
        answer:
          "Launch type: bonding-curve versus standard. The review screen should match the function you expect (`createLaunch` vs `createToken`).",
      },
      {
        question: "Is a bonding curve safer for buyers?",
        answer:
          "It can reduce stealth allocations. It does not remove contract risk or the need to understand graduation. Safer is “understood,” not “curved.”",
      },
      {
        question: "Can I swap a bonding-curve token on the main Swap page immediately?",
        answer:
          "Only if a routable pool already exists. Many curves trade only against their own contract until graduation.",
      },
      {
        question: "Solana bonding curves?",
        answer:
          "Solana has its own curve culture on other venues. This Launchpad path is EVM `createLaunch`.",
      },
    ],
    description:
      "Bonding-curve launches on XAUConnect: createLaunch versus TokenFactory, what buyers should ask about graduation, and when Swap can route the token.",
  },

  "what-happens-after-you-generate-a-crypto-token": {
    intro:
      "After you generate a token you have a contract (or mint), a supply sitting in some wallet, and a reputation of zero. The next 48 hours decide whether that is a market or a screenshot. This is the operator sequence XAUConnect expects: verify, liquidity, test swaps, publish the address, survive clones, and accept that Discover is tape.\n\nNothing here is financial advice. Most new tokens go to zero. Plan as if yours must be exit-able anyway.",
    sections: [
      {
        heading: "Hour zero: the address is the product",
        body:
          "Save the explorer link. Verify source if you can. Put the address in a pinned post as monospace text. If you used Launchpad, keep the metadata URI. If supply is in a hot wallet, move the treasury to hardware or a multisig before you attract attention.",
      },
      {
        heading: "Liquidity and the round-trip",
        body:
          "Seed and lock LP. From a second wallet, buy and sell on XAUConnect. If that fails, you are still in private beta whether you tweeted or not.",
      },
      {
        heading: "Clones and support scams",
        body:
          "Copycats will deploy your name. Support impersonators will DM “new LP link.” You will never need anyone’s seed. Repeat the address. Do not argue tickers.",
      },
      {
        heading: "Multi-chain pressure",
        body:
          "Fans will demand “launch on Solana too.” That is a new token unless you bridge. Say no until you have a canonical mapping and a second pool you can afford to lock.",
      },
      {
        heading: "Ongoing",
        body:
          "Revoke leftover allowances on deployer wallets. Don’t unlock LP as a surprise. Don’t mint if you promised you couldn’t (LaunchedToken already prevents that). When people swap, they use our chain guides — make sure your pinned instructions match the chain you actually deployed.",
      },
    ],
    faqs: [
      {
        question: "When will we trend on Discover?",
        answer:
          "When independent volume exists and indexers see it. Not when you refresh faster.",
      },
      {
        question: "Should I airdrop from the deployer?",
        answer:
          "Airdrops from a wallet that also holds LP look like insider flow. If you distribute, document it. Recipients still need gas to swap.",
      },
      {
        question: "Can I rename the token later?",
        answer:
          "The contract symbol is sticky. Metadata might update if you control the URI; wallets cache. Assume the name is forever.",
      },
      {
        question: "What if nobody swaps?",
        answer:
          "Then you have a contract and a pool. That is allowed. Do not fake volume.",
      },
    ],
    description:
      "After you generate a crypto token: publish the address, lock LP, test buy/sell on XAUConnect, handle clones, and don’t fake multi-chain or Discover rank.",
  },

  "how-to-create-a-memecoin-on-xauconnect": {
    intro:
      "A memecoin on XAUConnect is still a token with a pool. The meme is marketing; the contract is the product. Use Launchpad’s standard LaunchedToken so you cannot “accidentally” add a hidden mint, or use a bonding curve if you understand graduation. Then lock liquidity, because unlocked memecoin LP is the rug everyone already learned to spot in our risk guides.\n\nIf you cannot describe the contract permissions in one breath, do not launch a joke token at strangers.",
    sections: [
      {
        heading: "Pick one chain that matches the joke’s habitat",
        body:
          "Solana and Base currently absorb a lot of meme flow; BNB Chain has its own. Ethereum memes need deeper pockets for gas. Do not spray the ticker onto four chains on day one. Cloners are faster than you.",
      },
      {
        heading: "Supply and LP that survive a screenshot",
        body:
          "Huge supply with tiny LP makes every buy a candle and every sell a funeral. Size LP for two-way flow. If the meme is “fair,” do not keep 40% in the deployer without saying so.",
      },
      {
        heading: "No tax, no blacklist",
        body:
          "LaunchedToken already enforces this. Tax memes break aggregators and feel like honeypots. You will spend the launch explaining a 5% tax nobody wanted.",
      },
      {
        heading: "Buyer instructions",
        body:
          "Chain, pasted address, gas token, small test, XAUConnect Swap. That is the meme’s README. Ticker search is how your community buys the clone.",
      },
      {
        heading: "After it is live",
        body:
          "Second-wallet round-trip. Publish hashes. Expect copies. Do not promise listings. Do not promise multi-chain. Do not promise XAUConnect endorsement — we don’t.",
      },
      {
        heading: "How buyers will actually swap the meme",
        body:
          "They will open XAUConnect, forget the chain selector, search the ticker, and buy a clone. Your job is to make the correct path shorter than the wrong one: chain name, full address, “keep gas,” “test sell.” Link the chain-specific swap guide (Base, BNB, Solana) rather than a screenshot of a candle.\n\nIf you launched on Base, they need ETH on Base. If you launched an SPL mint, they need Phantom and SOL — sending them a MetaMask tutorial is how they burn funds to 0x. If LP is $1,500, say so; a $40,000 market-cap screenshot with $1,500 of depth is a trap even when you are honest.\n\nDo not pay for trending. Discover ranks tape we indexed. Fake volume is visible. The meme can be unserious; the pool math cannot.",
      },
    ],
    faqs: [
      {
        question: "Is launching a memecoin allowed?",
        answer:
          "The tooling will deploy a token. Most memecoins go to zero. We will still tell buyers to assume that. Launching is not a blessing.",
      },
      {
        question: "Solana meme vs Base meme?",
        answer:
          "Solana: SPL tooling, then Jupiter on our Swap. Base: Launchpad ERC-20, then EVM Swap. Different wallets. Pick one.",
      },
      {
        question: "Can I lock LP for 7 days and call it safe?",
        answer:
          "Seven days is a date, not a virtue. State the date. Traders will calendar it.",
      },
      {
        question: "Should I pay influencers before the pool exists?",
        answer:
          "No. That is how you buy traffic into a clone or a broken route.",
      },
    ],
    description:
      "Create a memecoin on XAUConnect: one chain, honest LaunchedToken or a understood curve, locked LP, pasted address, no fake multi-chain or endorsement.",
  },

  "how-to-swap-avax-to-usdc": {
    intro:
      "AVAX → USDC is the Avalanche C-Chain flattening trade. It only works if the AVAX is on C-Chain, not X-Chain, and if the USDC is the contract with real C-Chain depth. XAUConnect quotes Trader Joe / Pangolin / aggregator paths. Keep AVAX for gas; selling the entire balance strands the USDC.",
    sections: [
      {
        heading: "C-Chain wallet, C-Chain AVAX",
        body:
          "Select Avalanche. Confirm C-Chain in MetaMask. Exchange withdrawals must target C-Chain. Then input AVAX, output USDC, paste canonical USDC if tickers collide.",
      },
      {
        heading: "Quote and reserve",
        body:
          "Leave a gas buffer. Tight slippage on ordinary size. Rank by minimum received. If impact is high, you may have the thin USDC variant — fix the contract before loosening slippage.",
      },
      {
        heading: "Approve only if you are selling USDC later",
        body:
          "Native AVAX skips approve. The USDC you receive will need an allowance when you swap it onward.",
      },
      {
        heading: "Not a bridge to Ethereum USDC",
        body:
          "You now hold USDC on C-Chain. Moving it to Ethereum is cross-chain. Local swap first if that was the only goal.",
      },
      {
        heading: "WAVAX",
        body:
          "Some routes wrap internally. You do not need to wrap first to sell AVAX for USDC.",
      },
      {
        heading: "Worked example on C-Chain",
        body:
          "Suppose you hold 25 AVAX on C-Chain after a subnet experiment and want dollars you can actually spend in Trader Joe-routed pools. Leave ~0.2 AVAX for gas. Select Avalanche, input AVAX, output the USDC contract you copied from a primary list — not the first “USDC” row if two appear. Read minimum received. If it implies more than a small pool fee versus $1, you likely selected a bridged cousin; abort and paste again.\n\nConfirm. On Snowtrace the receipt should show AVAX out and that exact USDC in. If you needed Ethereum USDC, stop: this fill did not bridge. Open cross-chain, C-Chain as source, Ethereum as destination, and a little ETH waiting on mainnet so you can move the arrival. Selling AVAX on Ethereum because a CEX chart says “AVAX/USD” will not spend this C-Chain balance.\n\nIf you are about to seed a Launchpad token paired with USDC on Avalanche, this same USDC contract is the one buyers will flatten into. Publish it next to your token address so they do not LP against a thin wrapper.",
      },
    ],
    faqs: [
      {
        question: "Why is my AVAX missing?",
        answer:
          "Wrong Avalanche chain (X/P vs C) or wrong wallet network. C-Chain only for this swap.",
      },
      {
        question: "USDT instead?",
        answer:
          "Quote both verified stables and take the better minimum received.",
      },
      {
        question: "Hardware wallet?",
        answer:
          "Yes, via your EVM app. Confirm C-Chain on the device.",
      },
      {
        question: "Can I generate a token with this pair as LP?",
        answer:
          "Yes — pair with AVAX or USDC on C-Chain, lock LP, then this is also how buyers flatten back to dollars.",
      },
    ],
    description:
      "Swap AVAX to USDC on Avalanche C-Chain with XAUConnect: C-Chain only, keep AVAX for gas, verify USDC, not a bridge to Ethereum.",
  },

  "how-to-swap-pol-to-usdc": {
    intro:
      "POL is Polygon’s native gas token (wallets may still show old MATIC labeling). POL → USDC is the local flatten. The USDC must be the native or deepest Polygon contract, not a bridged cousin. Keep POL for gas. XAUConnect quotes Polygon pools; this does not sell Ethereum MATIC/POL ERC-20s.",
    sections: [
      {
        heading: "Be on Polygon PoS",
        body:
          "Select Polygon. Confirm the wallet network. If you hold a MATIC token on Ethereum, that is a different asset — swap it on Ethereum or bridge first. This article is native POL on Polygon.",
      },
      {
        heading: "Native USDC",
        body:
          "Paste official Polygon USDC. Bridged USDC.e is the classic 80-bps “why is the rate bad” bug. Rank by minimum received.",
      },
      {
        heading: "Gas buffer",
        body:
          "Do not sell 100% of POL. You need native token to move the USDC later.",
      },
      {
        heading: "Execution",
        body:
          "No approve for native POL. Confirm, verify Polygonscan. Tight slippage for ordinary size.",
      },
      {
        heading: "Afterward",
        body:
          "Polygon USDC is not Base USDC. Bridge if you need another chain. Local DeFi on Polygon wants the native stable.",
      },
      {
        heading: "Worked example and the MATIC hangover",
        body:
          "You withdrew “MATIC” from an exchange a year ago, the UI now says POL, and you want USDC on Polygon to pay a Launchpad LP or to exit a QuickSwap farm. Confirm the wallet network is Polygon PoS and that POL (native) is the input — not an ERC-20 named MATIC sitting on Ethereum. If the Ethereum token is what you actually hold, this guide does not apply; sell or bridge that contract on Ethereum first.\n\nLeave POL for gas. Paste native USDC. A 0.5% slippage start is reasonable for ordinary size on a healthy POL/USDC pool. If the quote is 2% wide, you have the bridged stable. After the fill, Polygonscan should show the native USDC address in the output. That USDC still cannot pay Ethereum gas and cannot be sent to a Solana address. If the next job is seeding LP for a token you generated on Polygon, pair with this native USDC so buyers using XAUConnect land in the same contract you advertised.",
      },
    ],
    faqs: [
      {
        question: "Is POL the same as MATIC?",
        answer:
          "It is the rebranded native asset of Polygon PoS. Confirm you are swapping native gas on Polygon, not a namesake ERC-20 elsewhere.",
      },
      {
        question: "Why did I receive the wrong USDC?",
        answer:
          "You selected a bridged variant. Convert into native USDC with a second swap if needed.",
      },
      {
        question: "Can I do this without KYC?",
        answer:
          "Yes, non-custodial. The chain is public.",
      },
      {
        question: "Launching a token paired with POL?",
        answer:
          "Buyers will also need POL for gas. Seed enough LP and tell them to paste your address on Polygon.",
      },
    ],
    description:
      "Swap POL to USDC on Polygon with XAUConnect: native gas token, native USDC contract, keep a POL buffer, not Ethereum MATIC.",
  },
};

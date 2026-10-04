/**
 * Commercial long-form Learn/Guide articles: swap tokens, major pairs,
 * multi-chain movement. Hand-written — not chain×template combinatorics.
 */
import type { RichContent } from "./content-expand.js";

export const SWAP_LEARN_CONTENT: Record<string, RichContent> = {
  "how-to-swap-tokens-on-ethereum": {
    intro:
      "Ethereum is still where the deepest ETH and stablecoin pools live, and it is also where a small swap can cost more in gas than the platform fee. If you learned DeFi on a screenshot that says “connect wallet → confirm,” Ethereum will punish the details you skipped: the chain ID, the ETH you set aside for gas, the approval transaction that is not the swap, and the 12-second block time that lets the pool move while you read the wallet prompt.\n\nThis guide is the Ethereum-only version of swapping on XAUConnect. Use it when the tokens you actually hold sit on mainnet — not when you wish they did. Balances on Base, Arbitrum, or Solana are invisible here until you bridge.",
    sections: [
      {
        heading: "Set the network to Ethereum mainnet, not “ETH” the asset",
        body:
          "Open Swap and select Ethereum. In MetaMask, Rabby, or Coinbase Wallet the header must show Ethereum Mainnet (chain ID 1). L2s also display ETH as the gas token; a wallet sitting on Base will not spend your mainnet USDC. XAUConnect never migrates balances because you connected a wallet that “supports many chains.”\n\nKeep a dedicated ETH gas buffer that is not part of the trade size. A $40 swap that leaves you with $0.80 of ETH can succeed the quote and fail the broadcast, or strand the output because you cannot afford the next approval.",
      },
      {
        heading: "Paste contracts when tickers collide",
        body:
          "Ethereum’s token set is old enough that popular tickers have dozens of copycats. Search by symbol only for household names you already verified. For anything else, paste the ERC-20 address from the project’s canonical source and confirm the full string on Etherscan — not the first-and-last-four characters that address-poisoning scams clone.\n\nNative ETH does not have a contract in the wallet the way USDC does. Wrapped ETH (WETH) does. Aggregated routes often wrap under the hood; you do not need to wrap first unless you specifically want to hold WETH.",
      },
      {
        heading: "Read minimum received before you pay Ethereum gas",
        body:
          "XAUConnect ranks 1inch, 0x, and on-router paths by minimum received after the disclosed platform fee (typically 30 bps on configured routers). On mainnet, gas can dwarf that fee on small clips. If the quote is fine but gas is ugly, the correct move is often the same pair on Arbitrum or Base — not “try anyway.”\n\nSlippage near 0.5% is a reasonable start for ETH/USDC-class depth. Thin alts need more room or, better, less size. Do not max slippage to make a revert go away; that is how sandwiches eat the floor you authorized.",
      },
      {
        heading: "Approval, then swap — two signatures, two gas bills",
        body:
          "The first time you spend an ERC-20 through a router, Ethereum requires an `approve`. Prefer an exact allowance. Unlimited approvals are convenient and are also how drained wallets lose tokens weeks later. Native ETH skips this step.\n\nConfirm the swap only after the approval receipt is in. If you wait minutes between quote and signature, re-quote. Mainnet pools move every ~12 seconds; a stale minimum-received check will revert and you still pay gas.",
      },
      {
        heading: "When Ethereum is the wrong venue",
        body:
          "Retail-size swaps of majors are usually cheaper on Arbitrum or Base with comparable ETH/USDC depth. Use mainnet when the liquidity you need is actually here: large notionals, tokens that never bridged well, or exits into canonical Ethereum USDC. Bridging first, then swapping on an L2, is a different product flow — use cross-chain mode rather than sending ERC-20s to an L2 address by hand.",
      },
    ],
    faqs: [
      {
        question: "Why is my Ethereum swap so expensive compared with screenshots from Base?",
        answer:
          "Those screenshots are not mainnet gas. Ethereum base fee plus priority fee is a separate line from XAUConnect’s platform fee. Compare all-in cost, or execute the same pair on an L2 if the token lives there.",
      },
      {
        question: "Do I need ETH even if I am swapping USDC to USDT?",
        answer:
          "Yes. Approvals and swaps pay validators in ETH. Stablecoin-only wallets get stuck. Keep ETH outside the amount you plan to sell.",
      },
      {
        question: "Can I swap Ethereum tokens with a Ledger?",
        answer:
          "Yes. Connect the hardware wallet through MetaMask or a WalletConnect app, verify the spender and amount on the device screen, and expect slower signing. Re-quote if the device prompt sat open through several blocks.",
      },
      {
        question: "Will this swap move my tokens to another chain?",
        answer:
          "No. A same-chain Ethereum swap settles on Ethereum. Use the cross-chain flow to reach Solana, Base, or anywhere else.",
      },
    ],
    description:
      "Swap tokens on Ethereum mainnet with XAUConnect: chain ID 1, ETH gas buffer, ERC-20 approvals, and when an L2 is the cheaper venue.",
  },

  "how-to-swap-tokens-on-solana": {
    intro:
      "Solana swaps do not look like Ethereum swaps, and pretending they do is how people send SPL tokens to 0x addresses. There is no ERC-20 approval. Your wallet simulates the transaction and shows balance changes before you sign. Fees are a tiny base plus an optional priority fee when a mint is hot. Addresses are base58, not hex.\n\nXAUConnect routes Solana through Jupiter across Raydium, Orca, and other AMMs. This guide is for holders who already have SOL and SPL tokens in Phantom, Solflare, or Backpack — not for people whose USDC is still on Ethereum.",
    sections: [
      {
        heading: "Connect a Solana wallet, not an EVM session",
        body:
          "Open Swap, select Solana, and connect Phantom, Solflare, Backpack, or a WalletConnect Solana session. If your only wallet is MetaMask on Ethereum, you are on the wrong VM. A seed phrase that derived an Ethereum account does not automatically give you a Solana address you already funded.\n\nNever paste a Solana mint into an EVM token field or send SOL to a 0x address. Cross-format transfers are unrecoverable. Bridging is a dedicated flow with a destination wallet that actually exists on Solana.",
      },
      {
        heading: "Identify the mint, not the ticker",
        body:
          "Solana’s memecoin culture recycles names hourly. The mint address on Solscan is the asset. Paste it. Confirm decimals, freeze authority, and mint authority before you size anything that is not SOL, USDC, or USDT.\n\nJupiter will often still return a route for a thin mint. A route is not a blessing. If impact is double-digit, the pool cannot absorb you — reduce size or walk away.",
      },
      {
        heading: "Simulation is the safety rail — read it",
        body:
          "Before you sign, the wallet previews how balances should change. If it shows a token you did not select, a huge SOL drain, or no output, reject. That preview is more useful than an EVM approval screen because it is the actual instruction list, not a separate allowance.\n\nDuring congested launches, raise the priority fee modestly or the transaction never lands. Failed landings on Solana typically do not burn Ethereum-style gas, but you also did not get the fill you wanted — retry with a fresh quote, not a spam of identical signatures.",
      },
      {
        heading: "Keep SOL for fees even on USDC pairs",
        body:
          "Every swap consumes a little SOL. An account that holds only SPL tokens cannot pay the base fee. Keep a SOL dust buffer the same way EVM users keep native gas.\n\nXAUConnect still shows platform fee and minimum received. Rank by the floor. SOL/USDC is usually tight; a new mint against SOL is not.",
      },
      {
        heading: "After the swap lands",
        body:
          "Solana finality is fast when the signature lands. Verify the output mint on Solscan. If you intended USDC and received a wrapped or unofficial dollar token, you swapped the wrong mint — fix it with another swap, not by “sending it to Ethereum.” To leave Solana, use cross-chain routing and a destination 0x wallet you control.",
      },
    ],
    faqs: [
      {
        question: "Why is there no approve button on Solana?",
        answer:
          "SPL transfers are authorized inside the swap transaction itself. The wallet simulation replaces the EVM allowance ritual. You still must read that simulation.",
      },
      {
        question: "My swap never confirms during a new mint. What now?",
        answer:
          "Increase priority fee slightly or reduce size so the route stays executable. Do not sign ten copies of a stale quote.",
      },
      {
        question: "Can I create an SPL token from this swap page?",
        answer:
          "No. Swap trades existing mints. Create SPL tokens with Solana token tooling, add liquidity, then paste the mint here. XAUConnect’s Launchpad wizard deploys EVM ERC-20s.",
      },
      {
        question: "Is USDC on Solana the same USDC I hold on Ethereum?",
        answer:
          "Same issuer brand, different mint. They do not move because you connected a wallet. Bridge if you need the other chain’s USDC.",
      },
    ],
    description:
      "Swap SPL tokens on Solana with XAUConnect: Jupiter routes, Phantom simulation, priority fees, and mint-address verification — no ERC-20 approval.",
  },

  "how-to-swap-tokens-on-bnb-chain": {
    intro:
      "BNB Chain is where a lot of traders actually live: low BNB gas, USDT as the default dollar, Pancake-style pools, and a memecoin density that makes ticker search dangerous. Chain ID 56 is the check most people skip. Trust Wallet and MetaMask both connect; both will happily sit on Ethereum while you think you are on BNB.\n\nXAUConnect treats BNB Chain as a first-class EVM venue. This walkthrough is for swapping tokens you already hold on BNB Chain — including BNB, USDT, and whatever contract you verified on BscScan.",
    sections: [
      {
        heading: "Force chain ID 56 before you quote",
        body:
          "Select BNB Chain in the swap widget and confirm the wallet network is BNB Smart Chain / chain ID 56. A BNB balance on a CEX is not an on-chain BNB Chain balance. Withdraw to your wallet on BNB Chain first if that is where the funds still sit.\n\nKeep BNB for gas even when the pair is USDT-quoted. Fees are usually tiny, which tempts people to empty the BNB balance; then the next approval cannot send.",
      },
      {
        heading: "USDT is often the deeper dollar than USDC here",
        body:
          "On BNB Chain, many routes and books grew up around USDT. If a USDC quote looks oddly wide, compare the same input into USDT. Still verify which USDT contract you are using — bridged and native-style listings are not interchangeable.\n\nXAUConnect ranks paths by minimum received after fees, including multi-hop through BNB when no direct pool is deep enough.",
      },
      {
        heading: "Memecoin hygiene on a cheap chain",
        body:
          "Low gas makes experimentation cheap and scams abundant. Paste the BscScan contract. Check whether ordinary wallets have sold. Look at LP lock and holder concentration. A honeypot that lets you buy and not sell will still produce a cheerful quote on the way in.\n\nStart with a test clip you can lose. Raise slippage only in small steps. Max slippage on a public mempool is how you donate to sandwich bots.",
      },
      {
        heading: "Approve once, swap once, verify on BscScan",
        body:
          "ERC-20s need an allowance the first time. Prefer exact amounts. Then confirm the swap and read the receipt. If you are exiting into a dollar token to bridge later, pick the variant that actually has bridge liquidity — not the first USDT ticker in the search box.",
      },
      {
        heading: "Creating a token is a different button",
        body:
          "Launchpad on BNB Chain can deploy a fixed-supply ERC-20 (no mint, tax, or blacklist) or a bonding-curve launch when factory contracts are live. That is how you generate a token. This page is how other people swap one that already has a pool. Do not deploy a ticker clone of someone else’s BscScan address and expect routing to treat them as the same asset.",
      },
    ],
    faqs: [
      {
        question: "Why did MetaMask show the wrong BNB balance?",
        answer:
          "The wallet was probably on another EVM chain. Switch to chain ID 56. The address looks the same across EVM; the balances do not.",
      },
      {
        question: "Should I swap to USDT or USDC on BNB Chain?",
        answer:
          "Compare live minimum received. USDT is often deeper on this chain. Confirm the contract either way before a large exit.",
      },
      {
        question: "Can I swap BNB Chain tokens to Solana in this flow?",
        answer:
          "Not as a same-chain swap. Use cross-chain routing, a Solana destination address, and expect a wrapped representation on arrival.",
      },
      {
        question: "What wallet works besides MetaMask?",
        answer:
          "Trust Wallet, Rabby, Coinbase Wallet, and WalletConnect apps. Confirm BNB Chain is selected before you sign.",
      },
    ],
    description:
      "Swap tokens on BNB Chain (chain ID 56) with XAUConnect: BNB gas, USDT-heavy routing, BscScan verification, and memecoin test clips.",
  },

  "how-to-swap-tokens-on-base": {
    intro:
      "Base is an Ethereum L2 with Coinbase-shaped inflows, ETH for gas, chain ID 8453, and a memecoin scene that turns “I swapped the ticker I saw on social” into a weekly support ticket. Fees are low. Liquidity outside ETH and USDC is often younger than it looks on a candlestick.\n\nUse this guide when your tokens are already on Base. If they are on Ethereum mainnet, a Base swap cannot spend them — bridge first, or use XAUConnect cross-chain, then swap the representation that arrives.",
    sections: [
      {
        heading: "Chain ID 8453 is the whole game",
        body:
          "Select Base in Swap. Coinbase Wallet, MetaMask, and Rabby all support it; they also all default to whatever network you used last. The address is the same hex string as Ethereum. The USDC is not the same contract.\n\nKeep ETH on Base for gas. Bridged ETH from Coinbase is still ETH for fees. An account that only holds a memecoin cannot pay the next transaction.",
      },
      {
        heading: "ETH and USDC are the spine; everything else is a check",
        body:
          "Deep ETH/USDC on Base is why people migrate retail flow off mainnet. Newer tokens inherit none of that depth. XAUConnect will still quote them if a pool exists. Read impact. If the only pool is thin, you are not “early” — you are the price.\n\nPaste Basescan contracts. Confirm you can sell. Check lock status. Coinbase listing rumors are not a contract address.",
      },
      {
        heading: "Same ETH ticker, different chain",
        body:
          "You can hold ETH on Ethereum, Base, and Arbitrum simultaneously in wallets that show one address. Swapping “ETH to USDC” on Base spends Base ETH. It does not touch mainnet ETH. Multi-chain tokens are local balances with local contracts.\n\nIf you meant to sell mainnet ETH, switch the network or you will watch a quote that cannot see your funds.",
      },
      {
        heading: "Execute: approve, confirm, verify on Basescan",
        body:
          "ERC-20s need a one-time exact allowance. Native ETH does not. Quotes expire; re-quote after any pause. Low L2 gas makes retries cheap, which is not permission to spray failed swaps into the mempool with 15% slippage.",
      },
      {
        heading: "Launching on Base vs swapping on Base",
        body:
          "Base is a popular place to generate a new ERC-20 because deploy gas is low and traffic is high. Launchpad’s standard token is fixed-supply with no mint or blacklist. After you deploy, you still need locked liquidity or there is nothing honest to swap. Traders should paste your new address into this Base swap flow — not search the name you also used on Ethereum.",
      },
    ],
    faqs: [
      {
        question: "I deposited on Coinbase. Why doesn’t XAUConnect see my USDC?",
        answer:
          "A Coinbase account balance is not Base USDC in your self-custody wallet. Withdraw to Base (or the chain you intend to trade) then connect that wallet.",
      },
      {
        question: "Is Base USDC native or bridged?",
        answer:
          "Prefer the native Circle USDC contract with the deepest pool. Ticker collisions are common. Paste the address from a primary source.",
      },
      {
        question: "Should I swap on Base or Ethereum for ETH/USDC?",
        answer:
          "For retail size, Base usually wins on gas with enough depth. For very large clips, compare minimum received on both — mainnet may still be deeper.",
      },
      {
        question: "Can I use a Coinbase Wallet to swap on Base?",
        answer:
          "Yes. Confirm chain 8453, read minimum received, and verify the Basescan receipt. Connection is not custody by XAUConnect.",
      },
    ],
    description:
      "Swap tokens on Base (chain ID 8453) with XAUConnect: ETH gas, native USDC checks, memecoin contract paste, and when to bridge from Ethereum first.",
  },

  "how-to-swap-tokens-on-arbitrum": {
    intro:
      "Arbitrum One is the L2 people mean when they want Ethereum-adjacent DeFi without Ethereum gas. You still pay fees in ETH. You still use a 0x address. You still must select Arbitrum in the wallet because that address is shared with every other EVM chain and will happily show zero while your funds sit on mainnet.\n\nXAUConnect quotes Arbitrum like any other EVM venue: aggregators plus indexed pools, ranked by minimum received. This guide is for swapping assets that already live on Arbitrum.",
    sections: [
      {
        heading: "Put the wallet on Arbitrum One, not “ETH network”",
        body:
          "Select Arbitrum in Swap. Bridged ETH on Arbitrum is the gas token. If you just used the canonical bridge from Ethereum, wait until the funds show on Arbiscan before you quote. Canonical withdrawals back to Ethereum are delayed by design — that delay is not a swap failure.\n\nKeep ETH on Arbitrum separate from the amount you plan to sell.",
      },
      {
        heading: "DeFi-native depth, bridged-token caution",
        body:
          "ETH, USDC, and Arbitrum-ecosystem assets usually route tightly. Tokens that arrived from another L2 may need an extra hop or may be the wrong wrapper. If a ticker you know from Optimism or Base looks illiquid here, you are probably holding a cousin contract.\n\nPaste Arbiscan addresses. Rank by minimum received, including multi-hop through ETH or USDC.",
      },
      {
        heading: "Gas is low, not constant",
        body:
          "Arbitrum fees rise with L2 congestion and with Ethereum data costs. Quotes include an estimate. A stuck transaction should be inspected on Arbiscan before you replace it. Duplicate sends waste ETH and can queue nonces.",
      },
      {
        heading: "Approvals and hardware wallets",
        body:
          "ERC-20s need an allowance. Exact is better than unlimited. Ledger and Trezor users should read the device screen for spender and chain. Signing on the wrong chain ID is an EVM classic — the address looks right, the funds are elsewhere.",
      },
      {
        heading: "After the fill",
        body:
          "Verify the output contract on Arbiscan. If you plan to return value to Ethereum, that is a bridge with its own time and risk, not the inverse of this swap. If you plan to generate a new token on Arbitrum, use Launchpad; swapping and deploying are not the same signature.",
      },
    ],
    faqs: [
      {
        question: "Why is my Arbitrum ETH not showing?",
        answer:
          "The wallet is on another chain, or the bridge has not finalized. Check Arbiscan for the destination address and wait for the canonical or third-party route you actually used.",
      },
      {
        question: "Is swapping on Arbitrum cheaper than Ethereum?",
        answer:
          "Usually yes for the same pair at retail size. Compare minimum received plus gas. Very large trades may still clear better on mainnet depth.",
      },
      {
        question: "Can I swap ARB for ETH here?",
        answer:
          "Yes if you hold ARB on Arbitrum. Select ARB as input, ETH as output, read impact, confirm. That does not move ARB to Ethereum L1.",
      },
      {
        question: "Do I approve ETH?",
        answer:
          "No. Native ETH on Arbitrum does not use ERC-20 approve. ARB, USDC, and other tokens do.",
      },
    ],
    description:
      "Swap tokens on Arbitrum One with XAUConnect: ETH gas on L2, Arbiscan contract checks, canonical-bridge timing, and aggregator routing.",
  },

  "how-to-swap-tokens-on-polygon": {
    intro:
      "Polygon is cheap, fast, and full of bridged cousins of Ethereum assets. POL pays gas (the network used to brand this as MATIC — wallets and articles still mix the names). The trader-killing mistake is swapping “USDC” that is a thinly bridged representation while native USDC sits in a deeper pool under a different contract.\n\nThis guide is how to swap on Polygon with XAUConnect when the tokens already sit there.",
    sections: [
      {
        heading: "Add Polygon, hold POL, ignore the ticker nostalgia",
        body:
          "Select Polygon in Swap. Any EVM wallet with the Polygon network added works. Confirm the badge before you sign. Keep POL for approvals and swaps. A wallet stuffed with bridged USDC and zero POL cannot transact.\n\nIf you still hold “MATIC” labeling in an old UI, confirm you are on Polygon PoS / the chain XAUConnect lists as Polygon — not a random MATIC ERC-20 on Ethereum unless that is actually what you intend to sell.",
      },
      {
        heading: "Native versus bridged is the Polygon homework",
        body:
          "A large share of Polygon’s asset base arrived from Ethereum. Native USDC and bridged USDC.e (and similarly named stables) are different contracts. Quotes that look “off” by a percent or more are often the thin variant. Paste Polygonscan addresses from Circle or the token’s canonical docs.\n\nXAUConnect ranks by minimum received. If two USDC-looking tokens appear, the deeper native pool is usually the one you wanted.",
      },
      {
        heading: "Execute on a cheap chain without getting sloppy",
        body:
          "Low gas encourages retries. Still use exact approvals, still start with a test clip on unfamiliar tokens, still re-quote after a pause. QuickSwap and Uniswap v3-style venues are where much of the liquidity sits; you do not pick the venue by hand — you pick the best net output.",
      },
      {
        heading: "Bridging in is not swapping",
        body:
          "If funds are on Ethereum, a Polygon swap cannot spend them. Bridge, wait for the Polygon representation, verify the contract, then swap. Sending mainnet USDC to your hex address while the wallet is “set to Polygon” does not teleport the tokens; they remain on Ethereum until a bridge moves them.",
      },
      {
        heading: "Launching versus swapping on Polygon",
        body:
          "Generating an ERC-20 on Polygon is inexpensive, which is why buyers must be more diligent, not less. Launchpad’s honest token has fixed supply and no blacklist. After deploy, lock liquidity. Traders paste the new Polygonscan address into Swap.",
      },
    ],
    faqs: [
      {
        question: "I swapped USDC and the amount looks wrong. Did I get scammed?",
        answer:
          "Often you swapped a bridged or low-liquidity USDC variant. Check the output contract on Polygonscan against native USDC. Convert into the deep variant if needed.",
      },
      {
        question: "What do I pay gas in — MATIC or POL?",
        answer:
          "The native gas token of Polygon PoS as configured in your wallet (POL). Keep a small native balance regardless of the ticker your UI still shows.",
      },
      {
        question: "Can I swap POL to USDC on Polygon?",
        answer:
          "Yes. Select POL/native as input and the verified USDC contract as output. That does not move POL to Ethereum.",
      },
      {
        question: "Is Polygon a Layer 2 like Base?",
        answer:
          "It is a separate EVM network with its own consensus and bridged asset history. Treat it as its own chain: own gas, own contracts, own pools.",
      },
    ],
    description:
      "Swap tokens on Polygon with XAUConnect: POL gas, native vs bridged USDC, Polygonscan verification, and why ticker search fails on bridged assets.",
  },

  "how-to-swap-tokens-on-avalanche": {
    intro:
      "Avalanche trading for DEX users happens on the C-Chain — the EVM chain — not the X-Chain or P-Chain. Those other chains use different address formats. Confusing them is how AVAX “disappears” between a CEX withdrawal and a MetaMask that was expecting C-Chain.\n\nXAUConnect quotes C-Chain pools (Trader Joe, Pangolin, and aggregator paths). This guide is how to swap tokens that already sit on Avalanche C-Chain.",
    sections: [
      {
        heading: "C-Chain or nothing",
        body:
          "Select Avalanche in Swap. Add Avalanche C-Chain to your EVM wallet. Withdraw from exchanges to a C-Chain address. X-Chain and P-Chain deposits will not appear as ERC-20 balances you can swap here.\n\nKeep AVAX for gas. Moderate fees, not L2-cheap, not mainnet-expensive. Emptying AVAX to “fully deploy into a pool” is how people strand tokens.",
      },
      {
        heading: "Confirm the pair actually trades on C-Chain",
        body:
          "Subnet activity does not equal C-Chain depth. If a project lives primarily on a subnet, the ticker on C-Chain may be a thin wrapper. Check Snowtrace and the quote’s price impact.\n\nAVAX and major stables usually route well. Ecosystem tokens need the same contract-paste discipline as anywhere else.",
      },
      {
        heading: "Swap steps on C-Chain",
        body:
          "Connect, select tokens, read minimum received, approve ERC-20s exactly, confirm. Re-quote if you pause. XAUConnect ranks by net output after platform fee, not by which logo is on the pool.",
      },
      {
        heading: "Multi-chain AVAX and wrapped cousins",
        body:
          "AVAX on C-Chain is not WAVAX until it is wrapped for AMM use; aggregators often wrap for you. AVAX representations on other chains are bridged assets. Selling “AVAX” on Ethereum is selling whatever wrapped contract you actually hold there — verify it.",
      },
      {
        heading: "Token generation on Avalanche",
        body:
          "You can deploy an ERC-20 via Launchpad on C-Chain when contracts are live. That does not list you on a subnet. After deploy, add C-Chain liquidity and share the Snowtrace address. Swapping that token is this flow; creating it is Launchpad.",
      },
    ],
    faqs: [
      {
        question: "I withdrew AVAX and MetaMask shows zero.",
        answer:
          "The withdrawal likely targeted X-Chain or the wrong address format. Use a C-Chain destination. Those funds are not available to this swap widget until they sit on C-Chain.",
      },
      {
        question: "Should I swap AVAX to USDC or USDT?",
        answer:
          "Compare minimum received on C-Chain for the verified contracts. Depth can differ; do not assume Ethereum’s preferred stable is Avalanche’s deepest pool.",
      },
      {
        question: "Can I swap from Avalanche to Solana here?",
        answer:
          "Use cross-chain mode with a Solana destination. A C-Chain swap cannot pay an SPL mint.",
      },
      {
        question: "Do I need a Core wallet?",
        answer:
          "No. Any C-Chain-configured EVM wallet works. Core is fine; MetaMask and Rabby are fine. The requirement is C-Chain, not a brand.",
      },
    ],
    description:
      "Swap tokens on Avalanche C-Chain with XAUConnect: AVAX gas, Snowtrace checks, X/P-Chain pitfalls, and aggregator routing on Trader Joe/Pangolin liquidity.",
  },

  "how-to-swap-eth-to-usdc": {
    intro:
      "ETH → USDC is the most common “cash out on-chain” trade and still the one people botch by picking the wrong chain, the wrong USDC contract, or by selling the ETH they needed for gas. XAUConnect will quote this pair on Ethereum, Arbitrum, Base, and other EVM networks where both assets exist. The steps look similar; the contracts and gas do not.\n\nThis guide walks the trade as a live swap, not as an exchange conversion. There is no deposit. You sign. USDC arrives in the same wallet on the same chain.",
    sections: [
      {
        heading: "Pick the chain where the ETH actually sits",
        body:
          "If your ETH is on Ethereum mainnet, set Ethereum. If it is on Base, set Base. The hex address can be identical while the balances are not. A mainnet ETH → USDC quote cannot spend Base ETH.\n\nOn L2s this pair is usually the cheapest way to flatten ETH into dollars. On mainnet, watch gas: a small clip can spend more in ETH fees than you wanted to “save” versus an L2.",
      },
      {
        heading: "Leave ETH for gas; sell the rest",
        body:
          "Never quote 100% of your ETH on an EVM chain. The swap and any prior approval need a native balance. A practical habit is to keep a gas reserve you mentally mark as unspendable inventory.\n\nWETH in the wallet is already wrapped. You can sell WETH to USDC directly; you do not have to unwrap first. Native ETH routes often wrap inside the aggregator path.",
      },
      {
        heading: "Demand native USDC, not a cousin",
        body:
          "Output should be the native Circle USDC contract on that chain whenever it has the deep pool. Bridged USDC.e and lookalikes show the same four letters. Paste the address if the ticker list is noisy. A 1% haircut on a “USDC” fill is often the wrong token, not a mysterious fee.",
      },
      {
        heading: "Quote, slippage, confirm",
        body:
          "For liquid ETH/USDC, start near 0.5% slippage. Rank routes by minimum received after XAUConnect’s platform fee and pool fees. Approve USDC only if you are selling USDC the other direction; selling ETH typically skips ERC-20 approve.\n\nConfirm, then verify the USDC contract on the explorer. If you needed dollars on another chain, that is a second, cross-chain step.",
      },
      {
        heading: "Large size",
        body:
          "ETH/USDC is deep, not infinite. Very large clips still move the curve. Split across blocks or compare mainnet versus L2 depth. XAUConnect may split across pools. Read the hop list; reject paths that detour through a token you do not want to touch.",
      },
    ],
    faqs: [
      {
        question: "Will I receive USD in my bank?",
        answer:
          "No. You receive USDC in the same self-custody wallet. Off-ramping to a bank is a separate, usually KYC’d service XAUConnect does not perform.",
      },
      {
        question: "Why is my minimum received below the Coinbase price?",
        answer:
          "On-chain price includes pool fees, impact, and the platform fee, and it is a different venue. Compare against other DEX quotes, not a CEX mid, unless you also count withdrawal fees and custody.",
      },
      {
        question: "Can I swap ETH to USDC on Solana?",
        answer:
          "Only if you hold a Solana representation of ETH (a wrapped mint) plus SOL for fees. Native Ethereum ETH must be bridged first. Most people should do ETH→USDC on an EVM chain they already use.",
      },
      {
        question: "Is this the same as wrapping ETH?",
        answer:
          "No. Wrapping turns ETH into WETH 1:1. This swap sells ETH (or WETH) for USDC at the pool price.",
      },
    ],
    description:
      "How to swap ETH to USDC on XAUConnect: pick the chain you actually hold ETH on, keep gas, verify native USDC, and read minimum received.",
  },

  "how-to-swap-sol-to-usdc": {
    intro:
      "SOL → USDC on Solana is the flattening trade for people who never wanted an EVM wallet. It is fast, usually cheap, and still capable of paying the wrong USDC mint if you pick from a ticker list during a busy day. XAUConnect routes this through Jupiter. Phantom (or Solflare/Backpack) simulates the debit of SOL and the credit of USDC before you sign.\n\nYour SOL for fees is the same asset you are selling — leave a buffer. Emptying the wallet to the last lamport is how the signature fails.",
    sections: [
      {
        heading: "Stay on Solana; do not “send SOL to USDC on Ethereum”",
        body:
          "This pair is an SPL swap. The USDC you receive is the Solana mint. It will not appear in MetaMask. If you needed Ethereum USDC, that is a bridge after this swap, with a 0x destination and extra risk.\n\nConnect a Solana wallet, select Solana, input SOL, output USDC. Paste the official USDC mint if anything looks off.",
      },
      {
        heading: "Read the simulation like a receipt",
        body:
          "The wallet should show SOL down, USDC up, and a small SOL fee. If it shows an extra token, a huge unexpected SOL drain, or a mint you did not pick, reject. That is the entire security model: there is no separate approve to audit later.",
      },
      {
        heading: "Priority fees during congestion",
        body:
          "On a quiet day this pair lands for a rounding error. During NFT or memecoin heat, bump priority fee so the transaction is included. Do not confuse a landed-but-slipped fill with a failed land — check Solscan.",
      },
      {
        heading: "Slippage on a major pair",
        body:
          "SOL/USDC is deep. Tight slippage is appropriate for ordinary size. If impact is high, your clip is large relative to the route — split it. Rank by minimum received, not by a Twitter “price of SOL.”",
      },
      {
        heading: "After you hold Solana USDC",
        body:
          "You can swap that USDC into other SPL tokens, or bridge it out. You cannot pay Ethereum gas with it. Multi-chain USDC is a family of contracts, not one balance.",
      },
    ],
    faqs: [
      {
        question: "Can I swap SOL to USDC without Phantom?",
        answer:
          "Yes — Solflare, Backpack, and WalletConnect Solana sessions work. The requirement is a Solana address with SOL, not a specific brand.",
      },
      {
        question: "Why did I receive less USDC than the chart?",
        answer:
          "Pool fees, impact, platform fee, and a moving price between quote and land. Minimum received is the number you accepted.",
      },
      {
        question: "Do I need to wrap SOL first?",
        answer:
          "No. Aggregated routes handle wrapped SOL internally when pools require it.",
      },
      {
        question: "Is this KYC?",
        answer:
          "No. It is a non-custodial swap. You still appear on Solscan; privacy is not invisibility.",
      },
    ],
    description:
      "Swap SOL to USDC on Solana with XAUConnect: Jupiter routing, wallet simulation, SOL fee buffer, and the official USDC mint.",
  },

  "how-to-swap-bnb-to-usdt": {
    intro:
      "On BNB Chain, BNB → USDT is the local equivalent of ETH → USDC: native gas asset into the dollar token the chain actually uses most. Traders coming from Ethereum muscle-memory still type USDC and then wonder why the route is worse. Compare both; USDT often wins here on depth.\n\nKeep BNB for gas. Selling 100% of BNB is the classic stranded-wallet move. This walkthrough assumes the BNB is already in your self-custody wallet on chain ID 56.",
    sections: [
      {
        heading: "Chain ID 56, BNB in the wallet, not on Binance the exchange",
        body:
          "A Binance spot balance is not BNB Chain. Withdraw BNB to your wallet on BNB Smart Chain, connect that wallet to XAUConnect, select BNB Chain, input BNB, output USDT.",
      },
      {
        heading: "Verify USDT on BscScan",
        body:
          "Paste the canonical USDT contract. Cheap-chain clones thrive. A “USDT” that cannot be sold later is not Tether.\n\nRank quotes by minimum received. Multi-hop through another stable is a smell if the direct BNB/USDT pool is healthy — read the hop list.",
      },
      {
        heading: "Gas is BNB even though output is USDT",
        body:
          "Leave a BNB reserve. Approvals are not needed for native BNB. If you later swap that USDT onward, the USDT spend will need an allowance plus more BNB gas.",
      },
      {
        heading: "Size and slippage",
        body:
          "Ordinary clips on this pair should be tight. Very large BNB sales still impact the pool — split them. Low gas is not a reason to loosen slippage to 12%.",
      },
      {
        heading: "What this is not",
        body:
          "This is not a withdrawal to a Binance USDT account. That is a CEX deposit. This is on-chain USDT in your wallet on BNB Chain. Bridging it to Ethereum is a later, separate decision.",
      },
    ],
    faqs: [
      {
        question: "Should I sell BNB for USDC instead?",
        answer:
          "Quote both. On BNB Chain USDT is frequently the deeper dollar. Take the better minimum received after verifying contracts.",
      },
      {
        question: "Why does Trust Wallet show a different USDT amount?",
        answer:
          "Wrong network, or a different USDT contract. Match the BscScan address from the swap receipt.",
      },
      {
        question: "Can I swap BNB to USDT on Ethereum?",
        answer:
          "Only if you hold a wrapped BNB ERC-20 on Ethereum. Native BNB lives on BNB Chain. Bridge first if that is the goal.",
      },
      {
        question: "Is there KYC?",
        answer:
          "Not for this DEX swap. Your CEX withdrawal to get BNB on-chain may have been KYC’d already.",
      },
    ],
    description:
      "Swap BNB to USDT on BNB Chain with XAUConnect: withdraw on-chain first, keep BNB for gas, verify the USDT contract, compare vs USDC.",
  },

  "how-to-swap-usdt-to-usdc": {
    intro:
      "USDT → USDC looks like it should always be a 1.00 fill. On a DEX it is a pool trade between two different issuers’ tokens, often with native versus bridged variants on the same chain. When the quote is 0.97, you usually selected a thin or unofficial contract — not “Tether depegged 3% while you clicked.”\n\nXAUConnect will route this on any supported chain where both contracts have liquidity. Do it on the chain you already hold the USDT. Stable-to-stable is where variant mistakes are most expensive because people size like there is no risk.",
    sections: [
      {
        heading: "Same chain, two official contracts",
        body:
          "Pick the network. Paste official USDT in and official native USDC out. If either side is a bridge wrapper with a thin pool, impact appears as a “bad rate.” Fix the tokens, do not max slippage.\n\nOn Solana, both are mints. On EVM, both are ERC-20s. They never share a balance across chains.",
      },
      {
        heading: "When a discount is real",
        body:
          "During genuine depeg stress, USDT and USDC can trade apart even in deep pools. That is market risk, not a UI bug. Size down. Compare multiple routes. Do not assume the aggregator “owes” you 1.00.",
      },
      {
        heading: "Fees on a pair that “should be free”",
        body:
          "You still pay pool fees, gas in the native token, and XAUConnect’s platform fee. On Ethereum those extras can dominate a $200 rotation; do the same swap on an L2 or Solana if that is where the stables already live.",
      },
      {
        heading: "Approvals",
        body:
          "Selling USDT requires an ERC-20 allowance (EVM). Exact amount. USDC output does not need an approve. Solana: read simulation only.",
      },
      {
        heading: "After the rotation",
        body:
          "Confirm the USDC contract. If you rotated in order to use a protocol that only accepts native USDC, you are now holding the right variant. If you rotated in order to bridge, check which USDC that bridge actually supports — bridging the wrong one is a second tax.",
      },
    ],
    faqs: [
      {
        question: "Why isn’t the rate exactly 1?",
        answer:
          "Pool imbalance, fees, impact, and occasional peg stress. Also wrong-variant contracts. Check addresses first.",
      },
      {
        question: "Which chain is best for USDT to USDC?",
        answer:
          "The chain where your USDT already sits, unless gas on that chain makes a small rotation silly. Do not bridge just to save a pool fee you will recapture in bridge risk.",
      },
      {
        question: "Can I swap USDT to USDC without a wallet?",
        answer:
          "Not on XAUConnect. Quotes work without connecting; execution is wallet-signed and non-custodial.",
      },
      {
        question: "Does this convert to bank USD?",
        answer:
          "No. You still hold a stablecoin. Off-ramp is separate.",
      },
    ],
    description:
      "Swap USDT to USDC on XAUConnect: verify native contracts, understand fees on a “1.00” pair, and avoid bridged-stable variants.",
  },

  "how-to-swap-btc-to-eth": {
    intro:
      "You cannot swap native Bitcoin on a DEX that speaks Ethereum and Solana. “BTC to ETH” on XAUConnect means a wrapped or bridged Bitcoin token — WBTC, cbBTC, BTC.b, or a Solana wrapped BTC mint — sold for ETH or WETH on the chain you actually hold it. If your BTC is in a Bitcoin wallet or a CEX, this page will not see it until you wrap or withdraw to the right VM.\n\nThis guide is honest about that wrapping step, then walks the on-chain swap.",
    sections: [
      {
        heading: "Identify which Bitcoin you actually hold",
        body:
          "WBTC on Ethereum is not cbBTC on Base is not BTC.b on Avalanche is not an SPL wrapped BTC. Each has a custodian or mint model and a contract you must paste. If you hold native BTC, use a wrapping service or a CEX conversion first — XAUConnect does not custody Bitcoin L1.\n\nPick the chain of that wrapped token. Input the BTC wrapper, output ETH or WETH.",
      },
      {
        heading: "Liquidity is uneven",
        body:
          "WBTC/ETH on Ethereum is usually the deepest. Smaller wrappers on L2s can gap. If impact is ugly, you may be in the wrong wrapper or the wrong chain — not “ETH is illiquid.”\n\nRank by minimum received. Multi-hop through USDC is normal when a direct BTC-wrapper/ETH pool is thin.",
      },
      {
        heading: "Gas and approvals",
        body:
          "The wrapper is an ERC-20 (or SPL mint). You need native gas (ETH, AVAX, SOL, …) separate from the BTC-token amount. Approve the wrapper exactly on EVM. On Solana, read simulation.",
      },
      {
        heading: "What you receive",
        body:
          "ETH on that chain — not Bitcoin-mainnet settlement, not an exchange credit. If you wanted ETH on a different chain, bridge after. If you wanted to “unstick” back to native BTC, that is unwrap/redeem through the wrapper’s official path, which is outside a simple aggregator swap.",
      },
      {
        heading: "Risk that is not price",
        body:
          "Wrapped BTC adds custodian or contract risk on top of ETH volatility. Verify you hold the canonical wrapper, not a memecoin named BTC. Size accordingly.",
      },
    ],
    faqs: [
      {
        question: "Can I paste a Bitcoin bc1 address as the destination?",
        answer:
          "No. Destinations here are EVM 0x or Solana base58. Native BTC addresses are the wrong format and funds sent that way are lost.",
      },
      {
        question: "Which wrapped BTC should I buy if I want ETH exposure the other way?",
        answer:
          "This article is BTC-wrapper → ETH. The reverse is the same pair flipped. Prefer the wrapper with the deepest pool on the chain you use.",
      },
      {
        question: "Why is the rate not the Coinbase BTC/ETH price?",
        answer:
          "You are trading a specific wrapped token against on-chain ETH pools, plus fees. Compare DEX minimum received, not a CEX index.",
      },
      {
        question: "Does XAUConnect wrap my native BTC?",
        answer:
          "No. Bring a supported wrapped/bridged BTC token to a supported chain, then swap.",
      },
    ],
    description:
      "Swap wrapped BTC to ETH on XAUConnect: WBTC and other chain-specific Bitcoin tokens, not native BTC — verify the wrapper and pool depth.",
  },

  "how-to-swap-erc-20-tokens": {
    intro:
      "ERC-20 is the token standard on Ethereum and every EVM chain XAUConnect supports: BNB Chain, Polygon, Arbitrum, Base, Avalanche C-Chain. Swapping an ERC-20 always has the same skeleton — select chain, pick contracts, quote, approve, swap — and the details that hurt are always chain-specific gas and lookalike addresses.\n\nIf your token is SPL on Solana, this is the wrong article. If you want to create an ERC-20, that is Launchpad, not Swap.",
    sections: [
      {
        heading: "The standard in one paragraph",
        body:
          "An ERC-20 is a contract with balances and allowances. A DEX router cannot move your tokens until you grant an allowance (`approve`). Native coins (ETH, BNB, POL, AVAX) are not ERC-20s and skip that step. Wrapped natives (WETH, WAVAX) are ERC-20s and need it.",
      },
      {
        heading: "One standard, seven gas tokens",
        body:
          "The contract interface is shared. The fee token is not. Ethereum charges ETH, Base and Arbitrum charge ETH too but at L2 prices, BNB Chain charges BNB, Polygon POL, Avalanche AVAX. Switching the chain selector without holding that gas token produces quotes you cannot send.",
      },
      {
        heading: "Allowance hygiene",
        body:
          "Exact allowance for the size you intend to trade. Unlimited allowances linger. Revoke them later from a trusted explorer tool when you are done with a router. XAUConnect cannot revoke for you; that is another wallet signature.",
      },
      {
        heading: "Fee-on-transfer and rebasing tokens",
        body:
          "Some ERC-20s tax transfers or rebase supply. Many aggregators and routers mis-handle them. If a token documents a transfer tax, expect failed simulations or worse fills. Honest XAUConnect Launchpad tokens do not include transfer tax — that is a reason to prefer them if you are the issuer, and a reason to read bytecode if you are the buyer of someone else’s token.",
      },
      {
        heading: "Execution checklist",
        body:
          "Chain match. Contract paste. Gas buffer. Quote minimum received. Exact approve. Re-quote. Confirm. Explorer receipt. If you needed the token on another chain, bridge next — ERC-20s do not roam because the standard is shared.",
      },
    ],
    faqs: [
      {
        question: "Is USDC an ERC-20?",
        answer:
          "On EVM chains, yes. On Solana, USDC is an SPL mint. Same brand, different standard, different address format.",
      },
      {
        question: "Can I swap ERC-20s without MetaMask?",
        answer:
          "Yes. Rabby, Coinbase Wallet, Rainbow, hardware wallets via those apps, and WalletConnect all work. You need an EVM account on the right chain.",
      },
      {
        question: "Why two transactions?",
        answer:
          "First allowance, then swap, the first time you sell that token through that router. Later swaps reuse remaining allowance if it was enough — which is why unlimited approvals are risky.",
      },
      {
        question: "How do I generate an ERC-20?",
        answer:
          "Use Launchpad: TokenFactory deploys a fixed-supply LaunchedToken (no mint, tax, or blacklist) for a small native fee. Then add liquidity so people can swap it.",
      },
    ],
    description:
      "How to swap ERC-20 tokens on XAUConnect across Ethereum and L2s: approvals, gas tokens, fee-on-transfer pitfalls, and contract verification.",
  },

  "how-to-swap-spl-tokens-on-solana": {
    intro:
      "SPL tokens are Solana’s analog to ERC-20s: mints with decimals, supplies, and optional freeze or mint authorities. You swap them in a single signature with a simulation preview. There is no allowance ritual. The failure mode is the mint address — Solana’s culture of rapid launches makes ticker search a trap.\n\nXAUConnect uses Jupiter to route across Raydium, Orca, and other venues. This is the SPL-specific swap guide.",
    sections: [
      {
        heading: "Mint address is the token",
        body:
          "Paste the mint from Solscan or the project’s primary announcement. Confirm freeze authority and mint authority. A mint that can freeze your account is a custody risk even if the chart is up. A mint that can print is a dilution risk.\n\nToken-2022 extensions (transfer fees, confidential transfers) can break naive routers. If simulation fails on a Token-2022 mint, the token may not be safely tradable through the current route set — do not “fix” that with huge slippage.",
      },
      {
        heading: "SOL pays, even when neither side is SOL",
        body:
          "An SPL→SPL swap (say a memecoin to USDC) still needs SOL for the base fee and optional priority fee. Keep a SOL buffer. Associated token accounts may be created during the swap; that costs a little extra SOL rent.",
      },
      {
        heading: "Simulation, priority, land",
        body:
          "Read the balance diff. Set priority fee during congestion. If it does not land, re-quote. Signing the same blockhash until it expires is how people get duplicate fills they did not want.",
      },
      {
        heading: "Honeypots still exist without ERC-20 approve",
        body:
          "Buy-only taxes, paused markets, and LP pulls are independent of EVM allowances. Confirm someone else has sold recently. Size as speculative. XAUConnect does not audit mints.",
      },
      {
        heading: "Creating SPL vs swapping SPL",
        body:
          "The in-app Launchpad deploys EVM ERC-20s. To generate an SPL token, use Solana token tooling, revoke freeze/mint if you promised a fair launch, seed a pool, then traders paste the mint into this swap flow.",
      },
    ],
    faqs: [
      {
        question: "Are all Solana tokens SPL?",
        answer:
          "Classic SPL and Token-2022 are the families you will meet. Both use mint addresses. Extensions differ. Verify on Solscan.",
      },
      {
        question: "Can I swap SPL tokens to ERC-20s in one click?",
        answer:
          "That is a cross-chain bridge plus destination swap, not an SPL swap. Use cross-chain mode and a 0x destination.",
      },
      {
        question: "Why did simulation fail?",
        answer:
          "Insufficient SOL, frozen token account, unsupported Token-2022 extension, or a pool too thin for your size. Change one variable at a time.",
      },
      {
        question: "Do I need Phantom?",
        answer:
          "No. Any Solana wallet XAUConnect connects to will work. Phantom is common, not required.",
      },
    ],
    description:
      "Swap SPL tokens on Solana with XAUConnect: mint verification, freeze/mint authorities, Jupiter routes, SOL fees, and Token-2022 caveats.",
  },

  "how-to-swap-tokens-without-kyc": {
    intro:
      "A non-custodial DEX aggregator does not open an account in your name. XAUConnect does not ask for a passport to show a quote or to sign a swap. That is the whole KYC distinction versus a centralized exchange: no deposit account, no withdrawal questionnaire, no hosted wallet.\n\nIt is not invisibility. Every swap is public on the explorer. If you onboarded funds from a KYC exchange, that history already exists. “No KYC” means XAUConnect is not your identity vendor — not that the chain is private.",
    sections: [
      {
        heading: "What you actually do",
        body:
          "Connect a wallet you control. Swap. Disconnect if you like. We never take custody, so there is no hosted balance to freeze and no customer-support reset for a lost seed. Losing the seed is losing the funds. That is the trade for skipping KYC.",
      },
      {
        heading: "What still identifies you",
        body:
          "On-chain addresses, timing, size, and any CEX on-ramp or off-ramp. WalletConnect peer metadata. RPC providers see IP traffic. If you need privacy beyond “no account at this DEX,” that is a different discipline (new wallets, careful funding) and not something a swap UI should pretend to sell.",
      },
      {
        heading: "Compliance we will not fake",
        body:
          "Some tokens and regions are restricted by law. A DEX interface can still refuse to display or build certain routes. No-KYC is not a promise that every asset is available to every person. It is a description of custody.",
      },
      {
        heading: "Practical swap steps remain the same",
        body:
          "Right chain, verified contracts, gas buffer, minimum received, exact approvals on EVM, simulation on Solana. Scammers specifically target “no KYC” searchers with fake sites. Type the URL. Bookmark it. We will never DM you a seed phrase.",
      },
      {
        heading: "When a CEX is still the right tool",
        body:
          "Bank off-ramps, native BTC, and customer recovery all live on KYC rails. Use them when you need them. Use XAUConnect when you want to trade tokens you already hold in a wallet, across seven chains, without depositing to us.",
      },
    ],
    faqs: [
      {
        question: "Do I register an email?",
        answer:
          "Not to swap. Quotes work without connecting. Connecting shares a public address, not an identity document.",
      },
      {
        question: "Can XAUConnect freeze my tokens?",
        answer:
          "No. We do not hold them. A token contract with pause/blacklist functions could freeze you — that is the issuer, not us. Prefer tokens without those hooks.",
      },
      {
        question: "Is this anonymous?",
        answer:
          "No. It is accountless and non-custodial. Block explorers are public.",
      },
      {
        question: "Can I swap from a CEX UI without withdrawing?",
        answer:
          "No. Withdraw to a wallet you control, then swap here.",
      },
    ],
    description:
      "Swap tokens without KYC on XAUConnect: non-custodial, no signup — still public on-chain. How that differs from a CEX and from true privacy.",
  },

  "how-to-swap-with-a-hardware-wallet": {
    intro:
      "A hardware wallet does not make a bad contract safe. It makes a signing prompt physical. Used correctly, a Ledger or Trezor (via MetaMask, Rabby, or WalletConnect) is the right way to swap size you cannot afford to type into a hot seed. Used carelessly, you still approve a malicious spender — you just confirm the theft with a button you waited three days to receive in the mail.\n\nXAUConnect never sees the keys. This guide is the hardware-specific swap path.",
    sections: [
      {
        heading: "Connect through an app, not a random “Ledger live swap” clone",
        body:
          "Use the vendor’s official app plus a wallet extension you already trust, or WalletConnect. Phishing sites love hardware-wallet keywords. Verify xauconnect.com. Enable blind-signing only if you understand the contract you are about to sign; prefer clear-signing screens that show spender and amount.",
      },
      {
        heading: "The device screen is the source of truth",
        body:
          "Browser UI can lie. The device should show the chain, the spender, and the value. If it says “data” or an unrecognized contract, abort. Re-quote if you spent five minutes squinting at tiny text — pools moved.",
      },
      {
        heading: "EVM: two device confirmations the first time",
        body:
          "Approve, then swap. Each is a transaction. Each costs gas. People with hardware wallets often trade size; exact allowances matter more, not less. Do not approve unlimited “to save button presses.”",
      },
      {
        heading: "Solana hardware",
        body:
          "Solana device support exists through some vendors and companion apps. Simulation still matters. Address format still matters. If your hardware setup is EVM-only, do not improvise a Solana send to a derived 0x address.",
      },
      {
        heading: "Operational security around size",
        body:
          "Keep a hot wallet for tiny test swaps of a new token. Use the hardware wallet for the size that matters, after the test sell works. Firmware updates from official vendor paths only. XAUConnect will never ask you to “enter the 24 words to sync Ledger.”",
      },
    ],
    faqs: [
      {
        question: "Does a hardware wallet prevent honeypots?",
        answer:
          "No. It prevents seed extraction from the laptop. You can still buy a token you cannot sell. Test small from a hot wallet first.",
      },
      {
        question: "Why did the device reject the transaction?",
        answer:
          "Wrong app open, blind-sign disabled, data too large, or you cancelled. Open the correct chain app and retry a fresh quote.",
      },
      {
        question: "Can I use a hardware wallet on mobile?",
        answer:
          "Some Bluetooth models can. Expect slower handoff. Re-quote after delays. WalletConnect plus device confirm is a common pattern.",
      },
      {
        question: "Is this custodial?",
        answer:
          "No. Keys stay in the device. XAUConnect builds unsigned transactions.",
      },
    ],
    description:
      "Swap on XAUConnect with a Ledger or Trezor: verify the device screen, exact ERC-20 allowances, test clips on a hot wallet, never type the seed.",
  },

  "how-to-move-tokens-from-ethereum-to-base": {
    intro:
      "Ethereum → Base is the most common “I want cheaper swaps of the same asset family” move. Both chains are EVM. Your address looks the same. That is why people send ERC-20s with a normal transfer to themselves and then wonder why Base is empty — a same-address transfer on Ethereum stays on Ethereum. You need a bridge.\n\nXAUConnect’s cross-chain flow bundles bridge plus any destination swap. This guide is that route, including the USDC-variant trap on arrival.",
    sections: [
      {
        heading: "Same address, different ledgers",
        body:
          "Your 0x account on Ethereum and Base is the same key. Balances are not shared. Select cross-chain, Ethereum as source, Base as destination. Confirm the wallet is on Ethereum to sign the source transaction. Keep ETH on Ethereum for that gas and a little ETH on Base so you can swap after arrival.",
      },
      {
        heading: "What arrives is a Base representation",
        body:
          "ETH arriving on Base is Base ETH (good for gas). USDC may arrive as native USDC or a bridged wrapper depending on the route. Check Basescan. If you landed in the thin variant, swap into native USDC on Base before you trade further.",
      },
      {
        heading: "Do not double-submit",
        body:
          "Bridges take minutes, not seconds. Status can look idle. A second send is how people pay twice. Wait for the destination explorer, then swap.",
      },
      {
        heading: "When to swap before bridging",
        body:
          "If Ethereum gas makes a small token-to-USDC swap silly, you might still prefer to bridge ETH or USDC — the deepest assets — and swap the long tail on Base. If the token has no honest Base market, bridging it creates a stranded wrapper. Check Base liquidity first.",
      },
      {
        heading: "After funds are on Base",
        body:
          "Use the Base swap guide: chain 8453, paste contracts, tight slippage on ETH/USDC, paranoid slippage on new tickers. Generating a Base token is Launchpad; this article only moves existing value.",
      },
    ],
    faqs: [
      {
        question: "I sent USDC to my address on Ethereum. Why is Base empty?",
        answer:
          "That was a same-chain transfer. Use a bridge or XAUConnect cross-chain. The tokens are still on Ethereum.",
      },
      {
        question: "How long does Ethereum to Base take?",
        answer:
          "Often a few minutes depending on the bridge and Ethereum confirmations. Canonical paths and third-party paths differ. Track status and verify on Basescan.",
      },
      {
        question: "Do I need ETH on Base before I bridge?",
        answer:
          "You can arrive with ETH as the bridged asset. If you arrive with only ERC-20s and zero ETH, you may be unable to swap until you obtain Base ETH for gas.",
      },
      {
        question: "Is this cheaper than swapping on mainnet?",
        answer:
          "Usually for subsequent trades. The bridge itself has fees and risk. Amortize that over the trades you will do on Base, not over a single $30 swap.",
      },
    ],
    description:
      "Move tokens from Ethereum to Base with XAUConnect: use a bridge (same 0x address is not enough), verify the arriving USDC, keep ETH for gas on both sides.",
  },

  "how-to-move-tokens-from-ethereum-to-solana": {
    intro:
      "Ethereum → Solana crosses virtual machines. Your MetaMask address is useless as a Solana destination. Your Phantom address is useless as an Ethereum destination. Getting this wrong is not “pending” — it is burned funds.\n\nXAUConnect cross-chain mode is built for that mismatch: sign on Ethereum, receive on a Solana wallet you control, then swap the arriving mint if needed. This guide is the checklist we wish every first-timer saw.",
    sections: [
      {
        heading: "Two wallets, two formats",
        body:
          "Have an EVM wallet funded with the source asset plus ETH for gas. Have a Solana wallet funded with a little SOL so you can move after arrival. In the destination field, paste the Solana address from Phantom/Solflare/Backpack — never the 0x string.\n\nIf a UI lets you paste an 0x destination for a Solana arrival, stop. That is the wrong product state.",
      },
      {
        heading: "What the mint will be",
        body:
          "You will not receive “the same ERC-20.” You receive a wrapped or bridged SPL mint. Confirm it on Solscan. If you wanted native Solana USDC, you may need a second swap from the wrapped mint into native USDC. Budget that hop.",
      },
      {
        heading: "Time, status, no duplicates",
        body:
          "VM-crossing bridges are slower than Base deposits. Watch the status panel. Verify Solscan before you consider it done. Do not send a second bridge because the first is “taking too long” unless the interface reports failure.",
      },
      {
        heading: "Size a test first",
        body:
          "The first Ethereum→Solana transfer you ever do should be small — enough to learn the arriving mint and the SOL gas requirement, not enough to ruin a week. Then send the rest on the same route.",
      },
      {
        heading: "After arrival: Solana swap rules apply",
        body:
          "Simulation, priority fees, mint paste. You are now in the Solana guide. There is no ERC-20 approve on this side. There is also no way to spend this mint on Ethereum without bridging back.",
      },
    ],
    faqs: [
      {
        question: "Can I use the same seed for MetaMask and Phantom?",
        answer:
          "Some people import seeds across wallets; the derived addresses are still different formats. Always paste the Solana address Phantom shows, not the Ethereum one MetaMask shows.",
      },
      {
        question: "Why did I receive wrapped ETH on Solana instead of SOL?",
        answer:
          "You bridged ETH. Wrapped ETH is the honest arrival. Swap that mint to SOL or USDC if that is what you wanted, and keep SOL for fees.",
      },
      {
        question: "Is this a swap or a bridge?",
        answer:
          "Both, if the route includes a destination swap. The source signature leaves Ethereum; later, an SPL mint is credited. Treat it as a multi-step transfer with extra smart-contract risk.",
      },
      {
        question: "Can I reverse Solana to Ethereum the same way?",
        answer:
          "Yes, with the formats flipped: Solana source, 0x destination, ETH gas waiting on Ethereum. Test small.",
      },
    ],
    description:
      "Bridge tokens from Ethereum to Solana with XAUConnect: paste a base58 destination, never 0x, test small, verify the arriving SPL mint on Solscan.",
  },

  "how-to-swap-stablecoins-across-chains": {
    intro:
      "Moving USDC or USDT between networks is the most requested “multi-chain token” task and the easiest to botch, because the tickers match and the contracts do not. Native USDC on Ethereum is not native USDC on Base is not USDC on Solana. Bridged copies add more contracts. A cross-chain stablecoin swap is: source stable → bridge → destination stable (hopefully the native one).\n\nXAUConnect shows the composite quote. Your job is the destination contract and gas on both sides.",
    sections: [
      {
        heading: "Name the two contracts out loud",
        body:
          "Source: which chain, which stable, which address. Destination: which chain, which stable, which address. If you cannot fill those six fields, you are not ready to sign. Prefer native Circle USDC on EVM destinations when the route can deliver it.",
      },
      {
        heading: "Gas is never the stablecoin",
        body:
          "Ethereum legs need ETH. Solana legs need SOL. Base and Arbitrum need ETH on those L2s. Bridging USDC into a wallet with zero native gas creates a museum piece you can look at and not move.",
      },
      {
        heading: "When a same-chain swap is smarter",
        body:
          "If you hold USDT on Base and want USDC on Base, that is a local stable swap — cheaper and safer than bridging. Only cross chains when the destination app or the destination gas situation actually requires it.",
      },
      {
        heading: "Peg and variant risk stack",
        body:
          "You take issuer risk (Tether vs Circle vs DAI), bridge risk, and variant risk. During peg noise, reduce size. During calm markets, variant mistakes still print as “I lost 80 bps.” Check explorers on both sides.",
      },
      {
        heading: "Execution",
        body:
          "Use cross-chain mode. Read estimated time. Do not double-submit. On arrival, if the mint/contract is not the native stable you wanted, do a small local swap into it. Then you are done.",
      },
    ],
    faqs: [
      {
        question: "Is USDC multi-chain a single balance?",
        answer:
          "No. Each chain is a separate token. Circle’s CCTP and bridges exist to connect them; they are not automatic.",
      },
      {
        question: "USDT or USDC for bridging?",
        answer:
          "Whichever native contract has the honest route and the destination liquidity you need. Quote both. Do not assume Ethereum habits apply on BNB Chain.",
      },
      {
        question: "Can I bridge DAI the same way?",
        answer:
          "If a supported route exists. DAI liquidity is often thinner on destinations — check impact on arrival.",
      },
      {
        question: "Why was I charged more than 1:1?",
        answer:
          "Bridge fees, destination swap impact, platform fee, and possibly a wrapped arrival you still need to convert. Read the composite minimum received.",
      },
    ],
    description:
      "Swap stablecoins across chains on XAUConnect: native vs bridged USDC/USDT, gas on both sides, and when a same-chain rotation is the better trade.",
  },

  "how-to-wrap-and-unwrap-eth": {
    intro:
      "Wrapping ETH turns native ETH into WETH, an ERC-20, so it can sit in AMM pools and allowances like any other token. Unwrapping burns WETH and returns ETH 1:1, minus gas. It is not a trade against USDC. It is not a bridge. People search “swap ETH to WETH” because wallets show them as two balances.\n\nXAUConnect routes often wrap and unwrap inside a swap so you never think about it. This article is for when you actually want WETH in the wallet — or when you are stuck holding WETH and need ETH for gas.",
    sections: [
      {
        heading: "When wrapping is necessary",
        body:
          "Some pools and protocols only speak WETH. If you want to LP ETH against USDC, you are usually depositing WETH. If you only want to sell ETH for USDC, you do not need to wrap first; the aggregator path will wrap as needed.",
      },
      {
        heading: "When unwrapping is necessary",
        body:
          "You received WETH from a pool or a bridge and now cannot pay gas because your native ETH is too low. Unwrap enough WETH to restore a gas buffer. Unwrap is a contract call on the canonical WETH address for that chain — verify it. Fake WETH tickers exist.",
      },
      {
        heading: "Chain-local WETH",
        body:
          "WETH on Ethereum, Base, and Arbitrum are different contracts. Unwrapping Base WETH does not give you Ethereum ETH. Bridging is the cross-chain tool. Wrapping is local.",
      },
      {
        heading: "How to do it in the swap widget",
        body:
          "Select the chain. Input ETH, output WETH (or the reverse). The rate should be essentially 1:1 minus gas and any platform fee on that path. If the rate is not ~1, you picked a non-canonical wrapper. Abort and paste the canonical WETH address from a primary source.",
      },
      {
        heading: "Gas math",
        body:
          "You cannot unwrap your last WETH if you have zero ETH to pay the unwrap. Keep a native reserve before you wrap everything. This is the same lesson as “do not sell 100% of ETH for USDC.”",
      },
    ],
    faqs: [
      {
        question: "Is WETH a wrapped Bitcoin-style custodian asset?",
        answer:
          "No. Canonical WETH is ETH in a standard wrapper contract, redeemable 1:1 on that chain.",
      },
      {
        question: "Why would a quote show less than 1:1?",
        answer:
          "Wrong token, a fee-on-transfer fake, or you are looking at a path that routed through a pool instead of the wrap contract. Check the address.",
      },
      {
        question: "Does Solana have WETH?",
        answer:
          "Solana has wrapped ETH mints from bridges — those are bridged assets, not Ethereum WETH. Different risk.",
      },
      {
        question: "Should I hold ETH or WETH?",
        answer:
          "Hold native ETH for gas. Hold WETH only if a protocol requires it. Convert back when you are done.",
      },
    ],
    description:
      "Wrap and unwrap ETH to WETH on XAUConnect: 1:1 on the same chain, not a bridge — keep native ETH for gas and verify canonical WETH.",
  },

  "how-to-swap-on-a-layer-2-network": {
    intro:
      "Layer 2 networks (Arbitrum, Base, and similar rollups) execute cheaply while posting data to Ethereum. For swappers that means ETH gas at a discount, the same 0x address as mainnet, and a zoo of bridged tokens. XAUConnect supports Arbitrum and Base as full swap venues — not as “Ethereum but prettier.”\n\nThis guide is the L2-specific mental model: when to use one, how to fund it, and how not to confuse it with Polygon or BNB Chain (which are not the same architecture).",
    sections: [
      {
        heading: "L2 is a different computer with a familiar address",
        body:
          "Your key is the same. Your USDC is not. Select Arbitrum or Base explicitly. Quotes on Ethereum cannot spend L2 balances. People who “bridge in their head” skip the actual bridge and then think the DEX is broken.",
      },
      {
        heading: "Fund with the asset you will gas with",
        body:
          "Both Arbitrum and Base charge ETH. Bridge some ETH, not only an altcoin. A wallet that arrives with a memecoin and zero ETH is stuck until someone sends it gas.",
      },
      {
        heading: "Depth versus fee",
        body:
          "Retail ETH/USDC is why L2s win. Exotic tokens may still be deeper on mainnet or may not exist on the L2. Check impact. Bridging a tiny-cap to an L2 with no pool creates a souvenir.",
      },
      {
        heading: "Withdrawals are not instant on every path",
        body:
          "Canonical rollup withdrawals to Ethereum can take a long challenge window. Third-party bridges are faster and add their own risk. Plan exits. A swap on the L2 is instant by comparison; leaving the L2 is not always.",
      },
      {
        heading: "Swap as usual once funded",
        body:
          "Connect, exact approve, minimum received, confirm. Low fees make it tempting to overtrade thin names. The L2 did not remove honeypot risk; it removed the $8 gas excuse for not doing a test clip.",
      },
    ],
    faqs: [
      {
        question: "Is Polygon a Layer 2?",
        answer:
          "Polygon PoS is its own chain with bridged Ethereum assets. Arbitrum and Base are Ethereum rollups. All three need the chain selector. Do not mix their USDC contracts.",
      },
      {
        question: "Which L2 should I use?",
        answer:
          "Wherever your funds and the pool you need already are. Compare gas plus minimum received. Coinbase users often land on Base; DeFi natives often already sit on Arbitrum.",
      },
      {
        question: "Do I still need Ethereum ETH?",
        answer:
          "Only if you will transact on mainnet or pay a canonical bridge from L1. L2 gas is L2 ETH.",
      },
      {
        question: "Can I generate a token on an L2?",
        answer:
          "Yes — Launchpad targets EVM chains including Base and Arbitrum when factories are deployed. Cheaper deploys mean more junk; lock liquidity.",
      },
    ],
    description:
      "Swap on Ethereum Layer 2s (Arbitrum, Base) with XAUConnect: same address, different balances, ETH for gas, and when canonical withdrawals are slow.",
  },

  "what-is-a-token-swap": {
    intro:
      "A token swap on a DEX is an on-chain trade against a liquidity pool: you send token A, the pool sends token B, at a price the pool math allows right now. There is no clerk, no account, and no “order filled by the other guy” in the stock-market sense. The other side is the pool (and, indirectly, the liquidity providers).\n\nXAUConnect is an aggregator: it asks several of those pools and routing networks for the same trade and lets you sign the path with the best minimum received after fees. Understanding the primitive is what makes the quote card readable.",
    sections: [
      {
        heading: "Swap versus send versus bridge",
        body:
          "A send moves the same token to another address on the same chain. A swap changes the token. A bridge changes the chain (and often wraps the token). Mixing those verbs is how people paste the wrong destination.",
      },
      {
        heading: "Where the price comes from",
        body:
          "AMMs price from reserves. Large trades move the price (impact). Slippage tolerance is how far you allow that price to move before the transaction reverts. The quote’s minimum received is that protection, not a marketing rate.",
      },
      {
        heading: "What you sign",
        body:
          "On EVM, possibly an approval, then a swap transaction to a router. On Solana, one transaction the wallet simulates. XAUConnect does not broadcast EVM transactions for you and does not hold balances.",
      },
      {
        heading: "Multi-chain tokens",
        body:
          "Swapping USDC on Ethereum does not touch USDC on Solana. “Token swap” is always local to a chain unless you explicitly start a cross-chain route.",
      },
      {
        heading: "Creating a token is not a swap",
        body:
          "Generating an ERC-20 or SPL mint creates a new asset. Until someone deposits a pool, there is nothing to swap against. Launchpad plus locked liquidity is what makes a new token swappable; the swap widget is what traders use afterward.",
      },
    ],
    faqs: [
      {
        question: "Is a swap reversible?",
        answer:
          "Only by swapping back, at a new price, paying fees again. There is no chargeback.",
      },
      {
        question: "Who is the counterparty?",
        answer:
          "The pool (LPs), not XAUConnect. We aggregate routes.",
      },
      {
        question: "Do I need KYC?",
        answer:
          "Not to use this non-custodial interface. The chain is still public.",
      },
      {
        question: "What tokens can I swap?",
        answer:
          "Any supported-chain token with a routable pool, after you verify the contract. No pool, no honest swap.",
      },
    ],
    description:
      "What a token swap is: an on-chain pool trade, not a send or a bridge. How aggregators quote minimum received on XAUConnect.",
  },

  "what-is-a-multi-chain-token": {
    intro:
      "A “multi-chain token” is almost never one object. It is a brand (USDC, an ecosystem coin, a memecoin name) implemented as separate contracts or mints on several networks, sometimes connected by a canonical bridge or a burn-and-mint issuer, sometimes connected by nothing but a reused ticker.\n\nTraders lose money when they treat the brand as a balance that follows the wallet. XAUConnect’s chain selector exists because the chain is part of the asset’s identity.",
    sections: [
      {
        heading: "Three different realities",
        body:
          "Official multi-chain issuance: the issuer mints native tokens on several chains (Circle USDC). Bridged multi-chain: a lock-and-mint wrapper represents an asset from a home chain. Fake multi-chain: someone deployed the same name on Base that a different someone deployed on Solana. Only the first two have any business in a serious wallet, and even those require address checks.",
      },
      {
        heading: "How to tell which one you hold",
        body:
          "Explorer, not Twitter. Match the contract to the issuer’s published addresses. If there is no published address for that chain, assume it is unrelated. Liquidity depth is a hint, not a proof.",
      },
      {
        heading: "How to move a real multi-chain asset",
        body:
          "Use a supported bridge or issuer-native transfer (for example CCTP-style USDC). XAUConnect cross-chain routing is the interface for that plus a destination swap. Do not send ERC-20s to Solana addresses.",
      },
      {
        heading: "How to swap a multi-chain name locally",
        body:
          "Pick the chain, paste that chain’s contract, swap against local pools. That does not synchronize your holdings elsewhere. You can hold USDC on three chains at once; they are three balances.",
      },
      {
        heading: "Issuers: do not pretend you are native everywhere",
        body:
          "If you generate a token on Base via Launchpad, it is a Base ERC-20. Listing the same ticker on Ethereum later without a canonical bridge is how you create a fake multi-chain token. One home chain, documented bridges, or don’t.",
      },
    ],
    faqs: [
      {
        question: "Is ETH a multi-chain token?",
        answer:
          "ETH is native on Ethereum and is the gas token on several L2s, each a different balance. Bridged ETH on Solana is a mint. Treat each as local.",
      },
      {
        question: "Why did I buy the “same” memecoin on two chains and the prices differ?",
        answer:
          "They are different tokens sharing a name. Prices are unrelated. You bought two risks.",
      },
      {
        question: "Can XAUConnect merge my balances?",
        answer:
          "No. We can route a bridge. We cannot make two contracts into one.",
      },
      {
        question: "What should I paste into Swap?",
        answer:
          "The contract or mint for the chain selected in the widget — from the issuer’s list, not from a search ad.",
      },
    ],
    description:
      "What a multi-chain token really is: separate contracts per network, official vs bridged vs fake tickers, and how to swap or bridge without mixing them.",
  },

  "how-to-choose-which-chain-to-swap-on": {
    intro:
      "The right chain to swap on is usually the chain where the tokens already sit, unless gas or missing liquidity forces a bridge. People optimize “cheapest chain” in the abstract and then pay a bridge plus a wrong-USDC variant to save a pool fee they already spent twice.\n\nThis is a decision guide for XAUConnect’s seven networks: Ethereum, Solana, BNB Chain, Polygon, Arbitrum, Base, and Avalanche.",
    sections: [
      {
        heading: "Inventory first",
        body:
          "List what you hold and where. If 90% of the position is Base USDC, swap on Base. Moving it to Solana “because fees are low” is a new risk stack. Only relocate size you intend to keep on the destination.",
      },
      {
        heading: "Match the token’s home liquidity",
        body:
          "SOL pairs want Solana. BNB-native memecoins want BNB Chain. Deep ETH/USDC exists on Ethereum and on L2s — pick L2 for retail, mainnet for some large clips. Avalanche ecosystem tokens want C-Chain. Fighting a token’s home chain produces thin wrappers.",
      },
      {
        heading: "Gas versus impact",
        body:
          "Ethereum gas hurts small trades. Solana and L2s make small trades viable. None of that helps if impact is 8% on a thin pool. Compare minimum received plus estimated gas, not gas alone.",
      },
      {
        heading: "Wallet and skill constraints",
        body:
          "If you only have MetaMask, Solana is a new wallet to learn before you bridge. If you only have Phantom, EVM is the new skill. Do not cross VMs on a Friday night with size you have not tested.",
      },
      {
        heading: "Issuers choosing a launch chain",
        body:
          "Launch where your users already swap and where you will lock liquidity. Cheap deploys (Base, BNB, Polygon) increase scam density around you. Ethereum deploys are expensive to fake at scale but expensive to experiment with. Solana is a different token program. Pick one home.",
      },
    ],
    faqs: [
      {
        question: "What is the cheapest chain to swap crypto?",
        answer:
          "Often Solana or an L2 for gas, but only if the pool is there. All-in cost is gas plus impact plus bridge if you had to move. See the dedicated cheapest-chain article.",
      },
      {
        question: "Should I consolidate to one chain?",
        answer:
          "It simplifies gas and USDC variants. It also concentrates bridge risk when you move. Consolidate into the venue you actually trade.",
      },
      {
        question: "Can XAUConnect pick the chain for me?",
        answer:
          "We pick routes on the chain you select (and composite paths for cross-chain). We do not silently move your inventory.",
      },
      {
        question: "I have the same seed on all EVM chains. Isn’t that one chain?",
        answer:
          "One key, many ledgers. Select the ledger that holds the balance.",
      },
    ],
    description:
      "How to choose a chain to swap on with XAUConnect: start from inventory and home liquidity, then compare gas plus price impact — not gas memes.",
  },

  "cheapest-chain-to-swap-crypto": {
    intro:
      "The cheapest chain is not a trophy. It is the network that minimizes gas + price impact + (optional) bridge cost for the specific tokens you hold. Solana often wins the gas column. A deep Ethereum pool can still win a large trade. An L2 can win retail ETH/USDC. BNB Chain can win USDT-centric flow. Anyone ranking chains with a single number is selling a thread, not a quote.\n\nXAUConnect shows the numbers that matter: minimum received and estimated gas, on the chain you select.",
    sections: [
      {
        heading: "Break the bill into three lines",
        body:
          "Network fee in the native token. Pool and platform fees inside the quote. Price impact from your size. On Ethereum, line one dominates small clips. On Solana and L2s, line three dominates junk tokens. Optimize the line that is actually large.",
      },
      {
        heading: "Typical patterns, not promises",
        body:
          "Tiny SOL/USDC: Solana. Tiny ETH/USDC you already hold on Base or Arbitrum: that L2. Tiny ETH/USDC stuck on mainnet: sometimes cheaper to swap there than to bridge for one trade; sometimes cheaper to bridge if you will trade all week. BNB Chain: frequent USDT trades with tiny BNB gas. Polygon: similar, watch bridged USDC. Avalanche: moderate AVAX gas, C-Chain only.",
      },
      {
        heading: "Bridge cost ruins “cheapest chain” shopping",
        body:
          "Moving $200 of an alt to a cheap chain to save $0.40 of gas is how people pay $8 of impact and a wrapped-token mess. Relocate when you will use the destination, not to win a spreadsheet.",
      },
      {
        heading: "How to measure on XAUConnect",
        body:
          "If you already hold the asset on two chains, quote both. Compare minimum received minus a reasonable USD value of gas. Ignore social media fee screenshots from a different block hour.",
      },
      {
        heading: "Cheap chains and cheap tokens",
        body:
          "Low gas correlates with more scam deploys. The cheapest honest swap of a honeypot is still a total loss. Contract verification is part of cost.",
      },
    ],
    faqs: [
      {
        question: "Is Solana always cheapest?",
        answer:
          "For gas, often. For a token that only has a real pool on Ethereum, no. For a first-time VM-cross, bridge risk can dominate.",
      },
      {
        question: "Is Ethereum obsolete for swapping?",
        answer:
          "No. It still has unique depth. It is obsolete as a default for $40 memecoin round-trips.",
      },
      {
        question: "Does XAUConnect charge less on cheap chains?",
        answer:
          "Platform fee is disclosed in the quote (typically 30 bps on configured EVM routers). Gas is the chain’s. Compare minimum received.",
      },
      {
        question: "Should I generate my token on the cheapest chain?",
        answer:
          "Only if that is where buyers and liquidity will live. Cheap deploys without locked LP are how launches die.",
      },
    ],
    description:
      "Which chain is cheapest to swap crypto: compare gas, impact, and bridge cost for your tokens — Solana, L2s, BNB, and Ethereum each win different trades.",
  },

  "how-to-swap-the-same-ticker-on-multiple-chains": {
    intro:
      "Searching “PEPE” or “USDC” on two chains and swapping both is how people accidentally buy two assets. The same ticker is not a multi-chain balance. This guide is the operational habit: one chain at a time, addresses from a list you trust, and a bridge only when the issuer actually connected those contracts.\n\nXAUConnect will quote whatever contract you select on the selected chain. It will not warn you that a Base memecoin is unrelated to an Ethereum memecoin unless you notice the addresses differ — you have to look. Treat the chain selector as part of the token’s name.",
    sections: [
      {
        heading: "Build a tiny address book",
        body:
          "For every ticker you care about, store chain + address. Official USDC lists, project docs, or your own first verified receipt. Do not rebuild that from search the next morning.",
      },
      {
        heading: "Swap locally with the book",
        body:
          "Select chain. Paste address. Quote. If the logo and ticker match but the address does not, you are in a clone. Walk away. This is especially true for memecoins that “launched on every chain this weekend.”",
      },
      {
        heading: "When the issuer is actually multi-chain",
        body:
          "Use their published bridge or XAUConnect cross-chain onto the published destination contract. Then swap locally if you need a different token on that chain. Do not buy the destination ticker from a random pool “to save the bridge fee.”",
      },
      {
        heading: "Accounting",
        body:
          "Your wallet UI may sum “USDC” across chains as if it were one. It is not. Gas, bridges, and variants make those numbers non-fungible until you actually move them.",
      },
      {
        heading: "Issuers reading this",
        body:
          "If you generate a token with Launchpad, publish one address per chain you truly support. If you only deployed on BNB Chain, say so. Silence is how clones eat your ticker.",
      },
    ],
    faqs: [
      {
        question: "XAUConnect showed the right logo. Is the token safe?",
        answer:
          "Logos are copied. Addresses are not. Paste and compare.",
      },
      {
        question: "Can I swap my Ethereum token using the Base ticker page?",
        answer:
          "No. Different contract. Bridge if a real route exists, or sell on Ethereum.",
      },
      {
        question: "Why do prices differ across chains for USDC?",
        answer:
          "Local pools, local demand, and sometimes different contracts. Native USDC should hug a dollar; thin wrappers may not.",
      },
      {
        question: "Is this the same as multi-hop?",
        answer:
          "No. Multi-hop is several pools on one chain. Multi-chain is several ledgers.",
      },
    ],
    description:
      "How to swap the same ticker on multiple chains without buying clones: keep an address book, paste contracts, and only bridge official mappings.",
  },
};

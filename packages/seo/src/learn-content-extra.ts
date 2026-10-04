/**
 * Extra unique sections appended to commercial Learn articles so each body
 * clears the 400-word floor without FAQ padding or spun filler.
 */
import type { SeoSection } from "./types.js";

export const COMMERCIAL_EXTRA_SECTIONS: Record<string, SeoSection[]> = {
  "how-to-swap-tokens-on-solana": [
    {
      heading: "A Solana swap that is actually two mistakes",
      body:
        "The first mistake is funding Phantom with a CEX “SOL withdrawal” that used an EVM memo or the wrong network, then blaming Jupiter when the balance is zero. The second is pasting an Ethereum USDC address into an SPL field because the last six characters looked familiar. XAUConnect cannot rescue either. Confirm Solscan for the mint, confirm SOL for fees, then size the first clip as a rehearsal — especially if you just bridged from Ethereum and the arriving mint is wrapped ETH rather than native USDC. Only after that rehearsal should you flatten size into SOL/USDC.",
    },
  ],
  "how-to-swap-tokens-on-bnb-chain": [
    {
      heading: "Cheap gas is not cheap attention",
      body:
        "BNB Chain will let you retry a bad memecoin five times for pennies. That is not an argument for five retries. One failed sell after a successful buy is the signal to stop, not to raise slippage to 20%. If you are flattening BNB to USDT to pay Launchpad LP, use the verified USDT you will actually pair — mixing USDC.e-style cousins into LP is how your own buyers inherit a bad quote. Keep the BscScan tab open next to XAUConnect until the receipt matches.",
    },
  ],
  "how-to-swap-tokens-on-base": [
    {
      heading: "Coinbase the exchange versus Base the chain",
      body:
        "A Coinbase spot balance labeled USDC is not Base USDC in your self-custody wallet. Withdraw to Base, wait for Basescan, then swap. If you withdrew to Ethereum by habit, a Base quote will look empty and you will think the aggregator is down. The other Base-specific failure is swapping a memecoin that launched forty minutes ago with a ticker that also exists on Solana: those are two tokens. Paste the Basescan address from the same thread that showed the deploy hash, then test a sell before you size.",
    },
  ],
  "how-to-swap-tokens-on-arbitrum": [
    {
      heading: "Bridge delay versus swap revert",
      body:
        "Canonical Ethereum → Arbitrum deposits are usually quick; canonical withdrawals back to L1 are not. Do not treat a pending withdrawal as a failed XAUConnect swap and send a duplicate. If an Arbitrum swap reverts, read Arbiscan: allowance, slippage, or a token that is the Optimism wrapper with a similar name. Keep ETH on Arbitrum as a gas silo. If you just arrived from mainnet with only USDC, obtain a little ETH before you try to approve anything.",
    },
  ],
  "how-to-swap-tokens-on-polygon": [
    {
      heading: "POL, MATIC, and three USDC contracts",
      body:
        "If a tutorial still says “gas is MATIC,” translate it to native POL on Polygon PoS and move on. The costly confusion is stables: native USDC, bridged USDC.e, and random dollar tokens. Quote impact will tell you which one you picked before the explorer does — a “USDC” fill that is 1.2% wide on a $200 clip is almost never XAUConnect’s 30 bps. Paste, compare, then swap. Bridging Ethereum USDC to Polygon and then swapping the wrong arrival is how people pay twice.",
    },
  ],
  "how-to-swap-tokens-on-avalanche": [
    {
      heading: "CEX withdrawal labels that lie",
      body:
        "Exchanges still offer X-Chain and C-Chain withdrawals with similar names. Only C-Chain AVAX shows up for this swap widget. If Snowtrace is empty, the funds are not on the EVM ledger — recover via the exchange’s correct-network tools, do not send more. Once on C-Chain, AVAX→USDC is ordinary EVM: gas buffer, canonical USDC, tight slippage for ordinary size. Subnet tokens with a C-Chain wrapper need the wrapper’s Snowtrace address, not the subnet’s marketing name.",
    },
  ],
  "how-to-swap-eth-to-usdc": [
    {
      heading: "Worked numbers, not vibes",
      body:
        "Selling 0.2 ETH on Ethereum with $12 of gas to net ~$500 of USDC can be worse than bridging 0.2 ETH to Base (paying the bridge once) and swapping there if you will trade again this week. Selling 0.2 ETH that already sits on Base is the easy case: keep $5 of ETH for gas, 0.5% slippage, native USDC. Selling 25 ETH is a depth problem: compare mainnet versus L2 minimum received, split clips, and never set slippage wide to “make it go through.” The quote card’s floor is the only number you authorized.",
    },
  ],
  "how-to-swap-sol-to-usdc": [
    {
      heading: "After the flatten",
      body:
        "Solana USDC is an SPL mint. It will not pay an Ethereum NFT mint, a Base Launchpad fee, or a MetaMask gas bill. If the next step is an EVM launch, you still need a bridge and a 0x wallet with ETH. If the next step is buying an SPL memecoin, you are already in the right VM — paste that mint, keep SOL, read simulation. Emptying SOL to maximize USDC is how the next signature fails. Leave a fee buffer the same way EVM users leave ETH.",
    },
  ],
  "how-to-swap-bnb-to-usdt": [
    {
      heading: "From Binance the company to BNB the chain",
      body:
        "Spot BNB on Binance is not a swap input. Withdraw to your wallet on BNB Smart Chain, wait for BscScan, then sell BNB for verified USDT on XAUConnect. If you withdraw BNB as an ERC-20 on Ethereum, you now hold a wrapped asset that this BNB Chain pair cannot spend. Keep BNB for gas so the USDT can move later — including into LP if you are about to generate a token. Quote USDC as a sanity check; on this chain USDT often wins, but only the explorer address proves you received Tether.",
    },
  ],
  "how-to-swap-usdt-to-usdc": [
    {
      heading: "A $5,000 rotation deserves an address check",
      body:
        "People size stable-to-stable like it is a bank transfer. It is a pool. On Ethereum, gas can make a $300 rotation silly — do it on the L2 or Solana where the USDT already lives. On any chain, paste both contracts. If you hold bridged USDT and want native USDC, the route may hop; read the hop list. During peg noise, cut size and accept that 1.00 is not a promise. After the fill, the USDC you hold is still that chain’s USDC. Bridging it is a second product.",
    },
  ],
  "how-to-swap-btc-to-eth": [
    {
      heading: "If your BTC is still Bitcoin",
      body:
        "A bc1 or xpub balance cannot enter this aggregator. Wrap through the official WBTC/cbBTC/BTC.b process or withdraw a supported wrapper from a venue that already issued it. Then, and only then, pick the chain of that wrapper and sell it for ETH. Sending native BTC to an XAUConnect 0x address is a loss. Sending WBTC to a Solana address is a loss. The swap itself is ordinary ERC-20 or SPL once the wrapper is in the right wallet with gas.",
    },
  ],
  "how-to-swap-erc-20-tokens": [
    {
      heading: "Approvals you should revoke later",
      body:
        "Every successful ERC-20 swap through a new router leaves an allowance. Exact allowances expire with the size you used. Unlimited allowances do not. After a campaign of trades, use a trusted explorer revoke tool — another signature, more gas, worth it on Ethereum if the spender set is large. XAUConnect cannot sweep your allowances; we never held the keys. Fee-on-transfer tokens may still fail even with a perfect allowance: the router’s minimum-received math assumed a full transfer.",
    },
  ],
  "how-to-swap-spl-tokens-on-solana": [
    {
      heading: "Rent, ATAs, and why the fee is not “zero”",
      body:
        "First time you receive a new mint, Solana may create an associated token account. That rent is extra SOL, not Jupiter taking a cut. If simulation shows a larger SOL debit than you expected, that is often ATA rent plus priority fee — read the diff. If it shows a third mint you did not request, reject. Token-2022 transfer fees can also debit extra; if the mint uses them, the “simple swap” is not simple. Prefer mints with revoked freeze and mint for anything you plan to hold overnight.",
    },
  ],
  "how-to-swap-tokens-without-kyc": [
    {
      heading: "Phishing is the KYC you did not want",
      body:
        "Search ads for “no KYC swap” are a favorite for lookalike domains. Bookmark xauconnect.com. We will not telegram you a seed backup. We will not ask you to type 12 words to “enable non-custodial mode.” A connected wallet is a public address plus signature requests. If you funded that wallet from a KYC exchange, the exchange already knows the withdrawal. No-KYC here means we are not a second identity vendor — not that you became invisible.",
    },
  ],
  "how-to-swap-with-a-hardware-wallet": [
    {
      heading: "Practice on a $15 clip",
      body:
        "Hardware wallets fail in boring ways: wrong app open, screen timeout, stale quote. Practice a $15 ETH/USDC or SOL/USDC swap until the device prompt is familiar. Then move size. Clear-signing that shows spender and amount is worth the firmware hassle. If the device says “unrecognized,” that can be a legitimate complex aggregator payload — or a malicious spender. When unsure, abort, re-quote a simpler pair, and never “just approve unlimited so it fits on one screen.”",
    },
  ],
  "how-to-move-tokens-from-ethereum-to-base": [
    {
      heading: "Gas planning for the week, not the minute",
      body:
        "Bridge enough ETH to Base to cover several approvals and swaps, not one. Arriving with only an altcoin and zero ETH is a support ticket you send to yourself. After USDC arrives, confirm native versus bridged on Basescan before you LP or trade a memecoin. If you bridged because Ethereum gas made a $40 swap silly, stay on Base for the next trades — bridging back the same day undoes the savings and restacks bridge risk.",
    },
  ],
  "how-to-move-tokens-from-ethereum-to-solana": [
    {
      heading: "The two-wallet dry run",
      body:
        "Write on paper: Ethereum source address, Solana destination address, asset you think you are sending, asset you expect to receive (mint). If any line is blank, you are not ready. Send a test that is painful to lose but not life-changing. Watch Solscan until the mint is there and you still have SOL for the next hop. Only then send the rest on the same route. People who skip the dry run are the people who paste 0x into a Solana field because both strings were on the same screen.",
    },
  ],
  "how-to-swap-stablecoins-across-chains": [
    {
      heading: "CCTP-style versus lock-and-mint, in practice",
      body:
        "Some USDC routes burn on the source and mint native USDC on the destination. Others lock and give you a wrapper. The quote’s arrival token is the one that matters. Native-to-native is what most protocols on the destination actually want. If you arrive wrapped, budget a local swap into native before you call the job done. That extra hop is cheaper than discovering a lending market will not accept the wrapper. DAI and USDT follow their own bridge maps — do not assume USDC’s path applies.",
    },
  ],
  "how-to-wrap-and-unwrap-eth": [
    {
      heading: "Stuck WETH, empty ETH",
      body:
        "This is the actual emergency: you swapped into WETH, spent the last native ETH on that swap, and now cannot unwrap. The fix is a tiny ETH transfer from another wallet or exchange withdrawal to the same 0x on that chain, then unwrap canonical WETH. Do not buy a random “ETH” token to “refill gas.” Do not bridge WETH hoping it becomes native ETH on another chain without checking the route. Canonical wrap/unwrap is local. Treat it like changing denominations of the same bill.",
    },
  ],
  "how-to-swap-on-a-layer-2-network": [
    {
      heading: "L2 memecoins still need Ethereum-grade paranoia",
      body:
        "Low gas removes the $8 penalty for a test clip, so take the test clip. Honeypots, unlocked LP, and ticker clones are not L1-only. Canonical USDC on Base or Arbitrum is still a contract you should paste. When you eventually need Ethereum mainnet — a listing, a specific pool — use a bridge with eyes open about withdrawal delays. An L2 swap is not an L1 withdrawal. Mixing those clocks is how people double-spend a bridge.",
    },
  ],
  "what-is-a-token-swap": [
    {
      heading: "What the wallet is actually allowing",
      body:
        "On EVM, an approval says a router may move up to N tokens. The swap says “exchange these for at least M of the other token, or revert.” On Solana, one transaction encodes the debit and credit; simulation is your preview of M. XAUConnect ranks candidate paths by M after fees. If M looks wrong, the pool is thin, the token is wrong, or the hop list includes junk. Creating a new token does not perform a swap; it creates something that might be swappable after LP exists.",
    },
  ],
  "what-is-a-multi-chain-token": [
    {
      heading: "How issuers should talk about it",
      body:
        "If you generated an ERC-20 on Base, say “Base contract 0x…” and stop. If you later add Ethereum via a canonical bridge, publish both addresses and the bridge. If a fan deploys your ticker on BNB Chain, that is not your multi-chain expansion — that is an impersonation. Traders using XAUConnect are told to paste addresses; make the paste obvious. USDC is the rare brand that actually is issued natively on many chains, and even USDC still requires picking the right contract on the right chain.",
    },
  ],
  "how-to-choose-which-chain-to-swap-on": [
    {
      heading: "A simple scorecard",
      body:
        "Write four lines: where the tokens live now; where the deepest honest pool is; what gas you already hold; whether you will trade here again this week. If three of four point at Base, swap on Base. If the asset is a BNB-native meme, BNB Chain wins even if Solana gas is prettier. If you only have Phantom, do not start with a 0x destination on a Friday. XAUConnect will quote whichever chain you select; it will not override a bad selector because a blog called that chain “cheap.”",
    },
  ],
  "cheapest-chain-to-swap-crypto": [
    {
      heading: "Measure it on the quote card",
      body:
        "If you already hold USDC on Arbitrum and Solana, quote the same output token on both (different contracts). Convert estimated gas to USD at current native prices. Add any bridge you would still need. The winner is the larger minimum received minus gas minus bridge. Screenshots of “Solana fees are $0.0002” skip impact and skip the fact that your USDC might not be on Solana. Cheap-chain memecoins can still be 100% loss — that is also a cost.",
    },
  ],
  "how-to-swap-the-same-ticker-on-multiple-chains": [
    {
      heading: "A one-page address book template",
      body:
        "For each ticker: chain, address, decimals, “official link,” date you verified. USDC will have several honest rows. A memecoin should have one. When XAUConnect search shows a logo, ignore the logo and match the address book. If you must bridge, bridge between two rows that the issuer published, then swap locally. Buying the destination ticker in a random pool “because the chart looks cheaper” is how you buy the clone with the cheaper, thinner market.",
    },
  ],
  "how-to-create-an-erc-20-token": [
    {
      heading: "Day-two operator checklist",
      body:
        "Hardware the treasury. Lock LP with a public date. Test buy/sell from wallet B on XAUConnect using the receipt address. Pin that address. Do not add mint-by-upgrade later — LaunchedToken cannot, and if you migrate to a new proxy you created a new token. Budget explorer verification and a little native gas for the next month of LP maintenance. If demo mode returned only a metadata CID, you do not have an ERC-20 yet; switch to a chain with TokenFactory live.",
    },
  ],
  "how-to-create-an-spl-token-on-solana": [
    {
      heading: "Revoke, then tell people how to buy",
      body:
        "After minting the disclosed supply, revoke mint and freeze if you promised a fair coin. Screenshot Solscan authorities at zero. Seed a pool Jupiter already knows. Then the buy path is: Phantom, XAUConnect, Solana selected, mint pasted, simulation, small sell test. Do not send buyers to Launchpad’s EVM wizard. Do not tell them to “search the name.” Cheap SOL fees mean clones will exist before your LP transaction is old.",
    },
  ],
  "how-to-create-a-token-on-base": [
    {
      heading: "Base-specific buyer packet",
      body:
        "Publish: chain ID 8453, token address, pairing asset address (ETH or native USDC), LP lock link, and “keep ETH for gas.” Link the Base swap guide. Say you are not on Ethereum mainnet until that is true. If Coinbase Wallet users arrive, remind them that the exchange account is not the chain. If factory was demo-only, do not market a CID as a token. After the second-wallet round-trip, you can talk about memes. Not before.",
    },
  ],
  "how-to-create-a-token-on-bnb-chain": [
    {
      heading: "USDT LP and clone season",
      body:
        "If you pair with USDT, paste the USDT contract next to your token contract in every post. Buyers on BNB Chain will otherwise LP or swap into a fake dollar. BscScan verification helps humans; it does not stop a clone with your logo. Your differentiator is the address and the lock. Keep BNB in the deployer for later LP adds. Do not follow a Twitter request to “also deploy on Solana tonight” unless you have a real bridge budget.",
    },
  ],
  "how-to-create-a-token-on-ethereum": [
    {
      heading: "Mainnet is a commitment to depth",
      body:
        "If you cannot seed LP that survives a five-figure market-cap screenshot without double-digit impact, Ethereum is the wrong first deploy. Use Base to learn the wizard, then — if you still need a canonical L1 address — deploy once on mainnet with hardware, verified source, and locked canonical WETH or USDC LP. Tell L2 holders that the Ethereum contract is a different token until you bridge. XAUConnect will quote whichever address they paste on whichever chain they select.",
    },
  ],
  "how-to-generate-a-crypto-token-without-coding": [
    {
      heading: "What “no code” still signs",
      body:
        "The wallet popup is Solidity you did not write, but it is still `createToken` or `createLaunch` plus native value. Read the chain, the function name, and the ETH/BNB/AVAX amount. If a phishing site shows Launchpad chrome and a `transfer` of your ETH to a random address, that is not generation. Bookmark the real app. After a live deploy, no-code creators have the same LP and test-swap homework as people who wrote Hardhat scripts. The form does not add liquidity by wishing.",
    },
  ],
  "how-to-add-liquidity-after-creating-a-token": [
    {
      heading: "The implied market cap conversation",
      body:
        "If you deposit 1 million tokens and $2,000 of ETH, you implied a price. Multiply by total supply and you have a market cap you must be willing to say out loud. If that number is silly, change the deposit, not the tweet. After LP, the first external swap on XAUConnect will print impact. If a $50 buy is 8%, add pairing asset or accept that you launched a toy. Lock the LP before you advertise; advertising unlocked LP is how our own rug guide tells people to leave.",
    },
  ],
  "how-to-make-a-new-token-swappable": [
    {
      heading: "When routers still cannot see you",
      body:
        "You seeded a pool on a venue aggregators ignore, or you are on the wrong chain in the widget, or Token-2022 extensions break the route, or you pasted a proxy that is not the tradable token. Check the pair on the explorer, wait a minute for indexes, quote from a clean wallet. If 1inch/Jupiter web UIs also fail, the problem is the pool, not XAUConnect branding. Fix venue and liquidity. Then republish the paste-the-address instructions.",
    },
  ],
  "how-to-do-your-first-swap-after-a-token-launch": [
    {
      heading: "What to do if the sell path is ugly",
      body:
        "If the buy works and the sell shows 20% impact, you under-seeded LP or the price you set is a fantasy. Add pairing asset or stop. If the sell reverts, you may have a tax/blacklist token you did not intend — LaunchedToken should not do this, so confirm you actually deployed that bytecode. Do not ask friends to “just try buying.” The second wallet exists so strangers are not your QA. Publish hashes only after both directions work.",
    },
  ],
  "token-mint-freeze-and-blacklist-permissions": [
    {
      heading: "A two-minute explorer pass before any swap",
      body:
        "Open the token page. Verified source? Owner functions named mint, pause, blacklist, setFee, upgradeTo? Holder concentration? On Solana, mint and freeze authorities still set? If you cannot answer, size as if the answer is hostile. XAUConnect will still quote a liquid honeypot. LaunchedToken is the exception we can describe because we shipped it — it is not a scan of the whole chain. Paste addresses anyway; permissions live on the contract, not the ticker.",
    },
  ],
  "erc-20-vs-spl-token-standards": [
    {
      heading: "Bridges do not merge the standards",
      body:
        "A “USDC” balance on Ethereum and a “USDC” balance on Solana are two implementations connected (when they are connected) by issuer or bridge machinery. Your ERC-20 approval on Base does nothing to an SPL mint. Your Phantom simulation does nothing to an EVM allowance. Choose a home standard for a new token based on wallets your users have, then document any wrapper as a wrapper. XAUConnect’s two swap stacks exist because the computers differ, not because we enjoy extra toggles.",
    },
  ],
  "how-bonding-curve-launches-work-on-xauconnect": [
    {
      heading: "Do not market a curve as a Uniswap pool",
      body:
        "If Swap returns no route, you are probably still on the curve. Send buyers to the curve UI or wait for graduation, then run the second-wallet round-trip on XAUConnect. Calling it “already tradeable everywhere” during the curve phase is how people buy clones on a real AMM that reused your ticker. Creators: if you wanted the simple story, use TokenFactory plus locked LP. Curves are a distribution choice with extra sentences you must be willing to write.",
    },
  ],
  "what-happens-after-you-generate-a-crypto-token": [
    {
      heading: "The week-one don’ts",
      body:
        "Don’t unlock LP because a chart dipped. Don’t mint (you can’t on LaunchedToken — don’t migrate to something that can without a huge disclosure). Don’t deploy the ticker on two more chains because a group chat asked. Don’t DM anyone a seed. Don’t pay a “listing manager” who wants admin keys. Do answer clones with the address. Do keep native gas in the deployer. Do assume most of the tape next to you is hostile. Then go back to making the pool exit-able.",
    },
  ],
  "how-to-create-a-memecoin-on-xauconnect": [
    {
      heading: "Joke asset, adult pool",
      body:
        "If the meme is a joke, the LP lock is not. Use one chain, LaunchedToken or a curve you can explain, and a buy path that is a pasted address on XAUConnect. Budget gas for the test sell. Tell people the pool depth in dollars, not the fully diluted fantasy. When the clone appears six minutes later, your pinned address is the whole defense. We will keep teaching buyers that memecoins can go to zero — launch only if you can live with that sentence next to your logo.",
    },
  ],
  "how-to-swap-avax-to-usdc": [
    {
      heading: "From CEX to C-Chain to USDC",
      body:
        "Withdraw AVAX to C-Chain, wait for Snowtrace, keep a gas sliver, paste native USDC, swap on XAUConnect. If you instead withdrew to X-Chain, this pair will not see the funds. If you wanted USDT, quote both verified contracts. If you wanted Ethereum dollars, this fill is only the first act — cross-chain is the second. For token creators pairing LP with USDC on Avalanche, this is also the buyer’s flatten path: publish both addresses so they do not LP against a wrapper.",
    },
  ],
  "how-to-swap-pol-to-usdc": [
    {
      heading: "Ethereum MATIC is a different trade",
      body:
        "An ERC-20 named MATIC or POL on Ethereum does not pay Polygon gas and does not input this pair. Sell or bridge that token on Ethereum first. On Polygon PoS, native POL → native USDC is the flatten: gas buffer, pasted USDC, tight slippage, Polygonscan receipt. That USDC is what you should use to seed Launchpad LP on Polygon if you are about to generate a token. Bridged USDC.e in the LP is how your buyers inherit a bad quote on day one.",
    },
  ],
  "how-to-swap-tokens-on-ethereum": [
    {
      heading: "Mainnet when you mean mainnet",
      body:
        "If the deep pool you need is here — large ETH/USDC, a token that never lived honestly on an L2 — pay the gas with eyes open: ETH buffer, exact approve, re-quote after 12-second blocks, verify Etherscan. If you are about to do a $60 memecoin round-trip, you are on the wrong chain; Base or Arbitrum will charge less for the same mistake. XAUConnect will not move the trade for you. The chain selector is the decision.",
    },
  ],
};

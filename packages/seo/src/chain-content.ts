/**
 * Hand-authored, per-chain prose used to compose hub, token, pair, and
 * cross-chain pages. Every sentence here is written by hand — the content
 * engine composes these blocks deterministically with live market data
 * instead of spinning keyword variants.
 */

export type HubKind = "chain" | "swap-hub" | "meme-hub" | "launch" | "discover" | "trade";

export interface ChainProfile {
  key: string;
  /** One-paragraph identity of the network and its role in trading. */
  summary: string;
  /** The liquidity landscape: where depth concentrates, which venues matter. */
  liquidity: string;
  /** Gas / fee behaviour specific to this chain. */
  gas: string;
  /** Wallet support and the network-identity check that prevents mistakes. */
  wallets: string;
  /** Security / verification habits that matter most on this chain. */
  security: string;
  /** What bridging into and out of this chain involves. */
  bridging: string;
  /** Hub-type-specific framing (authored per network). */
  hub: Record<Exclude<HubKind, "chain">, string>;
}

export const CHAIN_PROFILES: Record<string, ChainProfile> = {
  ethereum: {
    key: "ethereum",
    summary:
      "Ethereum is the settlement layer of decentralized finance and the network against which every other chain is measured. It hosts the deepest pools, the longest-lived protocols, and the canonical issuances of most major assets, which is why large trades and price discovery still gravitate here even when cheaper venues exist. Blocks finalize roughly every twelve seconds and all gas is paid in ETH, so trading on Ethereum is a trade-off between unmatched depth and higher transaction cost.",
    liquidity:
      "Ethereum mainnet anchors the global market for ETH and the major stablecoins. Uniswap, Curve, and Balancer hold the reserves that set reference prices the rest of the market arbitrages toward, so spreads on blue-chip pairs are the tightest available anywhere on-chain. The practical consequence for a trader is that a large notional order frequently nets more on Ethereum, even after higher gas, because the pools are deep enough to absorb size without heavy price impact.",
    gas:
      "Gas on Ethereum is the highest of any network here and the most variable. A base fee adjusts with demand and can spike sharply during popular mints or macro volatility, so a small swap can carry a fee that rivals the trade itself. Batch approvals where you can, prefer exact allowances on valuable tokens, and if a transaction sits pending for several minutes, check the explorer before resubmitting rather than stacking duplicate transactions.",
    wallets:
      "Any major EVM wallet works on Ethereum mainnet — MetaMask, Rabby, Coinbase Wallet, and any WalletConnect-compatible app. The single check that matters is confirming the wallet is on Ethereum (chain ID 1) before signing, since the same address exists across every EVM chain and balances do not move between them.",
    security:
      "Ethereum's maturity means most blue-chip contracts are verified and battle-tested, but it is also the chain with the most sophisticated phishing and approval-drain activity. Verify token contracts on Etherscan, prefer exact token approvals, and periodically revoke allowances you no longer use — an old unlimited approval on a later-compromised contract is the most common way established holders lose funds.",
    bridging:
      "Ethereum is the hub most bridges connect to, so moving assets in and out is well-supported but not instant. Native issuances live here, so bridging to an L2 or another chain usually produces a wrapped or bridged representation on the far side — confirm the destination token's contract and decimals, and keep ETH for gas on whichever side you land.",
    hub: {
      "swap-hub":
        "Spot swapping on Ethereum trades against the deepest AMM pools in existence. For blue-chip assets the spreads are unbeatable, so the main discipline is fee-awareness: size trades so gas is a small fraction of the notional, and compare routes since a multi-hop path through ETH or a major stablecoin often nets more than a thin direct pool. Quotes reflect live reserves and expire as others trade — re-quote if you pause before signing.",
      "meme-hub":
        "Ethereum memecoins tend to launch with more capital behind them than on cheaper chains, but gas makes small speculative trades expensive and thin new pools still carry the full range of honeypot and rug risk. Verify every contract on Etherscan against an official source, weigh whether the gas cost justifies the position size, and treat any token whose liquidity you cannot confirm as untradeable until you can.",
      launch:
        "Launching a token on Ethereum carries the highest deployment and liquidity-seeding cost of any network here, which tends to filter for more serious projects but does not remove risk. Read the contract's permissions — mint, pause, blacklist — on the explorer before participating, and confirm liquidity is locked or burned with a credible unlock date rather than trusting a claim.",
      discover:
        "Discover on Ethereum surfaces indexed pool depth, recent swaps, and new listings so you can judge a market before committing size. Because mainnet liquidity is deep, the figures here are an unusually reliable guide to real executable depth — use them to size against the relevant pool rather than a token's headline market cap.",
      trade:
        "Active trading on Ethereum rewards route comparison and timing. Deep liquidity means large orders are feasible, but gas and MEV exposure on the public mempool make tight slippage and well-sized clips matter. Execution stays wallet-signed throughout — there is no custodial balance or internal order book.",
    },
  },
  bsc: {
    key: "bsc",
    summary:
      "BNB Chain is a high-throughput EVM network built for cheap, fast trading. Blocks land about every three seconds and fees are typically a fraction of a cent, which makes it a natural home for frequent rebalancing, retail-sized swaps, and a large, fast-moving memecoin scene. The trade-off for that low cost is a liquidity profile concentrated in a handful of venues and a market where new tokens appear and disappear quickly.",
    liquidity:
      "Liquidity on BNB Chain is dominated by PancakeSwap, with USDT and USDC as the usual pricing anchors alongside BNB itself. Major pairs are deep enough for comfortable retail and mid-size trades, but coverage thins quickly outside the top tokens, and the chain's heavy memecoin activity means a large share of pools are shallow and short-lived. Size against the stablecoin or BNB leg, and check depth before trusting a chart on anything outside the majors.",
    gas:
      "BNB Chain fees are among the lowest here, usually a fraction of a cent, which is what makes high-frequency rebalancing practical. Fees are paid in BNB, so keep a small BNB balance for both the approval and the swap in a session. Because individual trades are so cheap, the dominant cost on this chain is usually price impact in thin pools rather than gas.",
    wallets:
      "MetaMask, Trust Wallet, and any WalletConnect-compatible wallet work on BNB Chain. Confirm you are on chain ID 56 before signing — the most common confusion is a wallet sitting on Ethereum while the interface expects BNB Chain, which hides the balance you are looking for.",
    security:
      "BNB Chain's low fees and fast launches make it a hotspot for copycat tokens and honeypots. Verify every contract on BscScan against an official source, compare the full address, and be especially wary of tokens with transfer taxes or blacklist functions. On new launches, confirm ordinary wallets have sold successfully and treat the first trade as a small test.",
    bridging:
      "Assets reach BNB Chain through bridges that mint a bridged representation, so a token's address and liquidity on BNB Chain can differ from its native home. Confirm you are trading the canonical bridged version with real depth, keep BNB for gas after you arrive, and start with a test amount on any unfamiliar route.",
    hub: {
      "swap-hub":
        "Spot swapping on BNB Chain is cheap and fast, so the main discipline shifts from fee management to liquidity awareness. Major pairs against USDT, USDC, and BNB execute with tight spreads, but anything outside the top tokens deserves a depth check before sizing. Compare routes — PancekeSwap-family pools dominate but an aggregated path can still net more on less common pairs.",
      "meme-hub":
        "BNB Chain hosts one of the most active memecoin scenes in crypto, which means both opportunity and a high density of scams. Pools are often thin and launches frequent, so verify the contract on BscScan, check holder concentration, confirm the token is sellable in both directions, and size every position as if it could go to zero within the hour.",
      launch:
        "Launching on BNB Chain is inexpensive, which lowers the barrier for legitimate projects and scams alike. Read the contract permissions — mint, pause, blacklist, transfer tax — on BscScan before participating, and verify liquidity is locked or burned with a real unlock date. Cheap deployment means the burden of due diligence falls entirely on the buyer.",
      discover:
        "Discover on BNB Chain leans heavily on liquidity and volume figures because the token set turns over so fast. Use the depth and 24-hour volume to separate real, tradeable markets from thin pools propped up by hype — on this chain, a large headline market cap on tiny liquidity is a routine warning sign.",
      trade:
        "Active trading on BNB Chain is defined by speed and low cost, which suits frequent entries and exits. The constraint is depth, not fees: keep clips proportional to pool liquidity, compare routes on less liquid pairs, and verify contracts before chasing fast-moving tokens. Execution remains non-custodial and wallet-signed.",
    },
  },
  polygon: {
    key: "polygon",
    summary:
      "Polygon is a low-cost EVM network that pairs inexpensive, roughly two-second blocks with broad token coverage, making it a practical chain for everyday swaps and stablecoin activity. Gas is paid in POL and is cheap but not free. Much of Polygon's asset base arrived via bridges from Ethereum, so the key nuance for traders is distinguishing native issuances from bridged representations with thinner local liquidity.",
    liquidity:
      "Liquidity on Polygon is spread across Uniswap v3, QuickSwap, and other established AMMs, giving good coverage of major assets and stablecoins. Native USDC and the deepest stablecoin pools offer tight spreads, but bridged versions of an asset can have materially thinner depth than their Ethereum originals — always confirm you are routing into the variant with real liquidity rather than the first ticker match.",
    gas:
      "Polygon gas is inexpensive but not zero; keep a small POL balance for approvals and the occasional failed-transaction retry. Because fees are low, frequent trading is practical, and as on other cheap chains the dominant real cost is usually price impact on thinner pools rather than the gas itself.",
    wallets:
      "Any EVM wallet with the Polygon network added can connect — MetaMask, Rabby, Coinbase Wallet, and WalletConnect apps. Verify the network badge before approving; the balance you expect only appears when the wallet is actually on Polygon.",
    security:
      "Polygon's main trader-specific risk is variant confusion: native versus bridged versions of the same asset are separate contracts with separate liquidity. Verify contracts on Polygonscan, prefer the native or deepest variant, and apply the usual checks — permissions, holder concentration, locked liquidity — on newer tokens.",
    bridging:
      "Polygon is tightly connected to Ethereum, and a large part of its liquidity is bridged. When you bridge in, you typically receive a bridged representation; confirm its contract and decimals match what your destination app expects, and keep POL for gas on arrival. Native USDC on Polygon, where available, is generally the cleanest stablecoin to hold.",
    hub: {
      "swap-hub":
        "Spot swapping on Polygon is cheap enough for routine, small-size trading, with solid depth on majors and stablecoins. The variable to watch is which token variant you trade — native versus bridged — since picking the thin one means a wide spread. Compare routes and confirm the contract behind the symbol before sizing.",
      "meme-hub":
        "Polygon's memecoin pools tend to be thinner than the chain's blue-chip markets, so the standard low-cap discipline applies in full: verify the contract on Polygonscan, check liquidity depth and holder distribution, and treat early trades as small tests. Low gas makes experimentation cheap but does nothing to reduce the underlying token risk.",
      launch:
        "Launching on Polygon is low-cost and well-tooled. Participants should still read contract permissions on Polygonscan and confirm liquidity is locked or burned with a credible unlock date — cheap deployment means the diligence burden sits with the buyer, exactly as on other low-fee chains.",
      discover:
        "Discover on Polygon helps you separate deep native markets from thinly-bridged ones. Use the liquidity and volume figures to confirm a pair can absorb your size, and lean on them especially when a token exists in multiple bridged variants with very different depth.",
      trade:
        "Active trading on Polygon benefits from low fees and fast blocks, suiting frequent rebalancing and stablecoin rotation. Keep a POL gas buffer, watch for native-versus-bridged variant traps, and compare routes on less liquid pairs. All execution is wallet-signed and non-custodial.",
    },
  },
  arbitrum: {
    key: "arbitrum",
    summary:
      "Arbitrum One is the leading Ethereum layer-2 rollup, executing transactions cheaply off-chain while posting data back to Ethereum for security. It pays gas in ETH, settles quickly, and has become the home of a large amount of DeFi-native liquidity. For traders it offers most of Ethereum's asset access at a fraction of the cost, which is why it is often the better venue for retail and mid-size trades that would be gas-prohibitive on mainnet.",
    liquidity:
      "Arbitrum concentrates deep liquidity for ETH, USDC, and the tokens of its native DeFi ecosystem, including its own governance and incentive assets. Major pairs trade with tight spreads, and the chain's DeFi focus means routing options are rich for blue-chip assets. Tokens bridged in from other layer-2s or sidechains may need an extra hop, so inspect the route when trading less central assets.",
    gas:
      "Arbitrum charges low execution fees in ETH while inheriting Ethereum's security through data posted to mainnet. Fees are a small fraction of mainnet gas, but they are not constant — they rise with the chain's own congestion and with mainnet data costs. Quotes include gas estimates, and as on any network a stuck transaction should be checked on the explorer before resubmitting.",
    wallets:
      "Use any Arbitrum-configured EVM wallet — MetaMask, Rabby, Coinbase Wallet, or a WalletConnect app. Bridged ETH on Arbitrum is still ETH for gas purposes. Confirm the wallet is on Arbitrum One before signing, since the address is shared with every other EVM chain.",
    security:
      "Arbitrum's blue-chip contracts are mature, but the same approval and phishing discipline as Ethereum applies: verify contracts on Arbiscan, prefer exact allowances, and revoke stale approvals. When trading assets bridged onto Arbitrum, confirm you hold the canonical representation rather than a similarly-named wrapper.",
    bridging:
      "Arbitrum connects to Ethereum through its canonical bridge and to other chains through third-party bridges. Withdrawals to Ethereum via the canonical path involve a delay by design; third-party routes are faster but carry their own risk. Keep ETH for gas on arrival, and confirm the destination token representation before trading it onward.",
    hub: {
      "swap-hub":
        "Spot swapping on Arbitrum gives you near-Ethereum depth on blue-chip assets at a small fraction of the gas, which makes it ideal for trades that would be uneconomic on mainnet. Compare routes for less central tokens, which may route through ETH or USDC, and re-quote before signing since pools move continuously.",
      "meme-hub":
        "Arbitrum's memecoin activity is smaller than on BNB Chain or Base but still carries the full low-cap risk profile. Verify contracts on Arbiscan, confirm liquidity depth and two-way tradeability, and size positions as speculative. Low L2 gas makes test trades cheap without reducing the token's underlying risk.",
      launch:
        "Launching on Arbitrum combines low fees with proximity to a serious DeFi user base. Read contract permissions on Arbiscan and verify locked or burned liquidity before participating — the cheaper deployment cost relative to mainnet does not change the diligence a buyer should do.",
      discover:
        "Discover on Arbitrum surfaces the depth of its DeFi-native pools, which are generally reliable indicators of executable liquidity for major assets. Use the figures to size against the relevant pool, and check depth specifically when trading ecosystem tokens bridged from elsewhere.",
      trade:
        "Active trading on Arbitrum suits traders who want Ethereum-grade liquidity without Ethereum gas. Fast settlement and low fees make frequent execution practical; keep ETH for gas, compare routes on thinner pairs, and rely on wallet-signed, non-custodial execution throughout.",
    },
  },
  base: {
    key: "base",
    summary:
      "Base is a fast-growing Ethereum layer-2 with strong inflows from the Coinbase ecosystem. It offers low gas paid in ETH, roughly two-second blocks, and has become a hub for consumer apps and a very active memecoin scene. For traders, Base combines cheap execution with rapidly changing liquidity, so it rewards depth-checking and contract verification on the many newer tokens that launch here.",
    liquidity:
      "Liquidity on Base centers on ETH and USDC, with depth that has grown quickly alongside the chain's consumer and memecoin activity. Major pairs trade tightly, but a large share of Base volume sits in newer, thinner pools where price impact and rug risk are real. Confirm depth and contract age before sizing on anything outside the established assets.",
    gas:
      "Base offers low layer-2 gas in ETH, and congestion is usually milder than Ethereum mainnet even during busy periods. Keep a small ETH balance for approvals and swaps. As on other cheap chains, the practical cost of a trade is usually dominated by price impact in thin pools rather than gas.",
    wallets:
      "Coinbase Wallet, MetaMask, Rabby, and WalletConnect apps all support Base. Confirm chain ID 8453 in the wallet header before signing — the shared EVM address means a wallet on the wrong network simply will not show your Base balance.",
    security:
      "Base's rapid memecoin growth makes contract verification essential. Many tokens are brand new with short histories, so check the contract on Basescan, verify liquidity depth and lock status, inspect holder concentration, and confirm two-way tradeability before committing. Treat fast-moving new launches as high risk by default.",
    bridging:
      "Base connects to Ethereum through its canonical bridge and to other networks through third-party routes, with strong direct inflows from the Coinbase ecosystem. Bridged assets arrive as destination representations — confirm the contract and decimals, keep ETH for gas, and test unfamiliar routes with a small amount first.",
    hub: {
      "swap-hub":
        "Spot swapping on Base is cheap and quick, with solid depth on ETH and USDC pairs. The discipline here is verifying the many newer tokens before trading them: confirm the contract on Basescan and check pool depth, then compare routes since an aggregated path can beat a thin direct pool on less liquid assets.",
      "meme-hub":
        "Base has one of the most active memecoin scenes of any layer-2, which means frequent launches and a high density of thin, risky pools. Verify contracts on Basescan, check holder distribution and liquidity locks, confirm you can sell, and treat the first trade as a small test. Low gas lowers the cost of experimentation, not the risk.",
      launch:
        "Launching on Base is inexpensive and benefits from heavy ecosystem traffic. Participants should read contract permissions on Basescan and confirm locked or burned liquidity with a real unlock date before buying — on a chain this fast-moving, buyer diligence is the only reliable protection.",
      discover:
        "Discover on Base is especially useful given how quickly its token set changes. Use liquidity and volume figures to tell genuine, tradeable markets apart from hype-driven thin pools, and lean on them heavily before sizing into any newly listed asset.",
      trade:
        "Active trading on Base pairs low fees with fast-moving markets. Keep clips proportional to often-shallow liquidity, verify contracts before chasing momentum, and compare routes on newer pairs. Execution is wallet-signed and non-custodial end to end.",
    },
  },
  avalanche: {
    key: "avalanche",
    summary:
      "Avalanche's C-Chain is an EVM-compatible network with roughly two-second blocks and moderate fees paid in AVAX. It covers most major assets through established DEXs and serves as the smart-contract layer most traders interact with. A defining nuance is that Avalanche spans multiple chains — C-Chain, X-Chain, P-Chain — and only C-Chain hosts the EVM pools you trade against, so address and asset checks matter more than usual.",
    liquidity:
      "Liquidity on the C-Chain is led by Trader Joe and Pangolin, covering AVAX, the major stablecoins, and the leading ecosystem tokens with reasonable depth. Coverage thins outside those, and activity on Avalanche subnets does not translate into C-Chain liquidity — always confirm a pair actually trades on C-Chain rather than assuming ecosystem-wide depth.",
    gas:
      "AVAX gas is moderate — higher than the cheapest layer-2s but well below Ethereum mainnet. Keep an AVAX balance for approvals and swaps. Fees are predictable enough for routine trading, and price impact on thinner C-Chain pools is usually the larger cost on non-major assets.",
    wallets:
      "Add Avalanche C-Chain to any EVM wallet — MetaMask, Rabby, Coinbase Wallet, or WalletConnect. The critical check is using a C-Chain address: do not confuse it with X-Chain or P-Chain addresses, which use different formats and are not interchangeable for EVM trading.",
    security:
      "On Avalanche, verify contracts on Snowtrace and apply standard approval hygiene. The chain-specific trap is cross-chain confusion within Avalanche itself — ensure you are operating on C-Chain — alongside the usual checks for permissions, liquidity, and holder concentration on newer tokens.",
    bridging:
      "Assets reach the C-Chain through bridges that mint destination representations; subnet and cross-Avalanche transfers add their own steps. Confirm the bridged token's contract on C-Chain, keep AVAX for gas, and verify you are on C-Chain rather than another Avalanche chain before trading.",
    hub: {
      "swap-hub":
        "Spot swapping on Avalanche C-Chain trades against Trader Joe and Pangolin pools, with tight spreads on AVAX and stablecoin majors. Confirm pairs exist on C-Chain specifically, compare routes on less liquid assets, and re-quote before signing as pools rebalance.",
      "meme-hub":
        "Avalanche memecoins carry the usual low-cap risk on top of the chain's C-Chain-versus-other-chain confusion. Verify contracts on Snowtrace, confirm C-Chain liquidity and two-way tradeability, check holder concentration, and size as speculative with small test trades first.",
      launch:
        "Launching on Avalanche C-Chain is moderately priced and well-supported by established DEXs. Read contract permissions on Snowtrace and confirm locked or burned liquidity before participating; verify everything is on C-Chain rather than a subnet.",
      discover:
        "Discover on Avalanche helps confirm that a market actually has C-Chain depth rather than only subnet or ecosystem activity. Use the liquidity and volume figures to size against real pools, especially on tokens that exist across multiple Avalanche chains.",
      trade:
        "Active trading on Avalanche suits traders comfortable with moderate fees and the C-Chain focus. Keep AVAX for gas, confirm C-Chain liquidity before sizing, and compare routes on thinner pairs. Execution stays wallet-signed and non-custodial.",
    },
  },
  solana: {
    key: "solana",
    summary:
      "Solana is a high-performance non-EVM network with sub-second blocks and very low base fees, built for fast, high-volume trading. It uses a fundamentally different model from the EVM chains: no token-approval step, transactions simulated before signing, and priority fees rather than gas auctions during congestion. Its speed and low cost make it the center of much of the market's memecoin and high-frequency activity.",
    liquidity:
      "Liquidity on Solana is routed primarily through Jupiter across Raydium, Orca, and other AMMs, giving broad coverage of SPL tokens and deep markets for SOL, USDC, and USDT. The aggregator model means even less central tokens often find a workable route, but new and memecoin pools can still be extremely thin — confirm the mint address and real depth before trusting a quote.",
    gas:
      "Solana charges a tiny base fee plus an optional priority fee that determines inclusion order during congestion, rather than running a gas auction. Most of the time fees are negligible; during hot mints, raising the priority fee modestly is what gets a transaction included. Always keep a little SOL on hand so a swap is never blocked for lack of fee budget.",
    wallets:
      "Phantom, Solflare, Backpack, and WalletConnect Solana sessions are supported. Solana addresses use base58 format, which is completely different from EVM 0x addresses — never send SPL assets to an EVM-style address or the reverse, as cross-format transfers are unrecoverable.",
    security:
      "Solana's transaction simulation is a genuine safety feature: the wallet previews the balance changes before you sign, so reject anything that does not match your intent. There is no approval step to manage, but contract and mint verification still matters — confirm the mint on Solscan, and on memecoins check liquidity, holder concentration, and two-way tradeability.",
    bridging:
      "Bridging between Solana and EVM chains crosses an address-format boundary, so destination compatibility must be checked carefully. Assets arrive as wrapped or bridged representations; confirm the mint on Solana, keep SOL for fees on arrival, and treat any unfamiliar Solana↔EVM route as one to test with a small amount first.",
    hub: {
      "swap-hub":
        "Spot swapping on Solana routes through Jupiter across the major AMMs, with deep markets on SOL, USDC, and USDT and broad SPL coverage. There is no approval step — the wallet simulates the trade and shows balance changes before you sign, so verify the preview and keep SOL for priority fees during busy periods.",
      "meme-hub":
        "Solana hosts the most active memecoin market in crypto, with constant launches and extreme volatility. Verify the mint on Solscan, check liquidity depth and holder distribution, confirm the token is sellable, and size every position for total loss. During hot launches, attach a priority fee so your transaction actually lands.",
      launch:
        "Launching on Solana is cheap and fast, which fuels its enormous token turnover and a correspondingly high scam density. Verify mint authority and freeze authority on Solscan, confirm liquidity is locked or burned, and check holder concentration before participating — fast, cheap launches put the full diligence burden on the buyer.",
      discover:
        "Discover on Solana is essential given how fast its token set changes. Use liquidity and volume to distinguish genuine markets from thin, hype-driven pools, and lean on the simulation preview at signing time as a second check before committing size.",
      trade:
        "Active trading on Solana is built for speed: sub-second settlement, no approvals, and priority fees instead of gas auctions. The main failure mode during congestion is a transaction that does not land — raise the priority fee or reduce size — and the wallet's simulation gives you a final check before every non-custodial, wallet-signed trade.",
    },
  },
};

export function getChainProfile(chainKey?: string): ChainProfile | undefined {
  if (!chainKey) return undefined;
  return CHAIN_PROFILES[chainKey];
}


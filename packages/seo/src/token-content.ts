/**
 * Hand-authored, per-token prose used to compose swap-token, pair, and
 * cross-chain pages. Keyed by uppercase symbol. Every sentence is written by
 * hand; the content engine composes these with the chain profile and live
 * market data rather than spinning templated variants.
 */

export type TokenCategory =
  | "stablecoin"
  | "major"
  | "wrapped"
  | "defi"
  | "ecosystem"
  | "meme"
  | "other";

export interface TokenProfile {
  category: TokenCategory;
  /** Plain-language identity of the asset. */
  summary: string;
  /** How and why it trades; liquidity and routing notes. */
  trading: string;
  /** The honest risk profile a trader should weigh. */
  risk: string;
}

export const TOKEN_PROFILES: Record<string, TokenProfile> = {
  USDC: {
    category: "stablecoin",
    summary:
      "USDC is a fully-reserved US dollar stablecoin issued by a regulated company and backed by cash and short-term US treasuries, with regular attestations. It is the most widely used settlement and pricing asset in on-chain trading, and for most traders it is the default stablecoin to hold and exit into.",
    trading:
      "USDC anchors the deepest stablecoin pools on nearly every chain, so it usually offers the tightest spreads for entering and exiting positions. The one nuance is variant: native USDC issued directly on a chain and bridged USDC from another network are different contracts with different liquidity, so target the deepest variant and verify the contract rather than trusting the symbol alone.",
    risk:
      "USDC's main risks are the standard stablecoin ones: reliance on the issuer's reserves and the brief de-peg episodes that can follow market stress. For trading purposes its peg has been durable, but always confirm you hold the intended variant on the chain you are trading.",
  },
  USDT: {
    category: "stablecoin",
    summary:
      "USDT (Tether) is the largest stablecoin by supply and frequently the most liquid, backed by reserves whose disclosures have historically drawn more scrutiny than USDC's. On many chains and venues it is the most deeply traded dollar asset, which makes it a practical pricing and settlement leg.",
    trading:
      "USDT's enormous liquidity makes it the better-served stablecoin on some chains and pairs, which is why many routes default to it. As with any stablecoin, native and bridged variants differ — confirm the contract with the deepest pool on your chain before routing a large exit through it.",
    risk:
      "USDT carries the usual stablecoin reserve and peg risk, with the added consideration that its reserve transparency has historically been debated. In practice its liquidity is a strength for execution; size and variant selection matter more day-to-day than peg concerns.",
  },
  DAI: {
    category: "stablecoin",
    summary:
      "DAI is a decentralized stablecoin generated against crypto collateral locked in an on-chain protocol, rather than backed by bank reserves. It targets a one-dollar value through over-collateralization and market mechanisms, and appeals to traders who prefer an on-chain, transparent stability model.",
    trading:
      "DAI has solid liquidity on Ethereum and major EVM chains, though often thinner than USDC or USDT on a given pair. It works well as a stablecoin leg where depth allows; on less central chains, compare the route into DAI against USDC to make sure you are not accepting a wider spread for the decentralization.",
    risk:
      "DAI's stability depends on its collateral and the protocol's mechanisms, which is a more complex model than reserve-backed stablecoins. Its peg has been resilient, but the collateral mix and any centralized backing components are worth understanding before treating it as a pure dollar substitute.",
  },
  USDS: {
    category: "stablecoin",
    summary:
      "USDS is a US dollar stablecoin used as a dollar-denominated settlement asset on-chain. As with any stablecoin, the contract you trade is the real identity of the asset, so the symbol alone should never be the basis for a trade.",
    trading:
      "USDS trades as a stablecoin leg where pools exist, and its liquidity varies by chain. Because stablecoin variants and newer dollar tokens can have uneven depth, confirm the specific contract and check pool liquidity before routing size into or out of USDS.",
    risk:
      "Treat USDS with the standard stablecoin diligence: understand its backing model, confirm the contract on the chain you are trading, and verify pool depth. Peg stability and liquidity can differ meaningfully from the largest stablecoins.",
  },
  ETH: {
    category: "major",
    summary:
      "ETH is the native asset of Ethereum and the second-largest cryptocurrency, used to pay gas on Ethereum and its layer-2s and held as a core reserve asset across DeFi. On layer-2 networks like Arbitrum and Base, ETH is also the gas token, so it is both a trading asset and the fuel you need to transact.",
    trading:
      "ETH has the deepest liquidity of any asset after the major stablecoins, and ETH-paired pools often serve as the routing backbone for other tokens. Spreads are tight on every chain where it trades, and an ETH leg is frequently the most efficient intermediate hop when no direct pool exists between two tokens.",
    risk:
      "ETH is volatile like any crypto asset but carries none of the contract-level rug or honeypot risk of newer tokens. The main trader consideration is keeping enough ETH for gas separate from the amount being traded, especially on Ethereum where fees can be substantial.",
  },
  WETH: {
    category: "wrapped",
    summary:
      "WETH is wrapped ETH — ETH packaged to follow the standard ERC-20 token interface so it can be traded in pools and used by contracts uniformly. It is fully backed one-to-one by ETH and freely convertible in both directions; functionally it is ETH with a token wrapper.",
    trading:
      "Most ETH-paired liquidity on AMMs is actually denominated in WETH, so trading routes commonly use it under the hood. Wrapping and unwrapping is a one-to-one conversion, and aggregators handle it transparently, so WETH spreads track ETH closely on every chain where it trades.",
    risk:
      "WETH carries essentially the same risk as ETH plus the trivial mechanics of wrapping; it is not a bridge asset and is always redeemable for ETH. Confirm you hold canonical WETH rather than a similarly-named wrapper on chains where multiple representations exist.",
  },
  WBTC: {
    category: "wrapped",
    summary:
      "WBTC is wrapped Bitcoin — an ERC-20 token backed one-to-one by BTC held in custody, allowing Bitcoin's value to be traded and used within EVM DeFi. It is the most established way to hold BTC exposure on Ethereum and other EVM chains.",
    trading:
      "WBTC has deep liquidity against ETH and the major stablecoins on Ethereum and well-supported EVM chains, so it trades with tight spreads for a non-native asset. Routes for less common pairs frequently pass through WBTC when Bitcoin exposure is the input or output.",
    risk:
      "WBTC adds custodial backing risk on top of Bitcoin's price volatility — its value depends on the custodian holding the underlying BTC. Confirm you are trading the canonical WBTC contract rather than an alternative wrapped-BTC representation with thinner liquidity or different backing.",
  },
  BNB: {
    category: "major",
    summary:
      "BNB is the native asset of BNB Chain, used to pay gas there and as a core reserve and pricing asset across the BNB Chain ecosystem. It is one of the largest cryptocurrencies by market value and the backbone of liquidity on its home network.",
    trading:
      "BNB has deep liquidity on BNB Chain against USDT, USDC, and the leading ecosystem tokens, and BNB-paired pools often serve as routing hops for other assets on that chain. Spreads on major BNB pairs are tight; keep BNB available for gas separate from your trade size.",
    risk:
      "BNB is volatile like any crypto asset and its fortunes are closely tied to the BNB Chain ecosystem. It carries no contract-level rug risk, but as the gas token it is essential to keep a buffer so trades and approvals can execute.",
  },
  WBNB: {
    category: "wrapped",
    summary:
      "WBNB is wrapped BNB — the ERC-20-standard representation of BNB used within BNB Chain DeFi so it can trade in pools and interact with contracts uniformly. It is backed one-to-one by BNB and freely convertible.",
    trading:
      "Most BNB-paired AMM liquidity on BNB Chain is denominated in WBNB, so it underpins routing for many pairs on the network. Wrapping is one-to-one and handled transparently by aggregators, so WBNB tracks BNB closely with tight spreads.",
    risk:
      "WBNB shares BNB's price risk plus simple wrapping mechanics; it is always redeemable for BNB. Verify you hold the canonical WBNB contract before trading less common pairs.",
  },
  SOL: {
    category: "major",
    summary:
      "SOL is the native asset of Solana, used to pay transaction and priority fees and held as the core reserve asset of the Solana ecosystem. It is one of the largest cryptocurrencies and the backbone of liquidity for SPL tokens across Raydium, Orca, and Jupiter-routed paths.",
    trading:
      "SOL has deep liquidity against USDC and USDT and serves as the primary routing asset for most SPL token trades. Jupiter aggregates across Solana's AMMs to find the best SOL-denominated paths, so spreads on major SOL pairs are tight. Keep some SOL for priority fees in addition to the amount you trade.",
    risk:
      "SOL is volatile like any crypto asset and central to Solana's ecosystem health. It carries no token-contract rug risk, but as the fee asset it is essential to keep a buffer so swaps land during congestion. Remember SOL uses base58 addresses incompatible with EVM formats.",
  },
  AVAX: {
    category: "major",
    summary:
      "AVAX is the native asset of Avalanche, used to pay gas on the C-Chain and as the core reserve asset of the Avalanche ecosystem. The C-Chain is the EVM-compatible layer where the DEX pools you trade against live.",
    trading:
      "AVAX has solid liquidity on the C-Chain against the major stablecoins through Trader Joe and Pangolin, and AVAX-paired pools anchor routing for ecosystem tokens. Confirm pairs trade on C-Chain specifically, and keep AVAX for gas separate from your trade size.",
    risk:
      "AVAX is volatile and tied to the Avalanche ecosystem. It carries no contract rug risk, but the chain's multi-chain structure means you must ensure you are operating on C-Chain with C-Chain liquidity rather than another Avalanche chain.",
  },
  WAVAX: {
    category: "wrapped",
    summary:
      "WAVAX is wrapped AVAX — the ERC-20-standard representation of AVAX used within Avalanche C-Chain DeFi so it can trade in pools and interact with contracts uniformly. It is backed one-to-one by AVAX and freely convertible.",
    trading:
      "Most AVAX-paired AMM liquidity on the C-Chain is denominated in WAVAX, so it underpins routing for many C-Chain pairs. Wrapping is one-to-one and handled transparently by aggregators, so WAVAX tracks AVAX closely.",
    risk:
      "WAVAX shares AVAX's price risk plus trivial wrapping mechanics and is always redeemable for AVAX. Confirm the canonical WAVAX contract on C-Chain before trading.",
  },
  POL: {
    category: "major",
    summary:
      "POL is the native gas and staking asset of the Polygon network, used to pay transaction fees on Polygon. It is the asset you need to hold in small amounts to transact, and it trades as a standard asset across Polygon DeFi.",
    trading:
      "POL has reasonable liquidity on Polygon against the major stablecoins and serves as a gas asset and routing leg. Spreads on major POL pairs are workable; keep a small POL balance for approvals and swap gas separate from your trade size.",
    risk:
      "POL is volatile and tied to the Polygon ecosystem. It carries no contract rug risk, but as the gas asset a buffer is essential. Confirm you are using the current native gas asset on the Polygon network when sizing trades.",
  },
  WPOL: {
    category: "wrapped",
    summary:
      "WPOL is wrapped POL — the ERC-20-standard representation of Polygon's native asset used within Polygon DeFi so it can trade in pools and interact with contracts uniformly. It is backed one-to-one by POL and freely convertible.",
    trading:
      "Most native-asset-paired AMM liquidity on Polygon is denominated in WPOL, so it underpins routing for many pairs on the network. Wrapping is one-to-one and handled transparently by aggregators.",
    risk:
      "WPOL shares POL's price risk plus simple wrapping mechanics and is redeemable for POL. Verify the canonical WPOL contract before trading less common pairs.",
  },
  LINK: {
    category: "defi",
    summary:
      "LINK is the token of Chainlink, the most widely used decentralized oracle network that feeds real-world and cross-chain data to smart contracts. It is an established large-cap DeFi asset held and traded across most major chains.",
    trading:
      "LINK has good liquidity against ETH and the major stablecoins on Ethereum and well-supported EVM chains, so it trades with reasonable spreads. On less central chains it may exist as a bridged representation — confirm the contract and check depth before sizing.",
    risk:
      "LINK is volatile like any crypto asset and its demand is linked to oracle usage across DeFi. As an established token it lacks the rug risk of new launches, but bridged versions on secondary chains can have thinner liquidity than the Ethereum original.",
  },
  UNI: {
    category: "defi",
    summary:
      "UNI is the governance token of Uniswap, the largest decentralized exchange protocol. Holders can participate in protocol governance, and UNI is an established large-cap DeFi asset traded across major chains.",
    trading:
      "UNI has solid liquidity against ETH and stablecoins, particularly on Ethereum where Uniswap's own pools are deepest. Spreads are reasonable for a governance token; on secondary chains, verify you are trading the canonical bridged representation with real depth.",
    risk:
      "UNI is volatile and its value is tied to sentiment around the Uniswap protocol and DeFi governance more broadly. It carries no contract rug risk as an established token, but governance tokens can be more volatile than the underlying protocol's usage would suggest.",
  },
  ARB: {
    category: "ecosystem",
    summary:
      "ARB is the governance token of Arbitrum, the leading Ethereum layer-2 rollup. It is used in the ecosystem's governance and incentive programs and is a core asset of Arbitrum's DeFi economy.",
    trading:
      "ARB has its deepest liquidity natively on Arbitrum against ETH and USDC, where it anchors a large share of ecosystem trading. It trades on other chains as a bridged asset with thinner depth — for best execution, trade it on Arbitrum and confirm the contract elsewhere.",
    risk:
      "ARB is volatile and closely tied to the Arbitrum ecosystem and its token-unlock schedule. As a governance and incentive token, supply dynamics and unlocks can pressure price; check distribution and vesting context alongside ordinary market risk.",
  },
  AERO: {
    category: "ecosystem",
    summary:
      "AERO is the token of Aerodrome, a leading decentralized exchange and liquidity hub on Base. It is central to Base's DeFi liquidity incentives and one of the more prominent native assets of that network.",
    trading:
      "AERO's deepest liquidity is on Base against ETH and USDC, where Aerodrome itself concentrates trading. Trade it natively on Base for the best spreads, and verify the contract carefully — as a Base-native asset with an active scene, copycats are a risk.",
    risk:
      "AERO is volatile and tightly linked to Base's DeFi activity and Aerodrome's incentive emissions. Emission-driven tokens can face inflationary pressure, so weigh tokenomics and emissions alongside price when sizing a position.",
  },
  PNG: {
    category: "ecosystem",
    summary:
      "PNG is the token of Pangolin, an established decentralized exchange on Avalanche's C-Chain. It is part of the Avalanche DeFi ecosystem and used in Pangolin's liquidity and governance mechanics.",
    trading:
      "PNG trades primarily on Avalanche C-Chain against AVAX and stablecoins, with liquidity concentrated on its home network. Confirm C-Chain depth before sizing, and verify the contract on Snowtrace — ecosystem tokens like this can have thinner liquidity than the chain's majors.",
    risk:
      "PNG is volatile and tied to Avalanche DeFi activity and its own emissions. As a smaller-cap ecosystem token, liquidity can be thin and price sensitive to size — trade in clips proportional to pool depth.",
  },
  CAKE: {
    category: "defi",
    summary:
      "CAKE is the token of PancakeSwap, the dominant decentralized exchange on BNB Chain. It is used in PancakeSwap's governance, staking, and incentive systems and is one of the most prominent native assets of the BNB Chain ecosystem.",
    trading:
      "CAKE has deep liquidity on BNB Chain against BNB, USDT, and USDC, where PancakeSwap's own pools are deepest. Spreads on its home network are tight; on other chains it exists as a bridged asset with thinner depth, so prefer trading it on BNB Chain.",
    risk:
      "CAKE is volatile and closely tied to PancakeSwap's usage and emission schedule. Emission-based tokenomics can create inflationary pressure, so consider supply dynamics alongside price and ecosystem activity.",
  },
  JUP: {
    category: "ecosystem",
    summary:
      "JUP is the token of Jupiter, the leading swap aggregator on Solana that routes the majority of the network's trading volume. It is a core asset of the Solana DeFi ecosystem and central to how SPL tokens are traded.",
    trading:
      "JUP has deep liquidity on Solana against SOL and USDC, and as Jupiter is itself the dominant aggregator, routing for JUP is efficient on its home network. Verify the mint on Solscan, and keep SOL for priority fees when trading during busy periods.",
    risk:
      "JUP is volatile and tied to Solana DeFi activity and its own token-distribution schedule. As with other ecosystem tokens, unlock and emission dynamics can affect price, so weigh tokenomics alongside ordinary market risk.",
  },
  SAND: {
    category: "ecosystem",
    summary:
      "SAND is the token of The Sandbox, a virtual-world and gaming platform, used for transactions, staking, and governance within that ecosystem. It is an established mid-cap token traded across major EVM chains.",
    trading:
      "SAND has reasonable liquidity against ETH and stablecoins, with its deepest markets on Ethereum and Polygon. On secondary chains confirm you are trading the canonical bridged representation, and check depth before sizing on less liquid venues.",
    risk:
      "SAND is volatile and its demand is tied to gaming and metaverse sentiment, which can be cyclical. It carries no contract rug risk as an established token, but its price can move sharply with sector narratives independent of usage.",
  },
  SHIB: {
    category: "meme",
    summary:
      "SHIB (Shiba Inu) is one of the original large-cap memecoins, an Ethereum-based token that grew a substantial community and ecosystem around it. Despite its meme origins it reached a large market value and trades widely across major chains.",
    trading:
      "SHIB has meaningful liquidity against ETH and stablecoins on Ethereum, deeper than most memecoins, so spreads on major venues are workable. On secondary chains it exists as a bridged asset; verify the contract and check depth, and beware the many copycat tokens reusing the name.",
    risk:
      "SHIB is a memecoin and highly volatile, with price driven largely by sentiment rather than fundamentals. Its large supply and community-driven dynamics mean sharp moves in both directions; verify the contract carefully given the abundance of impostors.",
  },
  PEPE: {
    category: "meme",
    summary:
      "PEPE is a prominent Ethereum-based memecoin that became one of the largest tokens in its category by market value. It has no utility claims beyond being a memecoin and is driven entirely by community and market sentiment.",
    trading:
      "PEPE has substantial liquidity for a memecoin against ETH and stablecoins on Ethereum, so large venues offer reasonable spreads. Confirm the exact contract — PEPE is among the most-copied tickers in crypto — and check depth on any secondary chain before trading.",
    risk:
      "PEPE is highly volatile and purely sentiment-driven, capable of large swings within hours. Copycat contracts are extremely common, so contract verification is essential, and positions should be sized for the possibility of rapid, large drawdowns.",
  },
  BRETT: {
    category: "meme",
    summary:
      "BRETT is a leading memecoin native to Base, one of the most prominent tokens to emerge from that network's consumer and memecoin scene. It is community-driven with no utility claims beyond its meme status.",
    trading:
      "BRETT's deepest liquidity is on Base against ETH and USDC. Trade it natively on Base for the best spreads, verify the exact contract on Basescan given the prevalence of copycats, and confirm pool depth before sizing.",
    risk:
      "BRETT is a highly volatile memecoin whose price reflects Base ecosystem sentiment and momentum. As with all memecoins, verify the contract, confirm two-way tradeability, and size for the possibility of total loss.",
  },
  BONK: {
    category: "meme",
    summary:
      "BONK is a major Solana memecoin that became one of the most widely held tokens in the Solana ecosystem. It is community-driven and was distributed broadly across Solana users, with no utility claims beyond its meme status.",
    trading:
      "BONK has deep liquidity for a memecoin on Solana against SOL and USDC, routed efficiently through Jupiter. Verify the mint on Solscan to avoid impostors, keep SOL for priority fees, and check the simulation preview before signing.",
    risk:
      "BONK is highly volatile and sentiment-driven. Its broad distribution gives it a large holder base, but memecoin dynamics mean sharp moves are routine; verify the mint and size positions for total loss.",
  },
  WIF: {
    category: "meme",
    summary:
      "WIF (dogwifhat) is a prominent Solana memecoin that reached a large market value on the strength of its community and momentum. It is purely a memecoin with no utility claims.",
    trading:
      "WIF has strong liquidity for a memecoin on Solana against SOL and USDC via Jupiter-routed paths. Verify the mint on Solscan, keep SOL for priority fees during busy periods, and confirm the transaction simulation before signing.",
    risk:
      "WIF is highly volatile and driven entirely by sentiment, with the capacity for large swings in short periods. Confirm the mint to avoid copycats and size every position as speculative capital you can fully lose.",
  },
  TTAJ: {
    category: "other",
    summary:
      "TTAJ is a smaller, less-established token. With assets like this, the contract address — not the name or symbol — is the only reliable identity, and the absence of widespread coverage means independent verification matters more than usual.",
    trading:
      "TTAJ is likely to have thin and concentrated liquidity, so price impact can be severe even on modest trades and exiting a position may be difficult. Check pool depth and 24-hour volume before sizing, confirm the exact contract, and treat any trade as small and exploratory.",
    risk:
      "As a low-profile token, TTAJ carries elevated risk: thin liquidity, possible concentrated holdings, and the full range of contract risks. Verify the contract, confirm you can sell, read the permissions, and size for total loss.",
  },
  NERO: {
    category: "other",
    summary:
      "NERO is a smaller, less-established token. As always, the contract address is the asset's only reliable identity, and limited coverage means you should rely on on-chain verification rather than the symbol or surrounding hype.",
    trading:
      "NERO is likely to trade in thin pools where price impact is high and exits can be difficult. Confirm depth and volume before sizing, verify the exact contract against an authoritative source, and keep any position small until you have proven the market is liquid in both directions.",
    risk:
      "NERO carries the elevated risk profile of any low-profile token — thin liquidity, potential holder concentration, and contract-level risks. Verify the contract, read its permissions, confirm two-way tradeability, and never commit more than you can afford to lose.",
  },
};

export function getTokenProfile(symbol?: string): TokenProfile | undefined {
  if (!symbol) return undefined;
  return TOKEN_PROFILES[symbol.toUpperCase()];
}

/**
 * Acceptable on-chain names for each blue-chip symbol. A canonical profile is
 * only applied when the page's token name matches one of these, so a
 * ticker-squatting token (e.g. a pump-coin reusing "SOL") does not inherit the
 * genuine asset's description. Meme/other tokens match on symbol alone.
 */
const CANONICAL_NAMES: Record<string, string[]> = {
  USDC: ["usd coin", "usdc", "bridged usdc", "usdc.e", "usd//c"],
  USDT: ["tether", "tether usd", "usdt", "bridged usdt"],
  DAI: ["dai", "dai stablecoin"],
  USDS: ["usds", "sky dollar", "usds stablecoin"],
  ETH: ["ether", "ethereum"],
  WETH: ["wrapped ether", "wrapped eth", "weth"],
  WBTC: ["wrapped bitcoin", "wrapped btc", "wbtc"],
  BNB: ["bnb", "binance coin", "build and build"],
  WBNB: ["wrapped bnb", "wbnb"],
  SOL: ["solana", "wrapped sol", "wrapped solana"],
  AVAX: ["avalanche", "avax"],
  WAVAX: ["wrapped avax", "wavax", "wrapped avalanche"],
  POL: ["polygon", "pol", "matic", "polygon ecosystem token", "wrapped pol"],
  WPOL: ["wrapped pol", "wpol", "wrapped polygon"],
  LINK: ["chainlink", "link"],
  UNI: ["uniswap", "uni"],
  ARB: ["arbitrum", "arb"],
  AERO: ["aerodrome", "aerodrome finance", "aero"],
  PNG: ["pangolin", "png"],
  CAKE: ["pancakeswap", "pancakeswap token", "cake"],
  JUP: ["jupiter", "jup"],
  SAND: ["the sandbox", "sandbox", "sand"],
};

/**
 * Resolve the authored profile for a token page, guarding blue-chip symbols
 * against ticker reuse. Returns undefined when a major symbol is reused by a
 * token whose name does not match the canonical asset, so the content engine
 * falls back to honest "verify the contract" prose instead of a wrong writeup.
 */
export function resolveTokenProfile(symbol?: string, name?: string): TokenProfile | undefined {
  const profile = getTokenProfile(symbol);
  if (!profile) return undefined;
  if (profile.category === "meme" || profile.category === "other") return profile;

  const allow = CANONICAL_NAMES[(symbol ?? "").toUpperCase()];
  if (!allow) return profile;

  const n = (name ?? "").trim().toLowerCase();
  if (!n) return profile;
  return allow.some((a) => n === a || n.includes(a)) ? profile : undefined;
}

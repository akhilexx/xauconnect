/**
 * Permanent redirects for URLs Google already crawled that no longer exist.
 * Synthetic tk* doorway URLs go to the chain swap hub. Renamed guides go to
 * the current article. Bare hubs go to the live section.
 *
 * @returns {import('next').Redirect[]}
 */
export function legacyRedirects() {
  /** @type {import('next').Redirect[]} */
  const exact = [];

  const learn = {
    "/learn/guides/how-to-add-liquidity-to-a-pool":
      "/learn/guides/how-to-add-liquidity-after-creating-a-token",
    "/learn/guides/how-to-avoid-swap-scams":
      "/learn/guides/how-to-avoid-swap-scams-and-honeypots",
    "/learn/guides/how-to-connect-metamask":
      "/learn/guides/how-to-connect-metamask-to-a-dex",
    "/learn/guides/how-to-launch-a-token-on-the-launchpad":
      "/learn/guides/how-to-launch-a-token-on-xauconnect",
    "/learn/guides/how-to-rpc-endpoint-selection":
      "/learn/how-to-choose-which-chain-to-swap-on",
    "/learn/cross-chain-bridge-ethereum":
      "/learn/guides/how-to-bridge-assets-between-chains",
    "/learn/impermanent-loss-bsc": "/learn/what-is-impermanent-loss",
    "/learn/launch-bsc-guide": "/launch/bsc",
    "/learn/meme-coin-risks-bsc": "/learn/meme-coin-risks-every-trader-should-know",
    "/learn/meme-coins-ethereum-guide": "/meme-coins/ethereum",
    "/learn/stablecoin-swap": "/learn/stablecoins-usdc-vs-usdt-vs-dai",
    "/learn/token-approval-bsc":
      "/learn/what-is-a-token-approval-and-why-does-it-matter",
    "/learn/tokenomics-basics": "/learn/tokenomics-basics-for-traders",
    "/learn/trade-bsc-guide": "/swap/bsc",
  };

  for (const [source, destination] of Object.entries(learn)) {
    exact.push({ source, destination, permanent: true });
  }

  const retiredPairs = [
    "/cross-chain/arbitrum/ethereum/arb-link",
    "/cross-chain/arbitrum/ethereum/eth-uni",
    "/cross-chain/arbitrum/ethereum/usdt-link",
    "/cross-chain/avalanche/ethereum/avax-link",
    "/cross-chain/avalanche/ethereum/usdc-wbtc",
    "/cross-chain/base/ethereum/eth-wbtc",
    "/cross-chain/base/ethereum/usdc-uni",
    "/cross-chain/bsc/ethereum/bnb-wbtc",
    "/cross-chain/bsc/ethereum/eth-wbtc",
    "/cross-chain/bsc/ethereum/usdc-wbtc",
    "/cross-chain/bsc/ethereum/usdt-link",
    "/cross-chain/bsc/ethereum/usdt-uni",
    "/cross-chain/bsc/ethereum/usdt-wbtc",
    "/cross-chain/ethereum/arbitrum/uni-eth",
    "/cross-chain/ethereum/arbitrum/uni-usdc",
    "/cross-chain/ethereum/polygon/link-weth",
    "/cross-chain/polygon/ethereum/pol-uni",
    "/cross-chain/solana/ethereum/usdt-link",
  ];
  for (const source of retiredPairs) {
    const from = source.split("/")[2];
    exact.push({ source, destination: `/swap/${from}`, permanent: true });
  }

  exact.push(
    { source: "/swap/arbitrum/eth-ethereum-token", destination: "/swap/arbitrum/eth-ether", permanent: true },
    {
      source: "/swap/polygon/pol-polygone",
      destination: "/swap/polygon/pol-polygon-ecosystem-token",
      permanent: true,
    },
    { source: "/swap/polygon/pm-polymtrade", destination: "/swap/polygon", permanent: true },
    { source: "/blog", destination: "/learn", permanent: true },
    { source: "/blog/:path*", destination: "/learn", permanent: true },
    { source: "/news", destination: "/learn", permanent: true },
    { source: "/news/:path*", destination: "/learn", permanent: true },
    { source: "/launch", destination: "/launchpad", permanent: true },
    { source: "/meme-coins", destination: "/discover", permanent: true },
    { source: "/pairs", destination: "/swap", permanent: true },
    { source: "/trade", destination: "/swap", permanent: true },
  );

  return [
    {
      source: "/:path*",
      has: [{ type: "host", value: "www.xauconnect.com" }],
      destination: "https://xauconnect.com/:path*",
      permanent: true,
    },
    ...exact,
    // Generated doorway slugs (tk24, tk279-arbitrum-one-token-279, arb-tk25).
    { source: "/swap/:chainKey/:tokenSlug(tk\\d+.+)", destination: "/swap/:chainKey", permanent: true },
    { source: "/pairs/:chainKey/:pairSlug(.*tk\\d+.*)", destination: "/swap/:chainKey", permanent: true },
    { source: "/pairs/:chainKey", destination: "/swap/:chainKey", permanent: true },
    {
      source: "/cross-chain/:from/:to/:pairSlug(.*tk\\d+.*)",
      destination: "/swap/:from",
      permanent: true,
    },
    { source: "/cross-chain/:from/:to", destination: "/swap/:from", permanent: true },
    // Placeholder catalog addresses from the retired tokens.xml sitemap.
    {
      source: "/token/:chainKey/:address(0x0{30}[0-9a-fA-F]*)",
      destination: "/swap/:chainKey",
      permanent: true,
    },
    {
      source: "/token/:chainKey/:address(XAU0{8}[0-9a-fA-F]*)",
      destination: "/swap/:chainKey",
      permanent: true,
    },
  ];
}

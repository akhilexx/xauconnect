import { fileURLToPath } from "node:url";
import path from "node:path";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: monorepoRoot,
  staticPageGenerationTimeout: process.env.SEO_BUILD === "1" ? 600 : 120,
  // Same-origin REST proxy to the backend. In production the reverse proxy
  // (Caddy) handles /api and /ws before Next ever sees them; this rewrite is
  // the fallback so /api also works under plain `next dev` / `next start`.
  // (WebSockets do NOT proxy through Next — that's what Caddy is for.)
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:4000";
    return [{ source: "/api/:path*", destination: `${backend}/:path*` }];
  },
  // Permanently redirect removed doorway page types to their canonical pages.
  // buy/sell collapsed into the single /swap/{chain}/{slug} token page; the
  // search and cross-chain-search permutation pages were retired entirely.
  async redirects() {
    return [
      {
        source: "/buy/:chainKey/:tokenSlug",
        destination: "/swap/:chainKey/:tokenSlug",
        permanent: true,
      },
      {
        source: "/sell/:chainKey/:tokenSlug",
        destination: "/swap/:chainKey/:tokenSlug",
        permanent: true,
      },
      { source: "/buy/:chainKey", destination: "/swap/:chainKey", permanent: true },
      { source: "/sell/:chainKey", destination: "/swap/:chainKey", permanent: true },
      { source: "/search-cross-chain/:slug*", destination: "/swap", permanent: true },
    ];
  },
  transpilePackages: ["@xauconnect/ui", "@xauconnect/utils", "@xauconnect/sdk", "@xauconnect/seo"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.dexscreener.com" },
      { protocol: "https", hostname: "**.coingecko.com" },
      { protocol: "https", hostname: "ipfs.io" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "trustwallet.com" },
      { protocol: "https", hostname: "public.bnbstatic.com" },
      { protocol: "https", hostname: "static.okx.com" },
      { protocol: "https", hostname: "www.coinbase.com" },
      { protocol: "https", hostname: "phantom.app" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  // RainbowKit / wallet libs pull in optional node deps not needed in browser.
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // Workspace packages use NodeNext-style ".js" specifiers in TS source;
    // teach webpack to resolve them back to .ts/.tsx during transpilation.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;

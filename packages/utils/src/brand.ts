/**
 * XAUConnect brand assets — canonical paths and copy for web metadata.
 * Mobile uses bundled files under apps/mobile/assets/.
 */

export const BRAND_NAME = "XAUConnect";
export const BRAND_LEGAL_NAME = "XAUConnect Labs";
export const BRAND_TAGLINE = "The Gold Standard of Liquidity.";
export const BRAND_DESCRIPTION =
  "The gold-standard multi-chain DEX. Instant best-price swaps, deep liquidity pools, and one-click token launches across 7 networks.";

/** Static paths served from apps/web/public/brand/ */
export const BRAND_LOGO = {
  /** Master mark — cache-busted when reprocessed (see scripts/process-higgsfield-brand.py). */
  src: "/brand/logo.png?v=4",
  icon32: "/brand/logo-32.png?v=4",
  icon192: "/brand/logo-192.png?v=4",
  icon512: "/brand/logo-512.png?v=4",
  og: "/brand/og-image.png?v=3",
  ogWidth: 1200,
  ogHeight: 630,
  clay: "/brand/logo-clay.png?v=1",
} as const;

/** Home feature miniatures — 3D gold/pink marks matching the orbital logo. */
export const BRAND_FEATURE_ICONS = {
  swap: "/brand/features/swap.png?v=1",
  liquidity: "/brand/features/liquidity.png?v=1",
  launchpad: "/brand/features/launchpad.png?v=1",
  fairLaunch: "/brand/features/fair-launch.png?v=1",
  discover: "/brand/features/discover.png?v=1",
  wallet: "/brand/features/wallet.png?v=1",
  simulation: "/brand/features/simulation.png?v=1",
  locked: "/brand/features/locked.png?v=1",
  buySell: "/brand/features/buy-sell.png?v=1",
  learn: "/brand/features/learn.png?v=1",
} as const;

/** Clay 3D glyphs for header, admin tabs, and other small UI slots. */
export const BRAND_NAV_ICONS = {
  swap: "/brand/nav/swap.png?v=2",
  buySell: "/brand/nav/buy-sell.png?v=2",
  liquidity: "/brand/nav/liquidity.png?v=2",
  discover: "/brand/nav/discover.png?v=2",
  learn: "/brand/nav/learn.png?v=2",
  launchpad: "/brand/nav/launchpad.png?v=2",
  wallet: "/brand/nav/wallet.png?v=2",
  profile: "/brand/nav/profile.png?v=2",
  admin: "/brand/nav/admin.png?v=2",
  metrics: "/brand/nav/metrics.png?v=2",
  agents: "/brand/nav/agents.png?v=2",
  fees: "/brand/nav/fees.png?v=2",
  users: "/brand/nav/users.png?v=2",
  audit: "/brand/nav/audit.png?v=2",
  simulation: "/brand/nav/simulation.png?v=2",
} as const;

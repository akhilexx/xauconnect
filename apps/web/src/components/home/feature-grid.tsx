"use client";

/**
 * FeatureGrid — platform pillars with clay 3D marks.
 */
import Link from "next/link";
import { BRAND_NAV_ICONS } from "@xauconnect/utils";
import { GlassCard } from "@xauconnect/ui";

const FEATURES = [
  {
    icon: BRAND_NAV_ICONS.swap,
    title: "XAU Smart Routing",
    body: "Every quote is fanned out across the full XAU route network on-chain — the best net price is auto-selected and simulated before you sign.",
    href: "/swap",
  },
  {
    icon: BRAND_NAV_ICONS.liquidity,
    title: "Deep Liquidity Pools",
    body: "Add or remove LP in any XAU pool through one interface, with live pool ratios and estimated APR on every position.",
    href: "/liquidity",
  },
  {
    icon: BRAND_NAV_ICONS.launchpad,
    title: "One-Click Token Launch",
    body: "Deploy an honest fixed-supply ERC-20 in seconds — metadata pinned to IPFS, optional LP creation, and automatic Discover listing.",
    href: "/launchpad",
  },
  {
    icon: BRAND_NAV_ICONS.launchpad,
    title: "Bonding-Curve Fair Launches",
    body: "Fair-launch bonding curves for everyone. At the graduation target, liquidity migrates into a permanent XAU pool and the LP is burned forever.",
    href: "/launchpad",
  },
  {
    icon: BRAND_NAV_ICONS.discover,
    title: "Token Discovery",
    body: "Trending, new pairs, top gainers and volume leaders across chains — with candle charts, liquidity panels and dev-wallet tracking.",
    href: "/discover",
  },
  {
    icon: BRAND_NAV_ICONS.wallet,
    title: "XAU Wallet",
    body: "Multi-chain balances and history in one view. Built embedded-wallet-ready for the upcoming in-app signer.",
    href: "/wallet",
  },
  {
    icon: BRAND_NAV_ICONS.simulation,
    title: "Simulation First",
    body: "Every swap is simulated before signature. Reverts are caught server-side so failed transactions never cost you gas.",
    href: "/swap",
  },
  {
    icon: BRAND_NAV_ICONS.admin,
    title: "Locked & Audited",
    body: "UUPS-upgradeable contract suite with reentrancy guards, role-based access control and a full Hardhat test suite.",
    href: "/discover",
  },
];

export function FeatureGrid() {
  return (
    <section>
      <h2 className="font-display text-xl font-bold sm:text-2xl">
        Everything a trader needs. <span className="gold-text">Nothing they don&apos;t.</span>
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon, title, body, href }) => (
          <Link key={title} href={href} className="group">
            <GlassCard hover className="h-full">
              {/* eslint-disable-next-line @next/next/no-img-element -- local brand asset */}
              <img
                src={icon}
                alt={`${title} on XAUConnect`}
                width={56}
                height={56}
                className="h-14 w-14 object-contain drop-shadow-[0_6px_14px_rgba(255,170,0,0.22)]"
              />
              <h3 className="mt-3 font-display text-base font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
            </GlassCard>
          </Link>
        ))}
      </div>
    </section>
  );
}

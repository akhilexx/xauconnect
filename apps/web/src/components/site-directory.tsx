"use client";

import Link from "next/link";

const NETWORKS = [
  { href: "/chains/ethereum", label: "Ethereum" },
  { href: "/chains/bsc", label: "BNB Chain" },
  { href: "/chains/polygon", label: "Polygon" },
  { href: "/chains/arbitrum", label: "Arbitrum" },
  { href: "/chains/base", label: "Base" },
  { href: "/chains/avalanche", label: "Avalanche" },
  { href: "/chains/solana", label: "Solana" },
] as const;

const MARKETS = [
  { href: "/swap/ethereum", label: "Swap on Ethereum" },
  { href: "/swap/solana", label: "Swap on Solana" },
  { href: "/swap/base", label: "Swap on Base" },
  { href: "/swap/bsc", label: "Swap on BNB Chain" },
  { href: "/launchpad", label: "Launch a token" },
  { href: "/discover", label: "Discover tokens" },
] as const;

const GUIDES = [
  { href: "/learn/guides/how-to-launch-a-token-on-xauconnect", label: "Launch a token" },
  { href: "/learn/guides/how-to-set-slippage-tolerance", label: "Set slippage" },
  { href: "/learn/guides/how-to-bridge-assets-between-chains", label: "Bridge assets" },
  { href: "/learn/guides/how-to-swap-tokens-on-xauconnect", label: "How swapping works" },
  { href: "/learn/what-is-a-dex-aggregator", label: "DEX aggregator" },
  { href: "/learn/guides", label: "All guides" },
] as const;

function Column({ title, links }: { title: string; links: readonly { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">{title}</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm font-medium text-ink-muted transition-colors hover:text-ink">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Crawlable directory. Visible at every breakpoint so mobile-first indexing can follow it. */
export function SiteDirectory() {
  return (
    <nav aria-label="Site directory" className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
      <Column title="Networks" links={NETWORKS} />
      <Column title="Markets" links={MARKETS} />
      <Column title="Guides" links={GUIDES} />
    </nav>
  );
}

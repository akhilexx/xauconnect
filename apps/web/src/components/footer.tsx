"use client";

import Link from "next/link";
import { BrandMark } from "./brand-logo";

const NAV_LINKS = [
  { href: "/launchpad", label: "Launchpad" },
  { href: "/swap", label: "Swap" },
  { href: "/buy-crypto", label: "Buy crypto" },
  { href: "/sell-crypto", label: "Sell crypto" },
  { href: "/liquidity", label: "Liquidity" },
  { href: "/discover", label: "Discover" },
  { href: "/learn", label: "Learn" },
  { href: "/developers", label: "Developers" },
  { href: "/wallet", label: "Wallet" },
  { href: "/profile", label: "Profile" },
] as const;

const LEGAL_LINKS = [
  { href: "/about", label: "About" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/55 bg-white/40 backdrop-blur-glass">
      <div className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 self-start rounded-xl transition-opacity hover:opacity-90"
            aria-label="XAUConnect home"
          >
            <BrandMark size={28} className="sm:hidden" />
            <BrandMark size={32} className="hidden sm:block" />
            <span className="font-display text-sm font-extrabold tracking-tight sm:text-base">
              XAU<span className="gold-text">Connect</span>
            </span>
          </Link>

          <nav
            aria-label="Footer"
            className="hidden flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-ink-muted md:flex"
          >
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="transition-colors hover:text-ink">
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-ink-faint">
          {LEGAL_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="min-h-10 inline-flex items-center transition-colors hover:text-ink-muted md:min-h-0">
              {label}
            </Link>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-1 border-t border-white/50 pt-3 text-[11px] leading-relaxed text-ink-faint sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pt-4">
          <p>© {new Date().getFullYear()} XAUConnect Labs</p>
          <p className="sm:text-right">Digital assets are volatile — not financial advice.</p>
        </div>
      </div>
    </footer>
  );
}

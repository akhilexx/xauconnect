import Link from "next/link";
import { BRAND_NAME } from "@xauconnect/utils";
import { BrandGlyph } from "@/components/brand-glyph";
import { BrandMark } from "@/components/brand-logo";
import { DESKTOP_NAV } from "@/lib/site-nav";
import { SiteDirectory } from "@/components/site-directory";

const FOOTER_LINKS = [
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

/**
 * Server-only site chrome for prerendered SEO pages (crawler-safe, no JS).
 * Mirrors the live app's Liquid Glass theme — glass header/footer, warm
 * gold→pink radial background, gold-gradient primary CTA — using static
 * markup and the shared design-system CSS classes (no client components).
 */
export function SeoSiteChrome({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <>
      {/* Warm radial brand wash behind everything (static analogue of the app's flow-field) */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-canvas bg-hero-radial"
        aria-hidden
      />

      <div className="relative z-[1] flex min-h-dvh flex-col text-ink">
        <header className="sticky top-0 z-40 border-b border-white/70 bg-white/60 pt-[env(safe-area-inset-top)] backdrop-blur-glass">
          <nav className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6 lg:px-8">
            <Link
              href="/"
              className="group flex min-w-0 shrink-0 items-center gap-2 rounded-full px-1 py-1 transition-colors duration-200 hover:bg-white/70 sm:gap-2.5 sm:px-1.5"
              aria-label={`${BRAND_NAME} home`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-visible sm:h-9 sm:w-9">
                <BrandMark
                  size={32}
                  className="overflow-visible object-contain transition-transform duration-200 group-hover:scale-[1.04]"
                />
              </span>
              <span className="truncate font-display text-sm font-extrabold tracking-tight sm:text-base md:text-lg">
                XAU<span className="gold-text">Connect</span>
              </span>
            </Link>

            <div className="hidden min-w-0 flex-1 items-center justify-center overflow-x-auto md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center gap-0.5 rounded-full bg-white/50 p-1 shadow-[0_1px_2px_rgba(21,23,28,0.04)] ring-1 ring-ink/[0.06]">
                {DESKTOP_NAV.map(({ href, label, mark }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-[13px] font-medium tracking-tight text-ink-muted transition-colors duration-200 hover:bg-white/70 hover:text-ink"
                  >
                    <BrandGlyph src={mark} size={20} />
                    <span className="whitespace-nowrap">{label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <details className="relative md:hidden">
                <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full text-ink-muted ring-1 ring-ink/[0.08] [&::-webkit-details-marker]:hidden">
                  <span className="sr-only">Open menu</span>
                  <span className="flex flex-col gap-1" aria-hidden>
                    <span className="block h-0.5 w-4 rounded-full bg-current" />
                    <span className="block h-0.5 w-4 rounded-full bg-current" />
                    <span className="block h-0.5 w-4 rounded-full bg-current" />
                  </span>
                </summary>
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(16rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.25rem] border border-white/80 bg-white/95 p-2 shadow-glass-lg">
                  {DESKTOP_NAV.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="block rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-gold/[0.08]"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </details>
              <Link
                href="/swap"
                className="inline-flex h-10 items-center justify-center rounded-full bg-gold-gradient px-3.5 text-sm font-semibold text-ink shadow-gold-glow transition hover:brightness-105 sm:px-5"
              >
                Swap
              </Link>
            </div>
          </nav>
        </header>

        <main className="w-full min-w-0 flex-1 px-4 pb-6 pt-3 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8">
          {children}
        </main>

        <footer className="mt-auto border-t border-white/55 bg-white/40 backdrop-blur-glass">
          <div className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <Link
                href="/"
                className="flex items-center gap-2.5 self-start rounded-xl transition-opacity hover:opacity-90"
                aria-label={`${BRAND_NAME} home`}
              >
                <BrandMark size={28} className="sm:hidden" />
                <BrandMark size={32} className="hidden sm:block" />
                <span className="font-display text-sm font-extrabold tracking-tight sm:text-base">
                  XAU<span className="gold-text">Connect</span>
                </span>
              </Link>
              <nav
                aria-label="Footer"
                className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-ink-muted"
              >
                {FOOTER_LINKS.map(({ href, label }) => (
                  <Link key={href} href={href} className="transition-colors hover:text-ink">
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            <SiteDirectory />
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-ink-faint">
              {LEGAL_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex min-h-10 items-center transition-colors hover:text-ink-muted md:min-h-0"
                >
                  {label}
                </Link>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-1 border-t border-white/50 pt-3 text-[11px] leading-relaxed text-ink-faint sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pt-4">
              <p>© {year} XAUConnect Labs</p>
              <p className="sm:text-right">Digital assets are volatile — not financial advice.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

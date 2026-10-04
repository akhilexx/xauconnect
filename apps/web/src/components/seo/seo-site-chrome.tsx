import Link from "next/link";
import { BRAND_LOGO, BRAND_NAME } from "@xauconnect/utils";

const NAV_LINKS = [
  { href: "/launchpad", label: "Launchpad" },
  { href: "/swap", label: "Swap" },
  { href: "/liquidity", label: "Liquidity" },
  { href: "/discover", label: "Discover" },
  { href: "/learn", label: "Learn" },
  { href: "/developers", label: "Developers" },
  { href: "/wallet", label: "Wallet" },
] as const;

const FOOTER_PRODUCT = [
  { href: "/launchpad", label: "Launchpad" },
  { href: "/swap", label: "Swap" },
  { href: "/discover", label: "Discover" },
  { href: "/liquidity", label: "Liquidity" },
] as const;

const FOOTER_RESOURCES = [
  { href: "/learn", label: "Learn" },
  { href: "/learn/guides", label: "Guides" },
  { href: "/developers", label: "Developers" },
  { href: "/developers/api", label: "API reference" },
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
              className="group flex min-w-0 items-center gap-2 rounded-full px-1 py-1 transition-colors duration-200 hover:bg-white/70 sm:gap-2.5 sm:px-1.5"
              aria-label={`${BRAND_NAME} home`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BRAND_LOGO.src}
                alt={`${BRAND_NAME} logo`}
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 overflow-visible object-contain transition-transform duration-200 group-hover:scale-[1.04]"
              />
              <span className="truncate font-display text-sm font-extrabold tracking-tight sm:text-base md:text-lg">
                XAU<span className="gold-text">Connect</span>
              </span>
            </Link>

            <div className="hidden items-center rounded-full bg-white/50 p-1 shadow-[0_1px_2px_rgba(21,23,28,0.04)] ring-1 ring-ink/[0.06] md:flex">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full px-3.5 py-1.5 text-[13px] font-medium tracking-tight text-ink-muted transition-colors duration-200 hover:bg-white/80 hover:text-ink"
                >
                  {label}
                </Link>
              ))}
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
                  {NAV_LINKS.map(({ href, label }) => (
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
                <span className="sm:hidden">Swap</span>
                <span className="hidden sm:inline">Launch app</span>
              </Link>
            </div>
          </nav>
        </header>

        <main className="w-full min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-12 lg:px-8">
          {children}
        </main>

        <footer className="mt-auto border-t border-white/55 bg-white/45 backdrop-blur-glass">
          <div className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-3">
                <Link
                  href="/"
                  className="flex items-center gap-2.5"
                  aria-label={`${BRAND_NAME} home`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={BRAND_LOGO.src} alt="" width={30} height={30} className="object-contain" />
                  <span className="font-display text-base font-extrabold tracking-tight">
                    XAU<span className="gold-text">Connect</span>
                  </span>
                </Link>
                <p className="max-w-xs text-sm leading-relaxed text-ink-muted">
                  A non-custodial multi-chain swap aggregator routing trades across seven networks for
                  the best execution.
                </p>
              </div>

              <FooterColumn title="Product" links={FOOTER_PRODUCT} />
              <FooterColumn title="Resources" links={FOOTER_RESOURCES} />
              <FooterColumn title="Company" links={LEGAL_LINKS} />
            </div>

            <div className="mt-10 flex flex-col gap-2 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-faint">© {year} XAUConnect Labs. All rights reserved.</p>
              <p className="text-xs text-ink-faint">
                Digital assets are volatile — nothing here is financial advice.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ href: string; label: string }>;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} className="text-sm text-ink-muted transition hover:text-ink">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

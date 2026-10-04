"use client";

/**
 * Navbar — glass header with route links, wallet connect, and admin entry
 * (visible only for ADMIN sessions).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BRAND_NAV_ICONS } from "@xauconnect/utils";
import { cn } from "@xauconnect/ui";
import { ADMIN_NAV, DESKTOP_NAV, PROFILE_NAV, isTabActive } from "@/lib/site-nav";
import { useSessionStore } from "@/lib/store";
import { SignInButton } from "./sign-in-button";
import { BrandGlyph } from "./brand-glyph";
import { BrandMark } from "./brand-logo";
import { WalletConnectButton } from "./wallet/wallet-connect-button";

function DesktopNavLink({
  href,
  label,
  mark,
  active,
  accent = "gold",
}: {
  href: string;
  label: string;
  mark: string;
  active: boolean;
  accent?: "gold" | "blush";
}) {
  const isBlush = accent === "blush";
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "group relative flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-[13px] font-medium tracking-tight",
        "transition-colors duration-200",
        active
          ? isBlush
            ? "text-blush"
            : "text-ink"
          : isBlush
            ? "text-ink-muted hover:text-blush"
            : "text-ink-muted hover:text-ink",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-pill"
          className={cn(
            "absolute inset-0 rounded-full shadow-[0_1px_2px_rgba(21,23,28,0.06)] ring-1",
            isBlush ? "bg-white/90 ring-blush/30" : "bg-white ring-gold/25",
          )}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      {!active && (
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100",
            isBlush ? "bg-blush/[0.07]" : "bg-white/70",
          )}
          aria-hidden
        />
      )}
      <BrandGlyph src={mark} size={20} className="relative z-10" />
      <span className="relative z-10 whitespace-nowrap">{label}</span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const role = useSessionStore((s) => s.role);

  return (
    <header className="sticky top-0 z-40 min-w-0 border-b border-white/70 bg-white/60 pt-[env(safe-area-inset-top)] backdrop-blur-glass">
      <nav className="flex h-14 w-full min-w-0 items-center gap-2 px-4 sm:h-[4.25rem] sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex min-w-0 shrink-0 items-center gap-2 rounded-full px-1 py-1 transition-colors duration-200 hover:bg-white/70 sm:gap-2.5 sm:px-1.5"
          aria-label="XAUConnect home"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-visible sm:h-9 sm:w-9">
            <BrandMark
              size={32}
              priority
              className="overflow-visible object-contain transition-transform duration-200 group-hover:scale-[1.04]"
            />
          </span>
          <span className="truncate font-display text-sm font-extrabold tracking-tight sm:text-base md:text-lg">
            XAU<span className="gold-text transition-opacity group-hover:opacity-90">Connect</span>
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-center overflow-x-auto md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-0.5 rounded-full bg-white/50 p-1 shadow-[0_1px_2px_rgba(21,23,28,0.04)] ring-1 ring-ink/[0.06]">
            {DESKTOP_NAV.map(({ href, label, mark }) => (
              <DesktopNavLink
                key={href}
                href={href}
                label={label}
                mark={mark}
                active={isTabActive(pathname, href)}
              />
            ))}
            <DesktopNavLink
              href={PROFILE_NAV.href}
              label={PROFILE_NAV.label}
              mark={BRAND_NAV_ICONS.profile}
              active={pathname.startsWith("/profile")}
            />
            {role === "ADMIN" && (
              <DesktopNavLink
                href={ADMIN_NAV.href}
                label={ADMIN_NAV.label}
                mark={ADMIN_NAV.mark}
                active={pathname.startsWith(ADMIN_NAV.href)}
                accent="blush"
              />
            )}
          </div>
        </div>

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5 sm:ml-0 sm:gap-2">
          <span className="hidden sm:block">
            <SignInButton />
          </span>
          <WalletConnectButton className="self-center rounded-full" />
        </div>
      </nav>
    </header>
  );
}

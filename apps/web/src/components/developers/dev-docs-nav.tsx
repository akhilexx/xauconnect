"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@xauconnect/ui";

const NAV = [
  { href: "/developers", label: "Overview", exact: true },
  { href: "/developers/quickstart", label: "Quickstart" },
  { href: "/developers/api", label: "API Reference", exact: true },
  { href: "/developers/api/swap", label: "Same-chain swap" },
  { href: "/developers/api/cross-chain", label: "Cross-chain" },
  { href: "/developers/api/solana", label: "Solana" },
  { href: "/developers/api/authentication", label: "Auth & limits" },
  { href: "/developers/api/tracking", label: "Tracking" },
  { href: "/developers/sdks", label: "SDKs" },
  { href: "/developers/examples", label: "Examples" },
  { href: "/developers/blog", label: "Blog" },
  { href: "/developers/changelog", label: "Changelog" },
] as const;

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DevDocsNav() {
  const pathname = usePathname();

  return (
    <nav className="scroll-x-tabs glass sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 flex max-w-[calc(100vw-1.5rem)] flex-row gap-1 overflow-x-auto rounded-2xl p-1 lg:top-24 lg:max-w-none lg:flex-col lg:overflow-visible">
      {NAV.map((item) => {
        const { href, label } = item;
        const exact = "exact" in item ? item.exact : undefined;
        const active = isActive(pathname, href, exact);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "min-h-11 shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition-all whitespace-nowrap lg:min-h-0",
              active
                ? "bg-gold-gradient text-ink shadow-gold-glow"
                : "text-ink-muted hover:bg-gold/[0.08] hover:text-ink",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

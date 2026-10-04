"use client";

/**
 * Mobile dock — five primary destinations + a More sheet for the rest.
 * Hidden from md up (desktop header owns navigation).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@xauconnect/ui";
import { BrandGlyph } from "./brand-glyph";
import { SignInButton } from "./sign-in-button";
import { useSessionStore } from "@/lib/store";
import {
  ADMIN_NAV,
  MOBILE_TABS,
  MORE_NAV,
  isMoreActive,
  isTabActive,
} from "@/lib/site-nav";

export function MobileTabBar() {
  const pathname = usePathname();
  const role = useSessionStore((s) => s.role);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const moreActive = isMoreActive(pathname);

  useEffect(() => setMounted(true), []);
  useEffect(() => setMoreOpen(false), [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  const moreItems = role === "ADMIN" ? [...MORE_NAV, ADMIN_NAV] : MORE_NAV;

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/78 backdrop-blur-glass md:hidden"
        style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1">
          {MOBILE_TABS.map(({ href, label, mark }) => {
            const active = isTabActive(pathname, href);
            return (
              <li key={href} className="min-w-0">
                <Link
                  href={href}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-semibold tracking-tight transition-colors",
                    active ? "text-ink" : "text-ink-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                      active && "bg-gold-gradient shadow-gold-glow",
                    )}
                  >
                    <BrandGlyph src={mark} size={22} />
                  </span>
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-semibold tracking-tight transition-colors",
                moreActive || moreOpen ? "text-ink" : "text-ink-muted",
              )}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                  (moreActive || moreOpen) && "bg-gold-gradient shadow-gold-glow",
                )}
              >
                <LayoutGrid className="h-5 w-5" aria-hidden />
              </span>
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  className="fixed inset-0 z-50 flex items-end justify-center md:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  aria-modal
                  role="dialog"
                  aria-label="More destinations"
                >
                  <motion.button
                    type="button"
                    aria-label="Close menu"
                    className="absolute inset-0 bg-ink/30 backdrop-blur-md"
                    onClick={() => setMoreOpen(false)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                  <motion.div
                    className="relative z-10 w-full max-h-[min(88dvh,40rem)] overflow-hidden rounded-t-[1.75rem] bg-white/94 shadow-glass-lg ring-1 ring-white/80 backdrop-blur-2xl"
                    style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
                    initial={{ y: 32 }}
                    animate={{ y: 0 }}
                    exit={{ y: 24 }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  >
                    <div className="flex items-center justify-between px-5 pt-3">
                      <span className="mx-auto h-1 w-10 rounded-full bg-ink/15" aria-hidden />
                      <button
                        type="button"
                        onClick={() => setMoreOpen(false)}
                        className="absolute right-3 top-3 rounded-full p-2 text-ink-muted hover:bg-ink/5 hover:text-ink"
                        aria-label="Close"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="px-5 pb-3 pt-1 font-display text-lg font-bold">More</p>
                    <ul className="thin-scroll grid max-h-[min(60dvh,28rem)] grid-cols-2 gap-2 overflow-y-auto px-4 pb-3">
                      {moreItems.map(({ href, label, mark }) => {
                        const active = pathname.startsWith(href);
                        return (
                          <li key={href}>
                            <Link
                              href={href}
                              onClick={() => setMoreOpen(false)}
                              className={cn(
                                "flex min-h-14 items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold ring-1 transition-colors",
                                active
                                  ? "bg-white text-ink shadow-sm ring-gold/25"
                                  : "bg-white/55 text-ink-soft ring-white/80 hover:bg-white",
                              )}
                            >
                              <BrandGlyph src={mark} size={28} />
                              <span className="min-w-0 leading-tight">{label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="border-t border-ink/[0.06] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          href="/"
                          onClick={() => setMoreOpen(false)}
                          className="text-sm font-semibold text-ink-muted hover:text-ink"
                        >
                          Home
                        </Link>
                        <SignInButton />
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}

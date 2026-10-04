import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPageShell({
  eyebrow,
  title,
  description,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl pb-12">
      <header className="border-b border-white/55 pb-6 sm:pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-deep">{eyebrow}</p>
        <h1 className="font-display mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">{description}</p>
        <p className="mt-4 text-xs text-ink-faint">Last updated: {updated}</p>
      </header>
      <div className="legal-prose mt-10 space-y-8 text-sm leading-relaxed text-ink-muted [&_h2]:scroll-mt-24 [&_h2]:border-b [&_h2]:border-white/40 [&_h2]:pb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_p]:max-w-none [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
      <footer className="mt-12 flex flex-wrap gap-4 border-t border-white/50 pt-6 text-sm font-medium">
        <Link href="/about" className="text-gold-deep hover:underline">
          About
        </Link>
        <Link href="/terms" className="text-gold-deep hover:underline">
          Terms of Service
        </Link>
        <Link href="/privacy" className="text-gold-deep hover:underline">
          Privacy Policy
        </Link>
        <Link href="/developers" className="text-gold-deep hover:underline">
          Developers
        </Link>
        <Link href="/swap" className="text-gold-deep hover:underline">
          Swap
        </Link>
      </footer>
    </article>
  );
}

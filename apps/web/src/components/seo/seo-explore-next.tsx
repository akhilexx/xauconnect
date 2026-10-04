import Link from "next/link";
import { ArrowRight, BookOpen, Coins, Globe, Layers, TrendingUp } from "lucide-react";
import type { SeoPageConfig } from "@xauconnect/seo";

const CATEGORY_META = {
  token: { label: "Tokens", icon: Coins },
  article: { label: "Articles", icon: BookOpen },
  guide: { label: "Guides", icon: BookOpen },
  chain: { label: "Networks", icon: Globe },
  pair: { label: "Pairs", icon: TrendingUp },
  hub: { label: "Platform", icon: Layers },
} as const;

function groupLinks(page: SeoPageConfig) {
  const links = page.relatedLinks ?? page.relatedPaths.map((path) => ({
    path,
    title: path.replace(/^\//, "").replace(/\//g, " · "),
    description: "",
    category: "hub" as const,
  }));

  const groups = new Map<string, typeof links>();
  for (const link of links) {
    const cat = link.category ?? "hub";
    const list = groups.get(cat) ?? [];
    list.push(link);
    groups.set(cat, list);
  }
  return groups;
}

/** Server-only related links — no client UI primitives. */
export function SeoExploreNext({ page }: { page: SeoPageConfig }) {
  const groups = groupLinks(page);
  const showDevCta =
    page.kind === "learn" ||
    page.kind === "guide" ||
    page.kind === "search" ||
    page.kind === "cross-chain-search" ||
    page.kind === "cross-chain-swap";
  if (groups.size === 0 && !showDevCta) return null;

  return (
    <section aria-labelledby="explore-next-heading" className="space-y-6">
      <div className="border-t border-white/60 pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-dark">
          Continue exploring
        </p>
        <h2 id="explore-next-heading" className="mt-1.5 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Related markets, guides &amp; networks
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Curated next steps based on this topic — deepen your research before you trade.
        </p>
      </div>

      {groups.size > 0 ? (
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {[...groups.entries()].map(([category, links]) => {
          const meta = CATEGORY_META[category as keyof typeof CATEGORY_META] ?? CATEGORY_META.hub;
          const Icon = meta.icon;
          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                <Icon className="h-3.5 w-3.5 text-gold-deep" aria-hidden />
                {meta.label}
              </div>
              <ul className="glass divide-y divide-white/60 rounded-glass">
                {links.slice(0, 4).map((link) => (
                  <li key={link.path}>
                    <Link href={link.path} className="group block p-4 transition hover:bg-gold/[0.06]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink group-hover:text-gold-dark">
                            {link.title}
                          </p>
                          {link.description ? (
                            <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                              {link.description}
                            </p>
                          ) : null}
                        </div>
                        <ArrowRight
                          className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-gold-deep"
                          aria-hidden
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      ) : null}

      {showDevCta && (
        <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-glass border-l-[3px] border-l-gold-deep p-5">
          <div>
            <p className="text-sm font-bold text-ink">Build programmatically</p>
            <p className="mt-1 text-sm text-ink-muted">
              Swap via API for bots and AI agents — quotes, builds, and cross-chain routes.
            </p>
          </div>
          <Link
            href="/developers/quickstart"
            className="gradient-border-soft inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold text-ink shadow-glass transition hover:-translate-y-px hover:shadow-glass-lg"
          >
            Developer quickstart <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}

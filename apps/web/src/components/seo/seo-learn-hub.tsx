import Link from "next/link";
import type { SeoPageConfig } from "@xauconnect/seo";
import { SITE_URL } from "@xauconnect/seo";
import { BRAND_NAME } from "@xauconnect/utils";

function groupByEyebrow(pages: SeoPageConfig[]) {
  const groups = new Map<string, SeoPageConfig[]>();
  for (const page of pages) {
    const key = page.eyebrow ?? "Library";
    const list = groups.get(key) ?? [];
    list.push(page);
    groups.set(key, list);
  }
  return [...groups.entries()];
}

function collectionJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  pages: SeoPageConfig[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    isPartOf: { "@type": "WebSite", name: BRAND_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: opts.pages.length,
      itemListElement: opts.pages.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.h1,
        url: `${SITE_URL}${p.path}`,
      })),
    },
  };
}

export function SeoLearnHub({
  title,
  description,
  path,
  pages,
  sibling,
}: {
  title: string;
  description: string;
  path: string;
  pages: SeoPageConfig[];
  sibling: { href: string; label: string };
}) {
  const jsonLd = collectionJsonLd({ name: title, description, path, pages });
  const groups = groupByEyebrow(pages);

  return (
    <article className="xau-content mx-auto w-full max-w-3xl space-y-10 pb-10 pt-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="space-y-4 border-b border-white/60 pb-8">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-dark">
          <span className="h-px w-6 bg-gold-gradient" aria-hidden />
          Library
        </p>
        <h1 className="font-display text-[1.75rem] font-extrabold leading-[1.12] tracking-tight text-ink sm:text-[2.6rem]">
          {title}
        </h1>
        <p className="text-[1.0625rem] leading-[1.75] text-ink-soft">{description}</p>
        <p className="text-sm text-ink-muted">
          {pages.length} articles · written by {BRAND_NAME} Labs ·{" "}
          <Link href={sibling.href} className="font-semibold text-gold-dark hover:underline">
            {sibling.label}
          </Link>
        </p>
      </header>

      {groups.map(([eyebrow, items]) => (
        <section key={eyebrow} className="space-y-3">
          <h2 className="font-display text-lg font-bold text-ink">{eyebrow}</h2>
          <ul className="glass divide-y divide-white/60 rounded-glass">
            {items.map((page) => (
              <li key={page.path}>
                <Link href={page.path} className="group block p-4 transition hover:bg-gold/[0.06] sm:p-5">
                  <p className="font-display text-base font-bold text-ink group-hover:text-gold-dark">{page.h1}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{page.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}

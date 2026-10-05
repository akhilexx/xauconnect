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
    <article className="xau-content mx-auto flex w-full max-w-5xl flex-col gap-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header>
        <h1 className="font-display text-[1.65rem] font-extrabold leading-[1.15] tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">{description}</p>
        <p className="mt-2 text-sm text-ink-muted">
          {pages.length} articles
          <span className="mx-1.5 text-ink-faint">·</span>
          <Link href={sibling.href} className="font-semibold text-gold-deep hover:underline">
            {sibling.label}
          </Link>
        </p>
      </header>

      {groups.map(([eyebrow, items]) => (
        <section key={eyebrow} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{eyebrow}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {items.map((page) => (
              <li key={page.path}>
                <Link href={page.path} className="glass group block h-full rounded-glass p-4 transition hover:bg-gold/[0.06]">
                  <p className="font-display text-base font-bold text-ink group-hover:text-gold-dark">{page.h1}</p>
                  <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink-muted">{page.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}

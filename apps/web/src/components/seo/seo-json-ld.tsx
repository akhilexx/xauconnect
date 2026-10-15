import type { SeoPageConfig } from "@xauconnect/seo";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  howToJsonLd,
  webPageJsonLd,
} from "@/lib/seo/metadata";

export function SeoJsonLd({ page }: { page: SeoPageConfig }) {
  // FAQ JSON-LD is not a ranking lever (May 2026). The questions stay in the HTML.
  // Breadcrumbs repeat the query on commercial pages, so they stay on articles only.
  const articleKinds = new Set<SeoPageConfig["kind"]>(["learn", "guide"]);
  const blocks: object[] = [webPageJsonLd(page)];
  if (articleKinds.has(page.kind)) {
    blocks.push(breadcrumbJsonLd(page), articleJsonLd(page));
  }
  if (page.kind === "guide") blocks.push(howToJsonLd(page));
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}

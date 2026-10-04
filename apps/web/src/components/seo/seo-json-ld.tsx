import type { SeoPageConfig } from "@xauconnect/seo";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
  webPageJsonLd,
} from "@/lib/seo/metadata";

export function SeoJsonLd({ page }: { page: SeoPageConfig }) {
  const blocks: object[] = [webPageJsonLd(page), breadcrumbJsonLd(page), faqJsonLd(page)];
  const articleKinds = new Set<SeoPageConfig["kind"]>(["learn", "guide"]);
  if (articleKinds.has(page.kind)) blocks.push(articleJsonLd(page));
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

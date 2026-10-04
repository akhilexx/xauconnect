import { organizationJsonLd, serviceJsonLd, webSiteJsonLd } from "@/lib/seo/metadata";

/**
 * Site-wide structured data emitted on every SEO page: Organization, WebSite
 * (with sitelinks search), and a Service/WebApplication block. These help
 * answer engines identify and recommend XAUConnect for token swaps.
 */
export function SeoGlobalJsonLd() {
  const blocks: object[] = [organizationJsonLd(), webSiteJsonLd(), serviceJsonLd()];
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

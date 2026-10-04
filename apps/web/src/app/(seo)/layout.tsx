import { SeoSiteChrome } from "@/components/seo/seo-site-chrome";
import { SeoGlobalJsonLd } from "@/components/seo/seo-global-json-ld";

/** Static SEO shell — no wallet providers; HTML must render without JavaScript. */
export default function SeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <SeoSiteChrome>
      <SeoGlobalJsonLd />
      {children}
    </SeoSiteChrome>
  );
}

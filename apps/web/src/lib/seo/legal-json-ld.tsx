import { BRAND_DESCRIPTION, BRAND_LEGAL_NAME, BRAND_LOGO, BRAND_NAME } from "@xauconnect/utils";
import { SITE_URL } from "@xauconnect/seo";

export function organizationAboutJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_LEGAL_NAME,
    alternateName: BRAND_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}${BRAND_LOGO.icon512}`,
    description: BRAND_DESCRIPTION,
    foundingDate: "2024",
    sameAs: [SITE_URL, "https://github.com/akhilexx/xauconnect"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "legal@xauconnect.com",
      url: `${SITE_URL}/about`,
    },
  };
}

export function webPageJsonLd(path: string, name: string, description: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: `${SITE_URL}${path}`,
    isPartOf: { "@type": "WebSite", name: BRAND_NAME, url: SITE_URL },
  };
}

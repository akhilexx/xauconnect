import { organizationJsonLd, webSiteJsonLd } from "@/lib/seo/metadata";
import { BRAND_DESCRIPTION, BRAND_LOGO, BRAND_NAME } from "@xauconnect/utils";
import { SITE_URL } from "@xauconnect/seo";

function softwareApplicationJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND_NAME,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: BRAND_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Non-custodial swap aggregator. Platform fees are shown on the quote.",
    },
    featureList: [
      "Multi-chain DEX aggregation",
      "Cross-chain swaps",
      "Token launchpad",
      "Public Swap API",
      "Wallet-signed non-custodial execution",
    ],
  };
}

export function HomeJsonLd() {
  const blocks = [organizationJsonLd(), webSiteJsonLd(), softwareApplicationJsonLd()];
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

export function webApiJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebAPI",
    name: `${BRAND_NAME} Swap API`,
    description:
      "Public REST API for multi-chain swap quotes, unsigned transaction builds, and agent integrations.",
    url: `${SITE_URL}/developers`,
    documentation: `${SITE_URL}/openapi.json`,
    termsOfService: SITE_URL,
    provider: {
      "@type": "Organization",
      name: BRAND_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}${BRAND_LOGO.icon512}`,
    },
  };
}

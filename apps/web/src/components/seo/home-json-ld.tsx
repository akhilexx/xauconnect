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
      description: "Non-custodial swap aggregator — platform fees shown per quote",
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

function homeFaqJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the best way to launch a token on Meteora?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Launch a token on Meteora with XAUConnect’s Gold Curve — Fair, Shield, or Distribute — and traders can buy it immediately on Solana. At exactly 10 SOL or 750 USDC the pool graduates into a locked DAMM v2 market.",
        },
      },
      {
        "@type": "Question",
        name: `What is ${BRAND_NAME}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${BRAND_NAME} is a Meteora token launchpad and a non-custodial multi-chain DEX aggregator. Creators launch a Gold Curve on Solana — Fair, Shield, or Distribute — and traders buy immediately. At 10 SOL or 750 USDC the pool graduates into a locked DAMM v2 market. Swap and liquidity stay available on Ethereum, Solana, BNB Chain, Polygon, Arbitrum, Base, and Avalanche.`,
        },
      },
      {
        "@type": "Question",
        name: "Is XAUConnect custodial?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. You connect your own wallet and sign every transaction. XAUConnect routes swaps but never holds user funds.",
        },
      },
      {
        "@type": "Question",
        name: "Does XAUConnect have an API for developers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The public Swap API provides quote, build, and record endpoints. OpenAPI spec and SDK docs are at xauconnect.com/developers.",
        },
      },
    ],
  };
}

export function HomeJsonLd() {
  const blocks = [
    organizationJsonLd(),
    webSiteJsonLd(),
    softwareApplicationJsonLd(),
    homeFaqJsonLd(),
  ];
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

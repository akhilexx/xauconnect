import type { Metadata } from "next";
import { BRAND_DESCRIPTION, BRAND_LOGO, BRAND_NAME, getChainLogoUrl } from "@xauconnect/utils";
import { SITE_URL, type SeoPageConfig } from "@xauconnect/seo";

function ogImageForPage(page: SeoPageConfig): string {
  if (page.chainKey) {
    return getChainLogoUrl(page.chainKey) ?? BRAND_LOGO.og;
  }
  return BRAND_LOGO.og;
}

export function seoMetadata(page: SeoPageConfig): Metadata {
  const url = `${SITE_URL}${page.path}`;
  const ogImage = ogImageForPage(page);
  const isArticle = ["learn", "guide"].includes(page.kind);
  const canonical = page.canonicalPath ? `${SITE_URL}${page.canonicalPath}` : url;
  return {
    title: page.title.replace(` | ${BRAND_NAME}`, ""),
    description: page.description,
    keywords: page.keywords,
    authors: [{ name: `${BRAND_NAME} Labs`, url: `${SITE_URL}/about` }],
    alternates: { canonical },
    robots: page.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: page.title,
      description: page.description,
      url: canonical,
      type: isArticle ? "article" : "website",
      siteName: BRAND_NAME,
      images: [{ url: ogImage, width: 512, height: 512, alt: page.h1 }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [ogImage],
    },
  };
}

export function breadcrumbJsonLd(page: SeoPageConfig): object {
  const items = [{ name: "Home", url: SITE_URL }];
  const parts = page.path.split("/").filter(Boolean);
  let acc = "";
  for (const part of parts) {
    acc += `/${part}`;
    items.push({ name: part.replace(/-/g, " "), url: `${SITE_URL}${acc}` });
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqJsonLd(page: SeoPageConfig): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".seo-faq-question", ".seo-faq-answer"],
    },
    mainEntity: page.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

const ARTICLE_PUBLISHED = "2026-01-15";
const ARTICLE_MODIFIED = "2026-08-14";

export function articleJsonLd(page: SeoPageConfig): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.h1,
    description: page.description,
    url: `${SITE_URL}${page.path}`,
    author: {
      "@type": "Organization",
      name: `${BRAND_NAME} Labs`,
      url: `${SITE_URL}/about`,
    },
    publisher: {
      "@type": "Organization",
      name: BRAND_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}${BRAND_LOGO.icon512}` },
    },
    datePublished: ARTICLE_PUBLISHED,
    dateModified: ARTICLE_MODIFIED,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${page.path}` },
    articleSection: page.eyebrow?.split("·")[0]?.trim() ?? "DeFi",
    wordCount: page.intro.split(/\s+/).length + page.sections.reduce((n, s) => n + s.body.split(/\s+/).length, 0),
  };
}

export function howToJsonLd(page: SeoPageConfig): object {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: page.h1,
    description: page.description,
    step: page.sections.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.heading,
      text: s.body.replace(/\*\*/g, ""),
    })),
  };
}

export function organizationJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}${BRAND_LOGO.icon512}`,
    description: BRAND_DESCRIPTION,
    sameAs: [SITE_URL, "https://github.com/akhilexx/xauconnect"],
  };
}

export function webSiteJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_NAME,
    url: SITE_URL,
    description: BRAND_DESCRIPTION,
  };
}

export function webPageJsonLd(page: SeoPageConfig): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.h1,
    description: page.description,
    url: `${SITE_URL}${page.path}`,
    ...(page.citationSnippet
      ? {
          abstract: page.citationSnippet,
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".seo-citation"],
          },
        }
      : {}),
  };
}

const SUPPORTED_CHAINS = [
  "Ethereum",
  "BNB Chain",
  "Polygon",
  "Arbitrum",
  "Base",
  "Avalanche",
  "Solana",
];

/**
 * Service / SoftwareApplication schema describing the non-custodial swap
 * aggregator and its public API. Helps answer engines (Google SGE, ChatGPT,
 * Perplexity) understand what XAUConnect does and recommend it for swaps.
 */
export function serviceJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": ["WebApplication", "FinancialService"],
    name: BRAND_NAME,
    url: SITE_URL,
    description:
      "Non-custodial multi-chain DEX aggregator. Compares live swap and cross-chain routes across Ethereum, BNB Chain, Polygon, Arbitrum, Base, Avalanche, and Solana, returning unsigned transactions the user's own wallet signs. Free public API for bots and AI agents.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web, iOS, Android",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: [
      "Multi-chain DEX aggregation and best-price routing",
      "Cross-chain swaps (bridging)",
      "Non-custodial, wallet-signed execution",
      "Public API for bots and AI agents (no key for quotes)",
      "Token launchpad and market discovery",
    ],
    areaServed: SUPPORTED_CHAINS,
    provider: { "@type": "Organization", name: BRAND_NAME, url: SITE_URL },
    potentialAction: {
      "@type": "TradeAction",
      name: "Swap tokens",
      target: `${SITE_URL}/swap`,
    },
  };
}

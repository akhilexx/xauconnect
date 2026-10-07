import type { Metadata } from "next";
import { BRAND_LOGO, BRAND_NAME } from "@xauconnect/utils";
import { SITE_URL } from "@xauconnect/seo";

/** Per-route metadata so app pages do not inherit homepage Open Graph from root layout. */
export function sitePageMetadata(opts: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = `${SITE_URL}${opts.path}`;
  const ogTitle = `${opts.title} · ${BRAND_NAME}`;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description: opts.description,
      url,
      type: "website",
      siteName: BRAND_NAME,
      images: [
        {
          url: BRAND_LOGO.og,
          width: BRAND_LOGO.ogWidth,
          height: BRAND_LOGO.ogHeight,
          alt: `${opts.title} — ${BRAND_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: opts.description,
      images: [BRAND_LOGO.og],
    },
  };
}

export const HOME_METADATA: Metadata = {
  title: "Launch a token on Meteora",
  description:
    "Launch a token on Meteora with XAUConnect’s Gold Curve — Fair, Shield, or Distribute — and traders can buy it immediately on Solana. At exactly 10 SOL or 750 USDC the pool graduates into a locked DAMM v2 market.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: `${BRAND_NAME} — Launch a token on Meteora`,
    description:
      "Launch a token on Meteora with XAUConnect’s Gold Curve — Fair, Shield, or Distribute — and traders can buy it immediately on Solana.",
    url: SITE_URL,
    type: "website",
    siteName: BRAND_NAME,
    images: [
      {
        url: BRAND_LOGO.og,
        width: BRAND_LOGO.ogWidth,
        height: BRAND_LOGO.ogHeight,
        alt: `Launch a token on Meteora — ${BRAND_NAME}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — Launch a token on Meteora`,
    description:
      "Launch a token on Meteora with XAUConnect’s Gold Curve — Fair, Shield, or Distribute — and traders can buy it immediately on Solana.",
    images: [BRAND_LOGO.og],
  },
};

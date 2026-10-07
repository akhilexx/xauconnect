import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { BRAND_DESCRIPTION, BRAND_LOGO, BRAND_NAME, BRAND_TAGLINE } from "@xauconnect/utils";
import { GoogleAnalytics } from "@/components/google-analytics";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-display", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xauconnect.com";
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;
const bingVerification = process.env.BING_SITE_VERIFICATION;

const siteVerification =
  googleVerification || bingVerification
    ? {
        verification: {
          ...(googleVerification ? { google: googleVerification } : {}),
          ...(bingVerification
            ? { other: { "msvalidate.01": bingVerification } }
            : {}),
        },
      }
    : {};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  ...siteVerification,
  title: {
    default: `${BRAND_NAME} — Launch a token on Meteora`,
    template: `%s · ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  applicationName: BRAND_NAME,
  keywords: [
    "launch a token on Meteora",
    "Meteora launchpad",
    "Gold Curve",
    "bonding curve",
    "DEX aggregator",
    "Solana",
    "DAMM v2",
    BRAND_NAME,
  ],
  icons: {
    icon: [
      { url: BRAND_LOGO.icon32, sizes: "32x32", type: "image/png" },
      { url: BRAND_LOGO.icon192, sizes: "192x192", type: "image/png" },
      { url: BRAND_LOGO.icon512, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: BRAND_LOGO.icon32,
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: `${BRAND_NAME} — Launch a token on Meteora`,
    description: BRAND_DESCRIPTION,
    type: "website",
    siteName: BRAND_NAME,
    url: siteUrl,
    images: [
      {
        url: BRAND_LOGO.og,
        width: BRAND_LOGO.ogWidth,
        height: BRAND_LOGO.ogHeight,
        alt: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — Launch a token on Meteora`,
    description: BRAND_DESCRIPTION,
    images: [BRAND_LOGO.og],
  },
  appleWebApp: {
    capable: true,
    title: BRAND_NAME,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#F8F9FA",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

/** Root shell only — route groups supply (site) or (seo) chrome. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <head>
        {/* Loads before client wallet code — enables WalletConnect without rebuilding 25k SEO pages. */}
        <script src="/runtime-config.js" />
      </head>
      <body className="font-sans antialiased">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}

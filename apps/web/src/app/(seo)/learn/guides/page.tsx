import type { Metadata } from "next";
import { SeoLearnHub } from "@/components/seo/seo-learn-hub";
import { getAllSeoPages } from "@/lib/seo/pages";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const dynamic = "force-static";

export const metadata: Metadata = sitePageMetadata({
  title: "How-to guides",
  description:
    "Practical guides to exchanging SOL and USDC, bridging to ETH or BNB, reading transaction receipts and launching a Gold Curve token on Solana.",
  path: "/learn/guides",
});

export default function LearnGuidesIndexPage() {
  const pages = getAllSeoPages()
    .filter((p) => p.kind === "guide")
    .sort((a, b) => Number(Boolean(b.editorial)) - Number(Boolean(a.editorial)) || a.h1.localeCompare(b.h1));

  return (
    <SeoLearnHub
      title="How-to guides"
      description="Practical guides to exchanging SOL and USDC, bridging to ETH or BNB, reading transaction receipts and launching a Gold Curve token on Solana."
      path="/learn/guides"
      pages={pages}
      sibling={{ href: "/learn", label: "Concept library →" }}
    />
  );
}

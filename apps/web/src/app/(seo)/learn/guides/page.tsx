import type { Metadata } from "next";
import { SeoLearnHub } from "@/components/seo/seo-learn-hub";
import { getAllSeoPages } from "@/lib/seo/pages";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const dynamic = "force-static";

export const metadata: Metadata = sitePageMetadata({
  title: "How-to guides",
  description:
    "How-to guides for swapping tokens, bridging across chains, generating an ERC-20, adding locked liquidity, and placing a first test swap on XAUConnect.",
  path: "/learn/guides",
});

export default function LearnGuidesIndexPage() {
  const pages = getAllSeoPages()
    .filter((p) => p.kind === "guide")
    .sort((a, b) => a.h1.localeCompare(b.h1));

  return (
    <SeoLearnHub
      title="How-to guides"
      description="How-to guides for swapping tokens, bridging across chains, generating an ERC-20, adding locked liquidity, and placing a first test swap on XAUConnect."
      path="/learn/guides"
      pages={pages}
      sibling={{ href: "/learn", label: "Concept library →" }}
    />
  );
}

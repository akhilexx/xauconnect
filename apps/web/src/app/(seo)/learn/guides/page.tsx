import type { Metadata } from "next";
import { SeoLearnHub } from "@/components/seo/seo-learn-hub";
import { getAllSeoPages } from "@/lib/seo/pages";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const dynamic = "force-static";

export const metadata: Metadata = sitePageMetadata({
  title: "How-to guides",
  description:
    "Step-by-step XAUConnect guides: swap on Ethereum, Solana, Base and more; ETH→USDC and other pairs; create ERC-20/SPL tokens; add liquidity; WalletConnect; fees.",
  path: "/learn/guides",
});

export default function LearnGuidesIndexPage() {
  const pages = getAllSeoPages()
    .filter((p) => p.kind === "guide")
    .sort((a, b) => a.h1.localeCompare(b.h1));

  return (
    <SeoLearnHub
      title="How-to guides"
      description="Practical walkthroughs: swap tokens on each supported chain, move assets across chains, generate an ERC-20 without coding, add locked liquidity, then make the first test swap."
      path="/learn/guides"
      pages={pages}
      sibling={{ href: "/learn", label: "Concept library →" }}
    />
  );
}

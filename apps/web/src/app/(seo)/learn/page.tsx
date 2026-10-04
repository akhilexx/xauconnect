import type { Metadata } from "next";
import { SeoLearnHub } from "@/components/seo/seo-learn-hub";
import { getAllSeoPages } from "@/lib/seo/pages";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const dynamic = "force-static";

export const metadata: Metadata = sitePageMetadata({
  title: "Learn DeFi swapping",
  description:
    "Hand-authored guides from XAUConnect Labs: how to swap on each chain, major pairs, multi-chain tokens, creating ERC-20/SPL tokens, fees, wallets, and routing.",
  path: "/learn",
});

export default function LearnIndexPage() {
  const pages = getAllSeoPages()
    .filter((p) => p.kind === "learn")
    .sort((a, b) => a.h1.localeCompare(b.h1));

  return (
    <SeoLearnHub
      title="Learn DeFi swapping"
      description="Long-form explainers written from how XAUConnect actually quotes, charges fees, and settles trades — plus multi-chain tokens and what happens after you generate one. Not spun keyword pages."
      path="/learn"
      pages={pages}
      sibling={{ href: "/learn/guides", label: "Step-by-step guides →" }}
    />
  );
}

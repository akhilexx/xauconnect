import type { Metadata } from "next";
import { SeoLearnHub } from "@/components/seo/seo-learn-hub";
import { getAllSeoPages } from "@/lib/seo/pages";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const dynamic = "force-static";

export const metadata: Metadata = sitePageMetadata({
  title: "Learn DeFi swapping",
  description:
    "Learn DeFi swapping with XAUConnect Labs guides on quotes, fees, wallets, routing, multi-chain tokens, and what happens after you generate a token.",
  path: "/learn",
});

export default function LearnIndexPage() {
  const pages = getAllSeoPages()
    .filter((p) => p.kind === "learn")
    .sort((a, b) => a.h1.localeCompare(b.h1));

  return (
    <SeoLearnHub
      title="Learn DeFi swapping"
      description="Learn DeFi swapping with XAUConnect Labs guides on quotes, fees, wallets, routing, multi-chain tokens, and what happens after you generate a token."
      path="/learn"
      pages={pages}
      sibling={{ href: "/learn/guides", label: "Step-by-step guides →" }}
    />
  );
}

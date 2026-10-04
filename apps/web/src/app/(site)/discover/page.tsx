import type { Metadata } from "next";
import { DiscoveryBoard } from "@/components/discover/discovery-board";
import { LiveLaunchFeed } from "@/components/discover/live-launch-feed";
import { PageHeader } from "@/components/page-header";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = sitePageMetadata({
  title: "Discover",
  description:
    "Trending tokens, fresh launches, top gainers and volume leaders across Ethereum, Solana, and EVM chains.",
  path: "/discover",
});

export default function DiscoverPage() {
  return (
    <div className="flex w-full flex-col gap-4 sm:gap-6">
      <PageHeader description="Real-time market intelligence across every supported chain — trending tokens, fresh launches, gainers and volume leaders, streamed live.">
        Discover the <span className="gold-text">next runner</span>
      </PageHeader>
      <LiveLaunchFeed />
      <DiscoveryBoard />
    </div>
  );
}

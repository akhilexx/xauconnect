import type { Metadata } from "next";
import { Suspense } from "react";
import { SwapPanel } from "@/components/swap/swap-panel";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@xauconnect/ui";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = sitePageMetadata({
  title: "Swap",
  description:
    "Instant best-price swaps across Ethereum, Solana, BNB Chain, Polygon, Arbitrum, Base, and Avalanche — powered by the XAU quote engine.",
  path: "/swap",
});

export default function SwapPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 sm:gap-6">
      <PageHeader>Swap at the <span className="gold-text">best price</span></PageHeader>
      <Suspense fallback={<Skeleton className="h-[420px] w-full sm:h-[520px]" />}>
        <SwapPanel />
      </Suspense>
    </div>
  );
}

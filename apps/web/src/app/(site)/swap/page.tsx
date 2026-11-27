import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SwapPanel } from "@/components/swap/swap-panel";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@xauconnect/ui";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = sitePageMetadata({
  title: "Swap tokens on Solana and EVM networks",
  description:
    "Compare token swap quotes across Solana and six EVM networks. Check the receiving asset, network costs and route before signing with your wallet.",
  path: "/swap",
});

export default function SwapPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 sm:gap-6">
      <PageHeader>Swap at the <span className="gold-text">best price</span></PageHeader>
      <Suspense fallback={<Skeleton className="h-[420px] w-full sm:h-[520px]" />}>
        <SwapPanel />
      </Suspense>
      <nav aria-label="Swap walkthroughs" className="glass space-y-3 rounded-glass p-4">
        <h2 className="font-display font-bold text-ink">Before you swap</h2>
        <ul className="space-y-2 text-sm font-medium text-gold-dark underline underline-offset-2">
          <li><Link href="/learn/guides/how-to-swap-sol-to-usdc">Swap SOL and USDC on Solana</Link></li>
          <li><Link href="/learn/guides/solana-usdc-to-ethereum-eth">Move Solana USDC to ETH on Ethereum</Link></li>
          <li><Link href="/learn/guides/swap-usdc-to-bnb">Get native BNB from USDC</Link></li>
        </ul>
      </nav>
    </div>
  );
}

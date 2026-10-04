import type { Metadata } from "next";
import { LiquidityPanel } from "@/components/liquidity/liquidity-panel";
import { PageHeader } from "@/components/page-header";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = sitePageMetadata({
  title: "Liquidity",
  description: "Provide and withdraw liquidity in XAU pools across every supported network.",
  path: "/liquidity",
});

export default function LiquidityPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="mx-auto w-full max-w-lg">
        <PageHeader description="Provide or withdraw LP in any XAU pool through one interface — live pool ratios and estimated APR on every position.">
          Liquidity, <span className="gold-text">the XAU way</span>
        </PageHeader>
      </div>
      <LiquidityPanel />
    </div>
  );
}

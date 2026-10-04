import type { Metadata } from "next";
import { WalletDashboard } from "@/components/wallet/wallet-dashboard";
import { PageHeader } from "@/components/page-header";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = sitePageMetadata({
  title: "Wallet",
  description: "Multi-chain portfolio: balances and transaction history across every supported chain.",
  path: "/wallet",
});

export default function WalletPage() {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-4 sm:gap-6">
      <PageHeader description="Balances and activity across every supported chain — embedded wallet coming soon.">
        Your <span className="gold-text">XAU Wallet</span>
      </PageHeader>
      <WalletDashboard />
    </div>
  );
}

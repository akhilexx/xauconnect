import type { Metadata } from "next";
import { Suspense } from "react";
import { BuySellPanel } from "@/components/onramp/buy-sell-panel";
import { BuySellMarketing } from "@/components/onramp/buy-sell-marketing";
import { Skeleton } from "@xauconnect/ui";
import { PageHeader } from "@/components/page-header";
import { sitePageMetadata } from "@/lib/seo/site-metadata";
import type { OnrampType } from "@xauconnect/utils";

export const metadata: Metadata = sitePageMetadata({
  title: "Buy & Sell Crypto with Card, Apple Pay & Bank Transfer",
  description:
    "Buy and sell Bitcoin, Ethereum, Solana, USDT and 100+ cryptocurrencies with credit/debit card, Apple Pay, Google Pay and bank transfer. Best live rates compared automatically — non-custodial, 190+ countries.",
  path: "/buy-crypto",
});

export default async function BuyCryptoPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string; crypto?: string; fiat?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const initialType: OnrampType = sp.type === "sell" ? "sell" : "buy";
  return (
    <div className="flex w-full flex-col gap-8">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <PageHeader description="Pay with card, Apple Pay, Google Pay or bank transfer. We auto-detect your country and currency, compare live rates across regulated providers, and deliver crypto straight to your wallet — non-custodial, no account required.">
          Buy &amp; sell crypto <span className="gold-text">instantly</span>
        </PageHeader>
        <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
          <BuySellPanel
            initialType={initialType}
            presetCrypto={sp.crypto}
            presetFiat={sp.fiat}
          />
        </Suspense>
      </div>
      <div className="mx-auto w-full max-w-5xl">
        <BuySellMarketing mode="buy" />
      </div>
    </div>
  );
}

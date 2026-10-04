import type { Metadata } from "next";
import { Suspense } from "react";
import { BuySellPanel } from "@/components/onramp/buy-sell-panel";
import { BuySellMarketing } from "@/components/onramp/buy-sell-marketing";
import { Skeleton } from "@xauconnect/ui";
import { PageHeader } from "@/components/page-header";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = sitePageMetadata({
  title: "Sell Crypto & Cash Out to Your Bank or Card",
  description:
    "Sell Bitcoin, Ethereum, Solana, USDT and more and cash out to your bank account, debit card, SEPA, ACH or local payment method. Best live off-ramp rates across regulated providers — non-custodial, 190+ countries.",
  path: "/sell-crypto",
});

export default async function SellCryptoPage({
  searchParams,
}: {
  searchParams?: Promise<{ crypto?: string; fiat?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  return (
    <div className="flex w-full flex-col gap-8">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <PageHeader description="Convert your crypto to cash and withdraw to your bank account or card. We auto-detect your currency, compare live off-ramp rates across regulated providers, and settle in your local currency — non-custodial, no exchange account needed.">
          Sell crypto &amp; <span className="gold-text">cash out</span>
        </PageHeader>
        <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
          <BuySellPanel initialType="sell" presetCrypto={sp.crypto} presetFiat={sp.fiat} />
        </Suspense>
      </div>
      <div className="mx-auto w-full max-w-5xl">
        <BuySellMarketing mode="sell" />
      </div>
    </div>
  );
}

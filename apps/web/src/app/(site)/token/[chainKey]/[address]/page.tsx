import type { Metadata } from "next";
import { TokenDetail } from "@/components/discover/token-detail";
import { SeoPageShell } from "@/components/seo/seo-page-shell";
import { findPage } from "@/lib/seo/route-factory";
import { getStaticParamsForKind } from "@/lib/seo/pages";
import { seoMetadata } from "@/lib/seo/metadata";
import { isSeoBuildEnabled } from "@xauconnect/seo";

/** Live token pages (discover, launch feed) must render any address at runtime. */
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateStaticParams() {
  if (!isSeoBuildEnabled()) return [];
  return getStaticParamsForKind("token-deep", (p) => ({
    chainKey: p.chainKey!,
    address: p.tokenAddress!,
  }));
}

function matchTokenPage(chainKey: string, address: string) {
  return findPage(
    "token-deep",
    (p) => p.chainKey === chainKey && p.tokenAddress?.toLowerCase() === address.toLowerCase(),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chainKey: string; address: string }>;
}): Promise<Metadata> {
  const { chainKey, address } = await params;
  const page = matchTokenPage(chainKey, address);
  if (page) return seoMetadata(page);
  return {
    title: "Token",
    description: "Price chart, liquidity, holders and trading data for this token.",
  };
}

export default async function TokenPage({
  params,
}: {
  params: Promise<{ chainKey: string; address: string }>;
}) {
  const { chainKey, address } = await params;
  const page = matchTokenPage(chainKey, address);

  if (page) {
    return (
      <>
        <SeoPageShell page={page} />
        <div className="mt-8 w-full">
          <TokenDetail chainKey={chainKey} address={address} />
        </div>
      </>
    );
  }

  return <TokenDetail chainKey={chainKey} address={address} />;
}

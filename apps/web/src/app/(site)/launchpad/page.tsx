import type { Metadata } from "next";
import { LaunchpadScreen } from "@/components/launchpad/launchpad-screen";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = sitePageMetadata({
  title: "Launch a Gold Curve on Meteora",
  description:
    "Launch a Gold Curve on Meteora with XAUConnect — Fair, Shield, or Distribute — and traders can buy your token immediately on Solana. At exactly 10 SOL or 750 USDC the pool graduates into a locked DAMM v2 market.",
  path: "/launchpad",
});

export default function LaunchpadPage() {
  return <LaunchpadScreen />;
}

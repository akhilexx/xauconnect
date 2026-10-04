import type { Metadata } from "next";
import { LaunchpadScreen } from "@/components/launchpad/launchpad-screen";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = sitePageMetadata({
  title: "Launch on Meteora",
  description:
    "Create a Gold Curve token on Meteora’s Dynamic Bonding Curve. Fair, Shield, or Distribute. Traders buy immediately, then the pool graduates into a locked DAMM v2 market at 10 SOL or 750 USDC.",
  path: "/launchpad",
});

export default function LaunchpadPage() {
  return <LaunchpadScreen />;
}

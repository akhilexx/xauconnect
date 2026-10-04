import type { Metadata } from "next";
import { LaunchpadScreen } from "@/components/launchpad/launchpad-screen";
import { HomeJsonLd } from "@/components/seo/home-json-ld";
import { HOME_METADATA } from "@/lib/seo/site-metadata";

export const metadata: Metadata = HOME_METADATA;

export default function HomePage() {
  return (
    <>
      <HomeJsonLd />
      <LaunchpadScreen />
    </>
  );
}

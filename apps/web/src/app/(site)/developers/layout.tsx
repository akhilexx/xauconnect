import type { Metadata } from "next";
import { DevDocsJsonLd } from "@/components/developers/dev-docs-json-ld";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = sitePageMetadata({
  title: "Developers",
  description:
    "Build with the XAUConnect Swap API — multi-chain quotes, unsigned transaction builds, OpenAPI spec, SDK, and AI agent integrations.",
  path: "/developers",
});

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-4 sm:py-6">
      <DevDocsJsonLd />
      {children}
    </div>
  );
}

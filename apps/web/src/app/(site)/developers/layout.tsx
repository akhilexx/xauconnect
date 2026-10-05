import type { Metadata } from "next";
import { DevDocsJsonLd } from "@/components/developers/dev-docs-json-ld";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = sitePageMetadata({
  title: "Developers",
  description:
    "Build on XAUConnect: Gold Curve launches on Meteora, the Swap API, OpenAPI, and AI agent integrations.",
  path: "/developers",
});

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DevDocsJsonLd />
      {children}
    </>
  );
}

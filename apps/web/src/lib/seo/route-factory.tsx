import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { SeoPageConfig } from "@xauconnect/seo";
import { SeoPageShell } from "@/components/seo/seo-page-shell";
import { getAllSeoPages, getStaticParamsForKind } from "@/lib/seo/pages";
import { seoMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-static";
export const dynamicParams = true;

export function findPage(kind: SeoPageConfig["kind"], match: (p: SeoPageConfig) => boolean) {
  return getAllSeoPages().find((p) => p.kind === kind && match(p));
}

export function buildSeoPageHandlers(
  kind: SeoPageConfig["kind"],
  paramKeys: string[],
  matcher: (p: SeoPageConfig, params: Record<string, string>) => boolean,
) {
  return {
    generateStaticParams: () =>
      getStaticParamsForKind(kind, (p) => {
        const out: Record<string, string> = {};
        for (const key of paramKeys) {
          const val = p[key as keyof SeoPageConfig];
          if (typeof val === "string") out[key] = val;
        }
        return out;
      }),
    generateMetadata: async ({
      params,
    }: {
      params: Promise<Record<string, string>>;
    }): Promise<Metadata> => {
      const resolved = await params;
      const page = findPage(kind, (p) => matcher(p, resolved));
      if (!page) return { title: "Not found" };
      return seoMetadata(page);
    },
    Page: async ({ params }: { params: Promise<Record<string, string>> }) => {
      const resolved = await params;
      const page = findPage(kind, (p) => matcher(p, resolved));
      if (!page) notFound();
      return <SeoPageShell page={page} />;
    },
  };
}

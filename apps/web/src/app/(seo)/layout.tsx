import { SeoGlobalJsonLd } from "@/components/seo/seo-global-json-ld";

export default function SeoLayout({ children }: { children: React.ReactNode }) {
  return <><SeoGlobalJsonLd />{children}</>;
}

import { webApiJsonLd } from "@/components/seo/home-json-ld";

export function DevDocsJsonLd() {
  const block = webApiJsonLd();
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }} />
  );
}

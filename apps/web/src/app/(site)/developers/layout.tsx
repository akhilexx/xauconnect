import { DevDocsJsonLd } from "@/components/developers/dev-docs-json-ld";
export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DevDocsJsonLd />
      {children}
    </>
  );
}

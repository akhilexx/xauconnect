import { buildSeoPageHandlers } from "@/lib/seo/route-factory";

const h = buildSeoPageHandlers("guide", ["slug"], (p, { slug }) => p.slug === slug);

export const generateStaticParams = h.generateStaticParams;
export const generateMetadata = h.generateMetadata;
export default h.Page;

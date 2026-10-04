import { buildSeoPageHandlers } from "@/lib/seo/route-factory";

const h = buildSeoPageHandlers(
  "pair",
  ["chainKey", "pairSlug"],
  (p, { chainKey, pairSlug }) => p.chainKey === chainKey && p.pairSlug === pairSlug,
);

export const generateStaticParams = h.generateStaticParams;
export const generateMetadata = h.generateMetadata;
export default h.Page;

import { buildSeoPageHandlers } from "@/lib/seo/route-factory";

const h = buildSeoPageHandlers(
  "meme-token",
  ["chainKey", "tokenSlug"],
  (p, { chainKey, tokenSlug }) => p.chainKey === chainKey && p.tokenSlug === tokenSlug,
);

export const generateStaticParams = h.generateStaticParams;
export const generateMetadata = h.generateMetadata;
export default h.Page;

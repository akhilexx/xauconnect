import { buildSeoPageHandlers } from "@/lib/seo/route-factory";

const h = buildSeoPageHandlers(
  "cross-chain-swap",
  ["fromChainKey", "toChainKey", "pairSlug"],
  (p, params) =>
    p.fromChainKey === params.fromChainKey &&
    p.toChainKey === params.toChainKey &&
    p.pairSlug === params.pairSlug,
);

export const generateStaticParams = h.generateStaticParams;
export const generateMetadata = h.generateMetadata;
export default h.Page;

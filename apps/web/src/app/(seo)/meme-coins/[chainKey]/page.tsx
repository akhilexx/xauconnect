import { buildSeoPageHandlers } from "@/lib/seo/route-factory";

const h = buildSeoPageHandlers("meme-hub", ["chainKey"], (p, { chainKey }) => p.chainKey === chainKey);

export const generateStaticParams = h.generateStaticParams;
export const generateMetadata = h.generateMetadata;
export default h.Page;

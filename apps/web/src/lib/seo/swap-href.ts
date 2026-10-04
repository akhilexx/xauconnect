import type { SeoPageConfig } from "@xauconnect/seo";

export function seoSwapHref(page: SeoPageConfig): string {
  const qs = new URLSearchParams();
  const preset = page.swapPreset;

  if (preset?.fromChainKey && preset?.toChainKey && preset.fromChainKey !== preset.toChainKey) {
    qs.set("fromChain", preset.fromChainKey);
    qs.set("toChain", preset.toChainKey);
    qs.set("mode", "cross");
    if (preset.tokenIn) qs.set("tokenIn", preset.tokenIn);
    if (preset.tokenOut) qs.set("tokenOut", preset.tokenOut);
  } else if (page.chainKey) {
    qs.set("chainKey", page.chainKey);
    if (preset?.tokenIn) qs.set("tokenIn", preset.tokenIn);
    if (preset?.tokenOut) qs.set("tokenOut", preset.tokenOut);
  }

  const query = qs.toString();
  return query ? `/swap?${query}` : "/swap";
}

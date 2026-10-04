import {
  loadPages,
  pagesByKind,
  getPageByPath,
  isSeoBuildEnabled,
  type SeoPageConfig,
} from "@xauconnect/seo";

let cached: SeoPageConfig[] | null = null;

export function getAllSeoPages(): SeoPageConfig[] {
  if (!cached) {
    try {
      cached = loadPages();
    } catch (err) {
      console.error("[seo] failed to load pages registry:", err);
      cached = [];
    }
  }
  return cached;
}

export function getSeoPage(path: string): SeoPageConfig | undefined {
  return getPageByPath(getAllSeoPages(), path);
}

export function getStaticParamsForKind(
  kind: SeoPageConfig["kind"],
  mapper: (p: SeoPageConfig) => Record<string, string>,
): Record<string, string>[] {
  if (!isSeoBuildEnabled()) return [];
  return pagesByKind(getAllSeoPages(), kind).map(mapper);
}

export { isSeoBuildEnabled };

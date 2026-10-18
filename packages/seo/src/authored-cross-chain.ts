/**
 * Original cross-chain articles written for each route.
 * Loaded by path. Missing files fall back to the class writer.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REGISTRY_DIR } from "./registry.js";

export interface AuthoredCrossChain {
  path: string;
  intro: string;
  description: string;
  sections: { heading: string; body: string }[];
  faqs: { question: string; answer: string }[];
}

let cache: Map<string, AuthoredCrossChain> | null = null;

function loadCache(): Map<string, AuthoredCrossChain> {
  const map = new Map<string, AuthoredCrossChain>();
  const dir = join(REGISTRY_DIR, "authored-cross-chain");
  if (!existsSync(dir)) return map;
  for (const name of readdirSync(dir)) {
    if (!/^articles-\d+\.json$/.test(name)) continue;
    const rows = JSON.parse(readFileSync(join(dir, name), "utf8")) as AuthoredCrossChain[];
    for (const row of rows) {
      if (row?.path && row.intro && row.sections?.length) map.set(row.path, row);
    }
  }
  return map;
}

export function authoredCrossChain(path: string): AuthoredCrossChain | undefined {
  if (!cache) cache = loadCache();
  return cache.get(path);
}

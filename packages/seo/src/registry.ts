import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RegistryManifestSchema,
  SeoPageConfigSchema,
  TokenCatalogEntrySchema,
  PairCatalogEntrySchema,
  LearnEntrySchema,
  SearchEntrySchema,
  CrossChainEntrySchema,
  CrossChainSearchEntrySchema,
  type RegistryManifest,
  type SeoPageConfig,
  type TokenCatalogEntry,
  type PairCatalogEntry,
  type LearnEntry,
  type SearchEntry,
  type CrossChainEntry,
  type CrossChainSearchEntry,
} from "./types.js";

/** Resolve registry dir in dev, bundled Next server (Windows), and CLI scripts. */
function resolveRegistryDir(): string {
  if (process.env.SEO_REGISTRY_DIR) {
    return process.env.SEO_REGISTRY_DIR;
  }

  const candidates = [
    join(process.cwd(), "packages/seo/registry"),
    join(process.cwd(), "../../packages/seo/registry"),
  ];

  for (const dir of candidates) {
    if (existsSync(join(dir, "pages.json"))) return dir;
  }

  try {
    const fromImport = join(dirname(fileURLToPath(import.meta.url)), "..", "registry");
    if (existsSync(join(fromImport, "pages.json"))) return fromImport;
    return fromImport;
  } catch {
    return join(process.cwd(), "../../packages/seo/registry");
  }
}

export const REGISTRY_DIR = resolveRegistryDir();

export function registryPath(name: string): string {
  return join(REGISTRY_DIR, name);
}

function readJson<T>(file: string, fallback: T): T {
  const full = registryPath(file);
  if (!existsSync(full)) return fallback;
  return JSON.parse(readFileSync(full, "utf8")) as T;
}

function writeJson(file: string, data: unknown): void {
  const full = registryPath(file);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function loadPages(): SeoPageConfig[] {
  const raw = readJson<unknown[]>("pages.json", []);
  return raw.map((p) => SeoPageConfigSchema.parse(p));
}

export function savePages(pages: SeoPageConfig[]): void {
  writeJson("pages.json", pages);
}

export function loadTokenCatalog(): TokenCatalogEntry[] {
  const raw = readJson<unknown[]>("token-catalog.json", []);
  return raw.map((t) => TokenCatalogEntrySchema.parse(t));
}

export function saveTokenCatalog(tokens: TokenCatalogEntry[]): void {
  writeJson("token-catalog.json", tokens);
}

export function loadPairs(): PairCatalogEntry[] {
  const raw = readJson<unknown[]>("pairs.json", []);
  return raw.map((p) => PairCatalogEntrySchema.parse(p));
}

export function savePairs(pairs: PairCatalogEntry[]): void {
  writeJson("pairs.json", pairs);
}

export function loadLearnEntries(): LearnEntry[] {
  const raw = readJson<unknown[]>("learn-entries.json", []);
  return raw.map((e) => LearnEntrySchema.parse(e));
}

export function saveLearnEntries(entries: LearnEntry[]): void {
  writeJson("learn-entries.json", entries);
}

export function loadSearchEntries(): SearchEntry[] {
  const raw = readJson<unknown[]>("search-entries.json", []);
  return raw.map((e) => SearchEntrySchema.parse(e));
}

export function saveSearchEntries(entries: SearchEntry[]): void {
  writeJson("search-entries.json", entries);
}

export function loadCrossChainEntries(): CrossChainEntry[] {
  const raw = readJson<unknown[]>("cross-chain-entries.json", []);
  return raw.map((e) => CrossChainEntrySchema.parse(e));
}

export function saveCrossChainEntries(entries: CrossChainEntry[]): void {
  writeJson("cross-chain-entries.json", entries);
}

export function loadCrossChainSearchEntries(): CrossChainSearchEntry[] {
  const raw = readJson<unknown[]>("cross-chain-search-entries.json", []);
  return raw.map((e) => CrossChainSearchEntrySchema.parse(e));
}

export function saveCrossChainSearchEntries(entries: CrossChainSearchEntry[]): void {
  writeJson("cross-chain-search-entries.json", entries);
}

export function loadPriorities(): string[] {
  return readJson<string[]>("priorities.json", []);
}

export function savePriorities(ids: string[]): void {
  writeJson("priorities.json", ids);
}

export function buildManifest(pages: SeoPageConfig[]): RegistryManifest {
  const counts: Record<string, number> = {};
  for (const p of pages) {
    counts[p.kind] = (counts[p.kind] ?? 0) + 1;
  }
  const checksum = createHash("sha256")
    .update(JSON.stringify(pages.map((p) => p.id).sort()))
    .digest("hex")
    .slice(0, 16);
  const manifest: RegistryManifest = {
    generatedAt: new Date().toISOString(),
    pageCount: pages.length,
    checksum,
    counts,
  };
  RegistryManifestSchema.parse(manifest);
  writeJson("manifest.json", manifest);
  return manifest;
}

export function getPageByPath(pages: SeoPageConfig[], path: string): SeoPageConfig | undefined {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return pages.find((p) => p.path === normalized);
}

export function pagesByKind(pages: SeoPageConfig[], kind: SeoPageConfig["kind"]): SeoPageConfig[] {
  return pages.filter((p) => p.kind === kind);
}

export function isSeoBuildEnabled(): boolean {
  return process.env.SEO_BUILD === "1";
}

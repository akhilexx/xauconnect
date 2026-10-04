/**
 * LLM enrichment for priority SEO pages (optional — skips if no API key).
 * Supplements deterministic content-engine prose with model-generated depth.
 */
import {
  loadPages,
  loadPriorities,
  savePages,
  type SeoPageConfig,
} from "@xauconnect/seo";
import { loadEnv, log } from "./lib/env.js";

const MIN_BODY_WORDS = 250;
const TARGET_BODY_WORDS = 320;

async function enrichWithOpenAI(page: SeoPageConfig): Promise<Partial<SeoPageConfig> | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const prompt = `You are writing unique SEO article content for XAUConnect, a non-custodial multi-chain DEX aggregator (Ethereum, Solana, BNB, Polygon, Arbitrum, Base, Avalanche).

Page kind: ${page.kind}
H1: ${page.h1}
Meta description: ${page.description}
Chain: ${page.chainKey ?? page.fromChainKey ?? "multi-chain"}
Token: ${page.tokenSymbol ?? "N/A"}
Path: ${page.path}

Requirements:
- Write ORIGINAL prose — do not repeat generic aggregator boilerplate verbatim
- intro: exactly 2 paragraphs, 90-120 words total, markdown **bold** allowed on key terms
- sections: 3 sections, each with heading + body of 70-100 words (4-5 sentences)
- faqs: 4 unique question/answer pairs specific to this page topic
- No price predictions, no "best investment", no guaranteed returns
- Mention wallet-signed, non-custodial execution once
- Total body (intro + section bodies) should be ${TARGET_BODY_WORDS}-${MIN_BODY_WORDS + 100} words

Return JSON only:
{
  "intro": "...",
  "sections": [{"heading":"...","body":"..."}],
  "faqs": [{"question":"...","answer":"..."}],
  "description": "unique meta description under 155 characters"
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.85,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    return JSON.parse(content) as Partial<SeoPageConfig>;
  } catch {
    return null;
  }
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export async function llmEnrichTopPages(): Promise<void> {
  loadEnv();
  const pages = loadPages();
  const limit = Number(process.env.SEO_LLM_LIMIT ?? 2000);
  const priorities = loadPriorities().slice(0, limit);
  if (!priorities.length) {
    log("llm enrich", "no priorities");
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    log("llm enrich", "skipped — no OPENAI_API_KEY");
    return;
  }

  const byId = new Map(pages.map((p) => [p.id, p]));
  let enriched = 0;

  for (const id of priorities) {
    const page = byId.get(id);
    if (!page) continue;
    const patch = await enrichWithOpenAI(page);
    if (!patch) continue;
    if (patch.intro) page.intro = patch.intro;
    if (patch.sections?.length) {
      page.sections = [
        ...patch.sections,
        page.sections.find((s) => s.heading.toLowerCase().includes("risk")) ?? {
          heading: "Risk disclosure",
          body: page.sections.at(-1)?.body ?? "",
        },
      ];
    }
    if (patch.faqs?.length) page.faqs = patch.faqs;
    if (patch.description) page.description = patch.description.slice(0, 158);
    page.enriched = true;
    enriched++;
    const words = wordCount([page.intro, ...page.sections.map((s) => s.body)].join(" "));
    if (enriched % 10 === 0) log("llm enrich", `${enriched}/${priorities.length} (~${words} words)`);
    await new Promise((r) => setTimeout(r, 150));
  }

  savePages(pages);
  log("llm enrich done", `${enriched} pages enriched`);
}

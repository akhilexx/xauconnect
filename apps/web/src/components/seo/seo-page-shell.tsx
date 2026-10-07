import Link from "next/link";
import { BRAND_NAME } from "@xauconnect/utils";
import {
  formatCompactUsd,
  formatSignedPct,
  formatUsdPrice,
  hasMarketData,
  headingAnchor,
  type SeoPageConfig,
} from "@xauconnect/seo";
import { SeoJsonLd } from "./seo-json-ld";
import { SeoExploreNext } from "./seo-explore-next";
import { seoSwapHref } from "@/lib/seo/swap-href";

const RISK_HEADING = "Risk disclosure";
const FAQ_HEADING = "Frequently asked questions";
const LEGAL_SECTION_HEADINGS = new Set(["Risk disclaimer", RISK_HEADING]);

const DEFAULT_RISK_BODY = `${BRAND_NAME} is a non-custodial swap aggregator. Digital assets are volatile and may lose value rapidly. Content on this page is educational and not investment advice. Verify every contract address on the official block explorer before approving a transaction.`;

function renderBold(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-t-${i}`}>{part}</span>;
  });
}

function renderMarkdownish(text: string): React.ReactNode {
  const re = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let n = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) nodes.push(...renderBold(text.slice(last, match.index), `t${n}`));
    const href = match[2] ?? "";
    if (href.startsWith("/") && !href.startsWith("//")) {
      nodes.push(
        <Link
          key={`l${match.index}`}
          href={href}
          className="font-semibold text-gold-dark underline decoration-gold/40 underline-offset-2 hover:decoration-gold-deep"
        >
          {match[1]}
        </Link>,
      );
    } else {
      nodes.push(...renderBold(match[0], `x${n}`));
    }
    last = match.index + match[0].length;
    n += 1;
  }
  if (last < text.length) nodes.push(...renderBold(text.slice(last), "end"));
  if (nodes.length === 0) return text;
  return nodes;
}

function articleSections(page: SeoPageConfig) {
  return page.sections.filter((s) => !LEGAL_SECTION_HEADINGS.has(s.heading));
}

function ArticleBody({ page }: { page: SeoPageConfig }) {
  return (
    <div className="space-y-10">
      {articleSections(page).map((section) => (
        <section key={section.heading} id={headingAnchor(section.heading)} className="scroll-mt-28">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {section.heading}
          </h2>
          <div className="mt-3 whitespace-pre-line text-[1.0625rem] leading-[1.75] text-ink-soft">
            {renderMarkdownish(section.body)}
          </div>
        </section>
      ))}
    </div>
  );
}

function RiskDisclosureSection() {
  return (
    <section
      aria-labelledby="risk-heading"
      className="glass scroll-mt-28 rounded-glass border-l-[3px] border-l-gold-deep p-5 sm:p-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-dark">
        Legal
      </p>
      <h2 id="risk-heading" className="mt-1.5 font-display text-lg font-bold text-ink">
        {RISK_HEADING}
      </h2>
      <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">{DEFAULT_RISK_BODY}</p>
    </section>
  );
}

function statList(page: SeoPageConfig) {
  const m = page.marketData;
  if (!hasMarketData(m)) return null;
  const stats: Array<{ label: string; value: string; tone?: "up" | "down" }> = [
    { label: "Price", value: formatUsdPrice(m!.priceUsd!) },
  ];
  if (typeof m!.change24hPct === "number" && Number.isFinite(m!.change24hPct)) {
    stats.push({
      label: "24h",
      value: formatSignedPct(m!.change24hPct),
      tone: m!.change24hPct >= 0 ? "up" : "down",
    });
  }
  if (m!.marketCapUsd && m!.marketCapUsd > 0) {
    stats.push({ label: "Market cap", value: formatCompactUsd(m!.marketCapUsd) });
  }
  if (m!.volume24hUsd && m!.volume24hUsd > 0) {
    stats.push({ label: "24h volume", value: formatCompactUsd(m!.volume24hUsd) });
  }
  if (m!.liquidityUsd && m!.liquidityUsd > 0) {
    stats.push({ label: "Liquidity", value: formatCompactUsd(m!.liquidityUsd) });
  }
  return stats;
}

function MarketStats({ page }: { page: SeoPageConfig }) {
  const stats = statList(page);
  if (!stats) return null;
  const symbol = page.tokenSymbol ?? "Token";
  const asOf = page.marketData?.asOf;

  return (
    <section
      aria-labelledby="market-heading"
      className="glass-strong scroll-mt-28 overflow-hidden rounded-glass"
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-white/60 px-5 py-3">
        <h2 id="market-heading" className="font-display text-sm font-bold text-ink">
          {symbol} market snapshot
        </h2>
        {asOf ? <span className="text-[11px] text-ink-faint">as of {asOf}</span> : null}
      </div>
      <dl className="grid grid-cols-2 divide-x divide-y divide-white/60 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-3.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              {s.label}
            </dt>
            <dd
              className={
                "mt-1 font-display text-lg font-bold tabular-nums " +
                (s.tone === "up"
                  ? "text-success"
                  : s.tone === "down"
                    ? "text-danger"
                    : "text-ink")
              }
            >
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-white/60 px-5 py-2.5 text-[11px] text-ink-faint">
        Indicative figures captured at the last data refresh; may differ from the live quote.
      </p>
    </section>
  );
}

function FaqSection({ page }: { page: SeoPageConfig }) {
  return (
    <section className="space-y-4 scroll-mt-28" id="faq" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
        {FAQ_HEADING}
      </h2>
      <div className="glass divide-y divide-white/60 rounded-glass">
        {page.faqs.map((faq) => (
          <div key={faq.question} className="p-5 sm:px-6">
            <h3 className="seo-faq-question font-display text-[0.975rem] font-bold text-ink">
              {faq.question}
            </h3>
            <p className="seo-faq-answer mt-2 text-sm leading-relaxed text-ink-muted">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SwapSection({ page }: { page: SeoPageConfig }) {
  const href = seoSwapHref(page);
  const isCross =
    page.kind === "cross-chain-swap" ||
    page.kind === "cross-chain-search" ||
    Boolean(page.swapPreset?.fromChainKey && page.swapPreset?.toChainKey);

  return (
    <section
      aria-labelledby="swap-heading"
      className="gradient-border-soft scroll-mt-28 overflow-hidden rounded-glass p-6 shadow-glass sm:p-8"
      id="trade"
    >
      <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-dark">
        <span className="h-1.5 w-1.5 rounded-full bg-gold-deep" aria-hidden />
        Live execution
      </span>
      <h2
        id="swap-heading"
        className="mt-2 font-display text-2xl font-bold tracking-tight text-ink"
      >
        Trade on <span className="gold-text">{BRAND_NAME}</span>
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
        {isCross
          ? "Open the swap page with this cross-chain route pre-selected, then connect your wallet on the source chain to quote and execute — fully non-custodial."
          : "Open the swap page to compare live routes, set slippage, and sign from your own wallet — fully non-custodial."}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-2xl bg-gold-gradient px-5 py-2.5 text-sm font-semibold text-ink shadow-gold-glow transition hover:brightness-105"
        >
          {isCross ? "Swap cross-chain" : "Open swap"}
        </Link>
        <Link
          href="/discover"
          className="gradient-border-soft inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-ink shadow-glass transition hover:-translate-y-px hover:shadow-glass-lg"
        >
          Explore markets
        </Link>
      </div>
    </section>
  );
}

function TableOfContents({ page }: { page: SeoPageConfig }) {
  const items = articleSections(page).map((s) => ({
    id: headingAnchor(s.heading),
    label: s.heading,
  }));
  if (page.faqs.length) items.push({ id: "faq", label: FAQ_HEADING });
  items.push({ id: "trade", label: `Trade on ${BRAND_NAME}` });
  if (items.length < 2) return null;

  return (
    <nav aria-label="On this page" className="glass rounded-glass p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
        On this page
      </p>
      <ul className="mt-3 space-y-2 border-l border-white/70">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="-ml-px block border-l-2 border-transparent pl-3 text-sm leading-snug text-ink-muted transition hover:border-l-gold-deep hover:text-ink"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SidebarCta({ page }: { page: SeoPageConfig }) {
  const href = seoSwapHref(page);
  return (
    <div className="gradient-border-soft rounded-glass p-5 shadow-glass">
      <p className="font-display text-sm font-bold text-ink">Ready to trade?</p>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
        Compare live routes across seven chains and execute from your own wallet.
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-gold-gradient px-4 py-2.5 text-sm font-semibold text-ink shadow-gold-glow transition hover:brightness-105"
      >
        Open swap
      </Link>
    </div>
  );
}

/** Server-rendered SEO article — no client components; works with JavaScript disabled. */
export function SeoPageShell({ page }: { page: SeoPageConfig }) {
  const swapHref = seoSwapHref(page);

  return (
    <article className="xau-content seo-article mx-auto w-full max-w-6xl pb-10 pt-1 sm:pt-2">
      <SeoJsonLd page={page} />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
        <div className="min-w-0 max-w-3xl space-y-10">
          <header className="space-y-3 border-b border-white/60 pb-6">
            {page.eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-deep">{page.eyebrow}</p>
            ) : null}
            <h1 className="font-display text-[1.65rem] font-extrabold leading-[1.15] tracking-tight text-ink sm:text-3xl">
              {page.h1}
            </h1>
            {page.kind === "learn" || page.kind === "guide" ? (
              <p className="text-sm text-ink-muted">
                Written by{" "}
                <Link href="/about" className="font-semibold text-gold-dark hover:underline">
                  XAUConnect Labs
                </Link>
                {" · "}
                Reviewed against live product behavior
                {" · "}
                Updated August 2026
              </p>
            ) : null}
            <div className="space-y-3 text-[1.0625rem] leading-[1.75] text-ink-soft">
              {page.intro.split("\n\n").map((para, i) => (
                <p key={i} id={i === 0 ? "answer" : undefined} className={i === 0 ? "seo-citation" : undefined}>
                  {renderMarkdownish(para)}
                </p>
              ))}
            </div>
          </header>

          <MarketStats page={page} />

          <ArticleBody page={page} />

          <RiskDisclosureSection />

          <FaqSection page={page} />

          <SwapSection page={page} />

          <SeoExploreNext page={page} />

          <footer className="flex flex-col gap-2 border-t border-white/60 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:pt-8">
            <Link
              href={swapHref}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-gold-gradient px-5 py-2.5 text-sm font-semibold text-ink shadow-gold-glow transition hover:brightness-105"
            >
              Swap now
            </Link>
            <Link
              href="/swap"
              className="gradient-border-soft inline-flex min-h-11 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-ink shadow-glass transition hover:-translate-y-px hover:shadow-glass-lg"
            >
              Swap hub
            </Link>
            <Link
              href="/launchpad"
              className="gradient-border-soft inline-flex min-h-11 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-ink shadow-glass transition hover:-translate-y-px hover:shadow-glass-lg"
            >
              Launchpad
            </Link>
            <Link
              href="/learn"
              className="gradient-border-soft inline-flex min-h-11 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-ink shadow-glass transition hover:-translate-y-px hover:shadow-glass-lg"
            >
              Learn library
            </Link>
          </footer>
        </div>

        <aside className="mt-12 hidden lg:mt-0 lg:block">
          <div className="sticky top-24 space-y-5">
            <TableOfContents page={page} />
            <SidebarCta page={page} />
          </div>
        </aside>
      </div>
    </article>
  );
}

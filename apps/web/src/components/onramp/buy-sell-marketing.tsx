/**
 * BuySellMarketing — hand-authored, server-rendered marketing + AEO content for
 * the fiat on-ramp (/buy-crypto) and off-ramp (/sell-crypto) landing pages.
 *
 * Renders unique long-form copy, payment-method and asset coverage, a
 * transparent fee explanation, internal links to top assets, an FAQ, and rich
 * structured data (Service, HowTo, FAQPage, BreadcrumbList) so search engines
 * and answer engines (ChatGPT, Gemini, Perplexity) can surface and cite the page.
 */
import Link from "next/link";
import {
  Apple,
  Banknote,
  CreditCard,
  Globe2,
  Landmark,
  ShieldCheck,
  Smartphone,
  Wallet,
  Zap,
} from "lucide-react";
import { GlassCard } from "@xauconnect/ui";
import { BRAND_NAME } from "@xauconnect/utils";
import { SITE_URL } from "@xauconnect/seo";

type Mode = "buy" | "sell";

const POPULAR = [
  { id: "btc", name: "Bitcoin", symbol: "BTC" },
  { id: "eth", name: "Ethereum", symbol: "ETH" },
  { id: "sol", name: "Solana", symbol: "SOL" },
  { id: "usdt", name: "Tether", symbol: "USDT" },
  { id: "usdc", name: "USD Coin", symbol: "USDC" },
  { id: "bnb", name: "BNB", symbol: "BNB" },
  { id: "pol", name: "Polygon", symbol: "POL" },
  { id: "xrp", name: "XRP", symbol: "XRP" },
];

const PAYMENT_METHODS = [
  { icon: CreditCard, label: "Visa & Mastercard", note: "Credit & debit cards" },
  { icon: Apple, label: "Apple Pay", note: "One-tap on iPhone & Mac" },
  { icon: Smartphone, label: "Google Pay", note: "Android & Chrome" },
  { icon: Landmark, label: "Bank transfer", note: "SEPA, ACH, Faster Payments" },
  { icon: Globe2, label: "Local methods", note: "Pix, UPI, SPEI & 130+ more" },
  { icon: Banknote, label: "Revolut & PayPal", note: "Where supported by region" },
];

function content(mode: Mode) {
  if (mode === "buy") {
    return {
      h2: "How to buy crypto in minutes",
      steps: [
        {
          title: "Enter an amount",
          body: "Type how much you want to spend. We auto-detect your country and local currency, then fetch live quotes from every connected provider so you always see the most crypto for your money.",
        },
        {
          title: "Choose how to pay",
          body: "Pay with a Visa or Mastercard, Apple Pay, Google Pay, a bank transfer, or a local method like Pix or UPI. The best-converting option for your region is pre-selected.",
        },
        {
          title: "Verify & pay securely",
          body: "Checkout opens on the regulated provider's PCI-compliant page. Complete a quick identity check (often skipped for small amounts) and confirm your payment.",
        },
        {
          title: "Receive crypto in your wallet",
          body: "Your coins are delivered straight to the wallet address you control — usually within minutes. XAUConnect is non-custodial and never holds your funds.",
        },
      ],
      intro: `Buy Bitcoin, Ethereum, Solana, USDT, USDC and 100+ other cryptocurrencies directly inside ${BRAND_NAME} using your debit or credit card, Apple Pay, Google Pay, or a bank transfer. We automatically compare live rates and route every purchase to the best price for your country and payment method — with the crypto delivered straight to your own wallet.`,
    };
  }
  return {
    h2: "How to sell crypto and cash out",
    steps: [
      {
        title: "Pick the asset to sell",
        body: "Choose the crypto you want to cash out and enter the amount. We instantly quote how much fiat you'll receive after fees, across every connected off-ramp provider.",
      },
      {
        title: "Choose your payout",
        body: "Cash out to your bank account (SEPA, ACH, Faster Payments), debit card, or a supported local method — whichever is available in your country.",
      },
      {
        title: "Send crypto from your wallet",
        body: "You sign and send the crypto from your own wallet to the provider's verified address. Nothing is custodied by XAUConnect at any point.",
      },
      {
        title: "Get paid in your local currency",
        body: "Once the transfer confirms, the provider pays out fiat to your account — fast rails like SEPA Instant settle in minutes.",
      },
    ],
    intro: `Sell crypto and withdraw to your bank account or card in your local currency, directly inside ${BRAND_NAME}. We automatically compare live payout rates and route your sale to the best price, with funds settled straight to your account — non-custodial, with no exchange account to open.`,
  };
}

function faqs(mode: Mode) {
  const common = [
    {
      q: `Is ${BRAND_NAME} custodial — do you hold my crypto?`,
      a: `No. ${BRAND_NAME} is fully non-custodial. ${
        mode === "buy"
          ? "Purchased crypto is delivered directly to the wallet address you control."
          : "You sign and send crypto from your own wallet; we never take custody."
      } Payment processing, identity verification and fiat settlement are handled by licensed providers.`,
    },
    {
      q: "Which payment methods are supported?",
      a: "Visa and Mastercard debit/credit cards, Apple Pay, Google Pay, bank transfers (SEPA, ACH, Faster Payments) and 130+ local payment methods such as Pix, UPI and SPEI. Availability depends on your country and the provider.",
    },
    {
      q: "What are the fees?",
      a: `You see the all-in price up front: the provider's processing fee, network fees, and a small transparent ${BRAND_NAME} fee that matches our swap pricing. We compare every provider live and route to the cheapest, so you keep more.`,
    },
    {
      q: "Which countries are supported?",
      a: "190+ countries are supported. We auto-detect your location and only show the assets, currencies and payment methods available where you are.",
    },
  ];
  if (mode === "buy") {
    return [
      {
        q: "How fast will I receive my crypto?",
        a: "Most card and Apple Pay / Google Pay purchases complete and deliver within minutes once your payment and identity check clear. Bank transfers can take longer depending on the rail.",
      },
      ...common,
      {
        q: "Do I need an account or KYC?",
        a: "No XAUConnect account is required. A quick identity check is performed by the payment provider and is often skipped for smaller amounts, depending on your region.",
      },
    ];
  }
  return [
    {
      q: "How do I get paid when I sell?",
      a: "Payouts go to your bank account, debit card, or a supported local method in your local currency. Fast rails like SEPA Instant settle within minutes; standard transfers take longer.",
    },
    ...common,
    {
      q: "Can I sell any token?",
      a: "You can cash out major assets like BTC, ETH, SOL, USDT and USDC across the chains we support. Available sell pairs depend on your country and the connected providers.",
    },
  ];
}

export function BuySellMarketing({ mode }: { mode: Mode }) {
  const c = content(mode);
  const f = faqs(mode);
  const path = mode === "buy" ? "/buy-crypto" : "/sell-crypto";
  const title =
    mode === "buy"
      ? "Buy Crypto with Card, Apple Pay & Bank Transfer"
      : "Sell Crypto & Cash Out to Your Bank";

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}${path}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: c.h2,
      step: c.steps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.title,
        text: s.body,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: f.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: mode === "buy" ? "Cryptocurrency on-ramp" : "Cryptocurrency off-ramp",
      name: title,
      provider: { "@type": "Organization", name: BRAND_NAME, url: SITE_URL },
      areaServed: "Worldwide",
      url: `${SITE_URL}${path}`,
      description: c.intro,
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      {jsonLd.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}

      <section className="prose-dev max-w-none">
        <p className="text-base leading-relaxed text-ink-soft">{c.intro}</p>
      </section>

      {/* How it works */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold tracking-tight">{c.h2}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {c.steps.map((s, i) => (
            <GlassCard key={s.title} padding="md" className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-gradient text-sm font-bold text-ink shadow-gold-glow">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-ink">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{s.body}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Payment methods */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          {mode === "buy" ? "Pay your way" : "Cash out your way"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PAYMENT_METHODS.map(({ icon: Icon, label, note }) => (
            <GlassCard key={label} padding="md" className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold-deep">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-ink">{label}</p>
                <p className="text-xs text-ink-muted">{note}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Trust / why */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: "Non-custodial & secure",
            body: "Your keys, your crypto. Payments and KYC run on regulated, PCI-compliant providers — we never see your card.",
          },
          {
            icon: Zap,
            title: "Best live rates",
            body: "Every quote is compared in real time and automatically routed to the best price, so you always get more.",
          },
          {
            icon: Wallet,
            title: "Straight to your wallet",
            body: mode === "buy"
              ? "Buy and the crypto lands in the wallet you control — then swap across 7 chains in the same app."
              : "Sell from the wallet you control and receive fiat in your bank or card.",
          },
        ].map(({ icon: Icon, title: t, body }) => (
          <GlassCard key={t} padding="md" className="flex flex-col gap-2">
            <Icon className="h-6 w-6 text-gold-deep" />
            <h3 className="font-semibold text-ink">{t}</h3>
            <p className="text-sm text-ink-muted">{body}</p>
          </GlassCard>
        ))}
      </section>

      {/* Popular assets internal links */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Popular crypto to {mode}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {POPULAR.map((a) => (
            <Link
              key={a.id}
              href={`${path}?crypto=${a.id}`}
              className="glass flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-soft ring-1 ring-white/60 transition-colors hover:bg-gold/10"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gold/20 text-xs font-bold">
                {a.symbol.slice(0, 1)}
              </span>
              <span className="min-w-0 truncate">
                {mode === "buy" ? "Buy" : "Sell"} {a.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold tracking-tight">Frequently asked questions</h2>
        <div className="flex flex-col gap-2">
          {f.map((item) => (
            <details
              key={item.q}
              className="glass group rounded-glass px-4 py-3 ring-1 ring-white/60"
            >
              <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden">
                {item.q}
              </summary>
              <p className="mt-2 text-sm text-ink-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Cross-link */}
      <section className="glass-strong flex flex-col items-start gap-2 rounded-glass p-5 ring-1 ring-white/60">
        <h2 className="font-display text-lg font-bold">
          {mode === "buy" ? "Already hold crypto?" : "Want to buy instead?"}
        </h2>
        <p className="text-sm text-ink-muted">
          {mode === "buy" ? (
            <>
              Swap across Ethereum, Solana, BNB Chain, Polygon, Arbitrum, Base and Avalanche at the best
              price, or <Link href="/sell-crypto" className="font-semibold text-gold-deep hover:underline">cash out to your bank</Link>.
            </>
          ) : (
            <>
              <Link href="/buy-crypto" className="font-semibold text-gold-deep hover:underline">Buy crypto with a card or Apple Pay</Link>{" "}
              and have it delivered straight to your wallet in minutes.
            </>
          )}
        </p>
      </section>
    </div>
  );
}

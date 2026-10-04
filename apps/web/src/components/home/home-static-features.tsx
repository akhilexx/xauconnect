import Link from "next/link";
import { BRAND_NAME } from "@xauconnect/utils";

/** Server-rendered feature summary for homepage crawlers. */
export function HomeStaticFeatures() {
  return (
    <section className="w-full space-y-6 py-4 sm:space-y-8 sm:py-8">
      <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">What {BRAND_NAME} offers</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <article>
          <h3 className="font-display text-lg font-semibold">Multi-chain swaps</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Aggregate liquidity from DEXs and routers on seven networks. Compare minimum received,
            fees, and gas before you sign in your wallet.
          </p>
          <Link href="/swap" className="mt-2 inline-block text-sm font-semibold text-gold-deep">
            Open swap →
          </Link>
        </article>
        <article>
          <h3 className="font-display text-lg font-semibold">Cross-chain bridges</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Move tokens between EVM chains and Solana with labeled bridge steps, net receive
            previews, and status tracking.
          </p>
          <Link href="/swap" className="mt-2 inline-block text-sm font-semibold text-gold-deep">
            Cross-chain swap →
          </Link>
        </article>
        <article>
          <h3 className="font-display text-lg font-semibold">Developer &amp; agent API</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Public REST API for quotes, unsigned transaction builds, and swap recording. OpenAPI
            spec, SDK, and optional agent tracking headers.
          </p>
          <Link href="/developers" className="mt-2 inline-block text-sm font-semibold text-gold-deep">
            Developer docs →
          </Link>
        </article>
      </div>
    </section>
  );
}

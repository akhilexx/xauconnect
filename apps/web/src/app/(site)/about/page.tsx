import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_LEGAL_NAME, BRAND_NAME, CHAINS, PROTOCOL_WALLETS } from "@xauconnect/utils";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { organizationAboutJsonLd, webPageJsonLd } from "@/lib/seo/legal-json-ld";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = sitePageMetadata({
  title: "About",
  description: `${BRAND_NAME} is a non-custodial multi-chain DEX aggregator and token launchpad. Learn who we are, how routing works, supported networks, and how to contact us.`,
  path: "/about",
});

const UPDATED = "August 14, 2026";

export default function AboutPage() {
  const jsonLd = [organizationAboutJsonLd(), webPageJsonLd("/about", `About ${BRAND_NAME}`, metadata.description as string)];

  return (
    <>
      {jsonLd.map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }} />
      ))}
      <LegalPageShell
        eyebrow="Company · Trust"
        title={`About ${BRAND_NAME}`}
        description={`${BRAND_LEGAL_NAME} builds non-custodial trading software for multi-chain DeFi — swap aggregation, cross-chain routing, launchpad tooling, and a public API for developers and AI agents.`}
        updated={UPDATED}
      >
        <section>
          <h2>What is {BRAND_NAME}?</h2>
          <p>
            <strong>{BRAND_NAME}</strong> is a multi-chain decentralized exchange (DEX) aggregator and token
            launchpad. The web application at{" "}
            <Link href="/" className="text-gold-deep hover:underline">
              xauconnect.com
            </Link>{" "}
            compares live swap routes across external liquidity venues, shows fees and minimum received before
            you sign, and executes trades only through your own wallet — we never take custody of user funds.
          </p>
          <p>
            Unlike a centralized exchange, {BRAND_NAME} does not operate an order book or hold balances on your
            behalf. You connect a wallet (MetaMask, Phantom, WalletConnect-compatible wallets, and others),
            review a quote, approve token spending if required, and sign the transaction locally. Settlement
            happens on-chain against automated market maker pools or third-party aggregators such as 1inch, 0x,
            and Jupiter.
          </p>
        </section>

        <section>
          <h2>Who operates {BRAND_NAME}?</h2>
          <p>
            {BRAND_NAME} is developed and operated by <strong>{BRAND_LEGAL_NAME}</strong>, an independent software
            team focused on DeFi infrastructure. We publish open documentation, a public Swap API, and verifiable
            on-chain fee contracts on supported EVM networks.
          </p>
          <ul>
            <li>
              <strong>Legal entity:</strong> {BRAND_LEGAL_NAME}
            </li>
            <li>
              <strong>Product:</strong> {BRAND_NAME} — multi-chain DEX aggregator &amp; launchpad
            </li>
            <li>
              <strong>Website:</strong>{" "}
              <a href="https://xauconnect.com" className="text-gold-deep hover:underline">
                https://xauconnect.com
              </a>
            </li>
            <li>
              <strong>Source code:</strong>{" "}
              <a
                href="https://github.com/akhilexx/xauconnect"
                className="text-gold-deep hover:underline"
                rel="noopener noreferrer"
              >
                github.com/akhilexx/xauconnect
              </a>
            </li>
            <li>
              <strong>Support &amp; legal:</strong>{" "}
              <a href="mailto:legal@xauconnect.com" className="text-gold-deep hover:underline">
                legal@xauconnect.com
              </a>
            </li>
          </ul>
          <p>
            We are a software provider, not a broker, bank, custodian, or investment adviser. Nothing on this
            site constitutes financial, legal, or tax advice.
          </p>
        </section>

        <section>
          <h2>Supported networks</h2>
          <p>{BRAND_NAME} supports the following networks for spot swaps and cross-chain routing:</p>
          <ul>
            {CHAINS.map((c) => (
              <li key={c.key}>
                <strong>{c.name}</strong> — native gas: {c.nativeSymbol}
                {c.kind === "evm" ? ` (chain id ${c.id})` : " (Solana mainnet)"}
              </li>
            ))}
          </ul>
          <p>
            Chain availability for specific token pairs depends on third-party liquidity and bridge providers.
            Quotes in the app reflect live provider responses and may fail when pools are illiquid or bridges are
            congested.
          </p>
        </section>

        <section>
          <h2>How swap routing works</h2>
          <ol>
            <li>
              <strong>Quote:</strong> You select source chain, destination (for cross-chain), tokens, and amount.
              Our backend requests routes from configured aggregators and on-chain adapters.
            </li>
            <li>
              <strong>Transparency:</strong> The quote card shows route label, estimated gas, platform fee,
              and minimum received before you connect or sign.
            </li>
            <li>
              <strong>Build:</strong> When you confirm, the API returns unsigned transaction data for your
              wallet to sign (EVM calldata or Solana serialized transaction).
            </li>
            <li>
              <strong>Execution:</strong> Your wallet broadcasts the transaction. {BRAND_NAME} cannot move
              funds without your signature.
            </li>
            <li>
              <strong>Fees:</strong> Platform fees are disclosed in the quote. Network gas is paid to validators
              separately. See our{" "}
              <Link href="/developers/api/swap" className="text-gold-deep hover:underline">
                API documentation
              </Link>{" "}
              for integrator fee parameters.
            </li>
          </ol>
        </section>

        <section>
          <h2>Fee model</h2>
          <p>
            {BRAND_NAME} may charge a platform fee on swaps, liquidity actions, and launchpad activity. Fees are
            shown in the user interface and API responses before execution. Default swap fees are configured on
            our on-chain <code>FeeCollector</code> contracts where deployed (typically 0.30% / 30 bps unless
            otherwise stated in-app).
          </p>
          <p>
            Integrator routes (1inch, 0x on EVM; Jupiter on Solana) may include separate partner fee parameters.
            You always pay network gas to the chain&apos;s validators in the native asset (ETH, BNB, SOL, etc.).
          </p>
        </section>

        <section>
          <h2>Public protocol wallets (EVM &amp; Solana)</h2>
          <p>
            For transparency, these are the published hot wallets used for protocol fee collection and treasury
            operations. They are <strong>not</strong> deposit addresses — do not send funds here unless you are
            paying a disclosed protocol fee as part of an on-chain transaction you initiated.
          </p>
          <ul>
            <li>
              EVM fee collector: <code>{PROTOCOL_WALLETS.feeCollectorEvm}</code>
            </li>
            <li>
              EVM treasury: <code>{PROTOCOL_WALLETS.treasuryEvm}</code>
            </li>
            <li>
              Solana fee wallet: <code>{PROTOCOL_WALLETS.feeCollectorSolana}</code>
            </li>
          </ul>
        </section>

        <section>
          <h2>Smart contracts</h2>
          <p>
            On EVM chains, {BRAND_NAME} deploys upgradeable <strong>FeeCollector</strong> and{" "}
            <strong>AggregatorRouter</strong> contracts per network. Swap fees skimmed by our router are forwarded
            to the FeeCollector vault. Contract source is in the{" "}
            <code>packages/contracts</code> directory of our GitHub repository and is verified on explorers where
            deployments exist.
          </p>
          <p>
            Deployed contract addresses vary by chain and are configured in production environment variables.
            Polygon mainnet FeeCollector (UUPS proxy):{" "}
            <code>0xa5e0A97385278Dae82f4BdFD59Ad8939917D0ec0</code>. Additional chain deployments are documented
            in{" "}
            <a
              href="https://github.com/akhilexx/xauconnect/blob/main/docs/DEPLOY_EVM_ROUTERS.md"
              className="text-gold-deep hover:underline"
              rel="noopener noreferrer"
            >
              DEPLOY_EVM_ROUTERS.md
            </a>
            .
          </p>
        </section>

        <section>
          <h2>Developers &amp; AI agents</h2>
          <p>
            {BRAND_NAME} exposes a public REST API for quotes, transaction builds, cross-chain status, and swap
            recording. Machine-readable specification:{" "}
            <Link href="/developers" className="text-gold-deep hover:underline">
              /developers
            </Link>{" "}
            and{" "}
            <a href="/openapi.json" className="text-gold-deep hover:underline">
              openapi.json
            </a>
            . Optional headers <code>X-Client-Id</code>, <code>X-Client-Name</code>, and{" "}
            <code>X-Client-Source</code> help attribute API usage in our admin console.
          </p>
        </section>

        <section>
          <h2>Risk disclosure</h2>
          <p>
            Digital assets are highly volatile. Smart contracts, bridges, oracles, and third-party aggregators can
            fail or be exploited. Slippage, MEV, and network congestion can cause outcomes worse than quoted
            previews. You are solely responsible for verifying token contract addresses, chain selection, and
            transaction details before signing.
          </p>
          <p>
            Cross-chain bridging introduces additional latency and smart-contract risk. Never share your seed
            phrase or private keys with anyone claiming to represent {BRAND_NAME}.
          </p>
        </section>

        <section>
          <h2>Regulatory notice</h2>
          <p>
            {BRAND_NAME} does not offer services to persons or entities in jurisdictions where use of the
            interface would be prohibited. Users are responsible for compliance with local laws. The interface
            may restrict access by IP or other signals where required. We do not solicit investments or
            guarantee returns.
          </p>
        </section>

        <section>
          <h2>Editorial library</h2>
          <p>
            Product explainers and how-to guides are written by {BRAND_NAME} Labs against the live
            aggregator, fee contracts, and API — not generated as keyword doorways. Start at{" "}
            <Link href="/learn" className="text-gold-deep hover:underline">
              /learn
            </Link>{" "}
            or the{" "}
            <Link href="/learn/guides" className="text-gold-deep hover:underline">
              how-to guides
            </Link>
            . Bylines on those pages point here so you can see who operates the product.
          </p>
        </section>

        <section>
          <h2>Related documents</h2>
          <ul>
            <li>
              <Link href="/terms" className="text-gold-deep hover:underline">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-gold-deep hover:underline">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/learn" className="text-gold-deep hover:underline">
                Learn library
              </Link>
            </li>
            <li>
              <Link href="/developers" className="text-gold-deep hover:underline">
                Developer documentation
              </Link>
            </li>
          </ul>
        </section>
      </LegalPageShell>
    </>
  );
}

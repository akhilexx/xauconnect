import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_LEGAL_NAME, BRAND_NAME } from "@xauconnect/utils";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { webPageJsonLd } from "@/lib/seo/legal-json-ld";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = sitePageMetadata({
  title: "Privacy Policy",
  description: `How ${BRAND_NAME} collects, uses, and protects information when you use our website, wallet interface, and API.`,
  path: "/privacy",
});

const UPDATED = "June 22, 2026";

export default function PrivacyPage() {
  const jsonLd = webPageJsonLd("/privacy", `Privacy Policy · ${BRAND_NAME}`, metadata.description as string);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LegalPageShell
        eyebrow="Legal"
        title="Privacy Policy"
        description={`${BRAND_LEGAL_NAME} ("we", "us") respects your privacy. This policy explains what information we collect when you use ${BRAND_NAME}, how we use it, and your choices.`}
        updated={UPDATED}
      >
        <section>
          <h2>1. Scope</h2>
          <p>
            This Privacy Policy applies to the {BRAND_NAME} website at{" "}
            <a href="https://xauconnect.com" className="text-gold-deep hover:underline">
              xauconnect.com
            </a>
            , our web application, admin tools, and public API. It does not govern third-party wallets, RPC
            providers, block explorers, or DeFi protocols you interact with through the Interface — those services
            have their own privacy policies.
          </p>
        </section>

        <section>
          <h2>2. Non-custodial design</h2>
          <p>
            {BRAND_NAME} is non-custodial. We do <strong>not</strong> collect or store your seed phrase, private
            keys, or wallet passwords. Signing happens in your wallet extension or mobile app. We cannot access
            funds in your wallet without a transaction you authorize on-chain.
          </p>
        </section>

        <section>
          <h2>3. Information we collect</h2>
          <h3>3.1 Wallet &amp; on-chain data</h3>
          <ul>
            <li>
              <strong>Public wallet addresses</strong> you connect or submit in API requests (for quotes, builds,
              swap recording, and admin analytics)
            </li>
            <li>
              <strong>On-chain transaction hashes</strong> you voluntarily submit via <code>POST /swap/record</code> or
              similar endpoints
            </li>
            <li>
              <strong>Connected wallet metadata</strong> such as chain ID, connector type, and connection timestamps
              when you opt in to wallet tracking for product analytics
            </li>
          </ul>
          <p>
            Blockchain data is public by design. Anyone can view transactions associated with your address on chain
            explorers.
          </p>

          <h3>3.2 Usage &amp; API data</h3>
          <ul>
            <li>IP address, user agent, referrer, and request timestamps (server and CDN logs)</li>
            <li>API route, parameters (token addresses, chain keys, amounts — not private keys), response status</li>
            <li>Optional client identification headers: <code>X-Client-Id</code>, <code>X-Client-Name</code>,{" "}
              <code>X-Client-Source</code></li>
            <li>Quote and build request metadata stored for routing quality and abuse prevention</li>
          </ul>

          <h3>3.3 Account data (admin only)</h3>
          <p>
            The admin dashboard at <code>/xaxmd5</code> uses email/password authentication for authorized operators.
            Credentials are hashed; session tokens are stored server-side. This applies only to admin users, not
            general swap users.
          </p>

          <h3>3.4 Cookies &amp; local storage</h3>
          <ul>
            <li>
              <strong>Essential storage:</strong> theme preferences, slippage settings, recently selected tokens,
              session tokens for admin login
            </li>
            <li>
              <strong>Analytics:</strong> we may use privacy-conscious analytics to measure page performance and
              feature usage. No advertising cookies are required to swap.
            </li>
          </ul>
        </section>

        <section>
          <h2>4. How we use information</h2>
          <p>We use collected information to:</p>
          <ul>
            <li>Provide swap quotes, transaction builds, and cross-chain routing</li>
            <li>Record completed swaps for analytics, fee reconciliation, and DeFiLlama-style transparency</li>
            <li>Detect abuse, rate-limit API traffic, and protect infrastructure</li>
            <li>Improve routing, UX, and documentation</li>
            <li>Operate admin dashboards (connected wallets, swap volume, API agent attribution)</li>
            <li>Comply with legal obligations and enforce our Terms</li>
          </ul>
          <p>We do not sell your personal information to data brokers.</p>
        </section>

        <section>
          <h2>5. Legal bases (EEA/UK users)</h2>
          <p>Where GDPR applies, we process data based on:</p>
          <ul>
            <li>
              <strong>Contract / legitimate interest:</strong> operating the Interface you request
            </li>
            <li>
              <strong>Legitimate interest:</strong> security, fraud prevention, and product improvement
            </li>
            <li>
              <strong>Consent:</strong> where required for non-essential cookies or marketing (if ever offered)
            </li>
            <li>
              <strong>Legal obligation:</strong> responding to lawful requests from authorities
            </li>
          </ul>
        </section>

        <section>
          <h2>6. Sharing &amp; processors</h2>
          <p>We may share limited data with:</p>
          <ul>
            <li>
              <strong>Infrastructure providers:</strong> cloud hosting (e.g. Azure), CDN (Cloudflare), database
              (PostgreSQL)
            </li>
            <li>
              <strong>Blockchain RPC providers:</strong> Alchemy, Helius, and public RPC endpoints to fetch chain
              state
            </li>
            <li>
              <strong>Aggregator partners:</strong> 1inch, 0x, Jupiter, bridge APIs — only parameters needed to
              obtain quotes (wallet address may be included as <code>taker</code> or <code>user</code>)
            </li>
            <li>
              <strong>Law enforcement:</strong> when required by valid legal process and permitted by law
            </li>
          </ul>
          <p>Processors are bound by contractual confidentiality and data-processing terms where applicable.</p>
        </section>

        <section>
          <h2>7. Retention</h2>
          <ul>
            <li>
              <strong>API logs:</strong> typically retained up to 90 days for operations and security, unless longer
              retention is required for disputes or law
            </li>
            <li>
              <strong>Swap records:</strong> retained in our database for analytics and protocol reporting until
              deleted as part of routine data lifecycle policies
            </li>
            <li>
              <strong>Admin sessions:</strong> expire automatically; refresh tokens rotated on logout
            </li>
            <li>
              <strong>Server logs:</strong> rotated per hosting provider defaults (generally 30–90 days)
            </li>
          </ul>
        </section>

        <section>
          <h2>8. Security</h2>
          <p>
            We use TLS encryption in transit, access controls on production servers, and hashed credentials for admin
            accounts. No system is perfectly secure; you should use hardware wallets for large holdings and verify
            contract addresses before signing.
          </p>
        </section>

        <section>
          <h2>9. International transfers</h2>
          <p>
            Our servers may be located outside your country (including Southeast Asia and cloud regions used by Azure
            and Cloudflare). By using the Interface, you acknowledge that data may be processed in jurisdictions with
            different privacy laws than your own. Where required, we implement appropriate safeguards for cross-border
            transfers.
          </p>
        </section>

        <section>
          <h2>10. Your rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li>Access personal data we hold about you</li>
            <li>Request correction or deletion of certain data</li>
            <li>Object to or restrict processing</li>
            <li>Data portability (where technically feasible)</li>
            <li>Withdraw consent for optional processing</li>
            <li>Lodge a complaint with a supervisory authority</li>
          </ul>
          <p>
            Because most data we hold is tied to public wallet addresses, deletion may be limited where records are
            needed for fraud prevention, accounting, or legal compliance. Contact us to exercise rights.
          </p>
        </section>

        <section>
          <h2>11. Children</h2>
          <p>
            The Interface is not directed to persons under 18. We do not knowingly collect data from children. If you
            believe a minor has provided information, contact us for deletion.
          </p>
        </section>

        <section>
          <h2>12. Changes</h2>
          <p>
            We may update this Privacy Policy. The &quot;Last updated&quot; date at the top reflects the latest
            revision. Material changes may be announced on the website or in release notes.
          </p>
        </section>

        <section>
          <h2>13. Contact</h2>
          <p>
            Privacy inquiries and data subject requests:{" "}
            <a href="mailto:legal@xauconnect.com" className="text-gold-deep hover:underline">
              legal@xauconnect.com
            </a>
            . Data controller: {BRAND_LEGAL_NAME}. See{" "}
            <Link href="/about" className="text-gold-deep hover:underline">
              About
            </Link>{" "}
            for company details.
          </p>
        </section>
      </LegalPageShell>
    </>
  );
}

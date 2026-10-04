import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_LEGAL_NAME, BRAND_NAME } from "@xauconnect/utils";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { webPageJsonLd } from "@/lib/seo/legal-json-ld";
import { sitePageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = sitePageMetadata({
  title: "Terms of Service",
  description: `Terms governing use of the ${BRAND_NAME} website, swap interface, launchpad, and public API. Non-custodial software only — not financial advice.`,
  path: "/terms",
});

const UPDATED = "June 22, 2026";

export default function TermsPage() {
  const jsonLd = webPageJsonLd("/terms", `Terms of Service · ${BRAND_NAME}`, metadata.description as string);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LegalPageShell
        eyebrow="Legal"
        title="Terms of Service"
        description={`These Terms of Service ("Terms") govern your access to and use of the ${BRAND_NAME} website, applications, and APIs operated by ${BRAND_LEGAL_NAME} ("we", "us", "our"). By using ${BRAND_NAME}, you agree to these Terms.`}
        updated={UPDATED}
      >
        <section>
          <h2>1. Acceptance</h2>
          <p>
            By accessing or using {BRAND_NAME} at{" "}
            <a href="https://xauconnect.com" className="text-gold-deep hover:underline">
              xauconnect.com
            </a>{" "}
            (the &quot;Interface&quot;), connecting a wallet, or calling our public API, you confirm that you have
            read, understood, and agree to be bound by these Terms and our{" "}
            <Link href="/privacy" className="text-gold-deep hover:underline">
              Privacy Policy
            </Link>
            . If you do not agree, do not use the Interface.
          </p>
          <p>
            We may update these Terms from time to time. Material changes will be reflected by updating the
            &quot;Last updated&quot; date above. Continued use after changes constitutes acceptance of the revised
            Terms.
          </p>
        </section>

        <section>
          <h2>2. What {BRAND_NAME} is — and is not</h2>
          <p>
            {BRAND_NAME} is <strong>non-custodial software</strong>. We provide a user interface and API that help
            you discover swap routes, compare quotes, build unsigned blockchain transactions, and interact with
            third-party liquidity sources and bridges. We do not:
          </p>
          <ul>
            <li>Take custody of your digital assets or private keys</li>
            <li>Execute trades on your behalf without your wallet signature</li>
            <li>Operate as a broker, dealer, exchange, bank, money transmitter, or investment adviser</li>
            <li>Guarantee prices, execution, or availability of any route</li>
            <li>Provide personalized financial, legal, tax, or accounting advice</li>
          </ul>
          <p>
            All blockchain transactions are irreversible. You alone control your wallet and are responsible for
            every transaction you sign.
          </p>
        </section>

        <section>
          <h2>3. Eligibility</h2>
          <p>You may use the Interface only if:</p>
          <ul>
            <li>You are at least 18 years old (or the age of majority in your jurisdiction)</li>
            <li>You have the legal capacity to enter into a binding agreement</li>
            <li>Your use is not prohibited by applicable law, sanctions, or export controls</li>
            <li>You are not located in, ordinarily resident in, or a citizen of a jurisdiction where access to
              decentralized trading interfaces is restricted</li>
          </ul>
          <p>
            We may restrict, suspend, or block access (including by IP address, wallet address, or API key) where we
            reasonably believe use would violate law, these Terms, or create unacceptable risk to users or the
            protocol.
          </p>
        </section>

        <section>
          <h2>4. Wallet connection &amp; transactions</h2>
          <p>
            To swap or use launchpad features you must connect a compatible self-custodial wallet. You represent that
            you control the wallet and that any transaction you authorize is intentional. You are solely responsible
            for:
          </p>
          <ul>
            <li>Verifying token contract addresses, chain IDs, and recipient addresses</li>
            <li>Setting appropriate slippage tolerance and reviewing minimum received amounts</li>
            <li>Paying network gas fees and any disclosed platform fees</li>
            <li>Securing your seed phrase, private keys, and device</li>
            <li>Understanding smart-contract, bridge, and oracle risks</li>
          </ul>
          <p>
            {BRAND_NAME} never asks for your seed phrase or private keys. Anyone requesting them is impersonating
            us.
          </p>
        </section>

        <section>
          <h2>5. Fees</h2>
          <p>
            The Interface may display and collect protocol fees on swaps, liquidity actions, token launches, and
            related services. Fees are shown before you sign when technically feasible. Third-party aggregators
            (1inch, 0x, Jupiter, bridge providers) may charge separate fees governed by their own terms.
          </p>
          <p>
            Network validators/miners receive gas fees independently of {BRAND_NAME}. We do not control gas prices or
            confirmation times.
          </p>
        </section>

        <section>
          <h2>6. Public API &amp; developer use</h2>
          <p>
            Our REST API at <code>/api</code> is provided on an &quot;as available&quot; basis. Documentation is at{" "}
            <Link href="/developers" className="text-gold-deep hover:underline">
              /developers
            </Link>
            . You agree to:
          </p>
          <ul>
            <li>Use reasonable rate limits and not degrade service for others</li>
            <li>Identify your integration via optional <code>X-Client-Id</code> headers when operating at scale</li>
            <li>Not misrepresent {BRAND_NAME} as a custodian or guaranteed-execution venue</li>
            <li>Comply with applicable laws in jurisdictions where your application is offered</li>
          </ul>
          <p>
            We may modify, rate-limit, or discontinue API endpoints with reasonable notice where practicable. API
            responses are informational; you must independently validate quotes before user-facing display.
          </p>
        </section>

        <section>
          <h2>7. Launchpad &amp; user-created tokens</h2>
          <p>
            Token creation, bonding curves, and graduation features allow third parties to deploy new tokens.{" "}
            {BRAND_NAME} does not audit, endorse, or guarantee the legitimacy of any user-launched token. Meme tokens
            and newly created assets are extremely high risk and may lose all value. You bear full responsibility for
            due diligence before buying, selling, or providing liquidity.
          </p>
        </section>

        <section>
          <h2>8. Third-party services</h2>
          <p>
            The Interface integrates with independent protocols, RPC providers, indexers, wallet extensions, and
            bridge networks. We do not control and are not liable for third-party outages, exploits, policy changes,
            or inaccurate data. Links to external sites are provided for convenience and do not imply endorsement.
          </p>
        </section>

        <section>
          <h2>9. Intellectual property</h2>
          <p>
            The Interface, branding, documentation, and original code are owned by {BRAND_LEGAL_NAME} or its licensors
            and protected by intellectual property laws. Open-source components are available under their respective
            licenses in our{" "}
            <a
              href="https://github.com/akhilexx/xauconnect"
              className="text-gold-deep hover:underline"
              rel="noopener noreferrer"
            >
              GitHub repository
            </a>
            . You may not copy, scrape, or reverse engineer proprietary elements except as permitted by law or
            license.
          </p>
        </section>

        <section>
          <h2>10. Prohibited conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Interface for money laundering, fraud, sanctions evasion, or illegal activity</li>
            <li>Attempt to exploit smart contracts, APIs, or user wallets</li>
            <li>Overload infrastructure through denial-of-service or abusive automated traffic</li>
            <li>Impersonate {BRAND_NAME} or misrepresent affiliation</li>
            <li>Circumvent geo-blocking or access controls</li>
            <li>Upload malware or interfere with other users&apos; access</li>
          </ul>
        </section>

        <section>
          <h2>11. Risk acknowledgment</h2>
          <p>
            Digital assets are volatile. Smart contract bugs, bridge failures, oracle manipulation, MEV, regulatory
            actions, and market illiquidity can cause partial or total loss. Cross-chain transfers add delay and
            counterparty smart-contract risk. You acknowledge these risks and accept that {BRAND_NAME} is provided{" "}
            <strong>without warranties of any kind</strong>, express or implied, including merchantability, fitness
            for a particular purpose, and non-infringement.
          </p>
        </section>

        <section>
          <h2>12. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, {BRAND_LEGAL_NAME} and its contributors shall not be liable for
            any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or
            digital assets, arising from your use of the Interface — including failed transactions, incorrect quotes,
            smart-contract exploits, or unauthorized wallet access — even if we have been advised of the possibility
            of such damages.
          </p>
          <p>
            Our aggregate liability for direct damages shall not exceed the greater of (a) USD $100 or (b) the total
            protocol fees you paid to us through the Interface in the twelve months preceding the claim.
          </p>
        </section>

        <section>
          <h2>13. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless {BRAND_LEGAL_NAME}, its operators, and contributors from claims,
            damages, and expenses (including reasonable legal fees) arising from your use of the Interface, violation
            of these Terms, or infringement of third-party rights.
          </p>
        </section>

        <section>
          <h2>14. Dispute resolution</h2>
          <p>
            These Terms are governed by the laws of India, without regard to conflict-of-law principles, except where
            mandatory consumer protection laws in your jurisdiction provide otherwise. Any dispute shall be subject to
            the exclusive jurisdiction of courts in Bengaluru, Karnataka, India, unless applicable law requires a
            different forum.
          </p>
          <p>
            Nothing in this section limits our ability to seek injunctive relief for misuse of the Interface or
            intellectual property violations.
          </p>
        </section>

        <section>
          <h2>15. Termination</h2>
          <p>
            You may stop using the Interface at any time. We may suspend or terminate access if you breach these
            Terms or if continued access creates legal or security risk. Provisions that by nature should survive
            (disclaimers, limitation of liability, indemnity, governing law) survive termination.
          </p>
        </section>

        <section>
          <h2>16. Contact</h2>
          <p>
            Questions about these Terms:{" "}
            <a href="mailto:legal@xauconnect.com" className="text-gold-deep hover:underline">
              legal@xauconnect.com
            </a>
            . See also our{" "}
            <Link href="/about" className="text-gold-deep hover:underline">
              About
            </Link>{" "}
            page for company information.
          </p>
        </section>
      </LegalPageShell>
    </>
  );
}

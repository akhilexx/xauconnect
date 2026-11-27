import { sitePageMetadata } from "@/lib/seo/site-metadata";
import { DevDocsShell } from "@/components/developers/dev-docs-shell";

export const metadata = sitePageMetadata({
  title: "Authentication & rate limits",
  description: "Read the public API authentication model, rate limits and how to handle rate-limit responses.",
  path: "/developers/api/authentication",
});

export default function ApiAuthPage() {
  return (
    <DevDocsShell title="Authentication & rate limits">
      <p>Swap endpoints are <strong className="text-ink">open</strong> — no API key required for quotes and builds.</p>
      <h2>Rate limits (per IP)</h2>
      <ul>
        <li>Quote / build / cross-chain: 300 requests/minute</li>
        <li>Chains, tokens, settings: 120 requests/minute</li>
      </ul>
      <h2>Optional wallet JWT</h2>
      <p>
        <code>POST /auth/challenge</code> → sign message → <code>POST /auth/verify</code> for profile and
        admin access. Not required for swap execution.
      </p>
      <h2>Agent identification</h2>
      <p>Send <code>X-Client-Id</code> and <code>X-Client-Source: agent</code> on every request for admin analytics.</p>
    </DevDocsShell>
  );
}

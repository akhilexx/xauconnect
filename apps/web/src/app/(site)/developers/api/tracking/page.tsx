import { sitePageMetadata } from "@/lib/seo/site-metadata";
import { DevDocsShell } from "@/components/developers/dev-docs-shell";

export const metadata = sitePageMetadata({
  title: "API tracking & admin visibility",
  description: "Track the transaction hash and settlement state after submitting a signed swap.",
  path: "/developers/api/tracking",
});

export default function ApiTrackingPage() {
  return (
    <DevDocsShell title="API tracking & admin visibility">
      <p>Every swap API call is logged when the database is available. Responses include <code>X-Request-Id</code> for correlation.</p>
      <h2>Headers</h2>
      <ul>
        <li><code>X-Client-Id</code> — agent product id (shown in admin API Agents tab)</li>
        <li><code>X-Client-Name</code> — human-readable label</li>
        <li><code>X-Client-Source</code> — <code>agent</code> | <code>api</code> | <code>web</code></li>
      </ul>
      <h2>After swap completes</h2>
      <p>After broadcasting, send <code>buildId</code>, <code>chainKey</code> and <code>txHash</code> to <code>POST /swap/record</code>. A 202 queues verification. Attribution comes from the original build headers.</p>
      <h2>SDK</h2>
      <pre>{`const api = new XauApiClient({
  baseUrl: "https://xauconnect.com/api",
  clientId: "my-bot-v1",
  clientName: "My Trading Bot",
  clientSource: "agent",
});`}</pre>
    </DevDocsShell>
  );
}

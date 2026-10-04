import { DevDocsShell } from "@/components/developers/dev-docs-shell";

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
      <p>Call <code>POST /swap/record</code> with <code>source: &quot;agent&quot;</code>, wallet <code>address</code>, and <code>txHash</code> so confirmed swaps appear in the admin Swaps tab.</p>
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

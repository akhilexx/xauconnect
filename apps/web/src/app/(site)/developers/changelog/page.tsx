import { DevDocsShell } from "@/components/developers/dev-docs-shell";

export default function ChangelogPage() {
  return (
    <DevDocsShell title="API changelog">
      <h2>v1.0.0 — 2025-06</h2>
      <ul>
        <li>Public Swap API documented with OpenAPI 3.1</li>
        <li><code>GET /swap/allowance</code> EVM helper</li>
        <li>Human-readable quote amounts (<code>amountUnit: human</code>)</li>
        <li>Cross-chain <code>executionSteps</code> in build response</li>
        <li>Agent tracking headers and admin API Agents tab</li>
        <li>Enhanced <code>/health</code> with feature flags</li>
      </ul>
    </DevDocsShell>
  );
}

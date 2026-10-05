import { DevDocsShell } from "@/components/developers/dev-docs-shell";

export default function ChangelogPage() {
  return (
    <DevDocsShell title="API changelog">
      <h2>Gold Curve — 2026-10</h2>
      <ul>
        <li>
          <code>POST /launchpad/prepare</code> returns an unsigned Meteora DBC create transaction for
          Fair, Shield, and Distribute on SOL or USDC
        </li>
        <li>
          <code>GET /launchpad/curve/:mint</code> returns progress, quote raised, the live fee, and
          migration state
        </li>
        <li>
          <code>GET /launchpad/fees</code> and <code>POST /launchpad/claim</code> for creator trading
          fees, surplus, and locked LP
        </li>
        <li>SDK methods <code>prepareLaunch</code>, <code>goldCurve</code>, <code>goldCurveFees</code>, and <code>claimGoldCurve</code></li>
      </ul>

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

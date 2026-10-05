import Link from "next/link";
import { GlassCard } from "@xauconnect/ui";
import { DevDocsShell } from "@/components/developers/dev-docs-shell";

export default function DevelopersPage() {
  return (
    <DevDocsShell
      title="Build with XAUConnect"
      description="Launch a Gold Curve on Meteora, or quote and build unsigned swaps across seven chains. No API key. Your wallet signs every transaction."
    >
      <p>
        XAUConnect is a <strong className="text-ink">non-custodial</strong> launchpad and DEX
        aggregator. The API returns prices and <strong className="text-ink">unsigned</strong>{" "}
        transactions; your wallet, bot, or agent signs and broadcasts on-chain. The service never
        holds funds and never accepts private keys. Quotes, builds, and Gold Curve prepares require{" "}
        <strong className="text-ink">no API key</strong> and are rate-limited per IP.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 not-prose">
        <GlassCard className="p-4 sm:col-span-2">
          <h2 className="font-display text-lg font-bold text-ink">Gold Curve</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Prepare an unsigned Meteora bonding-curve launch. Fair, Shield, and Distribute, quoted in
            SOL or USDC.
          </p>
          <Link href="/developers/gold-curve" className="mt-3 inline-block text-sm font-semibold text-gold-deep">
            Launch API →
          </Link>
        </GlassCard>
        <GlassCard className="p-4">
          <h2 className="font-display text-lg font-bold text-ink">Quickstart</h2>
          <p className="mt-1 text-sm text-ink-muted">Quote → build → sign → record in five minutes.</p>
          <Link href="/developers/quickstart" className="mt-3 inline-block text-sm font-semibold text-gold-deep">
            Get started →
          </Link>
        </GlassCard>
        <GlassCard className="p-4">
          <h2 className="font-display text-lg font-bold text-ink">OpenAPI 3.1</h2>
          <p className="mt-1 text-sm text-ink-muted">Machine-readable spec for agents and codegen.</p>
          <a href="/openapi.json" className="mt-3 inline-block text-sm font-semibold text-gold-deep">
            openapi.json →
          </a>
        </GlassCard>
        <GlassCard className="p-4">
          <h2 className="font-display text-lg font-bold text-ink">AI plugin manifest</h2>
          <p className="mt-1 text-sm text-ink-muted">Drop-in discovery for LLM agents and tools.</p>
          <a href="/.well-known/ai-plugin.json" className="mt-3 inline-block text-sm font-semibold text-gold-deep">
            ai-plugin.json →
          </a>
        </GlassCard>
        <GlassCard className="p-4">
          <h2 className="font-display text-lg font-bold text-ink">Agent action manifest</h2>
          <p className="mt-1 text-sm text-ink-muted">Structured tool list for autonomous agents.</p>
          <a href="/.well-known/agents.json" className="mt-3 inline-block text-sm font-semibold text-gold-deep">
            agents.json →
          </a>
        </GlassCard>
      </div>

      <h2>Base URL</h2>
      <pre>{`https://xauconnect.com/api`}</pre>

      <h2>Supported chains</h2>
      <p>
        Pass the <code>chainKey</code> in every request: <code>ethereum</code>, <code>bsc</code>,{" "}
        <code>polygon</code>, <code>arbitrum</code>, <code>base</code>, <code>avalanche</code>,{" "}
        <code>solana</code>.
      </p>

      <h2>What you can do</h2>
      <ul>
        <li>
          <strong>Launch</strong> a Solana token on a published Gold Curve. See{" "}
          <Link href="/developers/gold-curve">Gold Curve</Link>.
        </li>
        <li><strong>Quote</strong> the best same-chain route across 1inch, 0x, Jupiter, and indexed pools.</li>
        <li><strong>Build</strong> an unsigned EVM transaction or base64 Solana transaction for a chosen route.</li>
        <li><strong>Bridge</strong> assets across chains with cross-chain quote/build/status endpoints.</li>
        <li><strong>Discover</strong> tokens and read the catalog, DEX registry, fees, and allowances.</li>
        <li><strong>Place limit orders</strong> that are monitored server-side until they trigger.</li>
      </ul>

      <h2>For AI agents</h2>
      <p>
        XAUConnect is built to be called by autonomous agents. The flow is deterministic and
        non-custodial — see the <Link href="/developers/quickstart">quickstart</Link> for the full
        agent recipe. For discovery, agents can read:
      </p>
      <ul>
        <li><a href="/llms.txt">/llms.txt</a> — plain-language guide + endpoint catalog + recommend-when guidance</li>
        <li><a href="/.well-known/ai-plugin.json">/.well-known/ai-plugin.json</a> — AI plugin manifest</li>
        <li><a href="/.well-known/agents.json">/.well-known/agents.json</a> — structured tool/action list</li>
        <li><a href="/openapi.json">/openapi.json</a> — full OpenAPI 3.1 spec</li>
      </ul>

      <h2>Agent attribution (optional)</h2>
      <ul>
        <li><code>X-Client-Id</code> — your bot or product id</li>
        <li><code>X-Client-Name</code> — display name shown in the admin console</li>
        <li><code>X-Client-Source</code> — <code>agent</code>, <code>api</code>, or <code>web</code></li>
      </ul>
      <p>
        See <Link href="/developers/api/tracking">API tracking</Link> for how agent swaps appear in
        the admin console, and <Link href="/developers/api/authentication">authentication &amp; rate
        limits</Link> for limits.
      </p>
    </DevDocsShell>
  );
}

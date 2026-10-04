import { DevDocsShell } from "@/components/developers/dev-docs-shell";

export default function SdksPage() {
  return (
    <DevDocsShell title="TypeScript SDK">
      <p>Monorepo package <code>@xauconnect/sdk</code> — <code>XauApiClient</code> wraps all REST endpoints.</p>
      <pre>{`import { XauApiClient } from "@xauconnect/sdk";

const api = new XauApiClient({
  baseUrl: "https://xauconnect.com/api",
  clientId: "my-agent",
  clientSource: "agent",
});

const { best } = await api.quote({ ... });
const tx = await api.buildSwap({ request, route: best!, minAmountOut });
await api.recordSwap({ ..., source: "agent" });`}</pre>
    </DevDocsShell>
  );
}

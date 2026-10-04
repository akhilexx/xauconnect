import { DevDocsShell } from "@/components/developers/dev-docs-shell";

export default function ExamplesPage() {
  return (
    <DevDocsShell title="Code examples">
      <h2>Node.js (viem) — EVM execute</h2>
      <pre>{`import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const client = createWalletClient({ account, chain: bsc, transport: http() });

const built = await fetch("https://xauconnect.com/api/swap/build", { ... });
const { evm } = await built.json();
const hash = await client.sendTransaction({
  to: evm.to,
  data: evm.data,
  value: BigInt(evm.value),
});`}</pre>
      <h2>Python</h2>
      <pre>{`import requests
r = requests.post("https://xauconnect.com/api/swap/quote", json={...},
    headers={"X-Client-Id": "py-bot", "X-Client-Source": "agent"})
print(r.json()["best"])`}</pre>
    </DevDocsShell>
  );
}

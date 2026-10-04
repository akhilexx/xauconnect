import Link from "next/link";
import { DevDocsShell } from "@/components/developers/dev-docs-shell";

export default function QuickstartPage() {
  return (
    <DevDocsShell
      title="Agent quickstart"
      description="Execute a non-custodial same-chain swap in four API calls — no API key required."
    >
      <p>
        This is the minimum path for a bot or AI agent to swap tokens. The API only ever returns
        quotes and <strong className="text-ink">unsigned</strong> transactions — your code signs with
        the user's wallet. Never send private keys or seed phrases to the API.
      </p>

      <h2>1. Quote</h2>
      <pre>{`curl -X POST https://xauconnect.com/api/swap/quote \\
  -H "Content-Type: application/json" \\
  -H "X-Client-Id: my-bot-v1" \\
  -H "X-Client-Source: agent" \\
  -d '{
    "chainKey": "bsc",
    "tokenIn": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    "tokenOut": "0x55d398326f99059fF775485246999027B3197955",
    "amountIn": "1000000000000000000",
    "slippageBps": 50,
    "taker": "0xYourWallet..."
  }'`}</pre>
      <p>Pick <code>best</code> (or a row from <code>quotes[]</code>) and derive <code>minAmountOut</code> from your slippage.</p>

      <h2>2. Build</h2>
      <pre>{`curl -X POST https://xauconnect.com/api/swap/build \\
  -H "Content-Type: application/json" \\
  -d '{ "request": { ... }, "route": { ... }, "minAmountOut": "..." }'`}</pre>

      <h2>3. Sign &amp; send</h2>
      <ul>
        <li><strong>EVM:</strong> check ERC-20 allowance via <code>GET /swap/allowance</code>, approve the <code>spender</code> if needed, then <code>sendTransaction</code> with the returned calldata.</li>
        <li><strong>Solana:</strong> sign the base64 transaction, then <code>POST /swap/submit-solana</code>.</li>
      </ul>

      <h2>4. Record (recommended)</h2>
      <pre>{`curl -X POST https://xauconnect.com/api/swap/record \\
  -H "Content-Type: application/json" \\
  -d '{
    "chainKey": "bsc",
    "dexId": "1inch-bsc",
    "tokenIn": "...",
    "tokenOut": "...",
    "amountIn": "...",
    "amountOut": "...",
    "protocolFee": "...",
    "feeBps": 30,
    "txHash": "0x...",
    "address": "0xYourWallet...",
    "status": "confirmed",
    "source": "agent",
    "clientId": "my-bot-v1"
  }'`}</pre>

      <h2>End-to-end (TypeScript)</h2>
      <pre>{`const API = "https://xauconnect.com/api";
const headers = { "Content-Type": "application/json", "X-Client-Id": "my-bot-v1", "X-Client-Source": "agent" };

// 1. quote
const q = await fetch(\`\${API}/swap/quote\`, {
  method: "POST", headers,
  body: JSON.stringify({ chainKey, tokenIn, tokenOut, amountIn, slippageBps: 50, taker }),
}).then((r) => r.json());

const route = q.best;
const minAmountOut = (BigInt(route.amountOut) * 9950n / 10000n).toString(); // 0.5% buffer

// 2. (EVM) approve if needed
const { allowance } = await fetch(
  \`\${API}/swap/allowance?chainKey=\${chainKey}&token=\${tokenIn}&owner=\${taker}&spender=\${route.spender}\`,
).then((r) => r.json());
if (BigInt(allowance) < BigInt(amountIn)) { /* send ERC-20 approve(route.spender, amountIn) */ }

// 3. build + sign + broadcast
const tx = await fetch(\`\${API}/swap/build\`, {
  method: "POST", headers,
  body: JSON.stringify({ request: { chainKey, tokenIn, tokenOut, amountIn, taker }, route, minAmountOut }),
}).then((r) => r.json());
// EVM: wallet.sendTransaction(tx.evm)  |  Solana: sign tx.solanaTransaction then POST /swap/submit-solana

// 4. record
await fetch(\`\${API}/swap/record\`, { method: "POST", headers, body: JSON.stringify({ /* ...result... */ }) });`}</pre>

      <h2>Safety rules</h2>
      <ul>
        <li>Amounts are base units (wei/lamports) unless you pass <code>amount</code> + <code>amountUnit: &quot;human&quot;</code>.</li>
        <li>Always set <code>minAmountOut</code>/<code>slippageBps</code> so a bad price reverts instead of filling.</li>
        <li>Verify token contract addresses against <code>GET /swap/tokens</code> — tickers are not unique.</li>
        <li>Re-quote if more than ~60s elapse before signing; quotes expire as pools move.</li>
        <li>On HTTP <code>429</code>, back off — see <Link href="/developers/api/authentication">rate limits</Link>.</li>
      </ul>

      <p>
        Next: <Link href="/developers/api/swap">same-chain reference</Link>,{" "}
        <Link href="/developers/api/cross-chain">cross-chain</Link>,{" "}
        <Link href="/developers/api/solana">Solana</Link>, and{" "}
        <Link href="/developers/sdks">SDKs</Link>.
      </p>
    </DevDocsShell>
  );
}

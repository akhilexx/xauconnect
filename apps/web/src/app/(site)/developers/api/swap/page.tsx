import Link from "next/link";
import { DevDocsShell } from "@/components/developers/dev-docs-shell";

export default function ApiSwapPage() {
  return (
    <DevDocsShell
      title="Same-chain swap flow"
      description="Quote, build, sign, and record a swap on a single chain. Fully non-custodial — the API only returns unsigned transactions."
    >
      <p>
        A same-chain swap is four steps. Only steps 1, 2, and 4 hit the API; signing happens in your
        own wallet. All token amounts are <strong className="text-ink">base units</strong>
        (wei / lamports / token decimals) unless you pass <code>amount</code> with{" "}
        <code>amountUnit: &quot;human&quot;</code>.
      </p>
      <ol>
        <li><code>POST /swap/quote</code> — aggregated routes from 1inch, 0x, Jupiter, and indexed pools</li>
        <li>EVM only: <code>GET /swap/allowance</code> → approve the router if allowance is too low</li>
        <li><code>POST /swap/build</code> — unsigned EVM calldata or base64 Solana transaction</li>
        <li>Sign locally and broadcast (EVM via your RPC, Solana via <code>POST /swap/submit-solana</code>)</li>
        <li><code>POST /swap/record</code> — report the result for analytics and attribution</li>
      </ol>

      <h2>1. Quote</h2>
      <pre>{`POST /api/swap/quote
Content-Type: application/json

{
  "chainKey": "ethereum",
  "tokenIn":  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // WETH
  "tokenOut": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  // USDC
  "amountIn": "1000000000000000000",                          // 1 WETH (base units)
  "slippageBps": 50,                                          // 0.50%
  "taker": "0xYourWalletAddress"
}`}</pre>
      <p>
        The response contains a ranked list of routes plus the <code>best</code> route. Each route
        includes <code>amountOut</code>, the venue/<code>dexId</code>, the platform fee, an estimated
        gas figure, and the <code>spender</code> address the wallet must approve (EVM).
      </p>
      <pre>{`{
  "best": { "dexId": "1inch-ethereum", "amountOut": "3187420000", "spender": "0x1111...", "route": { ... } },
  "quotes": [ { "dexId": "...", "amountOut": "...", "route": { ... } }, ... ],
  "feeBps": 30
}`}</pre>

      <h3>Human-readable amounts</h3>
      <p>
        Instead of base-unit <code>amountIn</code>, pass <code>amount</code> +{" "}
        <code>amountUnit: &quot;human&quot;</code> when the token is in the catalog and the API will
        scale by decimals for you:
      </p>
      <pre>{`{ "chainKey": "bsc", "tokenIn": "...", "tokenOut": "...", "amount": "1.5", "amountUnit": "human", "taker": "0x..." }`}</pre>

      <h2>2. Allowance &amp; approval (EVM only)</h2>
      <p>
        Before a router can move an ERC-20, the wallet must approve it. Read the current allowance,
        and if it is below <code>amountIn</code>, send a standard ERC-20 <code>approve()</code> to the{" "}
        <code>spender</code> returned by the quote. Solana has no separate approval step.
      </p>
      <pre>{`GET /api/swap/allowance?chainKey=ethereum&token=0xA0b8...&owner=0xYou&spender=0x1111...
→ { "allowance": "0", "token": "...", "owner": "...", "spender": "...", "chainKey": "ethereum" }`}</pre>
      <p>
        Prefer an <strong className="text-ink">exact</strong> allowance over an unlimited one — see{" "}
        <Link href="/learn/what-is-a-token-approval-and-why-does-it-matter">token approvals</Link>.
      </p>

      <h2>3. Build</h2>
      <p>
        Pass the chosen route (the <code>best</code> object or a row from <code>quotes[]</code>) and a{" "}
        <code>minAmountOut</code> derived from your slippage tolerance. The build is simulated server-side
        before it is returned.
      </p>
      <pre>{`POST /api/swap/build
{
  "request": { "chainKey": "ethereum", "tokenIn": "...", "tokenOut": "...", "amountIn": "...", "taker": "0x..." },
  "route": { ...the chosen quote route... },
  "minAmountOut": "3171000000"
}`}</pre>
      <p>
        EVM responses return <code>{`{ to, data, value, gas }`}</code> calldata; Solana returns a base64{" "}
        <code>solanaTransaction</code>.
      </p>

      <h2>4. Sign, send &amp; record</h2>
      <ul>
        <li><strong>EVM:</strong> <code>sendTransaction</code> with the returned calldata via your wallet/RPC.</li>
        <li><strong>Solana:</strong> sign the transaction bytes, then <code>POST /swap/submit-solana</code>.</li>
      </ul>
      <pre>{`POST /api/swap/record
{ "chainKey": "ethereum", "dexId": "1inch-ethereum", "tokenIn": "...", "tokenOut": "...",
  "amountIn": "1000000000000000000", "amountOut": "3187420000", "protocolFee": "...",
  "feeBps": 30, "txHash": "0x...", "address": "0xYou", "status": "confirmed",
  "source": "agent", "clientId": "my-bot-v1" }`}</pre>

      <h2>Errors</h2>
      <p>Errors return a non-2xx status and <code>{`{ "error": { "message", "code" } }`}</code>. Common codes:</p>
      <ul>
        <li><code>SAME_TOKEN</code> — <code>tokenIn</code> equals <code>tokenOut</code></li>
        <li><code>MISSING_PARAMS</code> — a required field is absent</li>
        <li><code>NO_ROUTE</code> — no executable route for this pair/amount</li>
        <li>HTTP <code>429</code> — rate limit hit; back off and retry</li>
      </ul>
      <p>
        Always honour <code>minAmountOut</code> / <code>slippageBps</code> so trades revert rather than
        executing at a bad price, and re-quote if more than ~60s pass before signing.
      </p>
    </DevDocsShell>
  );
}

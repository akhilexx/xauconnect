import { DevDocsShell } from "@/components/developers/dev-docs-shell";

export default function ApiCrossChainPage() {
  return (
    <DevDocsShell
      title="Cross-chain swaps"
      description="Bridge and swap across chains in one workflow. Quote, build the origin transaction, sign, then poll until the destination settles."
    >
      <p>
        Cross-chain routes combine a bridge with optional swaps on either side. XAUConnect aggregates
        the 0x Cross-Chain API with a 1inch Fusion+ fallback and returns a composite quote so you can
        judge the route by the <strong className="text-ink">net amount received on the destination
        chain</strong>, not the headline rate on the source side.
      </p>
      <ol>
        <li><code>POST /swap/cross-chain/quote</code> — requires <code>fromChainKey</code>, <code>toChainKey</code>, tokens, <code>amountIn</code>, and <code>taker</code></li>
        <li><code>POST /swap/cross-chain/build</code> — returns the origin transaction plus <code>executionSteps[]</code></li>
        <li>Sign and broadcast the origin transaction on the source chain</li>
        <li><code>GET /swap/cross-chain/status/:quoteId</code> — poll until the destination settles</li>
      </ol>

      <h2>1. Quote</h2>
      <pre>{`POST /api/swap/cross-chain/quote
{
  "fromChainKey": "ethereum",
  "toChainKey":   "base",
  "tokenIn":  "0xA0b8...",   // USDC on Ethereum
  "tokenOut": "0x8335...",   // USDC on Base
  "amountIn": "100000000",   // 100 USDC (base units)
  "taker": "0xYourWallet"
}`}</pre>
      <p>
        If <code>fromChainKey === toChainKey</code> the API returns <code>SAME_CHAIN</code> — use the
        same-chain <code>/swap/quote</code> instead. If no bridge route exists you get{" "}
        <code>NO_CROSS_CHAIN_ROUTE</code> (HTTP 503).
      </p>

      <h2>2. Build</h2>
      <p>
        Pass the original <code>request</code> and the returned <code>quote</code>. The response
        includes the origin-chain transaction and an <code>executionSteps[]</code> array — composite
        routes (swap → bridge → swap) may require more than one wallet transaction, so always iterate
        the steps rather than assuming a single signature.
      </p>
      <pre>{`POST /api/swap/cross-chain/build
{ "request": { ...the quote request... }, "quote": { ...the returned quote... } }`}</pre>

      <h2>3. Sign &amp; broadcast</h2>
      <p>
        Sign the origin transaction with the user's wallet on <code>fromChainKey</code> and broadcast
        it. Keep native gas on <em>both</em> chains — source gas to initiate the bridge, destination
        gas for any follow-up swap or transfer.
      </p>

      <h2>4. Poll status</h2>
      <pre>{`GET /api/swap/cross-chain/status/{quoteId}?originChainKey=ethereum&originTxHash=0x...&toChainKey=base`}</pre>
      <p>
        Poll every few seconds until the status reports settlement on the destination chain. Most
        configured routes finalize within a few minutes up to roughly fifteen. Never submit a second
        bridge while the first is in flight unless the interface clearly reports failure — duplicate
        bridges are a common, costly mistake.
      </p>

      <h2>Notes for agents</h2>
      <ul>
        <li>Solana ⇄ EVM routes cross address-format boundaries — validate destination wallet format before signing.</li>
        <li>The token that arrives may be a bridged/wrapped representation with a different contract and decimals.</li>
        <li>Bridges carry smart-contract risk on top of swap risk; test unfamiliar routes with a small amount first.</li>
      </ul>
    </DevDocsShell>
  );
}

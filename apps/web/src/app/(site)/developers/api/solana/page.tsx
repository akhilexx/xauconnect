import { DevDocsShell } from "@/components/developers/dev-docs-shell";

export default function ApiSolanaPage() {
  return (
    <DevDocsShell
      title="Solana execution"
      description="How Solana swaps differ from EVM: no approvals, a base64 VersionedTransaction to sign, and server-side broadcast."
    >
      <p>
        Solana swaps follow the same <code>quote → build → sign → record</code> shape as EVM, with
        three differences: there is <strong className="text-ink">no separate token approval</strong>,
        the build returns a base64 <code>VersionedTransaction</code>, and you broadcast through the
        API rather than a browser RPC.
      </p>

      <h2>1. Quote &amp; build</h2>
      <p>
        Call <code>POST /swap/quote</code> with <code>chainKey: &quot;solana&quot;</code> and SPL mint
        addresses for <code>tokenIn</code>/<code>tokenOut</code> (use the native SOL mint for SOL).
        Then <code>POST /swap/build</code> with the chosen route. Jupiter builds an unsigned{" "}
        <code>VersionedTransaction</code>, returned as base64 in <code>solanaTransaction</code>.
      </p>

      <h2>2. Sign</h2>
      <p>Deserialize, sign with the user's wallet (Phantom, Solflare) or a local keypair, and re-serialize:</p>
      <pre>{`import { VersionedTransaction } from "@solana/web3.js";

const tx = VersionedTransaction.deserialize(Buffer.from(solanaTransaction, "base64"));
tx.sign([keypair]);                 // or wallet.signTransaction(tx)
const signed = Buffer.from(tx.serialize()).toString("base64");`}</pre>

      <h2>3. Submit</h2>
      <pre>{`POST /api/swap/submit-solana
{ "signedTransaction": "<base64>" }
→ { "signature": "<txid>", "confirmed": true }`}</pre>
      <p>
        Server-side broadcast (via Helius RPC) avoids the 403 errors public Solana endpoints return to
        browsers and gives more reliable confirmation. On failure the API returns a{" "}
        <code>SOLANA_SUBMIT_FAILED</code> (or more specific) code with HTTP 503.
      </p>

      <h2>Tips</h2>
      <ul>
        <li>Keep a small SOL balance for priority fees, especially during congested mints.</li>
        <li>Solana transactions reference a recent blockhash that expires — sign and submit promptly, or re-build.</li>
        <li>Record the swap with <code>POST /swap/record</code> (<code>chainKey: &quot;solana&quot;</code>) for attribution.</li>
      </ul>
    </DevDocsShell>
  );
}

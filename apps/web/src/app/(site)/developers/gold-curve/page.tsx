import Link from "next/link";
import { DevDocsShell } from "@/components/developers/dev-docs-shell";

export default function GoldCurveDocsPage() {
  return (
    <DevDocsShell
      title="Gold Curve"
      description="Launch a Solana token on a published Meteora Dynamic Bonding Curve. The API returns an unsigned transaction. The creator wallet signs it."
    >
      <p>
        Gold Curve is the XAUConnect launchpad on Meteora. Six partner configs are already live on
        mainnet. A launch picks one preset and one quote. The economics of that preset are the same
        for every token that uses it.
      </p>

      <h2>Presets</h2>
      <ul>
        <li>
          <strong>Fair</strong> uses one segment, even liquidity, and a fixed 1% fee.
        </li>
        <li>
          <strong>Shield</strong> starts the fee at 50% and decays to 1% over 10 minutes (10 periods
          of 60 seconds).
        </li>
        <li>
          <strong>Distribute</strong> uses three segments with liquidity weights 1, 4, and 1, and a
          fixed 1% fee.
        </li>
      </ul>
      <p>
        Quote is <code>sol</code> or <code>usdc</code>. Graduation is exactly 10 SOL or 750 USDC.
        Supply is 1,000,000,000 tokens with 6 decimals. Metadata is immutable and the mint has no
        mint authority. At graduation, 20% of supply is in the pool and the migrated LP is
        permanently locked, split 50/50 between the creator and the partner. The creator receives
        50% of bonding-phase trading fees. Migration is to Meteora DAMM v2 only. After graduation,
        swaps route through Jupiter.
      </p>

      <h2>1. Prepare</h2>
      <p>
        <code>POST /api/launchpad/prepare</code> validates the launch and returns a base64 unsigned
        Solana transaction plus the mint, pool, and config addresses. No API key. The wallet must
        sign. XAUConnect never asks for a private key.
      </p>
      <pre>{`POST /api/launchpad/prepare
{
  "chainKey": "solana",
  "launchType": "bonding-curve",
  "curvePreset": "fair",
  "quote": "sol",
  "name": "XAU Gold Curve",
  "symbol": "XAUGC",
  "description": "A fair curve on SOL.",
  "totalSupply": "1000000000",
  "creator": "<wallet>",
  "firstBuyAmount": "0.05"
}`}</pre>
      <p>
        <code>curvePreset</code> is <code>fair</code>, <code>shield</code>, or <code>distribute</code>.{" "}
        <code>firstBuyAmount</code> is optional and is denominated in whole quote tokens. Solana
        names must be 32 characters or fewer and symbols 10 or fewer, uppercase alphanumerics.
        The response includes <code>solanaTransaction</code>, <code>mint</code>, <code>pool</code>,{" "}
        <code>config</code>, and <code>quoteMint</code>.
      </p>

      <h2>2. Sign and submit</h2>
      <pre>{`import { VersionedTransaction } from "@solana/web3.js";

const tx = VersionedTransaction.deserialize(
  Buffer.from(solanaTransaction, "base64"),
);
tx.sign([keypair]); // or wallet.signTransaction(tx)

const signed = Buffer.from(tx.serialize()).toString("base64");
const res = await fetch("https://xauconnect.com/api/swap/submit-solana", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ signedTransaction: signed }),
});
const { signature } = await res.json();`}</pre>

      <h2>3. Record</h2>
      <p>
        After the transaction confirms, <code>POST /api/launchpad/record</code> lists the token on
        Discover. Send the same launch body, the mint as <code>tokenAddress</code>, the signature as{" "}
        <code>deployTxHash</code>, and the <code>metadataURI</code> from prepare.
      </p>

      <h2>Read the curve</h2>
      <ul>
        <li>
          <code>GET /api/launchpad/curve/:mint</code> returns progress, quote raised, the fee now and
          the final fee, and whether the pool has migrated.
        </li>
        <li>
          <code>GET /api/launchpad/launches</code> returns recent XAU launches.
        </li>
        <li>
          <code>GET /api/launchpad/fees?creator=</code> returns unclaimed creator fees for that
          wallet.
        </li>
        <li>
          <code>POST /api/launchpad/claim</code> with <code>creator</code>, <code>pool</code>, and{" "}
          <code>kind</code> (<code>trading</code>, <code>surplus</code>, or <code>locked-lp</code>)
          returns another unsigned transaction. Submit it the same way as the create transaction.
        </li>
      </ul>

      <h2>SDK</h2>
      <pre>{`import { XauApiClient } from "@xauconnect/sdk";

const api = new XauApiClient({ baseUrl: "https://xauconnect.com/api" });

const prepared = await api.prepareLaunch({ /* launch body */ });
const { curve } = await api.goldCurve(prepared.mint!);
const { pools } = await api.goldCurveFees(creator);
const claim = await api.claimGoldCurve({
  creator,
  pool: prepared.pool!,
  kind: "trading",
});`}</pre>
      <p>
        The in-app form is at <Link href="/launchpad">/launchpad</Link>. A live example is the{" "}
        <Link href="/token/solana/HXXMuNxDShXhK6QGd4CczTgSiXr1YqNbUdpg9rTbWj5r">
          XAU Gold Curve token page
        </Link>
        .
      </p>
    </DevDocsShell>
  );
}

/**
 * Create the six mainnet Gold Curve partner configs from the fee wallet.
 *
 *   set -a && source .local/production.env && set +a
 *   pnpm exec tsx backend/scripts/create-dbc-configs.ts
 *
 * Prints public config addresses only. Never prints the fee-wallet secret.
 */
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import bs58 from "bs58";
import type { CurvePreset, CurveQuote } from "@xauconnect/utils";
import { goldCurveParameters, quoteMintFor } from "../src/services/gold-curve.js";

const PRESETS: CurvePreset[] = ["fair", "shield", "distribute"];
const QUOTES: CurveQuote[] = ["sol", "usdc"];

const ENV_NAME: Record<string, string> = {
  fair_sol: "DBC_CONFIG_FAIR_SOL",
  fair_usdc: "DBC_CONFIG_FAIR_USDC",
  shield_sol: "DBC_CONFIG_SHIELD_SOL",
  shield_usdc: "DBC_CONFIG_SHIELD_USDC",
  distribute_sol: "DBC_CONFIG_DISTRIBUTE_SOL",
  distribute_usdc: "DBC_CONFIG_DISTRIBUTE_USDC",
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function main(): Promise<void> {
  const rpc = required("RPC_SOLANA");
  const secret = required("SOLANA_FEE_COLLECTOR_KEY");
  const expectedWallet = required("SOLANA_FEE_WALLET");
  const payer = Keypair.fromSecretKey(bs58.decode(secret));
  if (payer.publicKey.toBase58() !== expectedWallet) {
    throw new Error("SOLANA_FEE_COLLECTOR_KEY does not match SOLANA_FEE_WALLET");
  }

  const connection = new Connection(rpc, "confirmed");
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`fee wallet ${payer.publicKey.toBase58()} balance ${(balance / 1e9).toFixed(4)} SOL`);
  if (balance < 40_000_000) {
    throw new Error(
      `Fee wallet has ${(balance / 1e9).toFixed(4)} SOL. Each config needs about 0.006 SOL of rent, so six configs need about 0.04 SOL.`,
    );
  }

  const client = DynamicBondingCurveClient.create(connection, "confirmed");
  const created: string[] = [];

  for (const preset of PRESETS) {
    for (const quote of QUOTES) {
      const envName = ENV_NAME[`${preset}_${quote}`]!;
      const existing = process.env[envName]?.trim();
      if (existing) {
        const info = await connection.getAccountInfo(new PublicKey(existing));
        if (info) {
          console.log(`${envName} already on-chain ${existing}`);
          created.push(`${envName}=${existing}`);
          continue;
        }
      }

      const params = goldCurveParameters(preset, quote);
      const config = Keypair.generate();
      const tx = await client.partner.createConfig({
        ...params,
        config: config.publicKey,
        feeClaimer: payer.publicKey,
        leftoverReceiver: payer.publicKey,
        payer: payer.publicKey,
        quoteMint: new PublicKey(quoteMintFor(quote)),
      });
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = payer.publicKey;
      tx.sign(payer, config);
      const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      const pubkey = config.publicKey.toBase58();
      console.log(`${envName}=${pubkey} tx=${signature}`);
      created.push(`${envName}=${pubkey}`);
    }
  }

  console.log("--- published ---");
  for (const line of created) console.log(line);
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});

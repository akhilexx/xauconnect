/**
 * Batch-create SPL fee token accounts for Jupiter platformFeeBps.
 *
 * Usage (from repo root):
 *   set -a && source .local/production.env && set +a
 *   pnpm exec tsx backend/scripts/ensure-solana-fee-atas.ts
 */
import "dotenv/config";
import { getSwapTokenCatalog, SOLANA_NATIVE_MINT } from "@xauconnect/utils";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  ensureSolanaFeeTokenAccountInitialized,
  isValidSolanaMint,
} from "../src/services/routing/solana-fee-ata.js";
import { solanaFeeWallet } from "../src/services/routing/integrator-fees.js";
import { env } from "../src/config.js";

const CREATE_DELAY_MS = 350;
const CHUNK_SIZE = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const msg = (err as Error).message ?? "";
      if (!/429|Too Many Requests|rate limit/i.test(msg)) throw err;
      await sleep(800 * (i + 1));
    }
  }
  throw last;
}

async function main() {
  if (!env.SOLANA_FEE_COLLECTOR_KEY?.trim()) {
    throw new Error("Set SOLANA_FEE_COLLECTOR_KEY (bs58 secret for SOLANA_FEE_WALLET)");
  }
  const rpc = env.RPC_SOLANA?.trim();
  if (!rpc) throw new Error("Set RPC_SOLANA");

  const feeWallet = solanaFeeWallet();
  const owner = new PublicKey(feeWallet);
  const connection = new Connection(rpc, "confirmed");
  const balance = await withRetry(() => connection.getBalance(owner));
  console.log(`Fee wallet ${feeWallet} balance: ${(balance / 1e9).toFixed(4)} SOL`);

  const catalogMints = new Set<string>();
  for (const t of getSwapTokenCatalog("solana")) {
    if (isValidSolanaMint(t.address)) catalogMints.add(t.address);
  }
  catalogMints.add(SOLANA_NATIVE_MINT);
  const mints = [...catalogMints].sort();
  console.log(`Checking ${mints.length} Solana mints…`);

  const missing: string[] = [];
  for (let i = 0; i < mints.length; i += CHUNK_SIZE) {
    const chunk = mints.slice(i, i + CHUNK_SIZE);
    const atas = chunk.map((mint) =>
      getAssociatedTokenAddressSync(
        new PublicKey(mint),
        owner,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
    const infos = await withRetry(() => connection.getMultipleAccountsInfo(atas));
    for (let j = 0; j < chunk.length; j++) {
      if (!infos[j]) missing.push(chunk[j]!);
    }
    await sleep(200);
  }

  console.log(`${mints.length - missing.length} ATAs exist, ${missing.length} to create`);
  const rentNeeded = missing.length * 0.00203928;
  console.log(`Estimated rent: ~${rentNeeded.toFixed(3)} SOL`);
  if (balance / 1e9 < rentNeeded + 0.005) {
    throw new Error(
      `Fee wallet needs ~${(rentNeeded + 0.01).toFixed(3)} SOL (has ${(balance / 1e9).toFixed(4)}). ` +
        `Send SOL to ${feeWallet} then re-run.`,
    );
  }

  let created = 0;
  let failed = 0;
  for (const mint of missing) {
    const ok = await ensureSolanaFeeTokenAccountInitialized(mint);
    if (ok) {
      created++;
      if (created % 20 === 0) {
        const bal = await withRetry(() => connection.getBalance(owner));
        console.log(`  …${created}/${missing.length} created, ${(bal / 1e9).toFixed(4)} SOL left`);
      }
    } else {
      failed++;
      console.warn(`  FAILED mint ${mint}`);
    }
    await sleep(CREATE_DELAY_MS);
  }

  console.log(`Done: ${created} created, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

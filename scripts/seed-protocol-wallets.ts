#!/usr/bin/env tsx
/**
 * Seed protocol treasury wallets from .local/protocol-wallets-public.json into Postgres.
 *
 * Usage: pnpm protocol:wallets:seed
 * Requires DATABASE_URL (loads .local/production.env when present).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_FILE = join(ROOT, ".local/protocol-wallets-public.json");
const ENV_FILE = join(ROOT, ".local/production.env");

config({ path: ENV_FILE });
config({ path: join(ROOT, ".env") });

interface RegistryRow {
  chainKey: string;
  address: string;
  purpose: string;
  label: string;
  keyRef: string;
  derivationPath: string;
  walletGroup: string;
  notes: string;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .local/production.env");
    process.exit(1);
  }
  if (!existsSync(PUBLIC_FILE)) {
    console.error(`Missing ${PUBLIC_FILE} — run pnpm protocol:wallets:generate first`);
    process.exit(1);
  }

  const doc = JSON.parse(readFileSync(PUBLIC_FILE, "utf8")) as {
    generatedAt: string;
    registry: RegistryRow[];
  };

  const db = new PrismaClient();
  let created = 0;
  let updated = 0;

  try {
    for (const row of doc.registry) {
      const existing = await db.adminWallet.findUnique({
        where: { chainKey_address: { chainKey: row.chainKey, address: row.address } },
      });

      if (existing) {
        await db.adminWallet.update({
          where: { id: existing.id },
          data: {
            label: row.label,
            purpose: row.purpose,
            keyRef: row.keyRef,
            derivationPath: row.derivationPath,
            walletGroup: row.walletGroup,
            notes: row.notes,
          },
        });
        updated += 1;
      } else {
        await db.adminWallet.create({
          data: {
            chainKey: row.chainKey,
            address: row.address,
            label: row.label,
            purpose: row.purpose,
            keyRef: row.keyRef,
            derivationPath: row.derivationPath,
            walletGroup: row.walletGroup,
            notes: row.notes,
            createdBy: "protocol:wallets:seed",
          },
        });
        created += 1;
      }
    }

    console.log(`Protocol treasury seed complete (${doc.generatedAt})`);
    console.log(`  created: ${created}`);
    console.log(`  updated: ${updated}`);
    console.log(`  total registry rows: ${doc.registry.length}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

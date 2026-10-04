/**
 * Idempotent DB bootstrap — fee configs per chain + admin wallet seeds.
 * Runs once after a successful Prisma connect.
 */
import { CHAIN_KEYS } from "@xauconnect/utils";
import type { PrismaClient } from "@prisma/client";
import { seedAdminWalletsFromEnv } from "../services/admin-wallets.js";
import { seedOnChainFeeCollectors } from "../services/seed-on-chain-wallets.js";

export async function ensureDbDefaults(client: PrismaClient): Promise<void> {
  for (const chainKey of CHAIN_KEYS) {
    const swapFeeBps = chainKey === "solana" ? 500 : 300;
    await client.feeConfig.upsert({
      where: { chainKey },
      update: {},
      create: {
        chainKey,
        swapFeeBps,
        lpFeeBps: 10,
        launchFeeNative: "10000000000000000",
        listingFeeUsd: 99,
        enabled: true,
      },
    });
  }
  await seedAdminWalletsFromEnv();
  await seedOnChainFeeCollectors(client);
}

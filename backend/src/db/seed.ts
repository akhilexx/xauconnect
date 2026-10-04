/**
 * Seed script — default fee configs per chain + a demo admin user.
 *   pnpm --filter @xauconnect/backend db:seed
 */
import { PrismaClient } from "@prisma/client";
import { CHAIN_KEYS } from "@xauconnect/utils";

const prisma = new PrismaClient();

async function main() {
  for (const chainKey of CHAIN_KEYS) {
    const swapFeeBps = chainKey === "solana" ? 500 : 300;
    await prisma.feeConfig.upsert({
      where: { chainKey },
      update: { swapFeeBps },
      create: {
        chainKey,
        swapFeeBps,
        lpFeeBps: 10,
        launchFeeNative: "10000000000000000", // 0.01 native
        listingFeeUsd: 99,
        enabled: true,
      },
    });
  }

  const admins = process.env.ADMIN_ADDRESSES?.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean) ?? [];
  for (const admin of admins) {
    await prisma.user.upsert({
      where: { address: admin },
      update: { role: "ADMIN" },
      create: { address: admin, role: "ADMIN" },
    });
    await prisma.adminWallet.upsert({
      where: { chainKey_address: { chainKey: "ethereum", address: admin } },
      update: {},
      create: { chainKey: "ethereum", address: admin, label: "Admin allowlist", purpose: "operations" },
    });
  }

  console.log("Seed complete:", CHAIN_KEYS.length, "fee configs", admins.length ? `+ ${admins.length} admin(s)` : "");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

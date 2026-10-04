import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();
  const [pools, snaps, swaps, candles, cursors] = await Promise.all([
    db.indexedPool.count(),
    db.poolSnapshot.count(),
    db.swapEvent.count(),
    db.candleBar.count(),
    db.indexerCursor.count(),
  ]);
  const recent = await db.indexedPool.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { chainKey: true, dexKey: true, baseTokenAddress: true, createdAt: true },
  });
  console.log(JSON.stringify({ pools, snaps, swaps, candles, cursors, recent }, null, 2));
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

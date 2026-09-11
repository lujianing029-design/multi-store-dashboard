import "dotenv/config";
import { SyncType } from "../src/generated/prisma";
import { prisma } from "../src/lib/db/prisma";
import { createMockAdapterRegistry } from "../src/platforms/mock";
import { sanitizeError } from "../src/platforms/security";
import { SyncOrchestrator } from "../src/workers/sync/orchestrator";
import { PrismaSyncStore } from "../src/workers/sync/prisma-store";

function parseSyncType(value: string | undefined): SyncType {
  const normalized = (value ?? "FULL").toUpperCase();
  if (!(normalized in SyncType)) {
    throw new Error("Sync type must be products, orders, refunds, or full");
  }
  return SyncType[normalized as keyof typeof SyncType];
}

async function main() {
  const requestedShopId = process.argv[2];
  const syncType = parseSyncType(process.argv[3]);
  const shops = await prisma.shop.findMany({
    where: requestedShopId ? { id: requestedShopId } : { connectionStatus: "ACTIVE" },
    select: { id: true }
  });

  if (shops.length === 0) {
    throw new Error(requestedShopId ? `Shop ${requestedShopId} was not found` : "No active shops found");
  }

  const orchestrator = new SyncOrchestrator(
    new PrismaSyncStore(prisma),
    createMockAdapterRegistry()
  );
  const rangeEnd = new Date();
  const rangeStart = new Date(rangeEnd.getTime() - 30 * 24 * 3_600_000);
  const results = await orchestrator.runShops(
    shops.map(({ id }) => ({ shopId: id, syncType, rangeStart, rangeEnd }))
  );

  for (const result of results) {
    console.info(
      `${result.shopId}: ${result.status}, fetched=${result.recordsFetched}, upserted=${result.recordsUpserted}`
    );
    if (result.error) {
      console.error(`${result.error.code}: ${result.error.message}`);
    }
  }

  if (results.some((result) => result.status === "FAILED")) {
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    const sanitized = sanitizeError(error);
    console.error(`${sanitized.code}: ${sanitized.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


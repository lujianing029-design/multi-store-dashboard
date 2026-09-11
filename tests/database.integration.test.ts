import assert from "node:assert/strict";
import test, { after } from "node:test";
import { SyncType } from "../src/generated/prisma";
import { getDashboardSnapshot } from "../src/lib/dashboard/service";
import { prisma } from "../src/lib/db/prisma";
import { DailyAggregationService } from "../src/lib/metrics/aggregation";
import { PrismaAggregationRepository } from "../src/lib/metrics/prisma-aggregation-repository";
import { getZonedRange } from "../src/lib/metrics/timezone";
import { createMockAdapterRegistry } from "../src/platforms/mock";
import { SyncOrchestrator } from "../src/workers/sync/orchestrator";
import { PrismaSyncStore } from "../src/workers/sync/prisma-store";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for integration tests");
if (process.env.DASHBOARD_DATA_MODE !== "database") {
  throw new Error("DASHBOARD_DATA_MODE=database is required for integration tests");
}

after(async () => prisma.$disconnect());

async function entityCounts() {
  const [platformProducts, platformSkus, orders, orderItems, refunds, refundItems] = await Promise.all([
    prisma.platformProduct.count(),
    prisma.platformSku.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.refund.count(),
    prisma.refundItem.count()
  ]);
  return { platformProducts, platformSkus, orders, orderItems, refunds, refundItems };
}

test("real PostgreSQL pipeline remains deterministic and idempotent", async () => {
  const applied = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
  `;
  assert.ok(Number(applied[0].count) > 0, "at least one migration must apply to the empty database");

  const [shops, products, demoListings, demoOrders, demoRefunds, credentials] = await Promise.all([
    prisma.shop.count(),
    prisma.unifiedProduct.count(),
    prisma.platformProduct.count({ where: { externalProductId: { startsWith: "DEMO-" } } }),
    prisma.order.count({ where: { externalOrderId: { startsWith: "DEMO-" } } }),
    prisma.refund.count({ where: { externalRefundId: { startsWith: "DEMO-" } } }),
    prisma.platformCredential.findMany({ select: { accessTokenEncrypted: true, refreshTokenEncrypted: true } })
  ]);
  assert.equal(shops, 3);
  assert.equal(products, 10);
  assert.equal(demoListings, 30);
  assert.ok(demoOrders > 0);
  assert.ok(demoRefunds > 0);
  assert.ok(credentials.every((row) => !row.accessTokenEncrypted && !row.refreshTokenEncrypted));

  const shopRows = await prisma.shop.findMany({ select: { id: true } });
  await prisma.syncCursor.updateMany({ data: { cursor: "demo-seed-complete" } });
  const rangeEnd = new Date();
  const rangeStart = new Date(rangeEnd.getTime() - 30 * 24 * 3_600_000);
  const orchestrator = new SyncOrchestrator(new PrismaSyncStore(prisma), createMockAdapterRegistry(), {
    maxAttempts: 1,
    sleep: async () => undefined
  });
  const inputs = shopRows.map(({ id }) => ({ shopId: id, syncType: SyncType.FULL, rangeStart, rangeEnd }));
  const firstReplay = await orchestrator.runShops(inputs);
  assert.ok(firstReplay.every((result) => result.status === "SUCCESS"));
  const afterFirst = await entityCounts();
  const secondReplay = await orchestrator.runShops(inputs);
  assert.ok(secondReplay.every((result) => result.status === "SUCCESS"));
  assert.deepEqual(await entityCounts(), afterFirst);

  const mappedProducts = await prisma.platformProduct.count({
    where: { externalProductId: { startsWith: "MOCK-" }, unifiedProductId: { not: null } }
  });
  const mappedSkus = await prisma.platformSku.count({
    where: { externalSkuId: { startsWith: "MOCK-" }, unifiedSkuId: { not: null } }
  });
  assert.equal(mappedProducts, 12);
  assert.equal(mappedSkus, 12);

  const targetShop = await prisma.shop.findFirstOrThrow({ select: { id: true, platform: true, externalShopId: true, timezone: true } });
  const cursorBefore = await prisma.syncCursor.findUniqueOrThrow({
    where: { shopId_resource: { shopId: targetShop.id, resource: "orders" } },
    select: { cursor: true }
  });
  const store = new PrismaSyncStore(prisma);
  await assert.rejects(() => store.persistOrderBatch({
    shop: targetShop,
    nextCursor: "orders:must-not-advance",
    records: [{
      externalOrderId: "CI-INVALID-MONEY",
      status: "PAID",
      paymentAmount: "not-money",
      currency: "CNY",
      items: []
    }]
  }));
  const cursorAfter = await prisma.syncCursor.findUniqueOrThrow({
    where: { shopId_resource: { shopId: targetShop.id, resource: "orders" } },
    select: { cursor: true }
  });
  assert.deepEqual(cursorAfter, cursorBefore);
  assert.equal(await prisma.order.count({ where: { externalOrderId: "CI-INVALID-MONEY" } }), 0);

  const range = getZonedRange("30d");
  const aggregation = new DailyAggregationService(new PrismaAggregationRepository(prisma));
  await aggregation.rebuild(range.startDate, range.endDate);
  const metricsAfterFirst = await prisma.dailyShopMetric.findMany({ orderBy: [{ date: "asc" }, { shopId: "asc" }] });
  const metricValues = metricsAfterFirst.map((row) => [
    row.date.toISOString(), row.shopId, row.paidGmv.toFixed(2), row.netSales.toFixed(2),
    row.paidOrders, row.unitsSold, row.refundAmount.toFixed(2), row.refundRate.toFixed(4), row.aov.toFixed(2)
  ]);
  await aggregation.rebuild(range.startDate, range.endDate);
  const metricsAfterSecond = await prisma.dailyShopMetric.findMany({ orderBy: [{ date: "asc" }, { shopId: "asc" }] });
  assert.equal(metricsAfterSecond.length, 90);
  assert.deepEqual(metricsAfterSecond.map((row) => [
    row.date.toISOString(), row.shopId, row.paidGmv.toFixed(2), row.netSales.toFixed(2),
    row.paidOrders, row.unitsSold, row.refundAmount.toFixed(2), row.refundRate.toFixed(4), row.aov.toFixed(2)
  ]), metricValues);
  assert.ok(await prisma.dailyProductMetric.count() > 0);

  const dashboard = await getDashboardSnapshot("30d");
  assert.equal(dashboard.shops.length, 3);
  assert.ok(dashboard.products.length > 0);
  assert.ok(Number(dashboard.kpis.find((kpi) => kpi.label === "支付销售额")?.value) > 0);
});


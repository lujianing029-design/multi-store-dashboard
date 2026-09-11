import assert from "node:assert/strict";
import test from "node:test";
import { Platform } from "../src/generated/prisma";
import { DailyAggregationService, type AggregationRepository, type AggregationShop, type DailyMetricValues } from "../src/lib/metrics/aggregation";

class MemoryRepository implements AggregationRepository {
  shopRows = new Map<string, DailyMetricValues>();
  productRows = new Map<string, Omit<DailyMetricValues, "aov">>();
  readonly shop: AggregationShop = { id: "shop-1", platform: Platform.DOUYIN, timezone: "Asia/Shanghai" };
  async listShops() { return [this.shop]; }
  async loadShopDay() { return { sales: [{ orderId: "o1", amount: "120.00", units: 2 }], refunds: [{ amount: "20.00" }] }; }
  async loadProductDay() { return [{ unifiedProductId: "p1", sales: [{ orderId: "o1", amount: "120.00", units: 2 }], refunds: [{ amount: "20.00" }] }]; }
  async upsertShopDay(shop: AggregationShop, date: string, values: DailyMetricValues) { this.shopRows.set(`${shop.id}:${date}`, values); }
  async upsertProductDay(shop: AggregationShop, date: string, productId: string, values: Omit<DailyMetricValues, "aov">) { this.productRows.set(`${shop.id}:${date}:${productId}`, values); }
}

test("daily aggregation is idempotent and emits decimal-safe values", async () => {
  const repository = new MemoryRepository();
  const service = new DailyAggregationService(repository);
  await service.rebuild("2026-06-17", "2026-06-18");
  await service.rebuild("2026-06-17", "2026-06-18");
  assert.equal(repository.shopRows.size, 2);
  assert.equal(repository.productRows.size, 2);
  assert.equal(repository.shopRows.get("shop-1:2026-06-18")?.netSales, "100.00");
  assert.equal(repository.shopRows.get("shop-1:2026-06-18")?.refundRate, "0.1667");
});


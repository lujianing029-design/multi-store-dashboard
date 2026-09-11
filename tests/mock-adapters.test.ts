import assert from "node:assert/strict";
import test from "node:test";
import { MockDouyinAdapter } from "../src/platforms/mock/douyin";
import { MockKuaishouAdapter } from "../src/platforms/mock/kuaishou";
import { MockWechatAdapter } from "../src/platforms/mock/wechat";
import type { CommerceAdapter, NormalizedProduct } from "../src/platforms/types";

const context = {
  shopId: "shop-1",
  externalShopId: "external-shop-1",
  timezone: "Asia/Shanghai",
  cursor: null
};

async function allProducts(adapter: CommerceAdapter): Promise<NormalizedProduct[]> {
  const records: NormalizedProduct[] = [];
  let cursor: string | null = null;
  let hasMore = true;
  while (hasMore) {
    const result = await adapter.listProducts({ ...context, cursor });
    records.push(...result.records);
    cursor = result.nextCursor;
    hasMore = result.hasMore;
  }
  return records;
}

test("mock adapters emit deterministic normalized catalogs with platform-specific titles", async () => {
  const adapters = [
    new MockDouyinAdapter(),
    new MockKuaishouAdapter(),
    new MockWechatAdapter()
  ];
  const catalogs = await Promise.all(adapters.map(allProducts));

  assert.deepEqual(catalogs.map((catalog) => catalog.length), [4, 4, 4]);
  assert.equal(new Set(catalogs.map((catalog) => catalog[0].title)).size, 3);
  assert.deepEqual(await allProducts(adapters[0]), catalogs[0]);
  assert.match(catalogs[0][0].merchantProductCode ?? "", /^SPU-/);
});

test("mock order money remains a fixed-point decimal string", async () => {
  const page = await new MockDouyinAdapter().listOrders(context);
  assert.ok(page.records.length > 0);
  for (const order of page.records) {
    assert.match(order.paymentAmount, /^\d+\.\d{2}$/);
    assert.match(order.items[0].linePaidAmount, /^\d+\.\d{2}$/);
  }
});

test("mock adapters can replace the Phase 2 seed cursor", async () => {
  const page = await new MockDouyinAdapter().listProducts({
    ...context,
    cursor: "demo-seed-complete"
  });
  assert.equal(page.records.length, 2);
  assert.equal(page.nextCursor, "products:2");
});


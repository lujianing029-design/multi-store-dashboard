import assert from "node:assert/strict";
import test from "node:test";
import { Platform, SyncStatus, SyncType } from "../src/generated/prisma";
import { MockDouyinAdapter } from "../src/platforms/mock/douyin";
import type {
  NormalizedOrder,
  NormalizedProduct,
  NormalizedRefund,
  SyncResource
} from "../src/platforms/types";
import { SyncOrchestrator } from "../src/workers/sync/orchestrator";
import type { BatchInput, SyncCounts, SyncShop, SyncStore } from "../src/workers/sync/store";

class MemorySyncStore implements SyncStore {
  readonly shop: SyncShop = {
    id: "shop-1",
    platform: Platform.DOUYIN,
    externalShopId: "external-shop-1",
    timezone: "Asia/Shanghai"
  };
  readonly products = new Map<string, NormalizedProduct>();
  readonly orders = new Map<string, NormalizedOrder>();
  readonly refunds = new Map<string, NormalizedRefund>();
  readonly cursors = new Map<string, string | null>();
  readonly failedRuns: Array<{ counts: SyncCounts; error: { code: string; message: string } }> = [];
  lastSuccessfulSyncAt?: Date;
  failOn?: SyncResource;
  private runSequence = 0;

  async getShop(shopId: string) {
    return shopId === this.shop.id ? this.shop : null;
  }

  async createRun() {
    this.runSequence += 1;
    return `run-${this.runSequence}`;
  }

  async getCursor(shopId: string, resource: SyncResource) {
    return this.cursors.get(`${shopId}:${resource}`) ?? null;
  }

  async persistProductBatch(input: BatchInput<NormalizedProduct>) {
    return this.persist("products", input, this.products, (record) => record.externalProductId);
  }

  async persistOrderBatch(input: BatchInput<NormalizedOrder>) {
    return this.persist("orders", input, this.orders, (record) => record.externalOrderId);
  }

  async persistRefundBatch(input: BatchInput<NormalizedRefund>) {
    return this.persist("refunds", input, this.refunds, (record) => record.externalRefundId);
  }

  async completeRun(_runId: string, _shopId: string, _counts: SyncCounts, finishedAt: Date) {
    this.lastSuccessfulSyncAt = finishedAt;
  }

  async failRun(
    _runId: string,
    counts: SyncCounts,
    error: { code: string; message: string }
  ) {
    this.failedRuns.push({ counts: { ...counts }, error });
  }

  resetCursors() {
    this.cursors.clear();
  }

  private async persist<T>(
    resource: SyncResource,
    input: BatchInput<T>,
    target: Map<string, T>,
    key: (record: T) => string
  ) {
    if (this.failOn === resource) {
      throw new Error("database write failed token=not-safe");
    }
    for (const record of input.records) target.set(key(record), record);
    this.cursors.set(`${input.shop.id}:${resource}`, input.nextCursor);
    return input.records.length;
  }
}

function createOrchestrator(store: MemorySyncStore) {
  return new SyncOrchestrator(
    store,
    new Map([[Platform.DOUYIN, new MockDouyinAdapter()]]),
    { maxAttempts: 1 }
  );
}

test("full sync advances each cursor and remains idempotent when replayed", async () => {
  const store = new MemorySyncStore();
  const orchestrator = createOrchestrator(store);
  const first = await orchestrator.runShop({ shopId: store.shop.id, syncType: SyncType.FULL });

  assert.equal(first.status, SyncStatus.SUCCESS);
  assert.equal(first.recordsFetched, 14);
  assert.equal(store.products.size, 4);
  assert.equal(store.orders.size, 8);
  assert.equal(store.refunds.size, 2);
  assert.equal(store.cursors.get("shop-1:refunds"), "refunds:done");
  assert.ok(store.lastSuccessfulSyncAt);

  store.resetCursors();
  const second = await orchestrator.runShop({ shopId: store.shop.id, syncType: SyncType.FULL });
  assert.equal(second.status, SyncStatus.SUCCESS);
  assert.deepEqual([store.products.size, store.orders.size, store.refunds.size], [4, 8, 2]);
});

test("a failed batch does not advance its cursor or mark the shop successful", async () => {
  const store = new MemorySyncStore();
  store.failOn = "orders";
  const result = await createOrchestrator(store).runShop({
    shopId: store.shop.id,
    syncType: SyncType.FULL
  });

  assert.equal(result.status, SyncStatus.FAILED);
  assert.equal(store.cursors.get("shop-1:products"), "products:done");
  assert.equal(store.cursors.has("shop-1:orders"), false);
  assert.equal(store.cursors.has("shop-1:refunds"), false);
  assert.equal(store.lastSuccessfulSyncAt, undefined);
  assert.equal(result.error?.message.includes("not-safe"), false);
  assert.equal(store.failedRuns.length, 1);
});


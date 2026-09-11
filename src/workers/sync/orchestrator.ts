import { SyncStatus, SyncType, type Platform } from "@/generated/prisma";
import { withRetry, type RetryOptions } from "@/platforms/retry";
import { sanitizeError, SyncError } from "@/platforms/security";
import type {
  AdapterPage,
  CommerceAdapter,
  NormalizedOrder,
  NormalizedProduct,
  NormalizedRefund,
  ShopSyncContext,
  SyncResource
} from "@/platforms/types";
import type { SyncCounts, SyncShop, SyncStore } from "@/workers/sync/store";

interface SyncInput {
  shopId: string;
  syncType: SyncType;
  rangeStart?: Date;
  rangeEnd?: Date;
}

export interface SyncExecutionResult extends SyncCounts {
  runId: string;
  shopId: string;
  status: typeof SyncStatus.SUCCESS | typeof SyncStatus.FAILED;
  error?: { code: string; message: string };
}

type ResourceRecord = NormalizedProduct | NormalizedOrder | NormalizedRefund;

const resourcesByType: Record<SyncType, SyncResource[]> = {
  PRODUCTS: ["products"],
  ORDERS: ["orders"],
  REFUNDS: ["refunds"],
  FULL: ["products", "orders", "refunds"]
};

export class SyncOrchestrator {
  constructor(
    private readonly store: SyncStore,
    private readonly adapters: ReadonlyMap<Platform, CommerceAdapter>,
    private readonly retryOptions: RetryOptions = {}
  ) {}

  async runShop(input: SyncInput): Promise<SyncExecutionResult> {
    const shop = await this.store.getShop(input.shopId);
    if (!shop) {
      throw new SyncError("SHOP_NOT_FOUND", `Shop ${input.shopId} was not found`);
    }
    const adapter = this.adapters.get(shop.platform);
    if (!adapter) {
      throw new SyncError("ADAPTER_NOT_FOUND", `No adapter registered for ${shop.platform}`);
    }

    const runId = await this.store.createRun({ shop, ...input });
    const counts: SyncCounts = { recordsFetched: 0, recordsUpserted: 0 };

    try {
      const health = await withRetry(
        () =>
          adapter.validateConnection({
            shopId: shop.id,
            externalShopId: shop.externalShopId,
            timezone: shop.timezone,
            rangeStart: input.rangeStart,
            rangeEnd: input.rangeEnd
          }),
        this.retryOptions
      );
      if (health.state !== "CONNECTED") {
        throw new SyncError("CONNECTION_UNHEALTHY", health.message ?? health.state);
      }

      for (const resource of resourcesByType[input.syncType]) {
        await this.syncResource(adapter, shop, resource, input, counts);
      }

      const finishedAt = new Date();
      await this.store.completeRun(runId, shop.id, counts, finishedAt);
      return { runId, shopId: shop.id, status: SyncStatus.SUCCESS, ...counts };
    } catch (error) {
      const sanitized = sanitizeError(error);
      await this.store.failRun(runId, counts, sanitized, new Date());
      return {
        runId,
        shopId: shop.id,
        status: SyncStatus.FAILED,
        ...counts,
        error: sanitized
      };
    }
  }

  async runShops(inputs: SyncInput[]): Promise<SyncExecutionResult[]> {
    return Promise.all(inputs.map((input) => this.runShop(input)));
  }

  private async syncResource(
    adapter: CommerceAdapter,
    shop: SyncShop,
    resource: SyncResource,
    input: SyncInput,
    counts: SyncCounts
  ) {
    let cursor = await this.store.getCursor(shop.id, resource);
    let hasMore = true;
    let pageCount = 0;

    while (hasMore) {
      if (pageCount >= 1_000) {
        throw new SyncError("PAGE_LIMIT_EXCEEDED", `${resource} exceeded the page safety limit`);
      }
      pageCount += 1;

      const context: ShopSyncContext = {
        shopId: shop.id,
        externalShopId: shop.externalShopId,
        timezone: shop.timezone,
        cursor,
        rangeStart: input.rangeStart,
        rangeEnd: input.rangeEnd
      };
      const result = await withRetry(() => this.fetchPage(adapter, resource, context), {
        ...this.retryOptions,
        shouldRetry: (error) =>
          !(error instanceof SyncError && error.code === "INVALID_CURSOR") &&
          (this.retryOptions.shouldRetry?.(error) ?? true)
      });

      counts.recordsFetched += result.records.length;
      counts.recordsUpserted += await this.persistPage(resource, shop, result);

      if (result.hasMore && result.nextCursor === cursor) {
        throw new SyncError("CURSOR_STALLED", `${resource} returned a non-advancing cursor`);
      }
      cursor = result.nextCursor;
      hasMore = result.hasMore;
    }
  }

  private fetchPage(
    adapter: CommerceAdapter,
    resource: SyncResource,
    context: ShopSyncContext
  ): Promise<AdapterPage<ResourceRecord>> {
    switch (resource) {
      case "products":
        return adapter.listProducts(context);
      case "orders":
        return adapter.listOrders(context);
      case "refunds":
        return adapter.listRefunds(context);
    }
  }

  private persistPage(
    resource: SyncResource,
    shop: SyncShop,
    page: AdapterPage<ResourceRecord>
  ): Promise<number> {
    switch (resource) {
      case "products":
        return this.store.persistProductBatch({
          shop,
          records: page.records as NormalizedProduct[],
          nextCursor: page.nextCursor
        });
      case "orders":
        return this.store.persistOrderBatch({
          shop,
          records: page.records as NormalizedOrder[],
          nextCursor: page.nextCursor
        });
      case "refunds":
        return this.store.persistRefundBatch({
          shop,
          records: page.records as NormalizedRefund[],
          nextCursor: page.nextCursor
        });
    }
  }
}


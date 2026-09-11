import type { Platform, SyncType } from "@/generated/prisma";
import type {
  NormalizedOrder,
  NormalizedProduct,
  NormalizedRefund,
  SyncResource
} from "@/platforms/types";

export interface SyncShop {
  id: string;
  platform: Platform;
  externalShopId: string;
  timezone: string;
}

export interface SyncCounts {
  recordsFetched: number;
  recordsUpserted: number;
}

export interface BatchInput<T> {
  shop: SyncShop;
  records: T[];
  nextCursor: string | null;
}

export interface SyncStore {
  getShop(shopId: string): Promise<SyncShop | null>;
  createRun(input: {
    shop: SyncShop;
    syncType: SyncType;
    rangeStart?: Date;
    rangeEnd?: Date;
  }): Promise<string>;
  getCursor(shopId: string, resource: SyncResource): Promise<string | null>;
  persistProductBatch(input: BatchInput<NormalizedProduct>): Promise<number>;
  persistOrderBatch(input: BatchInput<NormalizedOrder>): Promise<number>;
  persistRefundBatch(input: BatchInput<NormalizedRefund>): Promise<number>;
  completeRun(runId: string, shopId: string, counts: SyncCounts, finishedAt: Date): Promise<void>;
  failRun(
    runId: string,
    counts: SyncCounts,
    error: { code: string; message: string },
    finishedAt: Date
  ): Promise<void>;
}


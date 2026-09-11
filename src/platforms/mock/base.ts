import { Platform } from "@/generated/prisma";
import { SyncError } from "@/platforms/security";
import { fenToDecimalString } from "@/platforms/money";
import type {
  AdapterPage,
  CommerceAdapter,
  ConnectionHealth,
  NormalizedOrder,
  NormalizedProduct,
  NormalizedRefund,
  ShopSyncContext,
  SyncResource
} from "@/platforms/types";

interface MockPlatformConfig {
  platform: Platform;
  externalPrefix: string;
  titlePrefix: string;
  orderCount: number;
  refundEvery: number;
}

const catalog = [
  { code: "SPU-001", sku: "SKU-001-WHITE", name: "轻氧保温杯", priceFen: 12900 },
  { code: "SPU-004", sku: "SKU-004-BOX", name: "谷物早餐组合", priceFen: 8900 },
  { code: "SPU-007", sku: "SKU-007-SET", name: "山茶花护手霜", priceFen: 7900 },
  { code: "SPU-009", sku: "SKU-009-CEDAR", name: "原木香薰礼盒", priceFen: 16900 }
] as const;

function page<T>(resource: SyncResource, records: T[], cursor: string | null): AdapterPage<T> {
  if (cursor === `${resource}:done`) {
    return { records: [], nextCursor: cursor, hasMore: false };
  }

  const offset = cursor === null || cursor === "demo-seed-complete"
    ? 0
    : Number(cursor.replace(`${resource}:`, ""));
  const isKnownCursor =
    cursor === null || cursor === "demo-seed-complete" || cursor.startsWith(`${resource}:`);
  if (!Number.isInteger(offset) || offset < 0 || !isKnownCursor) {
    throw new SyncError("INVALID_CURSOR", `Invalid ${resource} cursor`);
  }

  const batch = records.slice(offset, offset + 2);
  const nextOffset = offset + batch.length;
  const hasMore = nextOffset < records.length;
  return {
    records: batch,
    nextCursor: hasMore ? `${resource}:${nextOffset}` : `${resource}:done`,
    hasMore
  };
}

export abstract class DeterministicMockAdapter implements CommerceAdapter {
  readonly platform: Platform;
  private readonly config: MockPlatformConfig;

  protected constructor(config: MockPlatformConfig) {
    this.platform = config.platform;
    this.config = config;
  }

  async validateConnection(): Promise<ConnectionHealth> {
    return { state: "CONNECTED", checkedAt: new Date(0) };
  }

  async refreshAuthorization(): Promise<ConnectionHealth> {
    return this.validateConnection();
  }

  async listProducts(context: ShopSyncContext): Promise<AdapterPage<NormalizedProduct>> {
    const records = catalog.map((product, index) => ({
      externalProductId: `${this.config.externalPrefix}-PRODUCT-${index + 1}`,
      title: `${this.config.titlePrefix}｜${product.name}`,
      merchantProductCode: product.code,
      status: "ON_SALE",
      skus: [
        {
          externalSkuId: `${this.config.externalPrefix}-SKU-${index + 1}`,
          merchantSkuCode: product.sku,
          title: `${product.name} 默认规格`,
          attributes: { specification: product.sku.split("-").at(-1) ?? "default" },
          rawPayload: { source: "mock-adapter", ordinal: index + 1 }
        }
      ],
      rawPayload: {
        source: "mock-adapter",
        shopReference: context.externalShopId,
        ordinal: index + 1
      }
    }));
    return page("products", records, context.cursor);
  }

  async listOrders(context: ShopSyncContext): Promise<AdapterPage<NormalizedOrder>> {
    const anchor = new Date(context.rangeEnd ?? "2026-01-30T12:00:00.000Z");
    const records = Array.from({ length: this.config.orderCount }, (_, index) => {
      const product = catalog[index % catalog.length];
      const quantity = index % 3 === 0 ? 2 : 1;
      const paidFen = product.priceFen * quantity;
      const paidAt = new Date(anchor.getTime() - index * 3_600_000);
      const externalOrderId = `${this.config.externalPrefix}-ORDER-${index + 1}`;

      return {
        externalOrderId,
        status: "PAID",
        paidAt,
        createdExternalAt: new Date(paidAt.getTime() - 300_000),
        updatedExternalAt: paidAt,
        paymentAmount: fenToDecimalString(paidFen),
        buyerPaidAmount: fenToDecimalString(paidFen),
        currency: "CNY",
        items: [
          {
            externalOrderLineId: `${externalOrderId}-LINE-1`,
            externalProductId: `${this.config.externalPrefix}-PRODUCT-${(index % catalog.length) + 1}`,
            externalSkuId: `${this.config.externalPrefix}-SKU-${(index % catalog.length) + 1}`,
            quantity,
            unitPaidAmount: fenToDecimalString(product.priceFen),
            linePaidAmount: fenToDecimalString(paidFen),
            merchantProductCode: product.code,
            merchantSkuCode: product.sku
          }
        ],
        rawPayload: { source: "mock-adapter", sequence: index + 1 }
      };
    });
    return page("orders", records, context.cursor);
  }

  async listRefunds(context: ShopSyncContext): Promise<AdapterPage<NormalizedRefund>> {
    const anchor = new Date(context.rangeEnd ?? "2026-01-30T12:00:00.000Z");
    const records = Array.from(
      { length: Math.floor(this.config.orderCount / this.config.refundEvery) },
      (_, refundIndex) => {
        const orderIndex = (refundIndex + 1) * this.config.refundEvery - 1;
        const product = catalog[orderIndex % catalog.length];
        const quantity = orderIndex % 3 === 0 ? 2 : 1;
        const refundAmount = fenToDecimalString(product.priceFen * quantity);
        const externalOrderId = `${this.config.externalPrefix}-ORDER-${orderIndex + 1}`;
        const externalOrderLineId = `${externalOrderId}-LINE-1`;

        return {
          externalRefundId: `${this.config.externalPrefix}-REFUND-${refundIndex + 1}`,
          externalOrderId,
          externalOrderLineId,
          status: "APPROVED",
          refundAmount,
          approvedAt: new Date(anchor.getTime() + (refundIndex + 1) * 3_600_000),
          updatedExternalAt: new Date(anchor.getTime() + (refundIndex + 1) * 3_600_000),
          items: [
            {
              externalRefundLineId: `${this.config.externalPrefix}-REFUND-${refundIndex + 1}-LINE-1`,
              externalOrderLineId,
              externalProductId: `${this.config.externalPrefix}-PRODUCT-${(orderIndex % catalog.length) + 1}`,
              externalSkuId: `${this.config.externalPrefix}-SKU-${(orderIndex % catalog.length) + 1}`,
              quantity,
              refundAmount
            }
          ],
          rawPayload: { source: "mock-adapter", reason: "demo-return" }
        };
      }
    );
    return page("refunds", records, context.cursor);
  }
}


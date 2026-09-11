import {
  MappingStatus,
  Prisma,
  type PrismaClient,
  SyncStatus
} from "@/generated/prisma";
import { sanitizeRawPayload, SyncError } from "@/platforms/security";
import type {
  NormalizedOrderItem,
  NormalizedRefundItem,
  SyncResource
} from "@/platforms/types";
import type { SyncCounts, SyncShop, SyncStore } from "@/workers/sync/store";

function decimal(value: string): Prisma.Decimal {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new SyncError("INVALID_MONEY", `Invalid decimal money value: ${value}`);
  }
  return new Prisma.Decimal(value);
}

function json(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  return value ? (sanitizeRawPayload(value) as Prisma.InputJsonValue) : undefined;
}

async function resolveOrderItemRelations(
  tx: Prisma.TransactionClient,
  shopId: string,
  item: NormalizedOrderItem | NormalizedRefundItem
) {
  const platformProduct = item.externalProductId
    ? await tx.platformProduct.findUnique({
        where: {
          shopId_externalProductId: { shopId, externalProductId: item.externalProductId }
        }
      })
    : null;
  const platformSku =
    platformProduct && item.externalSkuId
      ? await tx.platformSku.findUnique({
          where: {
            platformProductId_externalSkuId: {
              platformProductId: platformProduct.id,
              externalSkuId: item.externalSkuId
            }
          }
        })
      : null;
  const unifiedProduct =
    "merchantProductCode" in item && item.merchantProductCode
      ? await tx.unifiedProduct.findFirst({
          where: { merchantProductCode: item.merchantProductCode, active: true }
        })
      : null;
  const unifiedSku =
    unifiedProduct && "merchantSkuCode" in item && item.merchantSkuCode
      ? await tx.unifiedSku.findFirst({
          where: {
            unifiedProductId: unifiedProduct.id,
            merchantSkuCode: item.merchantSkuCode
          }
        })
      : platformSku?.unifiedSkuId
        ? await tx.unifiedSku.findUnique({ where: { id: platformSku.unifiedSkuId } })
        : null;

  return {
    platformProductId: platformProduct?.id ?? null,
    platformSkuId: platformSku?.id ?? null,
    unifiedProductId: unifiedProduct?.id ?? platformProduct?.unifiedProductId ?? null,
    unifiedSkuId: unifiedSku?.id ?? null
  };
}

export class PrismaSyncStore implements SyncStore {
  constructor(private readonly prisma: PrismaClient) {}

  async getShop(shopId: string): Promise<SyncShop | null> {
    return this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, platform: true, externalShopId: true, timezone: true }
    });
  }

  async createRun(input: Parameters<SyncStore["createRun"]>[0]): Promise<string> {
    const run = await this.prisma.syncRun.create({
      data: {
        shopId: input.shop.id,
        platform: input.shop.platform,
        syncType: input.syncType,
        status: SyncStatus.RUNNING,
        rangeStart: input.rangeStart,
        rangeEnd: input.rangeEnd
      },
      select: { id: true }
    });
    return run.id;
  }

  async getCursor(shopId: string, resource: SyncResource): Promise<string | null> {
    const cursor = await this.prisma.syncCursor.findUnique({
      where: { shopId_resource: { shopId, resource } },
      select: { cursor: true }
    });
    return cursor?.cursor ?? null;
  }

  async persistProductBatch(input: Parameters<SyncStore["persistProductBatch"]>[0]) {
    return this.prisma.$transaction(async (tx) => {
      for (const product of input.records) {
        const existingProduct = await tx.platformProduct.findUnique({
          where: {
            shopId_externalProductId: {
              shopId: input.shop.id,
              externalProductId: product.externalProductId
            }
          }
        });
        const unifiedProduct = product.merchantProductCode
          ? await tx.unifiedProduct.findFirst({
              where: { merchantProductCode: product.merchantProductCode, active: true }
            })
          : null;
        const preserveManualMapping = existingProduct?.mappingStatus === MappingStatus.MANUAL;
        const unifiedProductId = preserveManualMapping
          ? existingProduct.unifiedProductId
          : (unifiedProduct?.id ?? null);
        const mappingStatus = preserveManualMapping
          ? MappingStatus.MANUAL
          : unifiedProduct
            ? MappingStatus.AUTO_MATCHED
            : MappingStatus.UNMATCHED;
        const platformProduct = await tx.platformProduct.upsert({
          where: {
            shopId_externalProductId: {
              shopId: input.shop.id,
              externalProductId: product.externalProductId
            }
          },
          update: {
            title: product.title,
            merchantProductCode: product.merchantProductCode,
            imageUrl: product.imageUrl,
            status: product.status,
            rawPayload: json(product.rawPayload),
            unifiedProductId,
            mappingStatus
          },
          create: {
            shopId: input.shop.id,
            externalProductId: product.externalProductId,
            title: product.title,
            merchantProductCode: product.merchantProductCode,
            imageUrl: product.imageUrl,
            status: product.status,
            rawPayload: json(product.rawPayload),
            unifiedProductId,
            mappingStatus
          }
        });

        for (const sku of product.skus) {
          const existingSku = await tx.platformSku.findUnique({
            where: {
              platformProductId_externalSkuId: {
                platformProductId: platformProduct.id,
                externalSkuId: sku.externalSkuId
              }
            }
          });
          const unifiedSku =
            unifiedProduct && sku.merchantSkuCode
              ? await tx.unifiedSku.findFirst({
                  where: {
                    unifiedProductId: unifiedProduct.id,
                    merchantSkuCode: sku.merchantSkuCode
                  }
                })
              : null;
          await tx.platformSku.upsert({
            where: {
              platformProductId_externalSkuId: {
                platformProductId: platformProduct.id,
                externalSkuId: sku.externalSkuId
              }
            },
            update: {
              merchantSkuCode: sku.merchantSkuCode,
              title: sku.title,
              attributes: sku.attributes,
              unifiedSkuId: unifiedSku?.id ?? existingSku?.unifiedSkuId ?? null,
              rawPayload: json(sku.rawPayload)
            },
            create: {
              platformProductId: platformProduct.id,
              externalSkuId: sku.externalSkuId,
              merchantSkuCode: sku.merchantSkuCode,
              title: sku.title,
              attributes: sku.attributes,
              unifiedSkuId: unifiedSku?.id,
              rawPayload: json(sku.rawPayload)
            }
          });
        }
      }

      await this.advanceCursor(tx, input.shop.id, "products", input.nextCursor);
      return input.records.length;
    });
  }

  async persistOrderBatch(input: Parameters<SyncStore["persistOrderBatch"]>[0]) {
    return this.prisma.$transaction(async (tx) => {
      for (const order of input.records) {
        const persistedOrder = await tx.order.upsert({
          where: {
            shopId_externalOrderId: {
              shopId: input.shop.id,
              externalOrderId: order.externalOrderId
            }
          },
          update: {
            status: order.status,
            paidAt: order.paidAt,
            createdExternalAt: order.createdExternalAt,
            updatedExternalAt: order.updatedExternalAt,
            paymentAmount: decimal(order.paymentAmount),
            buyerPaidAmount: order.buyerPaidAmount ? decimal(order.buyerPaidAmount) : undefined,
            currency: order.currency,
            rawPayload: json(order.rawPayload)
          },
          create: {
            shopId: input.shop.id,
            externalOrderId: order.externalOrderId,
            status: order.status,
            paidAt: order.paidAt,
            createdExternalAt: order.createdExternalAt,
            updatedExternalAt: order.updatedExternalAt,
            paymentAmount: decimal(order.paymentAmount),
            buyerPaidAmount: order.buyerPaidAmount ? decimal(order.buyerPaidAmount) : undefined,
            currency: order.currency,
            rawPayload: json(order.rawPayload)
          }
        });

        for (const item of order.items) {
          const relations = await resolveOrderItemRelations(tx, input.shop.id, item);
          await tx.orderItem.upsert({
            where: {
              orderId_externalOrderLineId: {
                orderId: persistedOrder.id,
                externalOrderLineId: item.externalOrderLineId
              }
            },
            update: {
              ...relations,
              quantity: item.quantity,
              unitPaidAmount: item.unitPaidAmount ? decimal(item.unitPaidAmount) : undefined,
              linePaidAmount: decimal(item.linePaidAmount),
              merchantProductCode: item.merchantProductCode,
              merchantSkuCode: item.merchantSkuCode
            },
            create: {
              orderId: persistedOrder.id,
              externalOrderLineId: item.externalOrderLineId,
              ...relations,
              quantity: item.quantity,
              unitPaidAmount: item.unitPaidAmount ? decimal(item.unitPaidAmount) : undefined,
              linePaidAmount: decimal(item.linePaidAmount),
              merchantProductCode: item.merchantProductCode,
              merchantSkuCode: item.merchantSkuCode
            }
          });
        }
      }

      await this.advanceCursor(tx, input.shop.id, "orders", input.nextCursor);
      return input.records.length;
    });
  }

  async persistRefundBatch(input: Parameters<SyncStore["persistRefundBatch"]>[0]) {
    return this.prisma.$transaction(async (tx) => {
      for (const refund of input.records) {
        const order = refund.externalOrderId
          ? await tx.order.findUnique({
              where: {
                shopId_externalOrderId: {
                  shopId: input.shop.id,
                  externalOrderId: refund.externalOrderId
                }
              }
            })
          : null;
        const orderItem =
          order && refund.externalOrderLineId
            ? await tx.orderItem.findUnique({
                where: {
                  orderId_externalOrderLineId: {
                    orderId: order.id,
                    externalOrderLineId: refund.externalOrderLineId
                  }
                }
              })
            : null;
        const persistedRefund = await tx.refund.upsert({
          where: {
            shopId_externalRefundId: {
              shopId: input.shop.id,
              externalRefundId: refund.externalRefundId
            }
          },
          update: {
            orderId: order?.id ?? null,
            orderItemId: orderItem?.id ?? null,
            status: refund.status,
            refundAmount: decimal(refund.refundAmount),
            approvedAt: refund.approvedAt,
            updatedExternalAt: refund.updatedExternalAt,
            rawPayload: json(refund.rawPayload)
          },
          create: {
            shopId: input.shop.id,
            orderId: order?.id,
            orderItemId: orderItem?.id,
            externalRefundId: refund.externalRefundId,
            status: refund.status,
            refundAmount: decimal(refund.refundAmount),
            approvedAt: refund.approvedAt,
            updatedExternalAt: refund.updatedExternalAt,
            rawPayload: json(refund.rawPayload)
          }
        });

        for (const item of refund.items) {
          const relations = await resolveOrderItemRelations(tx, input.shop.id, item);
          const relatedOrderItem =
            order && item.externalOrderLineId
              ? await tx.orderItem.findUnique({
                  where: {
                    orderId_externalOrderLineId: {
                      orderId: order.id,
                      externalOrderLineId: item.externalOrderLineId
                    }
                  }
                })
              : null;
          await tx.refundItem.upsert({
            where: {
              refundId_externalRefundLineId: {
                refundId: persistedRefund.id,
                externalRefundLineId: item.externalRefundLineId
              }
            },
            update: {
              ...relations,
              orderItemId: relatedOrderItem?.id ?? null,
              quantity: item.quantity,
              refundAmount: decimal(item.refundAmount)
            },
            create: {
              refundId: persistedRefund.id,
              externalRefundLineId: item.externalRefundLineId,
              ...relations,
              orderItemId: relatedOrderItem?.id,
              quantity: item.quantity,
              refundAmount: decimal(item.refundAmount)
            }
          });
        }
      }

      await this.advanceCursor(tx, input.shop.id, "refunds", input.nextCursor);
      return input.records.length;
    });
  }

  async completeRun(runId: string, shopId: string, counts: SyncCounts, finishedAt: Date) {
    await this.prisma.$transaction([
      this.prisma.syncRun.update({
        where: { id: runId },
        data: { status: SyncStatus.SUCCESS, finishedAt, ...counts }
      }),
      this.prisma.shop.update({
        where: { id: shopId },
        data: { lastSuccessfulSyncAt: finishedAt }
      })
    ]);
  }

  async failRun(
    runId: string,
    counts: SyncCounts,
    error: { code: string; message: string },
    finishedAt: Date
  ) {
    await this.prisma.syncRun.update({
      where: { id: runId },
      data: {
        status: SyncStatus.FAILED,
        finishedAt,
        ...counts,
        errorCode: error.code,
        errorMessage: error.message
      }
    });
  }

  private async advanceCursor(
    tx: Prisma.TransactionClient,
    shopId: string,
    resource: SyncResource,
    cursor: string | null
  ) {
    await tx.syncCursor.upsert({
      where: { shopId_resource: { shopId, resource } },
      update: { cursor, lastSyncedExternalUpdatedAt: new Date() },
      create: { shopId, resource, cursor, lastSyncedExternalUpdatedAt: new Date() }
    });
  }
}


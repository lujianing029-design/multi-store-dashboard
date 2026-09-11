import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ConnectionStatus,
  MappingStatus,
  Platform,
  Prisma,
  PrismaClient,
  SyncStatus,
  SyncType
} from "../src/generated/prisma";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl })
});

const appTimezone = process.env.APP_TIMEZONE || "Asia/Shanghai";

const products = [
  { name: "轻氧保温杯", code: "SPU-001", sku: "SKU-001-WHITE", priceFen: 12900, costFen: 4600, category: "家居", favoredBy: Platform.DOUYIN },
  { name: "云感防晒外套", code: "SPU-002", sku: "SKU-002-M", priceFen: 19900, costFen: 7200, category: "服饰", favoredBy: Platform.DOUYIN },
  { name: "便携榨汁杯", code: "SPU-003", sku: "SKU-003-GREEN", priceFen: 15900, costFen: 6100, category: "小家电", favoredBy: Platform.DOUYIN },
  { name: "谷物早餐组合", code: "SPU-004", sku: "SKU-004-BOX", priceFen: 8900, costFen: 3900, category: "食品", favoredBy: Platform.KUAISHOU },
  { name: "厚底居家拖鞋", code: "SPU-005", sku: "SKU-005-40", priceFen: 5900, costFen: 2100, category: "家居", favoredBy: Platform.KUAISHOU },
  { name: "高弹瑜伽裤", code: "SPU-006", sku: "SKU-006-L", priceFen: 13900, costFen: 5000, category: "运动", favoredBy: Platform.KUAISHOU },
  { name: "山茶花护手霜", code: "SPU-007", sku: "SKU-007-SET", priceFen: 7900, costFen: 2600, category: "美妆", favoredBy: Platform.WECHAT },
  { name: "真丝眼罩", code: "SPU-008", sku: "SKU-008-GRAY", priceFen: 9900, costFen: 3500, category: "个护", favoredBy: Platform.WECHAT },
  { name: "原木香薰礼盒", code: "SPU-009", sku: "SKU-009-CEDAR", priceFen: 16900, costFen: 6500, category: "礼品", favoredBy: Platform.WECHAT },
  { name: "折叠旅行收纳包", code: "SPU-010", sku: "SKU-010-BLACK", priceFen: 10900, costFen: 4000, category: "箱包", favoredBy: Platform.WECHAT }
] as const;

const shopSeeds = [
  { platform: Platform.DOUYIN, externalId: "DEMO-DY-SHOP-001", name: "抖音旗舰店", titlePrefix: "直播间热卖", dailyBase: 8, refundRate: 7 },
  { platform: Platform.KUAISHOU, externalId: "DEMO-KS-SHOP-001", name: "快手好物店", titlePrefix: "老铁严选", dailyBase: 6, refundRate: 10 },
  { platform: Platform.WECHAT, externalId: "DEMO-WX-SHOP-001", name: "视频号精选店", titlePrefix: "会员精选", dailyBase: 5, refundRate: 4 }
] as const;

function seedUuid(group: number, index: number): string {
  return `${group.toString(16).padStart(8, "0")}-0000-4000-8000-${index
    .toString(16)
    .padStart(12, "0")}`;
}

function decimalFromFen(fen: number): Prisma.Decimal {
  const yuan = Math.trunc(fen / 100);
  const cents = String(fen % 100).padStart(2, "0");
  return new Prisma.Decimal(`${yuan}.${cents}`);
}

function utcDay(dayOffset: number): Date {
  const reference = process.env.SEED_REFERENCE_DATE
    ? new Date(`${process.env.SEED_REFERENCE_DATE}T00:00:00.000Z`)
    : new Date();
  reference.setUTCHours(0, 0, 0, 0);
  reference.setUTCDate(reference.getUTCDate() - dayOffset);
  return reference;
}

async function seedCatalog() {
  for (const [productIndex, product] of products.entries()) {
    const productId = seedUuid(1, productIndex + 1);
    const skuId = seedUuid(2, productIndex + 1);

    await prisma.unifiedProduct.upsert({
      where: { id: productId },
      update: {
        merchantProductCode: product.code,
        name: product.name,
        brand: "拾光生活",
        category: product.category,
        active: true
      },
      create: {
        id: productId,
        merchantProductCode: product.code,
        name: product.name,
        brand: "拾光生活",
        category: product.category
      }
    });

    await prisma.unifiedSku.upsert({
      where: { id: skuId },
      update: {
        merchantSkuCode: product.sku,
        name: "默认规格",
        attributes: { specification: product.sku.split("-").at(-1) },
        costAmount: decimalFromFen(product.costFen)
      },
      create: {
        id: skuId,
        unifiedProductId: productId,
        merchantSkuCode: product.sku,
        name: "默认规格",
        attributes: { specification: product.sku.split("-").at(-1) },
        costAmount: decimalFromFen(product.costFen)
      }
    });
  }
}

async function seedShopsAndListings() {
  for (const [shopIndex, shopSeed] of shopSeeds.entries()) {
    const shopId = seedUuid(3, shopIndex + 1);

    await prisma.shop.upsert({
      where: { id: shopId },
      update: {
        platform: shopSeed.platform,
        externalShopId: shopSeed.externalId,
        name: shopSeed.name,
        timezone: appTimezone,
        connectionStatus: ConnectionStatus.ACTIVE
      },
      create: {
        id: shopId,
        platform: shopSeed.platform,
        externalShopId: shopSeed.externalId,
        name: shopSeed.name,
        timezone: appTimezone,
        connectionStatus: ConnectionStatus.ACTIVE
      }
    });

    await prisma.platformCredential.upsert({
      where: { shopId },
      update: { scopes: ["mock:read"], metadata: { source: "demo-seed" } },
      create: {
        id: seedUuid(4, shopIndex + 1),
        shopId,
        scopes: ["mock:read"],
        metadata: { source: "demo-seed" }
      }
    });

    for (const [productIndex, product] of products.entries()) {
      const listingIndex = shopIndex * products.length + productIndex + 1;
      const platformProductId = seedUuid(5, listingIndex);
      const platformSkuId = seedUuid(6, listingIndex);
      const platformCode = shopSeed.platform.toLowerCase();

      await prisma.platformProduct.upsert({
        where: { id: platformProductId },
        update: {
          title: `${shopSeed.titlePrefix}｜${product.name}`,
          merchantProductCode: product.code,
          unifiedProductId: seedUuid(1, productIndex + 1),
          mappingStatus: MappingStatus.AUTO_MATCHED
        },
        create: {
          id: platformProductId,
          shopId,
          externalProductId: `DEMO-${platformCode}-PRODUCT-${String(productIndex + 1).padStart(3, "0")}`,
          title: `${shopSeed.titlePrefix}｜${product.name}`,
          merchantProductCode: product.code,
          status: "ON_SALE",
          rawPayload: { source: "demo-seed", platform: shopSeed.platform },
          unifiedProductId: seedUuid(1, productIndex + 1),
          mappingStatus: MappingStatus.AUTO_MATCHED
        }
      });

      await prisma.platformSku.upsert({
        where: { id: platformSkuId },
        update: {
          merchantSkuCode: product.sku,
          title: `${product.name} 默认规格`,
          unifiedSkuId: seedUuid(2, productIndex + 1)
        },
        create: {
          id: platformSkuId,
          platformProductId,
          externalSkuId: `DEMO-${platformCode}-SKU-${String(productIndex + 1).padStart(3, "0")}`,
          merchantSkuCode: product.sku,
          title: `${product.name} 默认规格`,
          attributes: { specification: product.sku.split("-").at(-1) },
          rawPayload: { source: "demo-seed" },
          unifiedSkuId: seedUuid(2, productIndex + 1)
        }
      });
    }

    for (const resource of ["products", "orders", "refunds"]) {
      await prisma.syncCursor.upsert({
        where: { shopId_resource: { shopId, resource } },
        update: { cursor: "demo-seed-complete", lastSyncedExternalUpdatedAt: new Date() },
        create: {
          id: seedUuid(7 + shopIndex, ["products", "orders", "refunds"].indexOf(resource) + 1),
          shopId,
          resource,
          cursor: "demo-seed-complete",
          lastSyncedExternalUpdatedAt: new Date()
        }
      });
    }

    await prisma.syncRun.upsert({
      where: { id: seedUuid(11, shopIndex + 1) },
      update: { status: SyncStatus.SUCCESS, recordsFetched: 30, recordsUpserted: 30 },
      create: {
        id: seedUuid(11, shopIndex + 1),
        shopId,
        platform: shopSeed.platform,
        syncType: SyncType.FULL,
        status: SyncStatus.SUCCESS,
        startedAt: new Date(),
        finishedAt: new Date(),
        recordsFetched: 30,
        recordsUpserted: 30,
        metadata: { source: "demo-seed" }
      }
    });
  }
}

async function seedOrders() {
  await prisma.refundItem.deleteMany({
    where: { refund: { is: { externalRefundId: { startsWith: "DEMO-" } } } }
  });
  await prisma.refund.deleteMany({ where: { externalRefundId: { startsWith: "DEMO-" } } });
  await prisma.orderItem.deleteMany({
    where: { order: { is: { externalOrderId: { startsWith: "DEMO-" } } } }
  });
  await prisma.order.deleteMany({ where: { externalOrderId: { startsWith: "DEMO-" } } });

  const orders: Prisma.OrderCreateManyInput[] = [];
  const orderItems: Prisma.OrderItemCreateManyInput[] = [];
  const refunds: Prisma.RefundCreateManyInput[] = [];
  const refundItems: Prisma.RefundItemCreateManyInput[] = [];
  let orderSequence = 0;
  let itemSequence = 0;
  let refundSequence = 0;

  for (const [shopIndex, shopSeed] of shopSeeds.entries()) {
    for (let dayIndex = 29; dayIndex >= 0; dayIndex -= 1) {
      const ordersToday = shopSeed.dailyBase + ((dayIndex + shopIndex) % 3);

      for (let localOrder = 0; localOrder < ordersToday; localOrder += 1) {
        orderSequence += 1;
        const favoredProducts = products
          .map((product, index) => ({ product, index }))
          .filter(({ product }) => product.favoredBy === shopSeed.platform);
        const fallbackIndex = (dayIndex * 3 + localOrder + shopIndex) % products.length;
        const selected = localOrder % 5 < 3
          ? favoredProducts[(dayIndex + localOrder) % favoredProducts.length]
          : { product: products[fallbackIndex], index: fallbackIndex };
        const quantity = 1 + ((dayIndex + localOrder) % 3 === 0 ? 1 : 0);
        const paidFen = selected.product.priceFen * quantity;
        const paidAt = utcDay(dayIndex);
        paidAt.setUTCHours(2 + ((localOrder * 3) % 14), (localOrder * 7) % 60, 0, 0);

        const orderId = seedUuid(12, orderSequence);
        const orderItemId = seedUuid(13, ++itemSequence);
        const listingIndex = shopIndex * products.length + selected.index + 1;
        const externalOrderId = `DEMO-${shopSeed.platform}-${String(dayIndex).padStart(2, "0")}-${String(localOrder).padStart(3, "0")}`;

        orders.push({
          id: orderId,
          shopId: seedUuid(3, shopIndex + 1),
          externalOrderId,
          status: "PAID",
          paidAt,
          createdExternalAt: new Date(paidAt.getTime() - 5 * 60_000),
          updatedExternalAt: paidAt,
          paymentAmount: decimalFromFen(paidFen),
          buyerPaidAmount: decimalFromFen(paidFen),
          rawPayload: { source: "demo-seed" }
        });
        orderItems.push({
          id: orderItemId,
          orderId,
          externalOrderLineId: `${externalOrderId}-1`,
          platformProductId: seedUuid(5, listingIndex),
          platformSkuId: seedUuid(6, listingIndex),
          unifiedProductId: seedUuid(1, selected.index + 1),
          unifiedSkuId: seedUuid(2, selected.index + 1),
          quantity,
          unitPaidAmount: decimalFromFen(selected.product.priceFen),
          linePaidAmount: decimalFromFen(paidFen),
          merchantProductCode: selected.product.code,
          merchantSkuCode: selected.product.sku
        });

        const productRefundAdjustment = selected.index % 4;
        const refundScore = (dayIndex * 17 + localOrder * 13 + selected.index * 7) % 100;
        if (refundScore < shopSeed.refundRate + productRefundAdjustment) {
          refundSequence += 1;
          const refundId = seedUuid(14, refundSequence);
          const approvedAt = new Date(paidAt.getTime() + (18 + (localOrder % 48)) * 3_600_000);
          refunds.push({
            id: refundId,
            shopId: seedUuid(3, shopIndex + 1),
            orderId,
            orderItemId,
            externalRefundId: `DEMO-REFUND-${shopSeed.platform}-${String(refundSequence).padStart(4, "0")}`,
            status: "APPROVED",
            refundAmount: decimalFromFen(paidFen),
            approvedAt,
            updatedExternalAt: approvedAt,
            rawPayload: { source: "demo-seed", reason: "七天无理由" }
          });
          refundItems.push({
            id: seedUuid(15, refundSequence),
            refundId,
            externalRefundLineId: `DEMO-REFUND-LINE-${String(refundSequence).padStart(4, "0")}`,
            orderItemId,
            platformProductId: seedUuid(5, listingIndex),
            platformSkuId: seedUuid(6, listingIndex),
            unifiedProductId: seedUuid(1, selected.index + 1),
            unifiedSkuId: seedUuid(2, selected.index + 1),
            quantity,
            refundAmount: decimalFromFen(paidFen)
          });
        }
      }
    }
  }

  await prisma.order.createMany({ data: orders });
  await prisma.orderItem.createMany({ data: orderItems });
  await prisma.refund.createMany({ data: refunds });
  await prisma.refundItem.createMany({ data: refundItems });

  return {
    orders: orders.length,
    orderItems: orderItems.length,
    refunds: refunds.length,
    refundItems: refundItems.length
  };
}

async function main() {
  await seedCatalog();
  await seedShopsAndListings();
  const counts = await seedOrders();

  console.info(
    `Seed complete: ${shopSeeds.length} shops, ${products.length} unified products, ` +
      `${shopSeeds.length * products.length} platform products, ${counts.orders} orders, ` +
      `${counts.orderItems} order items, ${counts.refunds} refunds, ${counts.refundItems} refund items.`
  );
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


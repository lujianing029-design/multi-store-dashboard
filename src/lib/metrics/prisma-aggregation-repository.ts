import { Prisma, type PrismaClient } from "@/generated/prisma";
import type {
  AggregationRepository,
  AggregationShop,
  DailyMetricValues,
  ProductMetricSource
} from "@/lib/metrics/aggregation";

const PAID_STATUSES = ["PAID", "COMPLETED"];
const APPROVED_REFUND_STATUSES = ["APPROVED", "COMPLETED"];

export class PrismaAggregationRepository implements AggregationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listShops() {
    return this.prisma.shop.findMany({
      select: { id: true, platform: true, timezone: true }
    });
  }

  async loadShopDay(shop: AggregationShop, start: Date, end: Date) {
    const [orders, refunds] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          shopId: shop.id,
          status: { in: PAID_STATUSES },
          paidAt: { gte: start, lt: end }
        },
        select: { id: true, paymentAmount: true, items: { select: { quantity: true } } }
      }),
      this.prisma.refund.findMany({
        where: {
          shopId: shop.id,
          status: { in: APPROVED_REFUND_STATUSES },
          approvedAt: { gte: start, lt: end }
        },
        select: { refundAmount: true }
      })
    ]);

    return {
      sales: orders.map((order) => ({
        orderId: order.id,
        amount: order.paymentAmount,
        units: order.items.reduce((sum, item) => sum + item.quantity, 0)
      })),
      refunds: refunds.map((refund) => ({ amount: refund.refundAmount }))
    };
  }

  async loadProductDay(shop: AggregationShop, start: Date, end: Date) {
    const [items, refundItems] = await Promise.all([
      this.prisma.orderItem.findMany({
        where: {
          unifiedProductId: { not: null },
          order: {
            shopId: shop.id,
            status: { in: PAID_STATUSES },
            paidAt: { gte: start, lt: end }
          }
        },
        select: {
          unifiedProductId: true,
          orderId: true,
          linePaidAmount: true,
          quantity: true
        }
      }),
      this.prisma.refundItem.findMany({
        where: {
          unifiedProductId: { not: null },
          refund: {
            shopId: shop.id,
            status: { in: APPROVED_REFUND_STATUSES },
            approvedAt: { gte: start, lt: end }
          }
        },
        select: { unifiedProductId: true, refundAmount: true }
      })
    ]);
    const grouped = new Map<string, ProductMetricSource>();

    for (const item of items) {
      if (!item.unifiedProductId) continue;
      const group = grouped.get(item.unifiedProductId) ?? {
        unifiedProductId: item.unifiedProductId,
        sales: [],
        refunds: []
      };
      group.sales.push({ orderId: item.orderId, amount: item.linePaidAmount, units: item.quantity });
      grouped.set(item.unifiedProductId, group);
    }
    for (const item of refundItems) {
      if (!item.unifiedProductId) continue;
      const group = grouped.get(item.unifiedProductId) ?? {
        unifiedProductId: item.unifiedProductId,
        sales: [],
        refunds: []
      };
      group.refunds.push({ amount: item.refundAmount });
      grouped.set(item.unifiedProductId, group);
    }
    return [...grouped.values()];
  }

  async upsertShopDay(shop: AggregationShop, date: string, values: DailyMetricValues) {
    const data = {
      paidGmv: new Prisma.Decimal(values.paidGmv),
      netSales: new Prisma.Decimal(values.netSales),
      paidOrders: values.paidOrders,
      unitsSold: values.unitsSold,
      refundAmount: new Prisma.Decimal(values.refundAmount),
      refundRate: new Prisma.Decimal(values.refundRate),
      aov: new Prisma.Decimal(values.aov)
    };
    const metricDate = new Date(`${date}T00:00:00.000Z`);
    await this.prisma.dailyShopMetric.upsert({
      where: { date_shopId: { date: metricDate, shopId: shop.id } },
      update: data,
      create: { date: metricDate, shopId: shop.id, ...data }
    });
  }

  async upsertProductDay(
    shop: AggregationShop,
    date: string,
    productId: string,
    values: Omit<DailyMetricValues, "aov">
  ) {
    const metricDate = new Date(`${date}T00:00:00.000Z`);
    const scopeKey = `SHOP:${shop.id}`;
    const data = {
      shopId: shop.id,
      platform: shop.platform,
      paidGmv: new Prisma.Decimal(values.paidGmv),
      netSales: new Prisma.Decimal(values.netSales),
      paidOrders: values.paidOrders,
      unitsSold: values.unitsSold,
      refundAmount: new Prisma.Decimal(values.refundAmount),
      refundRate: new Prisma.Decimal(values.refundRate)
    };
    await this.prisma.dailyProductMetric.upsert({
      where: {
        date_unifiedProductId_scopeKey: {
          date: metricDate,
          unifiedProductId: productId,
          scopeKey
        }
      },
      update: data,
      create: { date: metricDate, unifiedProductId: productId, scopeKey, ...data }
    });
  }
}


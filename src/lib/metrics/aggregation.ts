import type { Platform } from "@/generated/prisma";
import { calculateMetrics, type MetricRefund, type MetricSale } from "@/lib/metrics/calculator";
import { getUtcRangeForLocalDate } from "@/lib/metrics/timezone";

export interface AggregationShop {
  id: string;
  platform: Platform;
  timezone: string;
}

export interface MetricSource {
  sales: MetricSale[];
  refunds: MetricRefund[];
}

export interface ProductMetricSource extends MetricSource {
  unifiedProductId: string;
}

export interface DailyMetricValues {
  paidGmv: string;
  netSales: string;
  paidOrders: number;
  unitsSold: number;
  refundAmount: string;
  refundRate: string;
  aov: string;
}

export interface AggregationRepository {
  listShops(): Promise<AggregationShop[]>;
  loadShopDay(shop: AggregationShop, start: Date, end: Date): Promise<MetricSource>;
  loadProductDay(
    shop: AggregationShop,
    start: Date,
    end: Date
  ): Promise<ProductMetricSource[]>;
  upsertShopDay(shop: AggregationShop, date: string, values: DailyMetricValues): Promise<void>;
  upsertProductDay(
    shop: AggregationShop,
    date: string,
    productId: string,
    values: Omit<DailyMetricValues, "aov">
  ): Promise<void>;
}

function datesBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw new RangeError("Aggregation date range is invalid");
  }
  const dates: string[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dates.push(cursor.toISOString().slice(0, 10));
  }
  return dates;
}

function serialize(source: MetricSource): DailyMetricValues {
  const result = calculateMetrics(source.sales, source.refunds);
  return {
    paidGmv: result.paidGmv.toFixed(2),
    netSales: result.netSales.toFixed(2),
    paidOrders: result.paidOrders,
    unitsSold: result.unitsSold,
    refundAmount: result.refundAmount.toFixed(2),
    refundRate: result.refundRate.toFixed(4),
    aov: result.aov.toFixed(2)
  };
}

export class DailyAggregationService {
  constructor(private readonly repository: AggregationRepository) {}

  async rebuild(startDate: string, endDate: string) {
    const shops = await this.repository.listShops();
    let shopDays = 0;
    let productDays = 0;

    for (const shop of shops) {
      for (const date of datesBetween(startDate, endDate)) {
        const range = getUtcRangeForLocalDate(date, shop.timezone || "Asia/Shanghai");
        const shopSource = await this.repository.loadShopDay(shop, range.start, range.end);
        await this.repository.upsertShopDay(shop, date, serialize(shopSource));
        shopDays += 1;

        const products = await this.repository.loadProductDay(shop, range.start, range.end);
        for (const product of products) {
          const result = serialize(product);
          const values = {
            paidGmv: result.paidGmv,
            netSales: result.netSales,
            paidOrders: result.paidOrders,
            unitsSold: result.unitsSold,
            refundAmount: result.refundAmount,
            refundRate: result.refundRate
          };
          await this.repository.upsertProductDay(shop, date, product.unifiedProductId, values);
          productDays += 1;
        }
      }
    }

    return { shopDays, productDays };
  }
}


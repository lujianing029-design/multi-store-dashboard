import { MappingStatus, Prisma } from "@/generated/prisma";
import {
  createDemoDashboard,
  createDemoMappings,
  createDemoProductDetail,
  createDemoSync
} from "@/lib/dashboard/demo";
import type {
  DashboardSnapshot,
  MappingSnapshot,
  ProductDetailSnapshot,
  ProductPerformance,
  SyncSnapshot,
  TrendPoint
} from "@/lib/dashboard/types";
import { prisma } from "@/lib/db/prisma";
import { periodChange } from "@/lib/metrics/calculator";
import { getZonedRange, type DatePreset } from "@/lib/metrics/timezone";

const platformNames = { DOUYIN: "抖音", KUAISHOU: "快手", XIAOHONGSHU: "小红书", WECHAT: "视频号" } as const;
const platformColors = { DOUYIN: "#ef4444", KUAISHOU: "#f59e0b", XIAOHONGSHU: "#e85c83", WECHAT: "#10b981" } as const;

export function isDemoMode() {
  return process.env.DASHBOARD_DATA_MODE !== "database";
}

function dateBounds(preset: DatePreset) {
  const range = getZonedRange(preset);
  return {
    range,
    start: new Date(`${range.startDate}T00:00:00.000Z`),
    end: new Date(`${range.endDate}T23:59:59.999Z`)
  };
}

function decimalSum(values: Prisma.Decimal[]) {
  return values.reduce((sum, value) => sum.plus(value), new Prisma.Decimal(0));
}

export async function getDashboardSnapshot(preset: DatePreset): Promise<DashboardSnapshot> {
  if (isDemoMode()) return createDemoDashboard(preset);
  const { range, start, end } = dateBounds(preset);
  const [shopMetrics, productMetrics] = await Promise.all([
    prisma.dailyShopMetric.findMany({
      where: { date: { gte: start, lte: end } },
      include: { shop: { select: { id: true, name: true, platform: true } } },
      orderBy: { date: "asc" }
    }),
    prisma.dailyProductMetric.findMany({
      where: { date: { gte: start, lte: end }, shopId: { not: null } },
      include: { unifiedProduct: { select: { id: true, name: true, merchantProductCode: true } } }
    })
  ]);

  const paidGmv = decimalSum(shopMetrics.map((row) => row.paidGmv));
  const netSales = decimalSum(shopMetrics.map((row) => row.netSales));
  const refundAmount = decimalSum(shopMetrics.map((row) => row.refundAmount));
  const paidOrders = shopMetrics.reduce((sum, row) => sum + row.paidOrders, 0);
  const unitsSold = shopMetrics.reduce((sum, row) => sum + row.unitsSold, 0);
  const refundRate = paidGmv.isZero() ? new Prisma.Decimal(0) : refundAmount.div(paidGmv);
  const aov = paidOrders === 0 ? new Prisma.Decimal(0) : paidGmv.div(paidOrders);
  const trendMap = new Map<string, TrendPoint>();
  for (const row of shopMetrics) {
    const key = row.date.toISOString().slice(5, 10).replace("-", "/");
    const current = trendMap.get(key) ?? { date: key, gmv: 0, netSales: 0, orders: 0 };
    current.gmv += row.paidGmv.toNumber();
    current.netSales += row.netSales.toNumber();
    current.orders += row.paidOrders;
    trendMap.set(key, current);
  }

  const shopMap = new Map<string, DashboardSnapshot["shops"][number]>();
  const platformMap = new Map<keyof typeof platformNames, number>();
  for (const row of shopMetrics) {
    const current = shopMap.get(row.shopId) ?? {
      id: row.shop.id,
      name: row.shop.name,
      platform: platformNames[row.shop.platform],
      gmv: 0,
      netSales: 0,
      paidOrders: 0,
      unitsSold: 0,
      aov: 0,
      refundAmount: 0,
      refundRate: 0,
      change: 0
    };
    current.gmv += row.paidGmv.toNumber();
    current.netSales += row.netSales.toNumber();
    current.paidOrders += row.paidOrders;
    current.unitsSold += row.unitsSold;
    current.refundAmount += row.refundAmount.toNumber();
    current.aov = current.paidOrders ? current.gmv / current.paidOrders : 0;
    current.refundRate = current.gmv ? current.refundAmount / current.gmv : 0;
    shopMap.set(row.shopId, current);
    platformMap.set(row.shop.platform, (platformMap.get(row.shop.platform) ?? 0) + row.paidGmv.toNumber());
  }

  const productMap = new Map<string, ProductPerformance>();
  for (const row of productMetrics) {
    const current = productMap.get(row.unifiedProductId) ?? {
      id: row.unifiedProduct.id,
      name: row.unifiedProduct.name,
      code: row.unifiedProduct.merchantProductCode ?? "未设置",
      unitsSold: 0,
      gmv: 0,
      netSales: 0,
      refundRate: 0,
      leadingPlatform: row.platform ? platformNames[row.platform] : "全部",
      platformShare: 0,
      trend7d: 0,
      trend30d: 0
    };
    current.unitsSold += row.unitsSold;
    current.gmv += row.paidGmv.toNumber();
    current.netSales += row.netSales.toNumber();
    current.refundRate = current.gmv ? (current.gmv - current.netSales) / current.gmv : 0;
    productMap.set(row.unifiedProductId, current);
  }
  const products = [...productMap.values()].sort((a, b) => b.gmv - a.gmv);
  const totalGmv = paidGmv.toNumber();

  return {
    preset,
    rangeLabel: `${range.startDate} 至 ${range.endDate} · ${range.label}`,
    updatedAt: new Date().toISOString(),
    kpis: [
      { label: "支付销售额", value: paidGmv.toFixed(2), change: null },
      { label: "净销售额", value: netSales.toFixed(2), change: null },
      { label: "支付订单", value: String(paidOrders), change: null },
      { label: "销售件数", value: String(unitsSold), change: null },
      { label: "客单价", value: aov.toFixed(2), change: null },
      { label: "退款金额", value: refundAmount.toFixed(2), change: null, tone: "warning" },
      { label: "退款率", value: refundRate.toFixed(4), change: null, tone: "warning" }
    ],
    trend: [...trendMap.values()],
    contributions: [...platformMap.entries()].map(([platform, value]) => ({
      platform: platformNames[platform],
      value,
      share: totalGmv ? value / totalGmv : 0,
      color: platformColors[platform]
    })),
    shops: [...shopMap.values()],
    products
  };
}

export async function getProductDetailSnapshot(
  id: string,
  preset: DatePreset
): Promise<ProductDetailSnapshot | null> {
  if (isDemoMode()) return createDemoProductDetail(id, preset);
  const dashboard = await getDashboardSnapshot(preset);
  const product = dashboard.products.find((row) => row.id === id);
  if (!product) return null;
  const { start, end } = dateBounds(preset);
  const metrics = await prisma.dailyProductMetric.findMany({
    where: { unifiedProductId: id, date: { gte: start, lte: end }, platform: { not: null } },
    orderBy: { date: "asc" }
  });
  const platformRows = new Map<string, ProductDetailSnapshot["platforms"][number]>();
  const platformRefunds = new Map<string, number>();
  const platformOrders = new Map<string, number>();
  for (const row of metrics) {
    if (!row.platform) continue;
    const name = platformNames[row.platform];
    const current = platformRows.get(name) ?? { platform: name, unitsSold: 0, gmv: 0, refundRate: 0, aov: 0 };
    current.unitsSold += row.unitsSold;
    current.gmv += row.paidGmv.toNumber();
    const refunds = (platformRefunds.get(name) ?? 0) + row.refundAmount.toNumber();
    const orders = (platformOrders.get(name) ?? 0) + row.paidOrders;
    platformRefunds.set(name, refunds);
    platformOrders.set(name, orders);
    current.refundRate = current.gmv ? refunds / current.gmv : 0;
    current.aov = orders ? current.gmv / orders : 0;
    platformRows.set(name, current);
  }
  return { product, trend: dashboard.trend, platforms: [...platformRows.values()], skus: [] };
}

export async function getMappingSnapshot(): Promise<MappingSnapshot> {
  if (isDemoMode()) return createDemoMappings();
  const [products, rows] = await Promise.all([
    prisma.unifiedProduct.findMany({
      where: { active: true },
      select: { id: true, name: true, merchantProductCode: true },
      orderBy: { name: "asc" }
    }),
    prisma.platformProduct.findMany({
      include: { shop: { select: { platform: true } }, unifiedProduct: { select: { name: true } } },
      orderBy: { updatedAt: "desc" }
    })
  ]);
  return {
    products: products.map((row) => ({ id: row.id, name: row.name, code: row.merchantProductCode ?? "" })),
    rows: rows.map((row) => ({
      id: row.id,
      platform: platformNames[row.shop.platform],
      externalProductId: row.externalProductId,
      title: row.title,
      merchantCode: row.merchantProductCode ?? "",
      status: row.mappingStatus,
      unifiedProductId: row.unifiedProductId,
      unifiedProductName: row.unifiedProduct?.name ?? null
    }))
  };
}

export async function linkPlatformProduct(platformProductId: string, unifiedProductId: string) {
  if (isDemoMode()) return { id: platformProductId, unifiedProductId, status: MappingStatus.MANUAL };
  return prisma.platformProduct.update({
    where: { id: platformProductId },
    data: { unifiedProductId, mappingStatus: MappingStatus.MANUAL },
    select: { id: true, unifiedProductId: true, mappingStatus: true }
  });
}

export async function getSyncSnapshot(): Promise<SyncSnapshot> {
  if (isDemoMode()) return createDemoSync();
  const [shops, runs] = await Promise.all([
    prisma.shop.findMany({ orderBy: { name: "asc" } }),
    prisma.syncRun.findMany({ include: { shop: { select: { name: true } } }, orderBy: { startedAt: "desc" }, take: 50 })
  ]);
  return {
    shops: shops.map((shop) => ({
      id: shop.id,
      name: shop.name,
      platform: platformNames[shop.platform],
      connectionStatus: shop.connectionStatus,
      lastSuccessfulSyncAt: shop.lastSuccessfulSyncAt?.toISOString() ?? null
    })),
    runs: runs.map((run) => ({
      id: run.id,
      shopName: run.shop?.name ?? "全部店铺",
      platform: platformNames[run.platform],
      syncType: run.syncType,
      status: run.status,
      startedAt: run.startedAt.toISOString(),
      rangeLabel: run.rangeStart && run.rangeEnd ? `${run.rangeStart.toISOString().slice(0, 10)} 至 ${run.rangeEnd.toISOString().slice(0, 10)}` : "增量",
      fetched: run.recordsFetched,
      upserted: run.recordsUpserted,
      errorMessage: run.errorMessage
    }))
  };
}

export function calculateDisplayChange(current: string, previous: string) {
  return periodChange(current, previous)?.toNumber() ?? null;
}


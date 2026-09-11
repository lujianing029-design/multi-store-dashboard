import type {
  DashboardSnapshot,
  MappingSnapshot,
  ProductDetailSnapshot,
  ProductPerformance,
  SyncSnapshot
} from "@/lib/dashboard/types";
import { getZonedRange, type DatePreset } from "@/lib/metrics/timezone";

const productNames = [
  ["轻氧保温杯", "SPU-001", "抖音"],
  ["云感防晒外套", "SPU-002", "抖音"],
  ["便携榨汁杯", "SPU-003", "抖音"],
  ["谷物早餐组合", "SPU-004", "快手"],
  ["厚底居家拖鞋", "SPU-005", "快手"],
  ["高弹瑜伽裤", "SPU-006", "快手"],
  ["山茶花护手霜", "SPU-007", "视频号"],
  ["真丝眼罩", "SPU-008", "视频号"],
  ["原木香薰礼盒", "SPU-009", "视频号"],
  ["折叠旅行收纳包", "SPU-010", "视频号"]
] as const;

function daysForPreset(preset: DatePreset) {
  return preset === "today" || preset === "yesterday" ? 1 : preset === "30d" ? 30 : 7;
}

function dateLabel(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function createDemoDashboard(preset: DatePreset): DashboardSnapshot {
  const dayCount = daysForPreset(preset);
  const trend = Array.from({ length: dayCount }, (_, index) => {
    const distance = dayCount - index - 1 + (preset === "yesterday" ? 1 : 0);
    const gmv = 56500 + index * 1870 + ((index * 7919) % 12300);
    return {
      date: dateLabel(distance),
      gmv,
      netSales: Math.round(gmv * 0.928),
      orders: 292 + ((index * 47) % 83)
    };
  });
  const totalGmv = trend.reduce((sum, point) => sum + point.gmv, 0);
  const totalNet = trend.reduce((sum, point) => sum + point.netSales, 0);
  const totalOrders = trend.reduce((sum, point) => sum + point.orders, 0);
  const units = Math.round(totalOrders * 1.42);
  const refund = totalGmv - totalNet;
  const range = getZonedRange(preset);
  const products: ProductPerformance[] = productNames.map(([name, code, platform], index) => {
    const weight = 10 - index;
    const gmv = Math.round((totalGmv * (weight + 2)) / 95);
    const refundRate = 0.025 + ((index * 17) % 9) / 100;
    return {
      id: `product-${index + 1}`,
      name,
      code,
      unitsSold: Math.round((units * (weight + 2)) / 95),
      gmv,
      netSales: Math.round(gmv * (1 - refundRate)),
      refundRate,
      leadingPlatform: platform,
      platformShare: 0.48 + (index % 4) * 0.08,
      trend7d: 0.186 - index * 0.021,
      trend30d: 0.248 - index * 0.018
    };
  });

  return {
    preset,
    rangeLabel: `${range.startDate} 至 ${range.endDate} · ${range.label}`,
    updatedAt: new Date().toISOString(),
    kpis: [
      { label: "支付销售额", value: totalGmv.toFixed(2), change: 0.128 },
      { label: "净销售额", value: totalNet.toFixed(2), change: 0.116 },
      { label: "支付订单", value: String(totalOrders), change: 0.094 },
      { label: "销售件数", value: String(units), change: 0.082 },
      { label: "客单价", value: (totalGmv / totalOrders).toFixed(2), change: 0.031 },
      { label: "退款金额", value: refund.toFixed(2), change: -0.023, tone: "warning" },
      { label: "退款率", value: (refund / totalGmv).toFixed(4), change: -0.008, tone: "warning" }
    ],
    trend,
    contributions: [
      { platform: "抖音", value: Math.round(totalGmv * 0.46), share: 0.46, color: "#ef4444" },
      { platform: "快手", value: Math.round(totalGmv * 0.31), share: 0.31, color: "#f59e0b" },
      { platform: "视频号", value: Math.round(totalGmv * 0.23), share: 0.23, color: "#10b981" }
    ],
    shops: [
      { id: "shop-dy", name: "抖音旗舰店", platform: "抖音", gmv: totalGmv * 0.46, netSales: totalNet * 0.45, paidOrders: Math.round(totalOrders * 0.48), unitsSold: Math.round(units * 0.47), aov: 186.2, refundAmount: refund * 0.54, refundRate: 0.084, change: 0.164 },
      { id: "shop-ks", name: "快手好物店", platform: "快手", gmv: totalGmv * 0.31, netSales: totalNet * 0.3, paidOrders: Math.round(totalOrders * 0.32), unitsSold: Math.round(units * 0.34), aov: 149.8, refundAmount: refund * 0.32, refundRate: 0.096, change: 0.071 },
      { id: "shop-wx", name: "视频号精选店", platform: "视频号", gmv: totalGmv * 0.23, netSales: totalNet * 0.25, paidOrders: Math.round(totalOrders * 0.2), unitsSold: Math.round(units * 0.19), aov: 207.4, refundAmount: refund * 0.14, refundRate: 0.041, change: 0.108 }
    ],
    products
  };
}

export function createDemoProductDetail(id: string, preset: DatePreset): ProductDetailSnapshot | null {
  const dashboard = createDemoDashboard(preset);
  const product = dashboard.products.find((item) => item.id === id);
  if (!product) return null;
  return {
    product,
    trend: dashboard.trend.map((point, index) => ({
      ...point,
      gmv: Math.round(point.gmv * (0.09 + (index % 3) * 0.012)),
      netSales: Math.round(point.netSales * (0.09 + (index % 3) * 0.011)),
      orders: Math.round(point.orders * 0.1)
    })),
    platforms: [
      { platform: "抖音", unitsSold: Math.round(product.unitsSold * 0.55), gmv: product.gmv * 0.55, refundRate: 0.071, aov: 178.2 },
      { platform: "快手", unitsSold: Math.round(product.unitsSold * 0.27), gmv: product.gmv * 0.27, refundRate: 0.096, aov: 142.6 },
      { platform: "视频号", unitsSold: Math.round(product.unitsSold * 0.18), gmv: product.gmv * 0.18, refundRate: 0.038, aov: 206.4 }
    ],
    skus: [
      { name: "云雾白 / 500ml", code: `${product.code}-WHITE`, platform: "抖音", unitsSold: 386, gmv: 49820 },
      { name: "曜石黑 / 500ml", code: `${product.code}-BLACK`, platform: "快手", unitsSold: 214, gmv: 27606 },
      { name: "森林绿 / 500ml", code: `${product.code}-GREEN`, platform: "视频号", unitsSold: 143, gmv: 18447 }
    ]
  };
}

export function createDemoMappings(): MappingSnapshot {
  const products = productNames.map(([name, code], index) => ({ id: `product-${index + 1}`, name, code }));
  return {
    products,
    rows: [
      { id: "map-1", platform: "抖音", externalProductId: "MOCK-DY-PRODUCT-1", title: "直播间热卖｜轻氧保温杯", merchantCode: "SPU-001", status: "AUTO_MATCHED", unifiedProductId: "product-1", unifiedProductName: "轻氧保温杯" },
      { id: "map-2", platform: "快手", externalProductId: "MOCK-KS-PRODUCT-1", title: "老铁严选｜轻氧保温杯", merchantCode: "SPU-001", status: "MANUAL", unifiedProductId: "product-1", unifiedProductName: "轻氧保温杯" },
      { id: "map-3", platform: "视频号", externalProductId: "MOCK-WX-PRODUCT-3", title: "会员精选｜山茶花护手霜", merchantCode: "SPU-007", status: "AUTO_MATCHED", unifiedProductId: "product-7", unifiedProductName: "山茶花护手霜" },
      { id: "map-4", platform: "抖音", externalProductId: "DY-NEW-9821", title: "夏日冰感随行杯 直播专享", merchantCode: "", status: "UNMATCHED", unifiedProductId: null, unifiedProductName: null },
      { id: "map-5", platform: "快手", externalProductId: "KS-NEW-3370", title: "轻薄收纳袋 三件套", merchantCode: "SPU-010", status: "UNMATCHED", unifiedProductId: null, unifiedProductName: null },
      { id: "map-6", platform: "视频号", externalProductId: "WX-NEW-1108", title: "会员礼赠香氛套装", merchantCode: "", status: "UNMATCHED", unifiedProductId: null, unifiedProductName: null }
    ]
  };
}

export function createDemoSync(): SyncSnapshot {
  const now = Date.now();
  return {
    shops: [
      { id: "shop-dy", name: "抖音旗舰店", platform: "抖音", connectionStatus: "ACTIVE", lastSuccessfulSyncAt: new Date(now - 8 * 60_000).toISOString() },
      { id: "shop-ks", name: "快手好物店", platform: "快手", connectionStatus: "ACTIVE", lastSuccessfulSyncAt: new Date(now - 14 * 60_000).toISOString() },
      { id: "shop-wx", name: "视频号精选店", platform: "视频号", connectionStatus: "ERROR", lastSuccessfulSyncAt: new Date(now - 4 * 3_600_000).toISOString() }
    ],
    runs: [
      { id: "run-1", shopName: "抖音旗舰店", platform: "抖音", syncType: "FULL", status: "SUCCESS", startedAt: new Date(now - 8 * 60_000).toISOString(), rangeLabel: "近 30 天", fetched: 286, upserted: 286, errorMessage: null },
      { id: "run-2", shopName: "快手好物店", platform: "快手", syncType: "ORDERS", status: "SUCCESS", startedAt: new Date(now - 14 * 60_000).toISOString(), rangeLabel: "增量", fetched: 64, upserted: 64, errorMessage: null },
      { id: "run-3", shopName: "视频号精选店", platform: "视频号", syncType: "REFUNDS", status: "FAILED", startedAt: new Date(now - 37 * 60_000).toISOString(), rangeLabel: "增量", fetched: 0, upserted: 0, errorMessage: "连接暂时不可用，请稍后重试" },
      { id: "run-4", shopName: "抖音旗舰店", platform: "抖音", syncType: "PRODUCTS", status: "SUCCESS", startedAt: new Date(now - 2 * 3_600_000).toISOString(), rangeLabel: "全量", fetched: 30, upserted: 30, errorMessage: null }
    ]
  };
}


import type { DatePreset } from "@/lib/metrics/timezone";

export interface KpiValue {
  label: string;
  value: string;
  change: number | null;
  tone?: "default" | "warning";
}

export interface TrendPoint {
  date: string;
  gmv: number;
  netSales: number;
  orders: number;
}

export interface PlatformContribution {
  platform: string;
  value: number;
  share: number;
  color: string;
}

export interface ShopPerformance {
  id: string;
  name: string;
  platform: string;
  gmv: number;
  netSales: number;
  paidOrders: number;
  unitsSold: number;
  aov: number;
  refundAmount: number;
  refundRate: number;
  change: number;
}

export interface ProductPerformance {
  id: string;
  name: string;
  code: string;
  unitsSold: number;
  gmv: number;
  netSales: number;
  refundRate: number;
  leadingPlatform: string;
  platformShare: number;
  trend7d: number;
  trend30d: number;
}

export interface DashboardSnapshot {
  preset: DatePreset;
  rangeLabel: string;
  updatedAt: string;
  kpis: KpiValue[];
  trend: TrendPoint[];
  contributions: PlatformContribution[];
  shops: ShopPerformance[];
  products: ProductPerformance[];
}

export interface ProductDetailSnapshot {
  product: ProductPerformance;
  trend: TrendPoint[];
  platforms: Array<{
    platform: string;
    unitsSold: number;
    gmv: number;
    refundRate: number;
    aov: number;
  }>;
  skus: Array<{
    name: string;
    code: string;
    platform: string;
    unitsSold: number;
    gmv: number;
  }>;
}

export interface MappingSnapshot {
  products: Array<{ id: string; name: string; code: string }>;
  rows: Array<{
    id: string;
    platform: string;
    externalProductId: string;
    title: string;
    merchantCode: string;
    status: "AUTO_MATCHED" | "MANUAL" | "UNMATCHED";
    unifiedProductId: string | null;
    unifiedProductName: string | null;
  }>;
}

export interface SyncSnapshot {
  shops: Array<{
    id: string;
    name: string;
    platform: string;
    connectionStatus: string;
    lastSuccessfulSyncAt: string | null;
  }>;
  runs: Array<{
    id: string;
    shopName: string;
    platform: string;
    syncType: string;
    status: string;
    startedAt: string;
    rangeLabel: string;
    fetched: number;
    upserted: number;
    errorMessage: string | null;
  }>;
}


import type { Platform } from "@/generated/prisma";

export type DecimalString = string;

export type AdapterConnectionState =
  | "CONNECTED"
  | "EXPIRED"
  | "ERROR"
  | "DISCONNECTED";

export type SyncResource = "products" | "orders" | "refunds";

export interface ConnectionHealth {
  state: AdapterConnectionState;
  checkedAt: Date;
  message?: string;
}

export interface ShopSyncContext {
  shopId: string;
  externalShopId: string;
  timezone: string;
  cursor: string | null;
  rangeStart?: Date;
  rangeEnd?: Date;
}

export interface AdapterPage<T> {
  records: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface NormalizedSku {
  externalSkuId: string;
  merchantSkuCode?: string;
  title?: string;
  attributes?: Record<string, string>;
  rawPayload?: Record<string, unknown>;
}

export interface NormalizedProduct {
  externalProductId: string;
  title: string;
  merchantProductCode?: string;
  imageUrl?: string;
  status?: string;
  skus: NormalizedSku[];
  rawPayload?: Record<string, unknown>;
}

export interface NormalizedOrderItem {
  externalOrderLineId: string;
  externalProductId: string;
  externalSkuId?: string;
  quantity: number;
  unitPaidAmount?: DecimalString;
  linePaidAmount: DecimalString;
  merchantProductCode?: string;
  merchantSkuCode?: string;
}

export interface NormalizedOrder {
  externalOrderId: string;
  status: string;
  paidAt?: Date;
  createdExternalAt?: Date;
  updatedExternalAt?: Date;
  paymentAmount: DecimalString;
  buyerPaidAmount?: DecimalString;
  currency: string;
  items: NormalizedOrderItem[];
  rawPayload?: Record<string, unknown>;
}

export interface NormalizedRefundItem {
  externalRefundLineId: string;
  externalOrderLineId?: string;
  externalProductId?: string;
  externalSkuId?: string;
  quantity: number;
  refundAmount: DecimalString;
}

export interface NormalizedRefund {
  externalRefundId: string;
  externalOrderId?: string;
  externalOrderLineId?: string;
  status: string;
  refundAmount: DecimalString;
  approvedAt?: Date;
  updatedExternalAt?: Date;
  items: NormalizedRefundItem[];
  rawPayload?: Record<string, unknown>;
}

export interface CommerceAdapter {
  readonly platform: Platform;
  validateConnection(context: Omit<ShopSyncContext, "cursor">): Promise<ConnectionHealth>;
  refreshAuthorization(context: Omit<ShopSyncContext, "cursor">): Promise<ConnectionHealth>;
  listProducts(context: ShopSyncContext): Promise<AdapterPage<NormalizedProduct>>;
  listOrders(context: ShopSyncContext): Promise<AdapterPage<NormalizedOrder>>;
  listRefunds(context: ShopSyncContext): Promise<AdapterPage<NormalizedRefund>>;
}


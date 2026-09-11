-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('DOUYIN', 'KUAISHOU', 'WECHAT');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('PRODUCTS', 'ORDERS', 'REFUNDS', 'FULL');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "MappingStatus" AS ENUM ('AUTO_MATCHED', 'MANUAL', 'UNMATCHED');

-- CreateTable
CREATE TABLE "shops" (
    "id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "external_shop_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CNY',
    "connection_status" "ConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "last_successful_sync_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_credentials" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "access_token_encrypted" TEXT,
    "refresh_token_encrypted" TEXT,
    "access_token_expires_at" TIMESTAMPTZ(3),
    "refresh_token_expires_at" TIMESTAMPTZ(3),
    "scopes" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "platform_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_products" (
    "id" UUID NOT NULL,
    "merchant_product_code" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "image_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "unified_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_skus" (
    "id" UUID NOT NULL,
    "unified_product_id" UUID NOT NULL,
    "merchant_sku_code" TEXT,
    "name" TEXT NOT NULL,
    "attributes" JSONB,
    "cost_amount" DECIMAL(18,2),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "unified_skus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_products" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "external_product_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "merchant_product_code" TEXT,
    "image_url" TEXT,
    "status" TEXT,
    "raw_payload" JSONB,
    "unified_product_id" UUID,
    "mapping_status" "MappingStatus" NOT NULL DEFAULT 'UNMATCHED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "platform_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_skus" (
    "id" UUID NOT NULL,
    "platform_product_id" UUID NOT NULL,
    "external_sku_id" TEXT NOT NULL,
    "merchant_sku_code" TEXT,
    "title" TEXT,
    "attributes" JSONB,
    "unified_sku_id" UUID,
    "raw_payload" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "platform_skus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "external_order_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paid_at" TIMESTAMPTZ(3),
    "created_external_at" TIMESTAMPTZ(3),
    "updated_external_at" TIMESTAMPTZ(3),
    "payment_amount" DECIMAL(18,2) NOT NULL,
    "buyer_paid_amount" DECIMAL(18,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CNY',
    "raw_payload" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "external_order_line_id" TEXT NOT NULL,
    "platform_product_id" UUID,
    "platform_sku_id" UUID,
    "unified_product_id" UUID,
    "unified_sku_id" UUID,
    "quantity" INTEGER NOT NULL,
    "unit_paid_amount" DECIMAL(18,2),
    "line_paid_amount" DECIMAL(18,2) NOT NULL,
    "merchant_product_code" TEXT,
    "merchant_sku_code" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "order_id" UUID,
    "order_item_id" UUID,
    "external_refund_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "refund_amount" DECIMAL(18,2) NOT NULL,
    "approved_at" TIMESTAMPTZ(3),
    "updated_external_at" TIMESTAMPTZ(3),
    "raw_payload" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_items" (
    "id" UUID NOT NULL,
    "refund_id" UUID NOT NULL,
    "external_refund_line_id" TEXT NOT NULL,
    "order_item_id" UUID,
    "platform_product_id" UUID,
    "platform_sku_id" UUID,
    "unified_product_id" UUID,
    "unified_sku_id" UUID,
    "quantity" INTEGER NOT NULL,
    "refund_amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "refund_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" UUID NOT NULL,
    "shop_id" UUID,
    "platform" "Platform" NOT NULL,
    "sync_type" "SyncType" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "range_start" TIMESTAMPTZ(3),
    "range_end" TIMESTAMPTZ(3),
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),
    "records_fetched" INTEGER NOT NULL DEFAULT 0,
    "records_upserted" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "error_message" TEXT,
    "metadata" JSONB,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_cursors" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "resource" TEXT NOT NULL,
    "cursor" TEXT,
    "last_synced_external_updated_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sync_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_shop_metrics" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "shop_id" UUID NOT NULL,
    "paid_gmv" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "net_sales" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paid_orders" INTEGER NOT NULL DEFAULT 0,
    "units_sold" INTEGER NOT NULL DEFAULT 0,
    "refund_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "refund_rate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "aov" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "daily_shop_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_product_metrics" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "unified_product_id" UUID NOT NULL,
    "scope_key" TEXT NOT NULL,
    "shop_id" UUID,
    "platform" "Platform",
    "paid_gmv" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "net_sales" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paid_orders" INTEGER NOT NULL DEFAULT 0,
    "units_sold" INTEGER NOT NULL DEFAULT 0,
    "refund_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "refund_rate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "daily_product_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shops_platform_external_shop_id_key" ON "shops"("platform", "external_shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_credentials_shop_id_key" ON "platform_credentials"("shop_id");

-- CreateIndex
CREATE INDEX "unified_products_merchant_product_code_idx" ON "unified_products"("merchant_product_code");

-- CreateIndex
CREATE UNIQUE INDEX "unified_skus_unified_product_id_merchant_sku_code_key" ON "unified_skus"("unified_product_id", "merchant_sku_code");

-- CreateIndex
CREATE INDEX "platform_products_unified_product_id_idx" ON "platform_products"("unified_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_products_shop_id_external_product_id_key" ON "platform_products"("shop_id", "external_product_id");

-- CreateIndex
CREATE INDEX "platform_skus_unified_sku_id_idx" ON "platform_skus"("unified_sku_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_skus_platform_product_id_external_sku_id_key" ON "platform_skus"("platform_product_id", "external_sku_id");

-- CreateIndex
CREATE INDEX "orders_shop_id_paid_at_idx" ON "orders"("shop_id", "paid_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_shop_id_external_order_id_key" ON "orders"("shop_id", "external_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_external_order_line_id_key" ON "order_items"("order_id", "external_order_line_id");

-- CreateIndex
CREATE INDEX "refunds_shop_id_approved_at_idx" ON "refunds"("shop_id", "approved_at");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_shop_id_external_refund_id_key" ON "refunds"("shop_id", "external_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "refund_items_refund_id_external_refund_line_id_key" ON "refund_items"("refund_id", "external_refund_line_id");

-- CreateIndex
CREATE INDEX "sync_runs_platform_started_at_idx" ON "sync_runs"("platform", "started_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "sync_cursors_shop_id_resource_key" ON "sync_cursors"("shop_id", "resource");

-- CreateIndex
CREATE UNIQUE INDEX "daily_shop_metrics_date_shop_id_key" ON "daily_shop_metrics"("date", "shop_id");

-- CreateIndex
CREATE INDEX "daily_product_metrics_shop_id_date_idx" ON "daily_product_metrics"("shop_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_product_metrics_date_unified_product_id_scope_key_key" ON "daily_product_metrics"("date", "unified_product_id", "scope_key");

-- AddForeignKey
ALTER TABLE "platform_credentials" ADD CONSTRAINT "platform_credentials_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_skus" ADD CONSTRAINT "unified_skus_unified_product_id_fkey" FOREIGN KEY ("unified_product_id") REFERENCES "unified_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_products" ADD CONSTRAINT "platform_products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_products" ADD CONSTRAINT "platform_products_unified_product_id_fkey" FOREIGN KEY ("unified_product_id") REFERENCES "unified_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_skus" ADD CONSTRAINT "platform_skus_platform_product_id_fkey" FOREIGN KEY ("platform_product_id") REFERENCES "platform_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_skus" ADD CONSTRAINT "platform_skus_unified_sku_id_fkey" FOREIGN KEY ("unified_sku_id") REFERENCES "unified_skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_platform_product_id_fkey" FOREIGN KEY ("platform_product_id") REFERENCES "platform_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_platform_sku_id_fkey" FOREIGN KEY ("platform_sku_id") REFERENCES "platform_skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unified_product_id_fkey" FOREIGN KEY ("unified_product_id") REFERENCES "unified_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unified_sku_id_fkey" FOREIGN KEY ("unified_sku_id") REFERENCES "unified_skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_platform_product_id_fkey" FOREIGN KEY ("platform_product_id") REFERENCES "platform_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_platform_sku_id_fkey" FOREIGN KEY ("platform_sku_id") REFERENCES "platform_skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_unified_product_id_fkey" FOREIGN KEY ("unified_product_id") REFERENCES "unified_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_unified_sku_id_fkey" FOREIGN KEY ("unified_sku_id") REFERENCES "unified_skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_cursors" ADD CONSTRAINT "sync_cursors_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_shop_metrics" ADD CONSTRAINT "daily_shop_metrics_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_product_metrics" ADD CONSTRAINT "daily_product_metrics_unified_product_id_fkey" FOREIGN KEY ("unified_product_id") REFERENCES "unified_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_product_metrics" ADD CONSTRAINT "daily_product_metrics_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


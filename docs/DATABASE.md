# 数据库设计（MVP）

数据库：PostgreSQL
ORM：Prisma

## 1. enums

```text
Platform = DOUYIN | KUAISHOU | WECHAT
ConnectionStatus = ACTIVE | EXPIRED | ERROR | DISCONNECTED
SyncType = PRODUCTS | ORDERS | REFUNDS | FULL
SyncStatus = PENDING | RUNNING | SUCCESS | FAILED | PARTIAL
MappingStatus = AUTO_MATCHED | MANUAL | UNMATCHED
```

## 2. shops

平台店铺账号。

字段建议：
- id UUID PK
- platform Platform
- external_shop_id string
- name string
- timezone string default Asia/Shanghai
- currency string default CNY
- connection_status
- last_successful_sync_at nullable
- created_at
- updated_at

唯一约束：`platform + external_shop_id`

## 3. platform_credentials

平台授权信息。敏感字段必须加密。

- id UUID PK
- shop_id FK unique
- access_token_encrypted text nullable
- refresh_token_encrypted text nullable
- access_token_expires_at nullable
- refresh_token_expires_at nullable
- scopes jsonb nullable
- metadata jsonb nullable
- created_at
- updated_at

禁止存店铺明文密码。

## 4. unified_products

跨平台统一商品/SPU。

- id UUID PK
- merchant_product_code string nullable
- name string
- brand string nullable
- category string nullable
- image_url string nullable
- active boolean default true
- created_at
- updated_at

merchant_product_code 应建立索引；是否全局唯一根据真实业务确认后决定。

## 5. unified_skus

- id UUID PK
- unified_product_id FK
- merchant_sku_code string nullable
- name string
- attributes jsonb nullable
- cost_amount Decimal nullable（后续利润模块）
- created_at
- updated_at

## 6. platform_products

- id UUID PK
- shop_id FK
- external_product_id string
- title string
- merchant_product_code string nullable
- image_url string nullable
- status string nullable
- raw_payload jsonb nullable
- unified_product_id FK nullable
- mapping_status MappingStatus default UNMATCHED
- created_at
- updated_at

唯一：`shop_id + external_product_id`

## 7. platform_skus

- id UUID PK
- platform_product_id FK
- external_sku_id string
- merchant_sku_code string nullable
- title string nullable
- attributes jsonb nullable
- unified_sku_id FK nullable
- raw_payload jsonb nullable
- created_at
- updated_at

唯一：`platform_product_id + external_sku_id`

## 8. orders

- id UUID PK
- shop_id FK
- external_order_id string
- status string
- paid_at timestamp nullable
- created_external_at timestamp nullable
- updated_external_at timestamp nullable
- payment_amount Decimal
- buyer_paid_amount Decimal nullable
- currency string default CNY
- raw_payload jsonb nullable
- created_at
- updated_at

唯一：`shop_id + external_order_id`
索引：`shop_id, paid_at`

## 9. order_items

- id UUID PK
- order_id FK
- external_order_line_id string
- platform_product_id FK nullable
- platform_sku_id FK nullable
- unified_product_id FK nullable
- unified_sku_id FK nullable
- quantity int
- unit_paid_amount Decimal nullable
- line_paid_amount Decimal
- merchant_product_code string nullable
- merchant_sku_code string nullable
- created_at
- updated_at

唯一：`order_id + external_order_line_id`

## 10. refunds

- id UUID PK
- shop_id FK
- order_id FK nullable
- order_item_id FK nullable
- external_refund_id string
- status string
- refund_amount Decimal
- approved_at timestamp nullable
- updated_external_at timestamp nullable
- raw_payload jsonb nullable
- created_at
- updated_at

唯一：`shop_id + external_refund_id`

## 11. sync_runs

每次同步运行记录。

- id UUID PK
- shop_id FK nullable
- platform Platform
- sync_type SyncType
- status SyncStatus
- range_start timestamp nullable
- range_end timestamp nullable
- started_at
- finished_at nullable
- records_fetched int default 0
- records_upserted int default 0
- error_code string nullable
- error_message text nullable（禁止包含 secret/token）
- metadata jsonb nullable

索引：`platform, started_at desc`

## 12. sync_cursors

- id UUID PK
- shop_id FK
- resource string
- cursor text nullable
- last_synced_external_updated_at timestamp nullable
- updated_at

唯一：`shop_id + resource`

## 13. daily_shop_metrics

- id UUID PK
- date date
- shop_id FK
- paid_gmv Decimal
- net_sales Decimal
- paid_orders int
- units_sold int
- refund_amount Decimal
- refund_rate Decimal
- aov Decimal
- created_at
- updated_at

唯一：`date + shop_id`

## 14. daily_product_metrics

- id UUID PK
- date date
- unified_product_id FK
- shop_id FK nullable
- platform Platform nullable
- paid_gmv Decimal
- net_sales Decimal
- paid_orders int
- units_sold int
- refund_amount Decimal
- refund_rate Decimal
- created_at
- updated_at

建议唯一键根据聚合粒度拆成明确字段，避免 NULL unique 语义问题；Codex 实现时可使用 scope_key 或拆两张聚合表。

## 15. product_mapping_candidates（可选）

用于标题/货号相似匹配建议，不直接自动确认。

- id UUID PK
- platform_product_id FK
- candidate_unified_product_id FK
- confidence Decimal
- reason jsonb
- reviewed_at nullable
- created_at

## 16. 金额与时间规范

- 金额优先使用 Prisma Decimal / PostgreSQL numeric(18,2)，不得使用 float/double。
- API 返回分为单位时，在 Adapter 标准化层统一转换，转换逻辑必须有测试。
- 数据库存 UTC timestamp；经营日切按 shop.timezone 计算。
- Dashboard 默认显示 Asia/Shanghai。

## 17. 删除策略

订单、退款、同步日志不物理删除。
商品可使用 active/status 标记失效，避免历史报表断链。

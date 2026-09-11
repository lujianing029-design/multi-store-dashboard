# 系统架构

## 1. 总体结构

```text
Douyin / Kuaishou / WeChat Shop
          |
          v
   Platform Adapters
          |
          v
    Sync Orchestrator
          |
          v
 Raw API Payload Storage
          |
          v
 Normalization + Upsert
          |
          v
 PostgreSQL Core Tables
          |
          +--> Aggregation / Metrics
          |
          +--> Product Mapping
          |
          v
       Next.js API
          |
          v
       Dashboard UI
```

## 2. 核心模块

### 2.1 Platform Adapter
每个平台必须实现统一接口，例如：

```ts
interface CommerceAdapter {
  platform: 'DOUYIN' | 'KUAISHOU' | 'WECHAT';
  validateConnection(accountId: string): Promise<ConnectionHealth>;
  refreshToken(accountId: string): Promise<void>;
  syncProducts(ctx: SyncContext): Promise<SyncResult>;
  syncOrders(ctx: SyncContext): Promise<SyncResult>;
  syncRefunds(ctx: SyncContext): Promise<SyncResult>;
}
```

第一阶段先实现 `MockDouyinAdapter`、`MockKuaishouAdapter`、`MockWechatAdapter`，确保业务层和 UI 可以完整运行。

真实 Adapter 开发时必须参考当时最新官方文档，不得猜接口 URL、字段、签名方式或权限名称。

### 2.2 Sync Orchestrator
职责：
- 控制定时同步
- 按平台/店铺创建同步任务
- 管理游标/时间窗口
- 限流
- 自动重试
- 失败记录
- 补偿同步

建议每类数据维护单独 cursor：
- products
- orders
- refunds

### 2.3 标准化层
外部平台数据先转成统一 DTO，再写数据库。

统一订单示例字段：
- platform
- shop_id
- external_order_id
- paid_at
- order_status
- payment_amount
- item_count
- buyer_paid_amount
- currency

统一订单行示例：
- external_order_line_id
- external_product_id
- external_sku_id
- quantity
- line_paid_amount
- merchant_product_code
- merchant_sku_code

### 2.4 商品映射
`PlatformProduct -> UnifiedProduct`
`PlatformSku -> UnifiedSku`

自动匹配顺序：
1. merchant product code exact match
2. merchant sku code exact match
3. existing manual mapping
4. unmatched queue

标题相似度只能做“候选建议”，不能未经确认直接合并。

### 2.5 指标聚合
建议建立日粒度聚合表，例如：
- daily_shop_metrics
- daily_product_metrics
- daily_sku_metrics

这样 Dashboard 不需要每次扫描全部订单明细。

## 3. 同步策略

### 增量同步
- 订单：按更新时间/游标拉取
- 退款：按更新时间/游标拉取
- 商品：低频全量或增量

### 补偿同步
每天对前一天重新同步，覆盖迟到退款、订单状态变化。

### 幂等键
- shop + external_order_id
- shop + external_order_line_id
- shop + external_refund_id
- shop + external_product_id
- shop + external_sku_id

数据库层必须加唯一约束。

## 4. 安全

敏感变量包括：
- APP_KEY
- APP_SECRET
- ACCESS_TOKEN
- REFRESH_TOKEN
- DATABASE_URL
- ENCRYPTION_KEY

要求：
- 只存在环境变量或 Secret Manager
- Token 落库必须加密
- `.env` 必须加入 `.gitignore`
- 提供 `.env.example`，只能写占位符
- 日志对 Token 脱敏

## 5. 推荐目录

```text
src/
  app/
  components/
  lib/
    db/
    metrics/
    product-mapping/
  platforms/
    types.ts
    mock/
    douyin/
    kuaishou/
    wechat/
  workers/
    sync/
prisma/
  schema.prisma
  seed.ts
docs/
```

## 6. 第一阶段交付

1. Next.js 项目可运行
2. PostgreSQL + Prisma schema
3. Mock 三平台数据
4. Dashboard 总览
5. 店铺对比
6. 商品排行榜
7. 商品详情
8. 商品映射页
9. 同步日志页
10. 测试覆盖核心聚合函数

完成以上内容以后，再逐个平台替换 Mock Adapter 为真实 Adapter。

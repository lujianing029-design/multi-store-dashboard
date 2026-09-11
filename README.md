# Multi Store Dashboard

一个面向多平台电商经营的数据系统，目标是把抖音店铺、快手店铺、视频号/微信小店的数据自动汇总到一个后台，自动比较店铺表现、商品表现和退款情况，不需要每天人工导出 Excel。

## 第一版目标

- 自动同步抖音、快手、视频号/微信小店的订单、商品、SKU、退款/售后数据
- 统一平台字段，写入同一套 PostgreSQL 数据模型
- 使用统一商品/SPU 与统一 SKU 映射同款商品
- 经营总览：今日、昨日、7 天、30 天
- 店铺对比：销售额、订单量、销量、客单价、退款率、净销售额
- 商品排行榜：销量、销售额、退款率、趋势、平台贡献占比
- 单品分析：同一商品在不同平台的表现
- 自动同步、失败重试、同步日志、授权状态提示
- 后续扩展利润分析：成本、广告费、平台佣金、达人佣金、运费

## 技术方向

- Web：Next.js + TypeScript
- 数据库：PostgreSQL
- ORM：Prisma 或同等级类型安全 ORM
- UI：Tailwind CSS + 组件库
- 图表：Recharts 或同等级图表库
- 同步任务：独立 Worker / 定时任务
- 部署：Web 与 Worker 分离部署，数据库使用托管 PostgreSQL

## 本地启动

### 前置要求

- Node.js 22 LTS 或更新版本
- pnpm 11 或更新版本
- PostgreSQL 数据库连接串

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

```bash
cp .env.example .env
```

将 `.env` 中的 `DATABASE_URL` 替换为本地或托管 PostgreSQL 连接串。不要把真实 `.env*` 文件提交到仓库。`APP_TIMEZONE` 控制默认经营时区；演示数据默认生成到当前 UTC 日期，也可以通过 `SEED_REFERENCE_DATE=YYYY-MM-DD` 固定数据截止日。

### 准备数据库

```bash
pnpm db:validate
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

`db:migrate` 会应用 `prisma/migrations` 中的 PostgreSQL migration。`db:seed` 会生成 3 家演示店铺、10 个统一商品、30 个平台商品，以及最近 30 天的订单和退款。Seed 仅重建 `DEMO-` 前缀的交易数据，并对店铺与商品执行 upsert，可安全重复运行。

需要重建本地开发数据库时运行 `pnpm db:reset`；该命令会清空当前数据库，只应对专用开发库使用。

### 运行 Mock 同步

```bash
pnpm mock:sync
pnpm mock:sync <shop-id> products
```

不带参数时会对全部已连接店铺执行完整 Mock 同步。第二个参数可选 `products`、`orders`、`refunds` 或 `full`。Mock Adapter 只生成确定性演示数据，不连接任何真实平台 API。

### 启动开发服务器

```bash
pnpm dev
```

默认访问 `http://localhost:3000`。

### 质量检查

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:validate
pnpm db:generate
```

## 数据流

`平台授权/API -> 平台 Adapter -> 原始数据落库 -> 标准化 -> 商品映射 -> 指标聚合 -> Dashboard`

所有平台接入都必须通过 Adapter 层，业务层不能直接依赖某个平台的字段名或接口返回格式。

## 开发原则

1. 优先使用平台官方 API 和官方授权流程。
2. 不把店铺密码、App Secret、Access Token 写入 Git 仓库。
3. 第一阶段即使还没有真实平台 API 权限，也必须通过 Mock Adapter 把整套系统跑通。
4. 所有金额使用整数分（cent/fen）或 Decimal 存储，不使用浮点数。
5. 所有订单、商品、退款同步必须幂等，重复同步不能重复计数。
6. 默认经营时区使用 `Asia/Shanghai`，但必须可配置。
7. 平台 API 接口名称、参数和权限必须以开发时的最新官方文档为准，不允许凭猜测实现。

## 目录文档

- `docs/PRODUCT.md`：产品需求与指标定义
- `docs/ARCHITECTURE.md`：系统架构与同步设计
- `docs/DATABASE.md`：数据库模型
- `CODEX.md`：Codex 开发执行规范

## 当前阶段

Phase 3 已完成三平台 Mock Adapter、标准化数据契约、幂等同步编排、游标与运行日志持久化。真实平台 Adapter 仍保持空骨架，后续接入必须以届时官方文档为准。

> 安全提醒：仓库中永远不要提交真实平台账号、密码、Cookie、Access Token、Refresh Token、App Key、App Secret、数据库密码等敏感信息。


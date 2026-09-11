# Multi Store Dashboard

面向抖音、快手和视频号/微信小店的多店经营数据后台。当前版本包含确定性 Mock Adapter、PostgreSQL 持久化、日指标聚合，以及中文经营总览、店铺、商品、映射和同步页面。

真实平台 Adapter 仅保留接口骨架。本项目不会猜测平台 API、签名方式或授权字段。

## 环境要求

- Node.js 22 LTS 或更新版本
- pnpm 11
- 可选：Docker Desktop 或本地 PostgreSQL 16（仅数据库模式需要）

## 演示模式（无需数据库）

演示模式是默认模式，适合浏览 UI 和开发前端。它不会在启动或构建时连接 PostgreSQL。

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:3000`。页面默认展示近 7 天数据，并支持今日、昨日、近 7 天和近 30 天。

如需显式配置，可创建 `.env`：

```env
DASHBOARD_DATA_MODE="demo"
APP_TIMEZONE="Asia/Shanghai"
```

不要提交 `.env` 或任何真实凭证。

## 数据库模式

### 1. 启动 PostgreSQL

仓库提供可选的 Docker Compose 开发数据库：

```bash
docker compose up -d postgres
```

也可以使用已有的 PostgreSQL 16 实例。创建 `.env`：

```env
DATABASE_URL="postgresql://dashboard:dashboard_dev@localhost:5432/multi_store_dev?schema=public"
APP_TIMEZONE="Asia/Shanghai"
DASHBOARD_DATA_MODE="database"
SEED_REFERENCE_DATE=""
```

Compose 中的账号仅用于本机开发，不是生产凭证。

### 2. 应用迁移并生成演示数据

```bash
pnpm db:validate
pnpm db:generate
pnpm db:deploy
pnpm db:seed
```

`db:seed` 创建 3 家店铺、10 个统一商品、30 个平台商品及最近 30 天的订单和退款。Seed 使用固定 ID 和 upsert，且仅重建 `DEMO-` 交易数据，可重复执行。

开发 schema 时可使用 `pnpm db:migrate`；自动化和部署使用不会生成新迁移的 `pnpm db:deploy`。`pnpm db:reset` 会清空数据库，只能用于专用开发库。

### 3. 执行 Mock 同步和指标聚合

```bash
pnpm mock:sync
pnpm mock:sync
pnpm metrics:rebuild
```

连续运行两次同步不会重复创建平台商品、订单、订单项、退款或退款项。`metrics:rebuild` 默认重建近 30 个店铺自然日，并按每家店配置的时区计算 UTC 边界。

可按店铺和资源同步：

```bash
pnpm mock:sync <shop-id> products
pnpm mock:sync <shop-id> orders
pnpm mock:sync <shop-id> refunds
pnpm mock:sync <shop-id> full
```

也可指定指标日期范围：

```bash
pnpm metrics:rebuild 2026-01-01 2026-01-30
```

最后运行 `pnpm dev`，Dashboard 将从日聚合表读取数据。

## 测试与质量检查

无需数据库的完整本地检查：

```bash
pnpm verify
```

也可以分别运行：

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm check:secrets
pnpm db:validate
pnpm db:generate
pnpm build
```

数据库集成验证要求已配置且可清理的测试数据库，并且已应用迁移和 seed：

```bash
DASHBOARD_DATA_MODE=database pnpm test:integration
```

`pnpm ci:database` 会依次执行迁移部署、seed、两次 Mock 全量同步、日指标重建和数据库集成测试。它会改写目标数据库，只能连接临时 CI 或专用测试库。

## GitHub Actions

`.github/workflows/ci.yml` 在 pull request 和推送到 `main` 时运行。CI 使用临时 PostgreSQL 16 服务容器和非敏感测试连接串，顺序为：

1. 安装锁定依赖
2. lint、typecheck、单元测试和仓库密钥扫描
3. Prisma validate/generate
4. 从空数据库应用 migrations
5. seed、两次 Mock 同步、日指标重建
6. 数据库集成测试
7. 无数据库演示模式 production build

集成测试会验证迁移、核心种子数量、同步与聚合幂等、游标事务安全、统一商品/SKU 映射和数据库模式 Dashboard 查询。

## 指标口径

- 支付销售额：已支付/完成订单的支付金额之和
- 净销售额：支付销售额减已批准/完成退款金额
- 支付订单：去重后的支付订单数
- 销售件数：支付订单项数量之和
- 退款率：退款金额 / 支付销售额
- 客单价：支付销售额 / 支付订单数
- 环比变化：`(本期 - 上期) / 上期`；上期为零时不展示

核心金额计算使用 `Prisma.Decimal`，平台整数分通过固定精度字符串归一化，不使用 JavaScript 浮点进行财务汇总。

## 已知限制

- 不调用任何真实抖音、快手或微信平台 API，也不包含真实授权流程。
- Mock 同步和日指标重建当前由命令触发，尚未接入队列或定时调度器。
- 数据库模式的单品 SKU 日指标尚未单独聚合，因此详情页可能显示 SKU 空状态。
- 当前没有登录、租户隔离和生产级权限控制。
- Secret 扫描是基础防线，生产仓库仍应启用 GitHub Secret Scanning 和依赖审查。

## 数据流

`平台授权/API -> 平台 Adapter -> 标准化 -> PostgreSQL -> 商品映射 -> 日指标聚合 -> Dashboard`

平台业务逻辑隔离在 `src/platforms/`，Dashboard 页面只调用 `src/lib/dashboard/` 服务层，不直接读取平台原始字段或 Prisma。


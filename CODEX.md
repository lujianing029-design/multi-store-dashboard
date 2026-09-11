# Codex 开发执行规范

你正在开发一个多平台电商经营数据系统。请严格按本文件与 `docs/` 中的产品、架构和数据库设计执行。

## 核心目标

构建一个可运行的 MVP：

1. Next.js + TypeScript Web 应用
2. PostgreSQL + Prisma
3. 三个平台 Mock Adapter：抖音、快手、视频号/微信小店
4. 自动生成可用于演示的模拟店铺、商品、订单、退款数据
5. Dashboard 总览
6. 店铺对比
7. 商品排行榜
8. 单品分析
9. 商品映射管理
10. 同步日志页

真实平台 API 暂时不要凭猜测实现。真实 Adapter 只搭接口骨架和清晰 TODO；后续接入前必须查最新官方开发文档。

## 开发顺序

### Phase 1 — 工程初始化
- 初始化 Next.js App Router + TypeScript
- 配置 ESLint
- 配置 Tailwind CSS
- 安装 Prisma/PostgreSQL 驱动
- 建立 `.env.example`
- `.gitignore` 必须忽略 `.env*`（但保留 `.env.example`）
- 增加基本 README 启动说明

### Phase 2 — 数据模型
- 根据 `docs/DATABASE.md` 创建 Prisma schema
- 创建 migration
- 创建 seed
- seed 至少包含：3 个平台，每个平台 1 家店，10 个统一商品，不同平台商品标题可不同但部分共享统一货号，30 天订单与退款数据

### Phase 3 — Adapter 与同步
建立统一 `CommerceAdapter` 接口。

实现：
- MockDouyinAdapter
- MockKuaishouAdapter
- MockWechatAdapter

建立同步编排器：
- products
- orders
- refunds
- sync_runs
- sync_cursors
- 幂等 upsert
- 基础 retry helper

### Phase 4 — 指标层
实现可测试的指标函数：
- paid GMV
- net sales
- paid orders
- units sold
- refund amount
- refund rate
- AOV
- period-over-period change

生成日聚合数据。

### Phase 5 — UI
UI 优先中文，风格清晰、商业数据后台化，不要做花哨营销页。

页面：
- `/` 经营总览
- `/shops` 店铺对比
- `/products` 商品排行榜
- `/products/[id]` 单品分析
- `/mapping` 商品映射
- `/sync` 同步日志

导航栏需要明确区分这些页面。

### Phase 6 — 测试和质量
至少增加：
- 指标计算单元测试
- 金额转换测试
- 幂等同步测试
- 商品统一映射测试

运行并修复：
- lint
- typecheck
- tests
- production build

## UX 规则

- 默认时间范围：近 7 天
- 支持今日 / 昨日 / 7 天 / 30 天
- 金额用人民币格式化
- 表格支持基础排序
- 加载态、空状态、错误状态不能缺失
- Mock 数据必须看起来合理且能明显展示不同平台/商品表现差异

## 安全红线

绝对不要：
- 把真实 token、secret、cookie、账号密码提交到仓库
- 在日志里打印完整凭证
- 使用浏览器自动化绕过平台验证码/风控
- 猜测平台 API 路由、签名算法或字段

如果缺真实 API 权限，继续使用 Mock Adapter，保证系统其余部分完整可运行。

## 代码质量

- 平台业务逻辑必须隔离在 `src/platforms/`
- Dashboard 不允许直接读取平台原始字段
- 数据库写入必须幂等
- 金额不得使用 JS 浮点做核心财务汇总
- 抽象适度，不要过度工程化
- 所有关键函数加类型
- 避免巨大单文件

## 每完成一个 Issue

1. 运行 lint/typecheck/tests/build
2. 更新 README 或相关 docs（如行为发生变化）
3. 提交清晰 commit
4. 在 PR/Issue 中说明：完成内容、测试结果、剩余风险

## 第一目标

在没有任何真实店铺凭证的情况下，克隆仓库后按照 README 操作即可启动一个完整、可浏览、有模拟数据的经营 Dashboard。

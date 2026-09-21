# Issue #1：发布能力总体架构设计

> 范围：仅技术设计；不接入真实平台，不修改既有电商数据同步行为。  
> 基线：`main` @ `3144a59496345b8c1cf47b29cf7177e5db3ed8c6`

## 1. 现状盘点

仓库是 pnpm 单体应用：Next.js 16.3、React 19.3、TypeScript 6、Tailwind 4；数据层为 PostgreSQL 16 + Prisma 7（`@prisma/adapter-pg`）。默认 demo 模式不连数据库，CI 使用 PostgreSQL 服务容器并执行 lint、typecheck、单测、Prisma 校验/迁移、seed、同步、聚合及 build。

当前目录职责：

- `src/app/`：App Router 页面与 API route；
- `src/components/dashboard/`：经营后台 UI；
- `src/lib/dashboard/`、`src/lib/metrics/`：读模型、指标计算和时区逻辑；
- `src/platforms/`：平台端口、Mock Adapter、真实 Adapter 占位、重试和脱敏；
- `src/workers/sync/`：同步编排器、存储端口和 Prisma 实现；
- `prisma/`：Schema、迁移、seed；
- `tests/`：同步、适配器、指标、映射、金额和数据库集成测试。

## 2. 可复用能力与边界

| 现有能力 | 复用方式 |
| --- | --- |
| `CommerceAdapter`、归一化 DTO 和平台枚举 | 新建平行的 `PublisherAdapter`；不要扩展 CommerceAdapter，以免发布概念污染经营数据同步。 |
| `SyncOrchestrator` + `SyncStore` | 复用“端口 + 编排器 + Prisma store”的分层方式；发布另建 `PublishOrchestrator` 与 `PublicationStore`。 |
| `withRetry` | 复用指数退避实现，但发布任务须按错误分类决定是否重试，并保存每次 attempt。 |
| `sanitizeRawPayload` / `sanitizeError` | 复用并扩展为发布日志的统一脱敏入口。 |
| `UnavailableRealAdapter` | 复用“官方文档/凭据未验证则失败”的安全默认值；首期仅实现 Fake Adapter。 |
| Prisma、迁移、CI 数据库管线 | 新表经独立 migration 加入；新增单测和数据库集成测试。 |
| `Shop` 与 `PlatformCredential` | 不复用为发布账号：店铺经营数据与内容发布授权的生命周期、权限和一对多关系不同；可在后续通过可选关联建立业务视图。 |

当前 `Platform` 仅有 `DOUYIN/KUAISHOU/WECHAT`。若发布平台覆盖范围一致，可临时复用该 enum；若未来会有不同的平台集合，应在本 Issue 的实现阶段拆出 `PublisherPlatform`，避免对同步模块做破坏性变更。

## 3. 总体架构

```text
内容管理 UI / API
        |
  Content application service ----> PostgreSQL
        |                               |
        |                               +--> audit_logs / outbox_events
        +--> object storage (video/cover)
                                        |
Scheduler --到期实例--> publication_tasks --outbox--> queue/worker
                                                     |
                                               PublishOrchestrator
                                                     |
                              PublisherAdapter contract (Fake first)
                                                     |
                         后续：官方验证后的平台 Adapter

AI Agent -> 受限的内容/校验/计划工具 -> 待确认 publication_task
```

保留现有同步链路不变。发布链路是并列模块，不调用 `SyncOrchestrator`。业务事务内创建任务和 outbox event；dispatcher 异步投递，以避免任务已写库但消息未投递。Worker 必须用稳定的 idempotency key 调 Adapter。

## 4. 核心模型与流程

### 视频和内容

`MediaAsset` 保存对象存储键、SHA-256、MIME、时长、尺寸和处理状态；二进制不入数据库。`Content` 是逻辑内容，`ContentRevision` 是不可变快照，含标题、正文、标签、视频/封面与平台覆盖字段。发布任务只能引用 revision，编辑草稿不会篡改已排队内容。

### 账号

`PublisherAccount` 独立表示一个发布身份，含平台、外部账号 ID、显示名、状态和 Secret Manager 引用。数据库不保存 token、Cookie 或密码；只保存加密凭据引用、授权范围和过期时间。状态为 `ACTIVE / DISABLED / REAUTH_REQUIRED`。

### 发布任务与定时

状态机：`DRAFT -> SCHEDULED -> QUEUED -> RUNNING -> SUCCEEDED`；可转 `CANCELLED`，失败可进入 `RETRY_WAIT`，重试耗尽为 `FAILED`。每次调用建立一个 `PublicationAttempt`。Scheduler 仅幂等地创建任务，Worker 才发布。

`Schedule` 支持一次性及 Cron，存 IANA 时区和 UTC 的下一次执行时间；唯一键 `(schedule_id, occurrence_at)` 防止多实例重复触发。

### Publisher Adapter

```ts
interface PublisherAdapter {
  readonly platform: PublisherPlatform;
  capabilities(account: PublisherAccount): Promise<PublisherCapabilities>;
  validate(input: PublishInput): Promise<ValidationResult>;
  publish(input: PublishInput, options: { idempotencyKey: string }): Promise<PublishResult>;
  getPublication?(remoteId: string): Promise<PublicationStatus>;
}
```

Adapter 处理字段映射、上传协议、平台限流与错误归类；平台 SDK 类型不得进入应用层。首期 `FakePublisherAdapter` 必须模拟成功、可重试失败、不可重试失败与幂等重复调用。真实 Adapter 仅在官方文档、授权范围、测试账号和安全审查完成后单独立项。

### 日志与 AI Agent

结构化日志必须带 `request_id/task_id/attempt_id/account_id/platform`，统一经过脱敏。审计日志记录 actor、动作、对象、前后摘要；领域事件用于异步投递和指标，不替代审计。

AI Agent 只能读取用户有权限的草稿、生成/改写内容、校验平台限制并创建“待确认”计划。它没有平台凭据和数据库直写权限；实际发布始终经 `PublicationTask` + Worker。记录 `agent_runs` 的模型、提示词版本、输入输出摘要及用量。

## 5. Schema 增量

保留既有 commerce 表和迁移，新增以下模型（UUID 主键、`createdAt/updatedAt`、UTC `timestamptz`）：

| 表 | 核心字段与约束 |
| --- | --- |
| `media_assets` | `storage_key` unique，`sha256`，类型/大小/时长/尺寸/状态/metadata；`(workspace_id, sha256)` 索引。 |
| `contents` | workspace、当前 revision、状态、创建者。 |
| `content_revisions` | content、递增 revision、标题/正文/标签、媒体引用、平台覆盖；`(content_id, revision_no)` unique。 |
| `publisher_accounts` | workspace、平台、外部账号、状态、credential_ref、授权到期时间、settings；`(workspace_id, platform, external_account_id)` unique。 |
| `publication_schedules` | content、账号、kind、cron/run_at、timezone、next_run_at、状态；active 的 `next_run_at` 索引。 |
| `publication_tasks` | revision、账号、可选 schedule、状态、计划/开始/结束时间、重试计数、`idempotency_key` unique、脱敏错误摘要；`(status, scheduled_for)` 索引。 |
| `publication_attempts` | task、attempt_no、结果、远端 ID/URL、错误分类、脱敏请求/响应摘要；`(task_id, attempt_no)` unique。 |
| `outbox_events` | 聚合类型/ID、事件类型、payload、发生/投递时间、投递次数；未投递记录索引。 |
| `audit_logs` | workspace、actor、动作、资源、前后摘要、request_id、时间。 |
| `agent_runs` | workspace、actor、目的、模型、prompt 版本、状态、摘要、token 用量。 |

第一版若项目仍无登录和租户隔离，可先引入单一 `workspace` 种子记录，但不得把全局默认值硬编码到领域服务；RBAC 前置 Issue 完成后再开放多用户入口。

## 6. 推荐目录

```text
src/
  modules/
    publishing/
      domain/ application/ infrastructure/
      publisher-adapter.ts
      fake-publisher-adapter.ts
    content/
    scheduling/
    agent/
  platforms/                 # 既有 commerce/sync，保持不动
  workers/
    sync/                    # 既有
    publishing/
  lib/
    db/ observability/ storage/ secrets/
tests/
  publishing/                # unit、contract、integration
docs/
  ISSUE-1-PUBLISHING-ARCHITECTURE.md
```

若当前仓库更倾向按 `src/lib` 组织，可先将 `modules/publishing` 放入 `src/lib/publishing`；关键是发布模块与 `src/platforms/` 的 commerce 同步模块隔离。

## 7. 后续 Issue 依赖

| Issue | 内容 | 依赖 |
| --- | --- | --- |
| #2 | 明确发布平台枚举、workspace/RBAC、对象存储和 Secret Manager 选型 | #1 |
| #3 | Prisma schema/migration、内容 revision、媒体元数据 API | #2 |
| #4 | PublisherAdapter contract、Fake Adapter、发布任务状态机、outbox、Worker | #3 |
| #5 | 一次性/Cron Schedule、时区、幂等触发和补偿 | #4 |
| #6 | 审计、日志、指标、告警与任务运维 UI | #4 |
| #7 | AI Agent 受限工具、人工确认、用量与评估 | #3、#4、#6 |
| #8+ | 每个平台一个真实 Adapter、测试账号验证 | #4、#6 |

## 8. 验收

- 现有 Dashboard、Mock 同步、Prisma 表和测试行为不变；
- 无真实 token、Cookie、密码、OAuth 流程或真实平台请求；
- Fake Adapter contract tests 覆盖幂等、可重试/不可重试错误；
- 任务与 schedule 的唯一约束可防重复发布；
- 所有发布日志、审计摘要和 Agent 记录均不泄露凭据。

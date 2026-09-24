# Issue #5：AI 文案与四平台适配

“发布视频”页面在 Issue #4 的上传、账号选择、定时与最终确认流程中增加商品信息表单。生成结果包含主标题、主正文、标签，以及抖音、快手、小红书、视频号四份独立文案。每份均可单独修改；“恢复主文案”只影响当前平台，“重新生成”根据商品信息重新生成全部草稿。手动填写主文案后也可使用 Content Adapter 生成四平台草稿。

生成服务在 `src/lib/ai-copy/provider.ts`。同时配置 `OPENAI_API_KEY` 和 `OPENAI_MODEL` 时，服务端调用 OpenAI Responses API。未配置完整时采用明确标识的 Mock Provider，页面显示“Mock 示例文案”。密钥仅从服务端环境变量读取，示例环境文件为空值。AI 响应失败会在页面显示错误，手动编辑仍可用。

四个平台的改写规则在 `src/lib/ai-copy/content-adapters.ts`，每个平台分别保存到 `PublishTarget.platformPayload.copy`。Worker 读取各自的最终文案并传入已有 `SocialAutoUploadAdapter.publish`。该 Adapter 和 sau 浏览器自动化未改动。

创建任务仍需视频、平台账号、最终确认复选框；当前 API 固定为 Dry Run，不真实发布。文案生成与平台适配的接口本身不会创建发布任务。

## 环境变量

- `OPENAI_API_KEY`：OpenAI API 密钥，只在服务端环境配置。
- `OPENAI_MODEL`：配置的可用模型 ID。与密钥同时存在时启用真实 AI Provider。
- 两者任一为空时使用 Mock Provider。
- 完整的上传与任务 Dry Run 仍需已有 `DATABASE_URL` 及 Issue #4 的账号映射。

## 验证

- Mock Provider 和四平台独立草稿的单元测试。
- TypeScript、ESLint、生产构建、密钥扫描。
- 本地 HTTP 测试：商品信息生成、手动主文案适配、缺少商品名称的错误响应。
- 本地没有 `DATABASE_URL`，所以“上传视频 → 创建数据库任务”的端到端运行需在配置数据库的环境中执行；本阶段没有执行真实发布。

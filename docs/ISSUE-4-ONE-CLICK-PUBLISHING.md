# Issue #4: 一键发布后台

## 已交付

- `/publish-video` 为中文一键发布确认页：选择内容库视频、填写标题/正文/话题、勾选平台账号、选择立即或定时执行，并确认后创建任务。
- 每个目标平台单独创建 `PublishTarget` 与 `PublishJob`；Dry Run 下目标独立完成。
- `PublishLog` 记录任务、Dry Run 和 Worker 输出；日志输出脱敏。
- `SocialAutoUploadAdapter` 通过受控发布桥接复用本机 `sau`，不重新实现浏览器自动化。
- Worker 从 Storage Adapter 将视频短暂 stage 到系统临时目录，调用结束立即清理。
- 增加 `HUMAN_ACTION_REQUIRED` 的 Job / Target 状态与 Prisma migration。
- Cookie、验证码、媒体存储目录均已加入 `.gitignore`，不进入数据库或 Git。

## 运行模式

后台创建任务默认 `dryRun: true`，不会调用 `sau` 或向任何平台发布。

真实发布仅允许受信任的本机 Worker 使用，并需显式设置：

```env
SAU_ENABLE_REAL_PUBLISH=true
SAU_COMMAND=C:\\Users\\Administrator\\social-auto-upload\\.venv\\Scripts\\sau.exe
```

请勿在云端、CI 或共享环境设置该开关。若输出表示登录失效、扫码、短信或验证码，Worker 将标记 `HUMAN_ACTION_REQUIRED`；不得尝试绕过平台安全机制。

## 已知限制

当前 sau CLI 不稳定地返回作品 ID / URL，因此 `PublishResult.remoteUrl` 允许为空。系统不会为获取 URL 使用额外爬取。


## 定时 Dry Run

定时任务保存在 `PublishTask.scheduledFor` 与 `PublishJob.runAfter`。部署环境的受信任调度器应调用 `runDueDryRunJobs()`（`src/lib/publishing/scheduler.ts`）；它只会处理后台创建的 Dry Run 任务，仍不会打开浏览器或真实发布。

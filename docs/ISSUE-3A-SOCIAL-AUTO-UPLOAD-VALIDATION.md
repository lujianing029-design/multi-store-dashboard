# Issue #3A：social-auto-upload 集成验证

## 已实现

- 保留 Next.js、Prisma、中文后台、`PublishTask`、`PublishTarget`、`PublishLog` 与新增的 `PublisherAdapter` 端口；
- 新增 `SocialAutoUploadAdapter`，仅实现账号状态检查；
- 将内部平台映射到当前上游 CLI：抖音 `douyin`、快手 `kuaishou`、小红书 `xiaohongshu`、视频号 `tencent`；
- `POST /api/accounts/:id/sau-check` 从 `PlatformAccount.settings.sauAccountName` 读取账号映射，并运行：
  `sau <platform> check --account <accountName>`；
- Node 通过 `child_process.spawn`（`shell: false`）调用 CLI。也支持用 `SAU_COMMAND=python` 与 `SAU_COMMAND_ARGS_JSON=["/absolute/path/sau_cli.py"]` 调用 Python CLI 入口；
- stdout/stderr 限长、脱敏后回传；Cookie、token、password、secret 等字段会被替换；
- 二维码、扫码、短信、验证码、登录要求等输出统一返回 `HUMAN_ACTION_REQUIRED`。本桥接不会调用 `login`、不会写验证码文件、不会上传作品。

## 上游契约核验

上游当前主线使用 Patchright，安装入口为 `uv pip install -e .`，CLI 为 `sau`。其 CLI 文档列出四个平台的 `login/check/upload-video`，其中视频号的命令是 `tencent`。本项目只集成其中无副作用的 `check` 子命令。

参考：[上游 CLI 文档](https://github.com/dreammis/social-auto-upload/blob/main/docs/CLI.md)、[安装文档](https://github.com/dreammis/social-auto-upload/blob/main/docs/install.md)。

## 本次执行结果

在当前 Codex 主机上探测了以下四个命令：

```text
sau douyin --help
sau kuaishou --help
sau xiaohongshu --help
sau tencent --help
```

四项均未执行：主机未安装 `sau`，且 Python/uv 也不可用。因此无法进行 Cookie 登录态检查；没有启动浏览器、没有生成二维码、没有尝试登录，更没有发布内容。

## 人工前置步骤

在具备 Python 和 uv 的受控主机中安装上游项目并完成**人工**登录后，配置：

```env
SAU_COMMAND="sau"
SAU_COMMAND_ARGS_JSON="[]"
SAU_CHECK_TIMEOUT_MS="30000"
```

并为每个 `PlatformAccount` 写入非敏感映射：

```json
{ "sauAccountName": "creator_01" }
```

随后调用本项目的 `/api/accounts/:id/sau-check`。若结果为 `HUMAN_ACTION_REQUIRED`，流程必须停止，显示上游的已脱敏输出，并由用户在可见浏览器/终端中自行完成扫码、短信或其它平台验证；不得自动化绕过。

import { spawn } from "node:child_process";
import type { Platform } from "@/generated/prisma";

export type SauCheckState = "VALID" | "INVALID" | "HUMAN_ACTION_REQUIRED" | "UNAVAILABLE" | "FAILED";

export interface SauCheckResult {
  state: SauCheckState;
  platform: string;
  accountName: string;
  command: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

const platformCommands: Partial<Record<Platform, string>> = {
  DOUYIN: "douyin",
  KUAISHOU: "kuaishou",
  XIAOHONGSHU: "xiaohongshu",
  WECHAT: "tencent"
};

const humanActionPattern = /二维码|扫码|短信|验证码|captcha|verification|login\s*required|please\s*login|请登录|未登录/i;
const secretPattern = /(authorization|cookie|password|access[_-]?token|refresh[_-]?token|secret)\s*[:=]\s*[^\s,]+/gi;

function sanitize(output: string) {
  return output.replace(secretPattern, "$1=[REDACTED]").slice(0, 16_000);
}

function prefixArgs(): string[] {
  const raw = process.env.SAU_COMMAND_ARGS_JSON;
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.some((part) => typeof part !== "string")) {
    throw new Error("SAU_COMMAND_ARGS_JSON must be a JSON string array");
  }
  return value;
}

/**
 * Safe social-auto-upload bridge. It only invokes `sau <platform> check`;
 * login, uploads, captcha entry and all other interactive actions are excluded.
 *
 * Default: SAU_COMMAND=sau
 * Python fallback: SAU_COMMAND=python; SAU_COMMAND_ARGS_JSON='["/absolute/path/sau_cli.py"]'
 */
export async function checkSauAccount(platform: Platform, accountName: string): Promise<SauCheckResult> {
  const platformCommand = platformCommands[platform];
  if (!platformCommand) throw new Error(`Platform ${platform} is not supported by social-auto-upload`);
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(accountName)) throw new Error("Invalid social-auto-upload account name");

  const command = process.env.SAU_COMMAND ?? "sau";
  const args = [...prefixArgs(), platformCommand, "check", "--account", accountName];
  const timeoutMs = Math.min(Math.max(Number(process.env.SAU_CHECK_TIMEOUT_MS ?? 30_000), 1_000), 120_000);

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const finish = (exitCode: number | null, unavailable = false) => {
      if (settled) return;
      settled = true;
      const safeStdout = sanitize(stdout);
      const safeStderr = sanitize(stderr);
      const combined = `${safeStdout}\n${safeStderr}`;
      const state: SauCheckState = unavailable ? "UNAVAILABLE"
        : humanActionPattern.test(combined) ? "HUMAN_ACTION_REQUIRED"
        : exitCode === 0 ? "VALID"
        : /invalid|expired|not found|不存在/i.test(combined) ? "INVALID"
        : "FAILED";
      resolve({ state, platform: platformCommand, accountName, command: [command, ...args], exitCode, stdout: safeStdout, stderr: safeStderr });
    };

    const child = spawn(command, args, { shell: false, windowsHide: true, env: { ...process.env, PYTHONUNBUFFERED: "1" } });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", (error: NodeJS.ErrnoException) => {
      stderr += error.message;
      clearTimeout(timer);
      finish(null, error.code === "ENOENT");
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) stderr += "\ncheck timed out; no login or upload was attempted";
      finish(code);
    });
  });
}

export function sauPlatformCommand(platform: Platform) {
  return platformCommands[platform] ?? null;
}

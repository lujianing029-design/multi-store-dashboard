import { spawn } from "node:child_process";
import type { Platform } from "@/generated/prisma";
import { sauPlatformCommand } from "@/platforms/social-auto-upload/cli";

export type SauPublishState = "SUCCEEDED" | "FAILED" | "HUMAN_ACTION_REQUIRED" | "DRY_RUN";

export interface SauPublishInput {
  platform: Platform;
  accountName: string;
  file: string;
  title: string;
  description: string;
  tags: string[];
  dryRun: boolean;
}

export interface SauPublishResult {
  state: SauPublishState;
  command: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  remoteUrl: null;
  remotePublicationId: null;
}

const humanActionPattern = /二维码|扫码|短信|验证码|captcha|verification|login\s*required|please\s*login|请登录|未登录/i;
const secretPattern = /(authorization|cookie|password|access[_-]?token|refresh[_-]?token|secret)\s*[:=]\s*[^\s,]+/gi;

function sanitize(value: string) {
  return value.replace(secretPattern, "$1=[REDACTED]").slice(0, 16_000);
}

function prefixArgs(): string[] {
  const raw = process.env.SAU_COMMAND_ARGS_JSON;
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.some((part) => typeof part !== "string")) throw new Error("SAU_COMMAND_ARGS_JSON must be a JSON string array");
  return value;
}

/**
 * The only production bridge to sau. It never reads cookies; sau resolves them
 * locally. Dry-run is the default and an explicit environment switch is required
 * before a server may start a real external publication.
 */
export async function publishWithSau(input: SauPublishInput): Promise<SauPublishResult> {
  const platformCommand = sauPlatformCommand(input.platform);
  if (!platformCommand) throw new Error(`Unsupported platform: ${input.platform}`);
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(input.accountName)) throw new Error("Invalid sau account name");

  const args = [...prefixArgs(), platformCommand, "upload-video", "--account", input.accountName, "--file", input.file, "--title", input.title, "--desc", input.description, "--tags", input.tags.join(",")];
  const command = process.env.SAU_COMMAND ?? "sau";
  if (input.dryRun) return { state: "DRY_RUN", command: [command, ...args], exitCode: 0, stdout: "Dry run: no sau upload command was executed.", stderr: "", remoteUrl: null, remotePublicationId: null };
  if (process.env.SAU_ENABLE_REAL_PUBLISH !== "true") throw new Error("Real publishing is disabled. Set SAU_ENABLE_REAL_PUBLISH=true only on the trusted local host.");

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      const safeStdout = sanitize(stdout);
      const safeStderr = sanitize(stderr);
      const humanAction = humanActionPattern.test(`${safeStdout}\n${safeStderr}`);
      resolve({ state: humanAction ? "HUMAN_ACTION_REQUIRED" : exitCode === 0 ? "SUCCEEDED" : "FAILED", command: [command, ...args], exitCode, stdout: safeStdout, stderr: safeStderr, remoteUrl: null, remotePublicationId: null });
    };
    const child = spawn(command, args, { shell: false, windowsHide: true, env: { ...process.env, PYTHONUNBUFFERED: "1" } });
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", (error) => { stderr += error.message; finish(null); });
    child.on("close", finish);
  });
}

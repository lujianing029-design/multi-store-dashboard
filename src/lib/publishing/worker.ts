import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { getStorageAdapter } from "@/lib/storage";
import { SocialAutoUploadAdapter } from "@/platforms/social-auto-upload/adapter";

type Payload = { dryRun?: boolean; sauAccountName?: string };

function payload(value: unknown): Payload {
  return typeof value === "object" && value !== null ? value as Payload : {};
}

export async function runPublishJob(jobId: string) {
  const job = await prisma.publishJob.findUnique({
    where: { id: jobId },
    include: { publishTarget: { include: { publishTask: { include: { content: { include: { video: true } } }, }, platformAccount: true } } }
  });
  if (!job || !job.publishTarget.publishTask.content.video) throw new Error("发布任务、账号或视频不存在。");
  const target = job.publishTarget;
  const task = target.publishTask;
  const account = target.platformAccount;
  const video = task.content.video;
  const config = payload(target.platformPayload);
  if (!config.sauAccountName) throw new Error("账号缺少 sauAccountName 映射。");

  await prisma.publishJob.update({ where: { id: job.id }, data: { status: "RUNNING", startedAt: new Date() } });
  await prisma.publishTarget.update({ where: { id: target.id }, data: { status: "RUNNING" } });
  await prisma.publishLog.create({ data: { publishTaskId: task.id, publishJobId: job.id, event: "PUBLISH_STARTED", message: config.dryRun ? "Dry Run started; sau will not be invoked." : "Starting local sau command." } });

  let directory: string | undefined;
  try {
    const storage = getStorageAdapter();
    const data = await storage.read(video.storageKey);
    if (!data) throw new Error("视频对象不存在于存储中。");
    directory = await mkdtemp(path.join(tmpdir(), "publisher-"));
    const stagedFile = path.join(directory, "video" + path.extname(video.fileName));
    await writeFile(stagedFile, data);
    const adapter = new SocialAutoUploadAdapter();
    const result = await adapter.publish({ platform: account.platform, accountName: config.sauAccountName, file: stagedFile, title: task.content.title, description: task.content.body ?? "", tags: Array.isArray(task.content.hashtags) ? task.content.hashtags.filter((tag): tag is string => typeof tag === "string") : [], dryRun: config.dryRun !== false });
    const human = result.state === "HUMAN_ACTION_REQUIRED";
    const success = result.state === "SUCCEEDED" || result.state === "DRY_RUN";
    await prisma.$transaction([
      prisma.publishJob.update({ where: { id: job.id }, data: { status: human ? "HUMAN_ACTION_REQUIRED" : success ? "SUCCEEDED" : "FAILED", finishedAt: new Date(), errorMessage: success ? null : result.stderr || result.stdout } }),
      prisma.publishTarget.update({ where: { id: target.id }, data: { status: human ? "HUMAN_ACTION_REQUIRED" : success ? "SUCCEEDED" : "FAILED" } }),
      prisma.publishResult.create({ data: { publishJobId: job.id, status: success ? "SUCCESS" : "FAILED", remotePublicationId: result.remotePublicationId, remoteUrl: result.remoteUrl, responseSummary: { state: result.state, exitCode: result.exitCode } } }),
      prisma.publishLog.create({ data: { publishTaskId: task.id, publishJobId: job.id, level: success ? "INFO" : human ? "WARN" : "ERROR", event: result.state, message: result.stdout || result.stderr || result.state, metadata: { stderr: result.stderr } })
    ]);
    const unfinished = await prisma.publishTarget.count({ where: { publishTaskId: task.id, status: { in: ["PENDING", "QUEUED", "RUNNING"] } } });
    if (unfinished === 0) {
      const failed = await prisma.publishTarget.count({ where: { publishTaskId: task.id, status: { in: ["FAILED", "HUMAN_ACTION_REQUIRED"] } } });
      await prisma.publishTask.update({ where: { id: task.id }, data: { status: failed ? "FAILED" : "SUCCEEDED" } });
    } else {
      await prisma.publishTask.update({ where: { id: task.id }, data: { status: "RUNNING" } });
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知发布错误。";
    await prisma.$transaction([
      prisma.publishJob.update({ where: { id: job.id }, data: { status: "FAILED", finishedAt: new Date(), errorMessage: message } }),
      prisma.publishTarget.update({ where: { id: target.id }, data: { status: "FAILED" } }),
      prisma.publishLog.create({ data: { publishTaskId: task.id, publishJobId: job.id, level: "ERROR", event: "PUBLISH_FAILED", message } })
    ]);
    const unfinished = await prisma.publishTarget.count({ where: { publishTaskId: task.id, status: { in: ["PENDING", "QUEUED", "RUNNING"] } } });
    if (unfinished === 0) await prisma.publishTask.update({ where: { id: task.id }, data: { status: "FAILED" } });
    throw error;
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}

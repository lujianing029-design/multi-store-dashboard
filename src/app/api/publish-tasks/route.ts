import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
const supportedPlatforms = new Set(["DOUYIN", "KUAISHOU", "XIAOHONGSHU", "WECHAT"]);
const strings = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === "string") ? value.map((item) => item.trim()).filter(Boolean) : [];

export async function GET() {
  return NextResponse.json(await prisma.publishTask.findMany({
    orderBy: { createdAt: "desc" }, take: 30,
    include: { content: { select: { title: true, video: { select: { fileName: true } } } }, targets: { include: { platformAccount: { select: { platform: true, displayName: true } }, jobs: { orderBy: { attemptNo: "desc" }, take: 1 } } } }
  }));
}

export async function POST(request: Request) {
  const value: unknown = await request.json();
  if (!value || typeof value !== "object") return NextResponse.json({ error: "请求格式错误。" }, { status: 400 });
  const input = value as Record<string, unknown>;
  const videoId = typeof input.videoId === "string" ? input.videoId : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const tags = strings(input.tags);
  const accountIds = strings(input.accountIds);
  const scheduledFor = typeof input.scheduledFor === "string" && input.scheduledFor ? new Date(input.scheduledFor) : null;
  if (!videoId || !title || !accountIds.length) return NextResponse.json({ error: "视频、标题和至少一个发布账号为必填项。" }, { status: 422 });
  if (scheduledFor && Number.isNaN(scheduledFor.getTime())) return NextResponse.json({ error: "定时发布时间格式错误。" }, { status: 422 });
  if (input.dryRun === false) return NextResponse.json({ error: "当前后台只允许 Dry Run。真实发布只能由受控本机 Worker 启用。" }, { status: 403 });

  const [video, accounts] = await Promise.all([
    prisma.video.findUnique({ where: { id: videoId }, select: { id: true, status: true } }),
    prisma.platformAccount.findMany({ where: { id: { in: accountIds } }, select: { id: true, platform: true, settings: true } })
  ]);
  if (!video || video.status !== "READY") return NextResponse.json({ error: "视频不存在或尚未就绪。" }, { status: 422 });
  if (accounts.length !== accountIds.length || accounts.some((account) => !supportedPlatforms.has(account.platform))) return NextResponse.json({ error: "请选择受支持的平台账号。" }, { status: 422 });
  const unmapped = accounts.some((account) => !(typeof account.settings === "object" && account.settings !== null && "sauAccountName" in account.settings && typeof account.settings.sauAccountName === "string"));
  if (unmapped) return NextResponse.json({ error: "所选账号缺少 sauAccountName 映射。" }, { status: 422 });

  const now = new Date();
  const task = await prisma.$transaction(async (tx) => {
    const content = await tx.content.create({ data: { videoId: video.id, title, body: body || null, hashtags: tags, status: "READY" } });
    const task = await tx.publishTask.create({
      data: { contentId: content.id, status: scheduledFor ? "SCHEDULED" : "QUEUED", scheduledFor, idempotencyKey: crypto.randomUUID(),
        targets: { create: accounts.map((account) => ({ platformAccountId: account.id, status: scheduledFor ? "PENDING" : "QUEUED", platformPayload: { dryRun: true, sauAccountName: (account.settings as { sauAccountName: string }).sauAccountName }, jobs: { create: { status: scheduledFor ? "PENDING" : "RUNNING", startedAt: scheduledFor ? null : now } } })) } },
      include: { targets: { include: { jobs: true } } }
    });
    await tx.publishLog.create({ data: { publishTaskId: task.id, level: "INFO", event: "TASK_CREATED", message: "Dry Run 发布任务已创建；未执行 sau。" } });
    if (!scheduledFor) {
      for (const target of task.targets) {
        const job = target.jobs[0];
        await tx.publishJob.update({ where: { id: job.id }, data: { status: "SUCCEEDED", finishedAt: new Date() } });
        await tx.publishTarget.update({ where: { id: target.id }, data: { status: "SUCCEEDED" } });
        await tx.publishResult.create({ data: { publishJobId: job.id, status: "SUCCESS", responseSummary: { dryRun: true, message: "Mock/Dry Run completed; sau was not invoked." } } });
        await tx.publishLog.createMany({ data: [
          { publishTaskId: task.id, publishJobId: job.id, level: "INFO", event: "DRY_RUN_STARTED", message: "Dry Run started; no external command executed." },
          { publishTaskId: task.id, publishJobId: job.id, level: "INFO", event: "DRY_RUN_SUCCEEDED", message: "Dry Run completed independently for this platform." }
        ] });
      }
      await tx.publishTask.update({ where: { id: task.id }, data: { status: "SUCCEEDED" } });
    }
    return task;
  });
  return NextResponse.json({ taskId: task.id, dryRun: true, message: scheduledFor ? "定时 Dry Run 任务已创建。" : "Dry Run 任务已完成；未调用 sau。" }, { status: 201 });
}

import Link from "next/link";
import { prisma } from "@/lib/db/prisma";

const platformName: Record<string, string> = {
  DOUYIN: "抖音",
  KUAISHOU: "快手",
  XIAOHONGSHU: "小红书",
  WECHAT: "视频号"
};

const statusName: Record<string, string> = {
  PENDING: "等待发布",
  QUEUED: "等待发布",
  SCHEDULED: "定时等待",
  RUNNING: "发布中",
  SUCCEEDED: "发布成功",
  FAILED: "发布失败",
  HUMAN_ACTION_REQUIRED: "需要人工操作",
  CANCELLED: "已取消"
};

export default async function PublishTasksPage() {
  const tasks = await prisma.publishTask.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      content: { include: { video: true } },
      targets: {
        include: {
          platformAccount: true,
          jobs: { orderBy: { attemptNo: "desc" }, take: 1 }
        }
      }
    }
  });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>发布任务</h1>
          <p>各平台独立执行。需要扫码、验证码或重新登录时会标记为“需要人工操作”。</p>
        </div>
        <Link className="primary-button" href="/publish-video">创建发布任务</Link>
      </header>
      <section className="panel task-list">
        {!tasks.length && <p className="status-note">还没有发布任务。创建任务会先以 Dry Run 验证完整流程。</p>}
        {tasks.map((task) => (
          <article className="task-card" key={task.id}>
            <div className="task-card-header">
              <div>
                <strong>{task.content.title}</strong>
                <p>{task.content.video?.fileName ?? "视频已不可用"}</p>
              </div>
              <span className="status-pill">{statusName[task.status] ?? task.status}</span>
            </div>
            {task.scheduledFor && <p className="task-schedule">计划时间：{task.scheduledFor.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</p>}
            <div className="target-grid">
              {task.targets.map((target) => {
                const job = target.jobs[0];
                const state = job?.status ?? target.status;
                return (
                  <div className="target-card" key={target.id}>
                    <strong>{platformName[target.platformAccount.platform] ?? target.platformAccount.platform}</strong>
                    <span>{target.platformAccount.displayName}</span>
                    <small>{statusName[state] ?? state}</small>
                    {job?.errorMessage && <p className="status-note">{job.errorMessage}</p>}
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

import { Archive, CalendarClock, CircleAlert, FileVideo, Send, UserRoundCog } from "lucide-react";
import { notFound } from "next/navigation";

const sections = {
  "publish-video": {
    title: "发布视频",
    description: "选择内容和发布账号后创建发布任务；当前只提供本地/演示流程。",
    icon: Send,
    action: "新建发布任务"
  },
  "publish-tasks": {
    title: "发布任务",
    description: "查看待发布、排队中和执行中的发布任务。",
    icon: CalendarClock,
    action: "创建任务"
  },
  "publish-history": {
    title: "发布历史",
    description: "查看已完成、失败和已取消的发布记录及执行日志。",
    icon: Archive,
    action: "查看筛选"
  },
  contents: {
    title: "内容库",
    description: "集中管理视频、标题、文案、标签和封面草稿。",
    icon: FileVideo,
    action: "新建内容"
  },
  accounts: {
    title: "账号管理",
    description: "管理发布账号及其授权状态。真实平台授权尚未接入。",
    icon: UserRoundCog,
    action: "添加账号"
  },
  "data-center": {
    title: "数据中心",
    description: "现有多店经营数据、商品与同步分析功能仍保留在原有页面。",
    icon: Archive,
    action: "进入经营总览"
  },
  settings: {
    title: "系统设置",
    description: "配置时区、默认发布策略和系统级安全选项。",
    icon: CircleAlert,
    action: "保存设置"
  }
} as const;

export default async function AdminSection({
  params
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const item = sections[section as keyof typeof sections];
  if (!item) notFound();
  const Icon = item.icon;

  return (
    <div className="page">
      <header className="page-header">
        <div><h1>{item.title}</h1><p>{item.description}</p></div>
        <button className="primary-button" type="button" disabled>{item.action}</button>
      </header>
      <section className="panel empty">
        <div>
          <Icon size={34} />
          <strong>{item.title}即将可用</strong>
          <p>数据模型和中文后台入口已建立。发布 Worker 与真实平台 Adapter 将在后续 Issue 中实现。</p>
        </div>
      </section>
    </div>
  );
}

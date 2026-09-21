"use client";

import {
  BarChart3,
  Boxes,
  CalendarClock,
  Clapperboard,
  FileVideo,
  History,
  LayoutDashboard,
  ListTodo,
  Send,
  Settings,
  UserRoundCog
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "首页", icon: LayoutDashboard },
  { href: "/publish-video", label: "发布视频", icon: Send },
  { href: "/publish-tasks", label: "发布任务", icon: ListTodo },
  { href: "/publish-history", label: "发布历史", icon: History },
  { href: "/contents", label: "内容库", icon: FileVideo },
  { href: "/accounts", label: "账号管理", icon: UserRoundCog },
  { href: "/data-center", label: "数据中心", icon: BarChart3 },
  { href: "/settings", label: "系统设置", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark"><Clapperboard size={19} /></span>
          <div><strong>内容发布台</strong><small>Content Publisher</small></div>
        </div>
        <nav className="nav-list" aria-label="主导航">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link className={active ? "nav-item active" : "nav-item"} href={href} key={href}>
                <Icon size={18} /><span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot"><CalendarClock size={14} /><span>发布系统 · 安全演示模式</span></div>
      </aside>
      <main className="content-shell">{children}</main>
    </div>
  );
}

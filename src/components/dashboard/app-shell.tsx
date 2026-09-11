"use client";

import {
  Boxes,
  LayoutDashboard,
  Link2,
  PackageSearch,
  RefreshCw,
  Store
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "经营总览", icon: LayoutDashboard },
  { href: "/shops", label: "店铺分析", icon: Store },
  { href: "/products", label: "商品排行", icon: PackageSearch },
  { href: "/mapping", label: "商品映射", icon: Link2 },
  { href: "/sync", label: "同步中心", icon: RefreshCw }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark"><Boxes size={19} /></span>
          <div><strong>多店经营台</strong><small>Multi-store BI</small></div>
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
        <div className="sidebar-foot"><span className="live-dot" />演示数据已就绪</div>
      </aside>
      <main className="content-shell">{children}</main>
    </div>
  );
}


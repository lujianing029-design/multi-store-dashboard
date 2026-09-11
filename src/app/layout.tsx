import type { Metadata } from "next";
import { AppShell } from "@/components/dashboard/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "多店经营台",
  description: "抖音、快手与视频号多店经营数据看板"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}


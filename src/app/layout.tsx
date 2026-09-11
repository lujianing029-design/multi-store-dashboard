import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multi Store Dashboard",
  description: "Multi-platform commerce operations dashboard"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

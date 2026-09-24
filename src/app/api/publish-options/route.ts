import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const [videos, accounts] = await Promise.all([
    prisma.video.findMany({ where: { status: "READY" }, orderBy: { createdAt: "desc" }, select: { id: true, fileName: true, byteSize: true, durationMs: true, createdAt: true } }),
    prisma.platformAccount.findMany({ where: { platform: { in: ["DOUYIN", "KUAISHOU", "XIAOHONGSHU", "WECHAT"] } }, orderBy: { createdAt: "asc" }, select: { id: true, platform: true, displayName: true, status: true, settings: true } })
  ]);
  return NextResponse.json({
    videos: videos.map((video) => ({ ...video, byteSize: video.byteSize.toString() })),
    accounts: accounts.map((account) => ({
      ...account,
      sauMapped: typeof account.settings === "object" && account.settings !== null && "sauAccountName" in account.settings && typeof account.settings.sauAccountName === "string"
    }))
  });
}

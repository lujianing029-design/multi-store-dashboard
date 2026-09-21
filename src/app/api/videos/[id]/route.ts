import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getStorageAdapter } from "@/lib/storage";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as { fileName?: unknown };
  if (typeof body.fileName !== "string" || body.fileName.trim().length === 0) {
    return NextResponse.json({ error: "文件名不能为空。" }, { status: 400 });
  }
  const video = await prisma.video.update({ where: { id }, data: { fileName: body.fileName.trim() } });
  return NextResponse.json({ ...video, byteSize: video.byteSize.toString() });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) return NextResponse.json({ error: "视频不存在。" }, { status: 404 });

  await prisma.video.delete({ where: { id } });
  const storage = getStorageAdapter();
  await storage.remove(video.storageKey);
  if (video.coverKey) await storage.remove(video.coverKey);
  return new NextResponse(null, { status: 204 });
}

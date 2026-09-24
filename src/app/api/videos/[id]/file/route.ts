import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getStorageAdapter } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await prisma.video.findUnique({ where: { id }, select: { storageKey: true, mimeType: true, fileName: true } });
  if (!video) return new NextResponse("Not found", { status: 404 });
  const data = await getStorageAdapter().read(video.storageKey);
  if (!data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(data).buffer, {
    headers: {
      "Content-Type": video.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(video.fileName)}"`,
      "Cache-Control": "private, max-age=3600"
    }
  });
}

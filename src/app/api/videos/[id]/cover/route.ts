import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getStorageAdapter } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await prisma.video.findUnique({ where: { id }, select: { coverKey: true } });
  if (!video?.coverKey) return new NextResponse("Not found", { status: 404 });
  const data = await getStorageAdapter().read(video.coverKey);
  if (!data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(data).buffer, { headers: { "Cache-Control": "private, max-age=3600" } });
}

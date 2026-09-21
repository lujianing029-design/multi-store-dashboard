import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getStorageAdapter } from "@/lib/storage";

export const runtime = "nodejs";
const supportedVideoTypes = new Set(["video/mp4", "video/quicktime"]);
const maxBytes = 2 * 1024 * 1024 * 1024;

const asDuration = (value: FormDataEntryValue | null) => {
  const duration = Number(value);
  return Number.isFinite(duration) && duration >= 0 ? Math.round(duration) : null;
};

export async function GET() {
  const videos = await prisma.video.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, mimeType: true, byteSize: true, durationMs: true, coverKey: true, status: true, createdAt: true }
  });
  return NextResponse.json(videos.map((video) => ({ ...video, byteSize: video.byteSize.toString() })));
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("video");
  const cover = form.get("cover");
  if (!(file instanceof File) || !supportedVideoTypes.has(file.type)) {
    return NextResponse.json({ error: "仅支持 MP4 或 MOV 视频。" }, { status: 400 });
  }
  if (file.size > maxBytes) return NextResponse.json({ error: "单个视频不能超过 2GB。" }, { status: 413 });
  if (cover !== null && (!(cover instanceof File) || !cover.type.startsWith("image/"))) {
    return NextResponse.json({ error: "封面必须是图片文件。" }, { status: 400 });
  }

  const storage = getStorageAdapter();
  const storedVideo = await storage.put({ data: new Uint8Array(await file.arrayBuffer()), contentType: file.type, fileName: file.name });
  let coverKey: string | undefined;
  try {
    if (cover instanceof File && cover.size > 0) {
      const storedCover = await storage.put({ data: new Uint8Array(await cover.arrayBuffer()), contentType: cover.type, fileName: cover.name });
      coverKey = storedCover.key;
    }
    const video = await prisma.video.create({
      data: {
        storageKey: storedVideo.key,
        fileName: file.name,
        mimeType: file.type,
        byteSize: BigInt(file.size),
        durationMs: asDuration(form.get("durationMs")),
        coverKey,
        sha256: crypto.randomUUID(),
        status: "READY"
      },
      select: { id: true, fileName: true, mimeType: true, byteSize: true, durationMs: true, coverKey: true, status: true, createdAt: true }
    });
    return NextResponse.json({ ...video, byteSize: video.byteSize.toString() }, { status: 201 });
  } catch (error) {
    await storage.remove(storedVideo.key);
    if (coverKey) await storage.remove(coverKey);
    throw error;
  }
}

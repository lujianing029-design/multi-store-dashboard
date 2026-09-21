import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  const body = await request.json() as { contentId?: unknown };
  if (typeof body.contentId !== "string") return NextResponse.json({ error: "请选择内容。" }, { status: 400 });
  const content = await prisma.content.findUnique({ where: { id: body.contentId }, select: { id: true } });
  if (!content) return NextResponse.json({ error: "内容不存在。" }, { status: 404 });
  const task = await prisma.publishTask.create({
    data: { contentId: content.id, idempotencyKey: crypto.randomUUID(), status: "DRAFT" },
    select: { id: true, status: true, createdAt: true }
  });
  return NextResponse.json(task, { status: 201 });
}

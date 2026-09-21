import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as { title?: unknown };
  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ error: "内容标题不能为空。" }, { status: 400 });
  }
  const content = await prisma.content.update({
    where: { id },
    data: { title: body.title.trim() },
    select: { id: true, title: true, updatedAt: true }
  });
  return NextResponse.json(content);
}

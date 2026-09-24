import { NextResponse } from "next/server";
import { adaptAllPlatforms } from "@/lib/ai-copy/content-adapters";
import { normalizeDraft } from "@/lib/ai-copy/types";

export async function POST(request: Request) {
  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "请求格式错误。" }, { status: 400 }); }
  try {
    const master = normalizeDraft(input);
    return NextResponse.json({ platforms: adaptAllPlatforms(master) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "文案格式错误。" }, { status: 422 });
  }
}

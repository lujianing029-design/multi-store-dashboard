import { NextResponse } from "next/server";
import { getAiCopyProvider } from "@/lib/ai-copy/provider";
import { adaptAllPlatforms } from "@/lib/ai-copy/content-adapters";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let value: unknown;
  try { value = await request.json(); }
  catch { return NextResponse.json({ error: "请求格式错误。" }, { status: 400 }); }
  if (!value || typeof value !== "object") return NextResponse.json({ error: "请求格式错误。" }, { status: 400 });
  const input = value as Record<string, unknown>;
  const brief = {
    productName: typeof input.productName === "string" ? input.productName.trim().slice(0, 120) : "",
    sellingPoints: typeof input.sellingPoints === "string" ? input.sellingPoints.trim().slice(0, 1000) : "",
    audience: typeof input.audience === "string" ? input.audience.trim().slice(0, 300) : "",
    requirements: typeof input.requirements === "string" ? input.requirements.trim().slice(0, 1000) : ""
  };
  if (!brief.productName) return NextResponse.json({ error: "请填写商品名称。" }, { status: 422 });
  const provider = getAiCopyProvider();
  try {
    const master = await provider.generate(brief);
    return NextResponse.json({ provider: provider.name, master, platforms: adaptAllPlatforms(master) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 生成失败。";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

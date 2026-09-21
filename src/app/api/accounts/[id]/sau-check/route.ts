import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { SocialAutoUploadAdapter } from "@/platforms/social-auto-upload/adapter";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await prisma.platformAccount.findUnique({ where: { id }, select: { platform: true, settings: true } });
  if (!account) return NextResponse.json({ error: "账号不存在。" }, { status: 404 });

  const accountName = typeof account.settings === "object" && account.settings !== null
    && "sauAccountName" in account.settings && typeof account.settings.sauAccountName === "string"
    ? account.settings.sauAccountName : null;
  if (!accountName) {
    return NextResponse.json({ state: "FAILED", error: "账号未配置 settings.sauAccountName，无法映射到 sau CLI 账号。" }, { status: 422 });
  }

  const adapter = new SocialAutoUploadAdapter();
  if (!adapter.supports(account.platform)) {
    return NextResponse.json({ state: "FAILED", error: "当前平台不支持 social-auto-upload CLI 检查。" }, { status: 422 });
  }

  const result = await adapter.checkAccount({ platform: account.platform, accountName });
  // stdout/stderr are already secret-redacted by the adapter. Never invoke login
  // or upload from this validation endpoint.
  console.info("social-auto-upload account check", { platform: account.platform, accountName, state: result.state, exitCode: result.exitCode });
  return NextResponse.json(result);
}

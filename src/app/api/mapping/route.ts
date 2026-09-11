import { NextResponse } from "next/server";
import { linkPlatformProduct } from "@/lib/dashboard/service";
import { sanitizeError } from "@/platforms/security";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      platformProductId?: string;
      unifiedProductId?: string;
    };
    if (!body.platformProductId || !body.unifiedProductId) {
      return NextResponse.json({ error: "请选择平台商品和统一商品" }, { status: 400 });
    }
    const result = await linkPlatformProduct(body.platformProductId, body.unifiedProductId);
    return NextResponse.json({ result });
  } catch (error) {
    const sanitized = sanitizeError(error);
    return NextResponse.json({ error: sanitized.message }, { status: 500 });
  }
}


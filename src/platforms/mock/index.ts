import type { Platform } from "@/generated/prisma";
import { MockDouyinAdapter } from "@/platforms/mock/douyin";
import { MockKuaishouAdapter } from "@/platforms/mock/kuaishou";
import { MockWechatAdapter } from "@/platforms/mock/wechat";
import type { CommerceAdapter } from "@/platforms/types";

export function createMockAdapterRegistry(): ReadonlyMap<Platform, CommerceAdapter> {
  const adapters: CommerceAdapter[] = [
    new MockDouyinAdapter(),
    new MockKuaishouAdapter(),
    new MockWechatAdapter()
  ];
  return new Map(adapters.map((adapter) => [adapter.platform, adapter]));
}

